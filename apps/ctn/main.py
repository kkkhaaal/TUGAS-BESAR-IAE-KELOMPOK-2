"""
CTN - Sistem Pelacakan Pelanggan (Customer Tracking & Notification)
UPDATED: Support event baru SLS (PICKUP, IN_TRANSIT, DELIVERED, CANCELLED)
EIP: Aggregator, Canonical Data Model, Event-Driven Consumer
"""
import os
import sys
import json
import threading
import time
import redis
import pika
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

aplikasi = Flask(__name__)
CORS(aplikasi)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"[CTN] Required environment variable {name} is not set.", file=sys.stderr)
        sys.exit(1)
    return value

URL_REDIS = require_env("REDIS_URL")
URL_RABBITMQ = require_env("RABBITMQ_URL")
NAMA_EXCHANGE = "logistics.events"
NAMA_DLX = "logistics.dlx"

klienRedis = redis.from_url(URL_REDIS, decode_responses=True)


def ambilTimelinePesanan(id_pesanan: str) -> list:
    kunci = f"timeline_pesanan:{id_pesanan}"
    data_mentah = klienRedis.lrange(kunci, 0, -1)
    return [json.loads(e) for e in data_mentah]


def perbaruiStatusPesanan(id_pesanan: str, status: str, event: dict):
    """EIP: Canonical Data Model — normalisasi semua event ke skema seragam di Redis"""
    klienRedis.hset(f"status_pesanan:{id_pesanan}", mapping={
        "id_pesanan": id_pesanan,
        "status": status,
        "terakhir_diperbarui": datetime.utcnow().isoformat() + "Z",
        "sumber": event.get("sumber", "TIDAK_DIKETAHUI"),
        "nomor_resi": event.get("nomor_resi", ""),
        "id_pengiriman": event.get("id_pengiriman", ""),
        "id_gudang": event.get("id_gudang", ""),
        "estimated_delivery_date": str(event.get("estimated_delivery_date") or ""),
    })
    klienRedis.rpush(f"timeline_pesanan:{id_pesanan}", json.dumps({
        "status": status,
        "tipe_event": event.get("tipe_event"),
        "sumber": event.get("sumber"),
        "waktu": event.get("waktu", datetime.utcnow().isoformat() + "Z"),
        "metadata": {k: v for k, v in event.items()
                     if k not in ["tipe_event", "sumber", "waktu", "id_pesanan"]}
    }))
    klienRedis.expire(f"status_pesanan:{id_pesanan}", 60 * 60 * 24 * 30)
    klienRedis.expire(f"timeline_pesanan:{id_pesanan}", 60 * 60 * 24 * 30)


idPesanSudahDiproses = set()


def tanganiEvent(event: dict):
    """EIP: Aggregator + Canonical Data Model"""
    tipe_event = event.get("tipe_event", "")
    id_pesanan = event.get("id_pesanan", "")
    id_pesan = event.get("id_pesan", "")

    if not id_pesanan:
        return

    if id_pesan and id_pesan in idPesanSudahDiproses:
        print(f"[CTN] Pesan duplikat {id_pesan}, dilewati.")
        return
    if id_pesan:
        idPesanSudahDiproses.add(id_pesan)
        if len(idPesanSudahDiproses) > 50000:
            idPesanSudahDiproses.pop()

    # Pemetaan tipe event SLS baru + event lama
    peta_status = {
        # Event lama
        "pesanan.dibuat": "PESANAN_DITEMPATKAN",
        "gudang.dikemas": "PENGEMASAN_SELESAI",
        "pengiriman.dimanifes": "DIMANIFES",
        "pengiriman.terkirim": "TERKIRIM",
        # Event baru SLS manual
        "SHIPMENT_MANIFESTED": "DIMANIFES",
        "SHIPMENT_PICKUP": "PICKUP",
        "SHIPMENT_IN_TRANSIT": "IN TRANSIT",
        "SHIPMENT_DELIVERED": "DELIVERED",
        "SHIPMENT_CANCELLED": "CANCELLED",
        # Routing key baru
        "pengiriman.pickup": "PICKUP",
        "pengiriman.in_transit": "IN TRANSIT",
        "pengiriman.delivered": "DELIVERED",
        "pengiriman.cancelled": "CANCELLED",
    }

    status = peta_status.get(tipe_event)
    if not status:
        # Fallback: bersihkan routing key format
        status = tipe_event.upper().replace(".", "_").replace("PENGIRIMAN_", "")

    perbaruiStatusPesanan(id_pesanan, status, event)
    print(f"[CTN] Event diagregasi: {id_pesanan} → {status} ({tipe_event})")


def putaranKonsumsi():
    """Berlangganan ke semua event logistik"""
    maks_retry = 10
    for percobaan in range(maks_retry):
        try:
            parameter = pika.URLParameters(URL_RABBITMQ)
            koneksi = pika.BlockingConnection(parameter)
            saluran = koneksi.channel()

            saluran.exchange_declare(NAMA_DLX, exchange_type="topic", durable=True)
            saluran.queue_declare("q.dlq.gagal", durable=True)
            saluran.queue_bind("q.dlq.gagal", NAMA_DLX, "#")

            saluran.exchange_declare(NAMA_EXCHANGE, exchange_type="topic", durable=True)

            antrian = saluran.queue_declare(
                "q.ctn.agregator",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": NAMA_DLX,
                    "x-dead-letter-routing-key": "surat.mati"
                }
            )
            saluran.queue_bind(antrian.method.queue, NAMA_EXCHANGE, "pesanan.#")
            saluran.queue_bind(antrian.method.queue, NAMA_EXCHANGE, "gudang.#")
            saluran.queue_bind(antrian.method.queue, NAMA_EXCHANGE, "pengiriman.#")
            print("[CTN] Terhubung ke RabbitMQ, menunggu event...")

            def callback(saluran, method, props, body):
                try:
                    event = json.loads(body)
                    tanganiEvent(event)
                    saluran.basic_ack(delivery_tag=method.delivery_tag)
                except json.JSONDecodeError as e:
                    print(f"[CTN] JSON tidak valid: {e}")
                    saluran.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                except Exception as e:
                    print(f"[CTN] Kesalahan memproses event: {e}")
                    saluran.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            saluran.basic_qos(prefetch_count=10)
            saluran.basic_consume(antrian.method.queue, callback)
            saluran.start_consuming()
            return
        except Exception as e:
            print(f"[CTN] RabbitMQ belum siap, mencoba ulang ({percobaan+1}/{maks_retry})... {e}")
            time.sleep(3)


threading.Thread(target=putaranKonsumsi, daemon=True).start()


@aplikasi.route("/health")
def periksaKesehatan():
    return jsonify({"status": "AKTIF", "layanan": "CTN"})


@aplikasi.route("/api/v1/pelacakan/<id_pesanan>")
def ambilPelacakan(id_pesanan):
    status_mentah = klienRedis.hgetall(f"status_pesanan:{id_pesanan}")
    if not status_mentah:
        return jsonify({"error": "Pesanan tidak ditemukan atau belum diproses"}), 404
    timeline = ambilTimelinePesanan(id_pesanan)
    return jsonify({
        "id_pesanan": id_pesanan,
        "status_terkini": status_mentah,
        "timeline": timeline,
        "total_event": len(timeline)
    })


@aplikasi.route("/api/v1/pelacakan")
def daftarSemuaPelacakan():
    kunci_semua = klienRedis.keys("status_pesanan:*")
    hasil = []
    for kunci in kunci_semua:
        data = klienRedis.hgetall(kunci)
        if data:
            hasil.append(data)
    hasil.sort(key=lambda x: x.get("terakhir_diperbarui", ""), reverse=True)
    return jsonify({"jumlah": len(hasil), "daftar_pesanan": hasil})


@aplikasi.route("/api/v1/pelacakan/<id_pesanan>/timeline")
def ambilTimelineSaja(id_pesanan):
    timeline = ambilTimelinePesanan(id_pesanan)
    if not timeline:
        return jsonify({"error": "Timeline tidak ditemukan"}), 404
    return jsonify({"id_pesanan": id_pesanan, "timeline": timeline})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8004))
    print(f"[CTN] Berjalan di port {port}")
    aplikasi.run(host="0.0.0.0", port=port)
