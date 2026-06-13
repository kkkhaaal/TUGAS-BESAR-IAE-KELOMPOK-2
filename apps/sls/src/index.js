/**
 * SLS - Sistem Pengiriman & Logistik (Shipping & Logistics System)
 * UPDATED: Manual status control via dropdown + ETA auto-delivery + Jadwal Pickup
 * EIP: Async Event-Driven Consumer, Dead Letter Channel, Idempotent Receiver
 */
const express = require('express');
const { MongoClient } = require('mongodb');
const amqp = require('amqplib');
const crypto = require('crypto');

const aplikasi = express();
aplikasi.use(express.json());

// CORS untuk dashboard
aplikasi.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[SLS] Required environment variable ${name} is not set.`);
    process.exit(1);
  }
  return value;
}

const PORT = parseInt(process.env.PORT, 10) || 8003;
const MONGO_URL = requireEnv('MONGO_URL');
const RABBITMQ_URL = requireEnv('RABBITMQ_URL');
const NAMA_EXCHANGE = 'logistics.events';
const NAMA_DLX = 'logistics.dlx';

// Urutan status yang valid
const STATUS_ORDER = ['DIMANIFES', 'PICKUP', 'IN TRANSIT', 'DELIVERED'];

// Mapping status ke routing key RabbitMQ
const STATUS_EVENT_MAP = {
  'DIMANIFES':  { routing_key: 'pengiriman.dimanifes',  tipe_event: 'SHIPMENT_MANIFESTED' },
  'PICKUP':     { routing_key: 'pengiriman.pickup',      tipe_event: 'SHIPMENT_PICKUP' },
  'IN TRANSIT': { routing_key: 'pengiriman.in_transit',  tipe_event: 'SHIPMENT_IN_TRANSIT' },
  'DELIVERED':  { routing_key: 'pengiriman.delivered',   tipe_event: 'SHIPMENT_DELIVERED' },
  'CANCELLED':  { routing_key: 'pengiriman.cancelled',   tipe_event: 'SHIPMENT_CANCELLED' },
};

let koleksiPengiriman;
let saluranPesan;
const idPesananSudahDiproses = new Set();

// Set idempoten in-memory untuk mencegah duplikat shipment

// --- Koneksi MongoDB ---
async function hubungkanMongoDB(maksRetry = 10) {
  for (let percobaan = 0; percobaan < maksRetry; percobaan++) {
    try {
      const klien = new MongoClient(MONGO_URL);
      await klien.connect();
      await klien.db('admin').command({ ping: 1 });
      console.log('[SLS] Terhubung ke MongoDB');
      const database = klien.db('sls_db');
      koleksiPengiriman = database.collection('pengiriman');
      await koleksiPengiriman.createIndex({ 'detail_paket.nomor_referensi': 1 }, { unique: true });
      return;
    } catch (err) {
      console.warn(`[SLS] MongoDB belum siap, mencoba ulang (${percobaan + 1}/${maksRetry})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('[SLS] Gagal terhubung ke MongoDB');
}

// --- Koneksi RabbitMQ ---
async function hubungkanRabbitMQ(maksRetry = 10) {
  for (let percobaan = 0; percobaan < maksRetry; percobaan++) {
    try {
      const koneksi = await amqp.connect(RABBITMQ_URL);
      saluranPesan = await koneksi.createChannel();

      await saluranPesan.assertExchange(NAMA_DLX, 'topic', { durable: true });
      await saluranPesan.assertQueue('q.dlq.gagal', { durable: true });
      await saluranPesan.bindQueue('q.dlq.gagal', NAMA_DLX, '#');

      await saluranPesan.assertExchange(NAMA_EXCHANGE, 'topic', { durable: true });

      const antrian = await saluranPesan.assertQueue('q.sls.masuk', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': NAMA_DLX,
          'x-dead-letter-routing-key': 'surat.mati'
        }
      });
      await saluranPesan.bindQueue(antrian.queue, NAMA_EXCHANGE, 'gudang.dikemas');

      // Bind routing key untuk event pengiriman agar CTN bisa terima
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pengiriman.pickup').catch(() => {});
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pengiriman.in_transit').catch(() => {});
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pengiriman.delivered').catch(() => {});
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pengiriman.cancelled').catch(() => {});

      koneksi.on('close', () => {
        console.warn('[SLS] Koneksi RabbitMQ terputus, mencoba sambung ulang...');
        setTimeout(() => hubungkanRabbitMQ(), 5000);
      });

      console.log('[SLS] Terhubung ke RabbitMQ');
      return;
    } catch (err) {
      console.warn(`[SLS] RabbitMQ belum siap, mencoba ulang (${percobaan + 1}/${maksRetry})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('[SLS] Gagal terhubung ke RabbitMQ');
}

// --- Publish event status pengiriman ---
function publishEventPengiriman(pengiriman, status) {
  const mapping = STATUS_EVENT_MAP[status];
  if (!mapping || !saluranPesan) return;

  const event = {
    tipe_event: mapping.tipe_event,
    routing_key: mapping.routing_key,
    sumber: 'SLS',
    id_pesanan: pengiriman.detail_paket?.nomor_referensi || '',
    id_pengiriman: pengiriman.id_pengiriman,
    nomor_resi: pengiriman.nomor_resi,
    status,
    waktu: new Date().toISOString(),
    id_pesan: crypto.randomUUID(),
    scheduled_pickup_date: pengiriman.scheduled_pickup_date || null,
    diperbarui_pada: pengiriman.diperbarui_pada || new Date().toISOString()
  };

  saluranPesan.publish(
    NAMA_EXCHANGE,
    mapping.routing_key,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: 'application/json', messageId: event.id_pesan }
  );

  console.log(`[SLS] Event dipublikasikan: ${mapping.tipe_event} untuk pengiriman ${pengiriman.id_pengiriman}`);
  return event;
}

// --- Utilitas ---
function buatNomorResi() {
  return `RESI-${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`;
}
function buatIdPengiriman() {
  return `KIRIM-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
}

// --- Validasi perubahan status ---
function validasiPerubahanStatus(statusLama, statusBaru) {
  if (statusLama === 'DELIVERED') {
    return { valid: false, pesan: 'Status DELIVERED tidak dapat diubah lagi' };
  }
  if (statusBaru === 'CANCELLED') {
    if (statusLama === 'DELIVERED') {
      return { valid: false, pesan: 'CANCELLED tidak bisa dipilih setelah DELIVERED' };
    }
    return { valid: true };
  }
  const idxLama = STATUS_ORDER.indexOf(statusLama);
  const idxBaru = STATUS_ORDER.indexOf(statusBaru);
  if (idxBaru === -1) {
    return { valid: false, pesan: `Status '${statusBaru}' tidak valid` };
  }
  if (idxBaru <= idxLama) {
    return { valid: false, pesan: `Status tidak boleh mundur dari '${statusLama}' ke '${statusBaru}'` };
  }
  return { valid: true };
}

// --- Konsumen Event Gudang ---
function konsumsiEventGudang() {
  saluranPesan.prefetch(1);
  saluranPesan.consume('q.sls.masuk', async (pesan) => {
    if (pesan === null) return;
    try {
      let eventGudang;
      try {
        eventGudang = JSON.parse(pesan.content.toString());
      } catch (e) {
        saluranPesan.nack(pesan, false, false);
        return;
      }

      if (idPesananSudahDiproses.has(eventGudang.id_pesanan)) {
        saluranPesan.ack(pesan);
        return;
      }

      const nomorResi = buatNomorResi();
      const idPengiriman = buatIdPengiriman();
      const sekarang = new Date();

      const dataPengiriman = {
        id_pengiriman: idPengiriman,
        asal: eventGudang.id_gudang,
        alamat_tujuan: eventGudang.alamat_tujuan || '—',
        detail_paket: {
          berat_kg: 1.5,
          nomor_referensi: eventGudang.id_pesanan,
          daftar_barang: eventGudang.daftar_barang
        },
        status: 'DIMANIFES',
        nomor_resi: nomorResi,
        dibuat_pada: sekarang,
        diperbarui_pada: sekarang,
        scheduled_pickup_date: null,
        riwayat_status: [
          { status: 'DIMANIFES', waktu: sekarang, oleh: 'SYSTEM', keterangan: 'Dimanifes otomatis dari WMS' }
        ]
      };

      try {
        await koleksiPengiriman.insertOne(dataPengiriman);
      } catch (errDb) {
        if (errDb.code === 11000) {
          saluranPesan.ack(pesan);
          return;
        }
        saluranPesan.nack(pesan, false, true);
        return;
      }

      publishEventPengiriman(dataPengiriman, 'DIMANIFES');
      idPesananSudahDiproses.add(eventGudang.id_pesanan);
      console.log(`[SLS] Pengiriman dimanifes: ${idPengiriman} (Resi: ${nomorResi})`);
      saluranPesan.ack(pesan);
    } catch (err) {
      console.error(`[SLS] Kesalahan memproses pesan: ${err.message}`);
      saluranPesan.nack(pesan, false, true);
    }
  }, { noAck: false });
}

// ============================================================
// RUTE API
// ============================================================

aplikasi.get('/health', (req, res) => res.json({ status: 'AKTIF', layanan: 'SLS' }));

// GET semua pengiriman
aplikasi.get('/api/v1/pengiriman', async (req, res) => {
  try {
    const list = await koleksiPengiriman.find({}, { projection: { _id: 0 } }).toArray();
    res.json({ jumlah: list.length, daftar_pengiriman: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pengiriman by order ID
aplikasi.get('/api/v1/pengiriman/:id_pesanan', async (req, res) => {
  try {
    const p = await koleksiPengiriman.findOne(
      { 'detail_paket.nomor_referensi': req.params.id_pesanan },
      { projection: { _id: 0 } }
    );
    if (!p) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pengiriman by shipment ID (id_pengiriman)
aplikasi.get('/api/v1/pengiriman/detail/:id_pengiriman', async (req, res) => {
  try {
    const p = await koleksiPengiriman.findOne(
      { id_pengiriman: req.params.id_pengiriman },
      { projection: { _id: 0 } }
    );
    if (!p) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/pengiriman/:id_pengiriman/status — Update status manual oleh operator
aplikasi.patch('/api/v1/pengiriman/:id_pengiriman/status', async (req, res) => {
  const { id_pengiriman } = req.params;
  const { status, scheduled_pickup_date, operator } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Field status wajib diisi' });
  }

  try {
    const pengiriman = await koleksiPengiriman.findOne({ id_pengiriman });
    if (!pengiriman) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });

    const { valid, pesan } = validasiPerubahanStatus(pengiriman.status, status);
    if (!valid) return res.status(400).json({ error: pesan });

    const sekarang = new Date();
    const updateFields = {
      status,
      diperbarui_pada: sekarang,
    };

    // Jika ada jadwal pickup dikirim, simpan
    if (scheduled_pickup_date !== undefined) {
      updateFields.scheduled_pickup_date = scheduled_pickup_date
        ? new Date(scheduled_pickup_date)
        : null;
    }

    if (status === 'DELIVERED') {
      updateFields.delivered_at = sekarang;
    }

    if (status === 'CANCELLED') {
      updateFields.cancelled_at = sekarang;
    }

    await koleksiPengiriman.updateOne(
      { id_pengiriman },
      {
        $set: updateFields,
        $push: {
          riwayat_status: {
            status,
            waktu: sekarang,
            oleh: operator || 'OPERATOR',
            keterangan: `Status diubah manual ke ${status}`
          }
        }
      }
    );

    const pengirimanUpdated = await koleksiPengiriman.findOne(
      { id_pengiriman },
      { projection: { _id: 0 } }
    );

    const event = publishEventPengiriman(pengirimanUpdated, status);

    res.json({
      pesan: `Status berhasil diubah ke ${status}`,
      pengiriman: pengirimanUpdated,
      event_dipublikasikan: event?.tipe_event || null
    });
  } catch (err) {
    console.error('[SLS] Gagal update status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/pengiriman/:id_pengiriman/jadwal — Set jadwal tanggal pickup
aplikasi.patch('/api/v1/pengiriman/:id_pengiriman/jadwal', async (req, res) => {
  const { id_pengiriman } = req.params;
  const { scheduled_pickup_date } = req.body;

  try {
    const pengiriman = await koleksiPengiriman.findOne({ id_pengiriman });
    if (!pengiriman) return res.status(404).json({ error: 'Pengiriman tidak ditemukan' });

    if (pengiriman.status === 'DELIVERED' || pengiriman.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Jadwal tidak dapat diubah untuk status DELIVERED/CANCELLED' });
    }

    const tanggal = scheduled_pickup_date ? new Date(scheduled_pickup_date) : null;
    await koleksiPengiriman.updateOne(
      { id_pengiriman },
      { $set: { scheduled_pickup_date: tanggal, diperbarui_pada: new Date() } }
    );

    res.json({ pesan: 'Jadwal pengiriman berhasil diset', scheduled_pickup_date: tanggal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET statistik
aplikasi.get('/api/v1/statistik', async (req, res) => {
  try {
    const total = await koleksiPengiriman.countDocuments();
    const dimanifes = await koleksiPengiriman.countDocuments({ status: 'DIMANIFES' });
    const pickup = await koleksiPengiriman.countDocuments({ status: 'PICKUP' });
    const inTransit = await koleksiPengiriman.countDocuments({ status: 'IN TRANSIT' });
    const delivered = await koleksiPengiriman.countDocuments({ status: 'DELIVERED' });
    const cancelled = await koleksiPengiriman.countDocuments({ status: 'CANCELLED' });
    res.json({
      total_pengiriman: total,
      total_dimanifes: dimanifes,
      total_pickup: pickup,
      total_in_transit: inTransit,
      total_delivered: delivered,
      total_cancelled: cancelled
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET waktu server (source of truth untuk ETA)
aplikasi.get('/api/v1/server-time', (req, res) => {
  res.json({ server_time: new Date().toISOString() });
});


// GET /api/v1/shipments - Alias untuk /api/v1/pengiriman (backward compatibility)
aplikasi.get('/api/v1/shipments', async (req, res) => {
  try {
    const list = await koleksiPengiriman.find({}, { projection: { _id: 0 } }).toArray();
    res.json({ jumlah: list.length, daftar_pengiriman: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bootstrap ---
(async () => {
  try {
    await hubungkanMongoDB();
    await hubungkanRabbitMQ();
    konsumsiEventGudang();
    aplikasi.listen(PORT, () => console.log(`[SLS] Berjalan di port ${PORT}`));
  } catch (err) {
    console.error(`[SLS] Bootstrap gagal: ${err.message}`);
    process.exit(1);
  }
})();