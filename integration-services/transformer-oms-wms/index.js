/**
 * EDLIE - Layanan Integrasi: Transformer OMS-WMS
 * EIP: Message Translator, Dead Letter Channel, Idempotent Receiver
 *
 * Mengonsumsi event JSON dari q.wms.masuk,
 * mentransformasi payload ke XML kompatibel WMS,
 * dan POST ke endpoint API WMS.
 * Pesan gagal setelah maksRetry dikirim ke Dead Letter Queue.
 */

const amqp = require('amqplib');
const axios = require('axios');
const { create } = require('xmlbuilder2');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[Transformer] Required environment variable ${name} is not set.`);
    process.exit(1);
  }
  return value;
}

const URL_RABBITMQ = requireEnv('RABBITMQ_URL');
const URL_API_WMS = requireEnv('WMS_API_URL');
const NAMA_ANTRIAN = 'q.wms.masuk';
const NAMA_DLX = 'logistics.dlx';
const MAKS_RETRY = parseInt(process.env.TRANSFORMER_MAX_RETRIES || '3');

// Set idempoten in-memory (produksi: gunakan Redis)
const idPesanSudahDiproses = new Set();

/**
 * EIP: Message Translator
 * Mengubah event pesanan JSON dari OMS → permintaan gudang XML untuk WMS
 */
function transformasiJsonKeXml(eventPesanan) {
  const idPermintaan = `WMS-REQ-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
  const dokumen = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('permintaan_gudang')
      .ele('id').txt(idPermintaan).up()
      .ele('referensi_pesanan').txt(eventPesanan.id_pesanan).up()
      .ele('aksi').txt('ALOKASI_DAN_KEMAS').up()
      .ele('id_pesan').txt(eventPesanan.id_pesan || idPermintaan).up()
      .ele('lokasi_pengambilan').txt(eventPesanan.lokasi_pengambilan || '').up()
      .ele('alamat_tujuan').txt(eventPesanan.alamat_tujuan || '').up()
      .ele('daftar_barang');

  for (const barang of eventPesanan.daftar_barang) {
    dokumen
      .ele('barang')
        .ele('kode_sku').txt(barang.sku).up()
        .ele('jumlah').txt(String(barang.qty)).up()
      .up();
  }

  return dokumen.end({ prettyPrint: true });
}

async function hubungkanDanKonsumsi(maksRetry = 15) {
  for (let percobaan = 0; percobaan < maksRetry; percobaan++) {
    try {
      const koneksi = await amqp.connect(URL_RABBITMQ);
      const saluran = await koneksi.createChannel();

      // Pastikan DLX sudah terdefinisi
      await saluran.assertExchange(NAMA_DLX, 'topic', { durable: true });
      await saluran.assertQueue('q.dlq.gagal', { durable: true });
      await saluran.bindQueue('q.dlq.gagal', NAMA_DLX, '#');

      // Assert antrian dengan argumen DLX
      await saluran.assertQueue(NAMA_ANTRIAN, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': NAMA_DLX,
          'x-dead-letter-routing-key': 'surat.mati'
        }
      });
      saluran.prefetch(1);

      console.log(`[Transformer] Mendengarkan antrian ${NAMA_ANTRIAN}...`);

      saluran.consume(NAMA_ANTRIAN, async (pesan) => {
        if (!pesan) return;

        let eventPesanan;
        try {
          eventPesanan = JSON.parse(pesan.content.toString());
        } catch (e) {
          console.error('[Transformer] Payload JSON tidak valid, dikirim ke DLQ:', e.message);
          saluran.nack(pesan, false, false); // → DLQ via DLX
          return;
        }

        // EIP: Idempotent Receiver - lewati pesan yang sudah diproses
        const idPesan = eventPesanan.id_pesan || eventPesanan.id_pesanan;
        if (idPesan && idPesanSudahDiproses.has(idPesan)) {
          console.log(`[Transformer] Pesan duplikat terdeteksi (${idPesan}), dilewati.`);
          saluran.ack(pesan);
          return;
        }

        console.log(`[Transformer] Menerima pesanan.dibuat: ${eventPesanan.id_pesanan}`);

        // --- Transformasi: JSON → XML (EIP: Message Translator) ---
        const payloadXml = transformasiJsonKeXml(eventPesanan);
        console.log('[Transformer] Hasil transformasi ke XML:\n', payloadXml);

        // --- Kirim ke API WMS dengan logika retry ---
        let kesalahanTerakhir;
        for (let upaya = 1; upaya <= MAKS_RETRY; upaya++) {
          try {
            const respons = await axios.post(URL_API_WMS, payloadXml, {
              headers: { 'Content-Type': 'application/xml' },
              timeout: 10000
            });
            console.log(`[Transformer] Respons WMS (upaya ${upaya}): ${respons.status} - ${JSON.stringify(respons.data)}`);

            // Tandai sebagai sudah diproses untuk idempotency
            if (idPesan) idPesanSudahDiproses.add(idPesan);
            // Bersihkan ID lama agar memori tidak penuh
            if (idPesanSudahDiproses.size > 10000) {
              const entriPertama = idPesanSudahDiproses.values().next().value;
              idPesanSudahDiproses.delete(entriPertama);
            }

            saluran.ack(pesan);
            return;
          } catch (err) {
            kesalahanTerakhir = err;
            console.error(`[Transformer] Panggilan API WMS gagal (upaya ${upaya}/${MAKS_RETRY}): ${err.message}`);
            if (upaya < MAKS_RETRY) {
              await new Promise(r => setTimeout(r, 2000 * upaya)); // exponential backoff
            }
          }
        }

        // Semua retry habis → kirim ke DLQ
        console.error(`[Transformer] Semua ${MAKS_RETRY} upaya gagal untuk ${eventPesanan.id_pesanan}, dikirim ke DLQ`);
        saluran.nack(pesan, false, false); // requeue=false → dirutekan ke DLX → DLQ
      });

      koneksi.on('close', () => {
        console.warn('[Transformer] Koneksi RabbitMQ terputus, mencoba sambung ulang...');
        setTimeout(() => hubungkanDanKonsumsi(), 5000);
      });

      return;
    } catch (err) {
      console.warn(`[Transformer] RabbitMQ belum siap, mencoba ulang (${percobaan + 1}/${maksRetry})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('[Transformer] Gagal terhubung ke RabbitMQ setelah semua percobaan');
}

hubungkanDanKonsumsi().catch(err => {
  console.error('[Transformer] Kesalahan fatal:', err.message);
  process.exit(1);
});
