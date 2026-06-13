const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');
const { v4: buatUuid } = require('uuid');


function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[OMS] Required environment variable ${name} is not set.`);
    process.exit(1);
  }
  return value;
}

const PORT = parseInt(process.env.PORT, 10) || 8001;
const DATABASE_URL = requireEnv('DATABASE_URL');
const RABBITMQ_URL = requireEnv('RABBITMQ_URL');

const aplikasi = express();
aplikasi.use(express.json());

// Aktifkan CORS untuk frontend dashboard
aplikasi.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});



const NAMA_EXCHANGE = 'logistics.events';
const NAMA_DLX = 'logistics.dlx';

// --- Koneksi Database ---
const koneksiDb = new Pool({ connectionString: DATABASE_URL });

// --- Koneksi RabbitMQ ---
let saluranPesan;
async function hubungkanRabbitMQ(maksRetry = 10) {
  for (let percobaan = 0; percobaan < maksRetry; percobaan++) {
    try {
      const koneksi = await amqp.connect(RABBITMQ_URL);
      saluranPesan = await koneksi.createChannel();

      // Deklarasi Dead Letter Exchange (EIP: Dead Letter Channel)
      await saluranPesan.assertExchange(NAMA_DLX, 'topic', { durable: true });
      await saluranPesan.assertQueue('q.dlq.gagal', { durable: true });
      await saluranPesan.bindQueue('q.dlq.gagal', NAMA_DLX, '#');

      // Deklarasi exchange utama (topic untuk routing yang presisi)
      await saluranPesan.assertExchange(NAMA_EXCHANGE, 'topic', { durable: true });

      // Argumen antrian dengan dead letter routing
      const argumenAntrian = {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': NAMA_DLX,
          'x-dead-letter-routing-key': 'surat.mati'
        }
      };

      // Deklarasi antrian untuk tiap sistem
      await saluranPesan.assertQueue('q.wms.masuk', argumenAntrian);
      await saluranPesan.assertQueue('q.sls.masuk', argumenAntrian);
      await saluranPesan.assertQueue('q.ctn.agregator', argumenAntrian);

      // Ikat antrian ke exchange dengan routing key yang sesuai
      await saluranPesan.bindQueue('q.wms.masuk', NAMA_EXCHANGE, 'pesanan.dibuat');
      await saluranPesan.bindQueue('q.sls.masuk', NAMA_EXCHANGE, 'gudang.dikemas');
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pesanan.#');
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'gudang.#');
      await saluranPesan.bindQueue('q.ctn.agregator', NAMA_EXCHANGE, 'pengiriman.#');

      // Queue baru: OMS mendengarkan event dari SLS dan WMS
      await saluranPesan.assertQueue('q.oms.updates', argumenAntrian);
      await saluranPesan.bindQueue('q.oms.updates', NAMA_EXCHANGE, 'pengiriman.#');
      await saluranPesan.bindQueue('q.oms.updates', NAMA_EXCHANGE, 'gudang.dikemas');

      koneksi.on('close', () => {
        console.warn('[OMS] Koneksi RabbitMQ terputus, mencoba sambung ulang...');
        setTimeout(() => hubungkanRabbitMQ(), 5000);
      });

      console.log('[OMS] Terhubung ke RabbitMQ dengan konfigurasi DLX');
      return;
    } catch (err) {
      console.warn(`[OMS] RabbitMQ belum siap, mencoba ulang (${percobaan + 1}/${maksRetry})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('[OMS] Gagal terhubung ke RabbitMQ setelah semua percobaan');
}
// --- Mapping event → status OMS ---
const PETA_STATUS_OMS = {
  'gudang.dikemas':         'DIPROSES',
  'pengiriman.dimanifes':   'DIKIRIM',
  'pengiriman.pickup':      'DALAM_PERJALANAN',
  'pengiriman.in_transit':  'DALAM_PERJALANAN',
  'pengiriman.delivered':   'SELESAI',
  'pengiriman.cancelled':   'DIBATALKAN',
};

async function konsumsiUpdateStatus() {
  saluranPesan.prefetch(5);
  saluranPesan.consume('q.oms.updates', async (pesan) => {
    if (!pesan) return;
    try {
      const event = JSON.parse(pesan.content.toString());
      const statusBaru = PETA_STATUS_OMS[event.tipe_event] 
                      || PETA_STATUS_OMS[event.routing_key];
      
      if (!statusBaru || !event.id_pesanan) {
        saluranPesan.ack(pesan);
        return;
      }

      await koneksiDb.query(
        `UPDATE pesanan 
         SET status = $1, diperbarui_pada = NOW() 
         WHERE id_pesanan = $2`,
        [statusBaru, event.id_pesanan]
      );

      console.log(`[OMS] Status pesanan ${event.id_pesanan} diperbarui → ${statusBaru}`);
      saluranPesan.ack(pesan);
    } catch (err) {
      console.error('[OMS] Gagal update status:', err.message);
      saluranPesan.nack(pesan, false, true);
    }
  });
}

// --- Rute API ---
aplikasi.get('/health', (req, res) => res.json({ status: 'AKTIF', layanan: 'OMS' }));

// POST /pesanan - Buat pesanan baru
aplikasi.post('/pesanan', async (req, res) => {
  const { pelanggan, daftarBarang, totalHarga, lokasi_pengambilan, alamat_tujuan } = req.body;

  if (!pelanggan?.nama || !pelanggan?.email || !daftarBarang?.length || !totalHarga) {
    return res.status(400).json({
      error: 'Data tidak lengkap: pelanggan (nama, email), daftarBarang, totalHarga wajib diisi'
    });
  }

  if (!lokasi_pengambilan || !alamat_tujuan) {
    return res.status(400).json({
      error: 'lokasi_pengambilan dan alamat_tujuan wajib diisi'
    });
  }

  const idPesanan = `PSN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${buatUuid().slice(0, 6).toUpperCase()}`;
  const waktuBuat = new Date().toISOString();

  try {
    // Simpan ke database lokal (idempotency: UNIQUE constraint mencegah duplikat)
    const hasil = await koneksiDb.query(
      `INSERT INTO pesanan (id_pesanan, nama_pelanggan, email_pelanggan, daftar_barang, total_harga, lokasi_pengambilan, alamat_tujuan, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DIBUAT')
       ON CONFLICT (id_pesanan) DO NOTHING
       RETURNING id_pesanan`,
      [idPesanan, pelanggan.nama, pelanggan.email, JSON.stringify(daftarBarang), totalHarga, lokasi_pengambilan, alamat_tujuan]
    );

    if (hasil.rowCount === 0) {
      const dataLama = await koneksiDb.query('SELECT * FROM pesanan WHERE id_pesanan = $1', [idPesanan]);
      return res.status(200).json({ pesan: 'Pesanan sudah ada (idempoten)', data: dataLama.rows[0] });
    }

    // Buat payload event kanonik (EIP: Canonical Data Model)
    const eventPesanan = {
      id_pesanan: idPesanan,
      pelanggan: { nama: pelanggan.nama, email: pelanggan.email },
      daftar_barang: daftarBarang,
      total_harga: totalHarga,
      lokasi_pengambilan: lokasi_pengambilan,
      alamat_tujuan: alamat_tujuan,
      waktu: waktuBuat,
      tipe_event: 'pesanan.dibuat',
      sumber: 'OMS',
      id_pesan: buatUuid()
    };

    // Publikasikan ke exchange RabbitMQ (EIP: Publish-Subscribe)
    saluranPesan.publish(
      NAMA_EXCHANGE,
      'pesanan.dibuat',
      Buffer.from(JSON.stringify(eventPesanan)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: eventPesanan.id_pesan,
        timestamp: Math.floor(Date.now() / 1000)
      }
    );

    console.log(`[OMS] Dipublikasikan pesanan.dibuat: ${idPesanan}`);
    res.status(201).json({
      pesan: 'Pesanan berhasil dibuat dan event dipublikasikan',
      id_pesanan: idPesanan,
      data: eventPesanan
    });
  } catch (err) {
    console.error('[OMS] Kesalahan:', err.message);
    res.status(500).json({ error: 'Kesalahan server internal', detail: err.message });
  }
});

// PATCH /pesanan/:id/status - Update status pesanan manual & publish event
aplikasi.patch('/pesanan/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status harus diisi' });

  try {
    const hasil = await koneksiDb.query(
      `UPDATE pesanan SET status = $1, diperbarui_pada = NOW() WHERE id_pesanan = $2 RETURNING *`,
      [status, id]
    );
    if (!hasil.rows.length) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

    const pesananUpdated = hasil.rows[0];

    // Buat payload event status terupdate
    const eventUpdate = {
      id_pesanan: id,
      status: status,
      waktu: new Date().toISOString(),
      tipe_event: 'pesanan.diupdate',
      sumber: 'OMS',
      id_pesan: buatUuid()
    };

    // Publikasikan event terupdate
    if (saluranPesan) {
      saluranPesan.publish(
        NAMA_EXCHANGE,
        'pesanan.diupdate',
        Buffer.from(JSON.stringify(eventUpdate)),
        { persistent: true, contentType: 'application/json', messageId: eventUpdate.id_pesan }
      );
      console.log(`[OMS] Event dipublikasikan pesanan.diupdate: ${id} → ${status}`);
    }

    res.json({ pesan: 'Status pesanan berhasil diperbarui', data: pesananUpdated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pesanan - Daftar semua pesanan
aplikasi.get('/pesanan', async (req, res) => {
  try {
    const hasil = await koneksiDb.query('SELECT * FROM pesanan ORDER BY dibuat_pada DESC');
    res.json({ jumlah: hasil.rows.length, daftar_pesanan: hasil.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /pesanan/:id - Detail pesanan berdasarkan id_pesanan
aplikasi.get('/pesanan/:id', async (req, res) => {
  try {
    const hasil = await koneksiDb.query('SELECT * FROM pesanan WHERE id_pesanan = $1', [req.params.id]);
    if (!hasil.rows.length) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    res.json(hasil.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /orders - Alias untuk /pesanan (backward compatibility)
aplikasi.get('/orders', async (req, res) => {
  try {
    const hasil = await koneksiDb.query('SELECT * FROM pesanan ORDER BY dibuat_pada DESC');
    res.json({ jumlah: hasil.rows.length, daftar_pesanan: hasil.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /statistik - Statistik ringkas untuk dashboard
aplikasi.get('/statistik', async (req, res) => {
  try {
    const totalPesanan = await koneksiDb.query('SELECT COUNT(*) as total FROM pesanan');
    const totalPendapatan = await koneksiDb.query('SELECT COALESCE(SUM(total_harga), 0) as total FROM pesanan');
    const pesananHariIni = await koneksiDb.query(
      "SELECT COUNT(*) as total FROM pesanan WHERE dibuat_pada >= CURRENT_DATE"
    );
    res.json({
      total_pesanan: parseInt(totalPesanan.rows[0].total),
      total_pendapatan: parseFloat(totalPendapatan.rows[0].total),
      pesanan_hari_ini: parseInt(pesananHariIni.rows[0].total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Jalankan Aplikasi ---
(async () => {
  await hubungkanRabbitMQ();
  konsumsiUpdateStatus(); 
  aplikasi.listen(PORT, () => console.log(`[OMS] Berjalan di port ${PORT}`));
})();
