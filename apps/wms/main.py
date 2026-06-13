"""
WMS - Sistem Manajemen Gudang (Warehouse Management System)
EIP: Message Translator (konsumen XML), Event-Driven Consumer, Idempotent Receiver
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import aio_pika
import json

aplikasi = FastAPI(title="WMS - Sistem Manajemen Gudang", version="1.0.0")

def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"[WMS] Required environment variable {name} is not set.", file=sys.stderr)
        sys.exit(1)
    return value

URL_MYSQL = require_env("MYSQL_URL")
URL_RABBITMQ = require_env("RABBITMQ_URL")
NAMA_EXCHANGE = "logistics.events"
NAMA_DLX = "logistics.dlx"
ID_GUDANG = os.getenv("WAREHOUSE_ID", "WH-JAKARTA-01")

koneksiDb = create_engine(URL_MYSQL, pool_pre_ping=True)

# Aktifkan CORS untuk dashboard frontend
aplikasi.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uvicorn expects an object named `app` by default
app = aplikasi

saluranPesan = None


async def hubungkanRabbitMQ(maksRetry=10):
    global saluranPesan
    for percobaan in range(maksRetry):
        try:
            koneksi = await aio_pika.connect_robust(URL_RABBITMQ)
            saluranPesan = await koneksi.channel()
            exchange = await saluranPesan.declare_exchange(
                NAMA_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
            )
            print("[WMS] Terhubung ke RabbitMQ")
            return exchange
        except Exception as e:
            print(f"[WMS] RabbitMQ belum siap, mencoba ulang ({percobaan+1}/{maksRetry})...")
            await asyncio.sleep(3)
    raise Exception("[WMS] Gagal terhubung ke RabbitMQ")


@aplikasi.on_event("startup")
async def jalankanAplikasi():
    aplikasi.state.exchange = await hubungkanRabbitMQ()


@aplikasi.get("/health")
def periksaKesehatan():
    return {"status": "AKTIF", "layanan": "WMS"}


# POST /api/v1/alokasi - Menerima XML dari Transformer (EIP: Message Translator konsumen)
@aplikasi.post("/api/v1/alokasi")
async def alokasiStok(request: Request):
    from lxml import etree

    isiBody = await request.body()

    # Parsing payload XML (format heterogen - XML legacy dari transformer)
    try:
        akarXml = etree.fromstring(isiBody)
        idPermintaan = akarXml.findtext("id") or f"WMS-REQ-{uuid.uuid4().hex[:6].upper()}"
        referensiPesanan = akarXml.findtext("referensi_pesanan")
        aksi = akarXml.findtext("aksi")
        idPesan = akarXml.findtext("id_pesan") or idPermintaan
        lokasiPengambilan = akarXml.findtext("lokasi_pengambilan") or ""
        alamatTujuan = akarXml.findtext("alamat_tujuan") or ""
        daftarBarang = []
        for elemenBarang in akarXml.findall(".//barang"):
            daftarBarang.append({
                "kode_sku": elemenBarang.findtext("kode_sku"),
                "jumlah": int(elemenBarang.findtext("jumlah", 0))
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"XML tidak valid: {str(e)}")

    if not referensiPesanan:
        raise HTTPException(status_code=400, detail="referensi_pesanan tidak ditemukan dalam XML")

    # EIP: Idempotent Receiver - cek apakah sudah diproses
    with koneksiDb.connect() as conn:
        sudahDiproses = conn.execute(
            text("SELECT status FROM permintaan_gudang WHERE referensi_pesanan = :ref AND status = 'DIKEMAS'"),
            {"ref": referensiPesanan}
        ).fetchone()
        if sudahDiproses:
            print(f"[WMS] Lewati idempoten: {referensiPesanan} sudah berstatus DIKEMAS")
            return {"status": "DIKEMAS", "id_permintaan": idPermintaan, "referensi_pesanan": referensiPesanan, "idempoten": True}

    # Simpan permintaan gudang
    with koneksiDb.connect() as conn:
        conn.execute(text(
            "INSERT INTO permintaan_gudang (id_permintaan, referensi_pesanan, aksi, daftar_barang, lokasi_pengambilan, alamat_tujuan, status) "
            "VALUES (:id, :ref, :aksi, :barang, :lokasi, :alamat, 'DIPROSES') "
            "ON DUPLICATE KEY UPDATE status='DIPROSES'"
        ), {"id": idPermintaan, "ref": referensiPesanan, "aksi": aksi, "barang": json.dumps(daftarBarang), "lokasi": lokasiPengambilan, "alamat": alamatTujuan})
        conn.commit()

    print(f"[WMS] Memproses alokasi untuk {referensiPesanan} → {aksi}")

    # Simulasi alokasi stok dan pengemasan
    with koneksiDb.connect() as conn:
        for barang in daftarBarang:
            conn.execute(text(
                "UPDATE inventaris SET jumlah_dialokasikan = jumlah_dialokasikan + :jml "
                "WHERE kode_sku = :sku"
            ), {"jml": barang["jumlah"], "sku": barang["kode_sku"]})
        conn.execute(text(
            "UPDATE permintaan_gudang SET status='DIKEMAS' WHERE id_permintaan=:id"
        ), {"id": idPermintaan})
        conn.commit()

    # Publikasikan event gudang.dikemas (EIP: Canonical Data Model)
    if saluranPesan:
        eventGudang = {
            "tipe_event": "gudang.dikemas",
            "sumber": "WMS",
            "id_pesanan": referensiPesanan,
            "id_permintaan_gudang": idPermintaan,
            "daftar_barang": daftarBarang,
            "id_gudang": lokasiPengambilan or ID_GUDANG,
            "alamat_tujuan": alamatTujuan,
            "waktu": datetime.utcnow().isoformat() + "Z",
            "id_pesan": str(uuid.uuid4())
        }
        exchange = aplikasi.state.exchange
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(eventGudang).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=eventGudang["id_pesan"]
            ),
            routing_key="gudang.dikemas"
        )
        print(f"[WMS] Dipublikasikan gudang.dikemas untuk {referensiPesanan}")

    return {"status": "DIKEMAS", "id_permintaan": idPermintaan, "referensi_pesanan": referensiPesanan}


@aplikasi.get("/api/v1/permintaan")
def daftarPermintaan():
    with koneksiDb.connect() as conn:
        baris = conn.execute(text("SELECT * FROM permintaan_gudang ORDER BY dibuat_pada DESC")).fetchall()
    return [dict(b._mapping) for b in baris]


@aplikasi.get("/api/v1/inventaris")
def daftarInventaris():
    with koneksiDb.connect() as conn:
        baris = conn.execute(text("SELECT * FROM inventaris")).fetchall()
    return [dict(b._mapping) for b in baris]


@aplikasi.get("/api/v1/statistik")
def statistikGudang():
    with koneksiDb.connect() as conn:
        totalPermintaan = conn.execute(text("SELECT COUNT(*) as total FROM permintaan_gudang")).fetchone()
        totalDikemas = conn.execute(
            text("SELECT COUNT(*) as total FROM permintaan_gudang WHERE status='DIKEMAS'")
        ).fetchone()
        totalSku = conn.execute(text("SELECT COUNT(*) as total FROM inventaris")).fetchone()
    return {
        "total_permintaan": totalPermintaan[0],
        "total_dikemas": totalDikemas[0],
        "total_sku": totalSku[0]
    }


# Alias routes untuk backward compatibility dengan README
@aplikasi.get("/api/v1/requests")
def daftarPermintaanAlias():
    return daftarPermintaan()

@aplikasi.get("/api/v1/inventory")
def daftarInventarisAlias():
    return daftarInventaris()

