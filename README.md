# EDLIE — Enterprise Logistics Integration Engine

> **Event-Driven Logistics Integration** menggunakan RabbitMQ, Microservices, dan Enterprise Integration Patterns (EIP)

**Kelompok 2 — Universitas Telkom 2026**

---

## Deskripsi Sistem

EDLIE (**Enterprise Logistics Integration Engine**) adalah solusi integrasi yang menghubungkan 4 sistem enterprise logistik yang sebelumnya beroperasi sebagai *information silos* — masing-masing dengan database dan format data sendiri.

Sistem menggunakan **Event-Driven Architecture (EDA)** berbasis RabbitMQ sebagai message broker. Setiap event bisnis di satu sistem secara otomatis memicu pembaruan di sistem lain **tanpa akses database lintas-sistem**. Lapisan integrasi terdiri dari `transformer-oms-wms` (EIP: Message Translator) dan `api-gateway` (EIP: Message Router).

### Tema: Integrasi Logistik

| Sistem | Peran |
|---|---|
| **OMS** — Order Management System | Menerima pesanan pelanggan, menyimpan ke PostgreSQL, mempublikasikan event |
| **WMS** — Warehouse Management System | Memproses permintaan gudang dari format XML, mengalokasikan stok di MySQL |
| **SLS** — Shipping & Logistics System | Membuat manifest pengiriman, mengelola status pengiriman di MongoDB |
| **CTN** — Customer Tracking & Notification | Mengagregasi semua event ke timeline terpadu, disimpan di Redis |

### Enterprise Integration Patterns yang Diterapkan

| # | Pattern | Komponen | Deskripsi |
|---|---|---|---|
| 1 | **Publish-Subscribe Channel** | RabbitMQ `logistics.events` | OMS publish sekali; WMS, SLS, CTN consume secara independen |
| 2 | **Message Translator** | `transformer-oms-wms` | Konversi OMS JSON → WMS XML (heterogeneous data) |
| 3 | **Canonical Data Model** | CTN Redis store | Semua event dinormalisasi ke skema seragam |
| 4 | **Event-Driven Consumer** | WMS, SLS, CTN | Async consumption via message queue |
| 5 | **Dead Letter Channel** | `q.dlq.gagal` via `logistics.dlx` | Pesan gagal dirutekan ke DLQ setelah retry habis |
| 6 | **Idempotent Receiver** | Transformer, SLS, CTN | Mencegah pemrosesan duplikat via `id_pesan` (UUID) |
| 7 | **Message Router / API Gateway** | nginx `api-gateway` | Routing terpusat, rate limiting, single entrypoint |

---

## Daftar Sistem & Endpoint

### Ringkasan Port

| Service | URL Langsung | Via API Gateway (:8080) | Tech Stack | Database |
|---|---|---|---|---|
| OMS | `http://localhost:8001` | `http://localhost:8080/api/pesanan` | Node.js + Express | PostgreSQL |
| WMS | `http://localhost:8002` | `http://localhost:8080/api/gudang/...` | Python + FastAPI | MySQL |
| SLS | `http://localhost:8003` | `http://localhost:8080/api/pengiriman` | Node.js + Express | MongoDB |
| CTN | `http://localhost:8004` | `http://localhost:8080/api/pelacakan/...` | Python + Flask | Redis |
| API Gateway | `http://localhost:8080` | — | nginx | — |
| Dashboard UI | `http://localhost:3000` | — | React + Vite | — |
| RabbitMQ UI | `http://localhost:15672` | — | RabbitMQ | — |

---

### OMS — Order Management System (`:8001`)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/health` | Status service |
| `POST` | `/pesanan` | Buat pesanan baru + publish event ke RabbitMQ |
| `GET` | `/pesanan` | Daftar semua pesanan |
| `GET` | `/pesanan/:id_pesanan` | Detail satu pesanan |
| `GET` | `/statistik` | Ringkasan statistik pesanan |

**Via API Gateway:**

| Method | Gateway Endpoint | Target |
|---|---|---|
| `POST` | `/api/pesanan` | `OMS /pesanan` |
| `GET` | `/api/pesanan` | `OMS /pesanan` |
| `GET` | `/api/statistik` | `OMS /statistik` |
| `GET` | `/health/oms` | `OMS /health` |

---

### WMS — Warehouse Management System (`:8002`)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/health` | Status service |
| `POST` | `/api/v1/alokasi` | Terima permintaan alokasi stok (**format XML** — dipanggil oleh Transformer) |
| `GET` | `/api/v1/permintaan` | Daftar warehouse request (alias: `/api/v1/requests`) |
| `GET` | `/api/v1/inventaris` | Level stok saat ini (alias: `/api/v1/inventory`) |
| `GET` | `/api/v1/statistik` | Ringkasan statistik gudang |

**Via API Gateway** (prefix `/api/gudang` → `/api/v1`):

| Method | Gateway Endpoint | Target |
|---|---|---|
| `GET` | `/api/gudang/permintaan` | `WMS /api/v1/permintaan` |
| `GET` | `/api/gudang/inventaris` | `WMS /api/v1/inventaris` |
| `GET` | `/health/wms` | `WMS /health` |

---

### SLS — Shipping & Logistics System (`:8003`)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/health` | Status service |
| `GET` | `/api/v1/pengiriman` | Daftar semua shipment |
| `GET` | `/api/v1/pengiriman/:id_pesanan` | Cari shipment berdasarkan ID pesanan |
| `GET` | `/api/v1/pengiriman/detail/:id_pengiriman` | Detail satu shipment |
| `GET` | `/api/v1/statistik` | Statistik pengiriman per status |
| `GET` | `/api/v1/server-time` | Waktu server (untuk sinkronisasi) |

**Via API Gateway** (prefix `/api/pengiriman` → `/api/v1/pengiriman`):

| Method | Gateway Endpoint | Target |
|---|---|---|
| `GET` | `/api/pengiriman` | `SLS /api/v1/pengiriman` |
| `GET` | `/api/pengiriman/:id_pesanan` | `SLS /api/v1/pengiriman/:id_pesanan` |
| `GET` | `/api/sls/statistik` | `SLS /api/v1/statistik` |
| `GET` | `/health/sls` | `SLS /health` |

---

### CTN — Customer Tracking & Notification (`:8004`)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/health` | Status service |
| `GET` | `/api/v1/pelacakan/:id_pesanan` | Timeline pelacakan lengkap satu pesanan |
| `GET` | `/api/v1/pelacakan` | Daftar semua data pelacakan |
| `GET` | `/api/v1/pelacakan/:id_pesanan/timeline` | Hanya array timeline (tanpa status_saat_ini) |

**Via API Gateway** (prefix `/api/pelacakan` atau `/api/tracking` → `/api/v1/pelacakan`):

| Method | Gateway Endpoint | Target |
|---|---|---|
| `GET` | `/api/pelacakan/:id_pesanan` | `CTN /api/v1/pelacakan/:id_pesanan` |
| `GET` | `/api/tracking/:id_pesanan` | `CTN /api/v1/pelacakan/:id_pesanan` (alias) |
| `GET` | `/health/ctn` | `CTN /health` |

---

## Format Data Tiap Sistem

### OMS — Format JSON (PostgreSQL)

**Request buat pesanan (`POST /api/pesanan`):**
```json
{
  "pelanggan": {
    "nama": "Jane Doe",
    "email": "jane.doe@email.com"
  },
  "daftarBarang": [
    { "sku": "SKU-NEON-01", "qty": 2 }
  ],
  "totalHarga": 450000
}
```

**Skema tabel `pesanan` (PostgreSQL):**
```sql
id_pesanan        VARCHAR(50)   -- "PSN-20260602-A1B2C3"
nama_pelanggan    VARCHAR(255)
email_pelanggan   VARCHAR(255)
daftar_barang     JSONB         -- [{"sku":"SKU-NEON-01","qty":2}]
total_harga       NUMERIC(12,2)
status            VARCHAR(50)   -- DIBUAT | DIKEMAS | DIKIRIM
dibuat_pada       TIMESTAMPTZ
```

**Event yang dipublikasikan ke RabbitMQ** (routing key: `pesanan.dibuat`):
```json
{
  "id_pesanan": "PSN-20260602-A1B2C3",
  "id_pesan": "uuid-v4",
  "tipe_event": "pesanan.dibuat",
  "sumber": "OMS",
  "pelanggan": { "nama": "Jane Doe", "email": "jane.doe@email.com" },
  "daftar_barang": [{ "sku": "SKU-NEON-01", "qty": 2 }],
  "total_harga": 450000,
  "waktu": "2026-06-02T13:30:00Z"
}
```

---

### Transformer OMS→WMS — Konversi JSON ke XML

Service `transformer-oms-wms` mengonsumsi event JSON dari antrian `q.wms.masuk` dan mengkonversinya ke XML sebelum dikirim ke WMS.

**Input (JSON dari antrian):** → sama dengan event `pesanan.dibuat` di atas

**Output (XML dikirim ke `POST /api/v1/alokasi` WMS):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<permintaan_gudang>
  <id>WMS-REQ-09981</id>
  <referensi_pesanan>PSN-20260602-A1B2C3</referensi_pesanan>
  <aksi>ALOKASI_DAN_KEMAS</aksi>
  <id_pesan>uuid-v4</id_pesan>
  <lokasi_pengambilan>WH-JAKARTA-01</lokasi_pengambilan>
  <alamat_tujuan>Jl. Sukapura No. 20, Bandung</alamat_tujuan>
  <daftar_barang>
    <barang>
      <kode_sku>SKU-NEON-01</kode_sku>
      <jumlah>2</jumlah>
    </barang>
  </daftar_barang>
</permintaan_gudang>
```

---

### WMS — Format XML/JSON (MySQL)

WMS menerima permintaan dalam **format XML** (legacy) dan menyimpan ke MySQL.

**Skema tabel `permintaan_gudang` (MySQL):**
```sql
id_permintaan      VARCHAR(50)  -- "WMS-REQ-09981"
referensi_pesanan  VARCHAR(50)  -- id_pesanan dari OMS
aksi               VARCHAR(50)  -- "ALOKASI_DAN_KEMAS"
daftar_barang      JSON
status             VARCHAR(50)  -- DITERIMA | DIPROSES | SELESAI
```

**Skema tabel `inventaris` (MySQL):**
```sql
kode_sku           VARCHAR(50)  -- "SKU-NEON-01"
nama_produk        VARCHAR(255)
jumlah_stok        INT
jumlah_dialokasikan INT
```

**Stok awal yang tersedia:**

| SKU | Produk | Stok |
|---|---|---|
| `SKU-NEON-01` | Widget Neon Alpha | 100 |
| `SKU-NEON-02` | Widget Neon Beta | 50 |
| `SKU-BOLT-01` | Konektor Bolt X | 200 |

**Event yang dipublikasikan** (routing key: `gudang.dikemas`):
```json
{
  "tipe_event": "gudang.dikemas",
  "sumber": "WMS",
  "id_pesan": "uuid-v4",
  "id_pesanan": "PSN-20260602-A1B2C3",
  "id_permintaan_gudang": "WMS-REQ-09981",
  "daftar_barang": [{ "kode_sku": "SKU-NEON-01", "jumlah": 2 }],
  "id_gudang": "WH-JAKARTA-01",
  "waktu": "2026-06-02T13:31:00Z"
}
```

---

### SLS — Format JSON (MongoDB)

**Dokumen MongoDB `shipments`:**
```json
{
  "id_pengiriman": "SHIP-88291",
  "asal": "WH-JAKARTA-01",
  "alamat_tujuan": "Jl. Sukapura No. 20, Bandung",
  "detail_paket": {
    "nomor_referensi": "PSN-20260602-A1B2C3",
    "daftar_barang": [{ "kode_sku": "SKU-NEON-01", "jumlah": 2 }]
  },
  "status": "DIMANIFES",
  "awb": "AWB-00123456",
  "dibuat_pada": "2026-06-02T13:32:00Z"
}
```

**Alur status pengiriman:**
```
DIMANIFES → PICKUP → IN TRANSIT → DELIVERED
                ↘ CANCELLED (kapan saja kecuali sudah DELIVERED)
```

**Event yang dipublikasikan** (contoh routing key: `pengiriman.dimanifes`):
```json
{
  "tipe_event": "SHIPMENT_MANIFESTED",
  "sumber": "SLS",
  "id_pesan": "uuid-v4",
  "id_pesanan": "PSN-20260602-A1B2C3",
  "id_pengiriman": "SHIP-88291",
  "awb": "AWB-00123456",
  "status": "DIMANIFES",
  "waktu": "2026-06-02T13:32:00Z"
}
```

---

### CTN — Format JSON / Canonical Data Model (Redis)

CTN mengagregasi semua event dari seluruh sistem ke dalam satu timeline terpadu (EIP: Canonical Data Model).

**Response `GET /api/v1/pelacakan/:id_pesanan`:**
```json
{
  "id_pesanan": "PSN-20260602-A1B2C3",
  "status_saat_ini": {
    "id_pesanan": "PSN-20260602-A1B2C3",
    "status": "DELIVERED",
    "terakhir_diperbarui": "2026-06-02T14:00:00Z",
    "sumber": "SLS",
    "awb": "AWB-00123456"
  },
  "timeline": [
    {
      "status": "PESANAN_DITEMPATKAN",
      "tipe_event": "pesanan.dibuat",
      "sumber": "OMS",
      "waktu": "2026-06-02T13:30:00Z",
      "metadata": { "nama_pelanggan": "Jane Doe", "total_harga": 450000 }
    },
    {
      "status": "PENGEMASAN_SELESAI",
      "tipe_event": "gudang.dikemas",
      "sumber": "WMS",
      "waktu": "2026-06-02T13:31:00Z",
      "metadata": { "id_gudang": "WH-JAKARTA-01" }
    },
    {
      "status": "DIMANIFES",
      "tipe_event": "SHIPMENT_MANIFESTED",
      "sumber": "SLS",
      "waktu": "2026-06-02T13:32:00Z",
      "metadata": { "awb": "AWB-00123456" }
    }
  ],
  "total_event": 3
}
```

**Pemetaan Event → Status CTN:**

| Tipe Event (dari sistem) | Status di CTN |
|---|---|
| `pesanan.dibuat` | `PESANAN_DITEMPATKAN` |
| `gudang.dikemas` | `PENGEMASAN_SELESAI` |
| `SHIPMENT_MANIFESTED` | `DIMANIFES` |
| `SHIPMENT_PICKUP` | `PICKUP` |
| `SHIPMENT_IN_TRANSIT` | `IN TRANSIT` |
| `SHIPMENT_DELIVERED` | `DELIVERED` |
| `SHIPMENT_CANCELLED` | `CANCELLED` |

---

### RabbitMQ — Topologi Antrian

| Antrian | Exchange | Routing Key | Consumer |
|---|---|---|---|
| `q.wms.masuk` | `logistics.events` | `pesanan.dibuat` | Transformer |
| `q.sls.masuk` | `logistics.events` | `gudang.dikemas` | SLS |
| `q.ctn.agregator` | `logistics.events` | `pesanan.#`, `gudang.#`, `pengiriman.#` | CTN |
| `q.oms.updates` | `logistics.events` | `pengiriman.#`, `gudang.dikemas` | OMS |
| `q.dlq.gagal` | `logistics.dlx` | `#` | Inspeksi manual |

---

## Cara Menjalankan

### Prasyarat

- Docker Engine ≥ 24
- Docker Compose v2+ (`docker compose` bukan `docker-compose`)
- Port `3000`, `8001`–`8004`, `8080`, `5672`, `15672` tidak sedang digunakan

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/kkkhaaal/TUGAS-BESAR-IAE-KELOMPOK-2
cd TUGAS-BESAR-IAE-KELOMPOK-2
```

### Langkah 2 — Konfigurasi Environment

```bash
cp .env.example .env
```

Isi `.env` sudah siap pakai. Edit jika perlu mengganti credential:

```env
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123

OMS_DB_USER=oms_user
OMS_DB_PASS=oms_pass

WMS_DB_USER=wms_user
WMS_DB_PASS=wms_pass
WMS_DB_ROOT_PASS=wms_root

SLS_DB_USER=sls_user
SLS_DB_PASS=sls_pass

WAREHOUSE_ID=WH-JAKARTA-01
TRANSFORMER_MAX_RETRIES=3
```

### Langkah 3 — Build & Jalankan Semua Service

```bash
docker compose up --build -d
```

Perintah ini membangun semua image dan menjalankan: RabbitMQ, PostgreSQL, MySQL, MongoDB, Redis, OMS, WMS, SLS, CTN, Transformer, API Gateway, dan Dashboard.

### Langkah 4 — Verifikasi Semua Service Aktif

```bash
docker compose ps
```

Tunggu sekitar **60 detik** hingga semua service menampilkan status `healthy`:

```
NAME                      STATUS
edlie-rabbitmq            Up (healthy)
edlie-db-oms              Up (healthy)
edlie-db-wms              Up (healthy)
edlie-db-sls              Up (healthy)
edlie-db-ctn              Up (healthy)
edlie-oms-app             Up (healthy)
edlie-wms-app             Up (healthy)
edlie-sls-app             Up (healthy)
edlie-ctn-app             Up (healthy)
edlie-transformer-oms-wms Up
edlie-api-gateway         Up
edlie-dashboard           Up
```

Cek health gateway:
```bash
curl http://localhost:8080/health
# → {"status":"AKTIF","layanan":"API-Gateway"}
```

### Langkah 5 — Trigger Alur Integrasi End-to-End

**Buat pesanan baru:**
```bash
curl -X POST http://localhost:8080/api/pesanan \
  -H "Content-Type: application/json" \
  -d '{
    "pelanggan": {
      "nama": "Jane Doe",
      "email": "jane.doe@email.com"
    },
    "daftarBarang": [
      { "sku": "SKU-NEON-01", "qty": 2 }
    ],
    "totalHarga": 450000
  }'
```

Response akan berisi `id_pesanan`, misalnya `PSN-20260602-A1B2C3`.

**Tunggu ~5 detik**, lalu cek tracking:
```bash
curl http://localhost:8080/api/pelacakan/PSN-20260602-A1B2C3
```

Response harus menampilkan timeline dengan minimal 3 event: `PESANAN_DITEMPATKAN` → `PENGEMASAN_SELESAI` → `DIMANIFES`.

**Verifikasi di tiap sistem:**
```bash
# OMS — PostgreSQL
curl http://localhost:8001/pesanan

# WMS — MySQL (permintaan gudang yang masuk)
curl http://localhost:8002/api/v1/permintaan

# WMS — MySQL (stok berkurang)
curl http://localhost:8002/api/v1/inventaris

# SLS — MongoDB (manifest pengiriman)
curl http://localhost:8003/api/v1/pengiriman

# RabbitMQ Management UI
open http://localhost:15672  # admin / admin123
```

### Langkah 6 — Akses Dashboard Monitoring

Buka browser: **http://localhost:3000**

Dashboard menampilkan status semua service, alur integrasi, dan daftar pesanan secara real-time.

---

## Reliable Messaging

### Dead Letter Queue (DLQ)

Pesan yang gagal diproses setelah **3x retry** (dapat diubah via `TRANSFORMER_MAX_RETRIES`) dikirim ke antrian `q.dlq.gagal` melalui dead letter exchange `logistics.dlx`. Transformer menggunakan **exponential backoff** antar retry (2s, 4s, 6s).

Monitor DLQ: [http://localhost:15672/#/queues/%2F/q.dlq.gagal](http://localhost:15672/#/queues/%2F/q.dlq.gagal)

### Idempotency

Setiap message dilengkapi `id_pesan` (UUID v4). Pengecekan duplikat dilakukan sebelum memproses:

| Service | Mekanisme |
|---|---|
| Transformer | In-memory `Set` (maks 10.000 entri, auto-rotasi) |
| SLS | MongoDB unique index pada `detail_paket.nomor_referensi` |
| CTN | In-memory `Set` (maks 50.000 entri, auto-rotasi) |

> **Catatan:** Idempotency berbasis in-memory akan hilang saat container restart. Untuk produksi, gunakan Redis sebagai shared store.

---

## Perintah Development

```bash
# Lihat log service tertentu (live)
docker compose logs -f oms-app
docker compose logs -f transformer-oms-wms

# Restart satu service
docker compose restart wms-app

# Rebuild setelah perubahan kode
docker compose up --build oms-app -d

# Stop semua service
docker compose down

# Stop dan hapus semua volumes (reset data penuh)
docker compose down -v
```

---

## Struktur Project

```
EDLIE/
├── docker-compose.yml
├── .env
├── .env.example
├── README.md
├── apps/
│   ├── oms/                  # Node.js + Express + PostgreSQL
│   │   ├── Dockerfile
│   │   ├── init.sql
│   │   ├── openapi.yaml
│   │   ├── package.json
│   │   └── src/index.js
│   ├── wms/                  # Python + FastAPI + MySQL (XML API)
│   │   ├── Dockerfile
│   │   ├── init.sql
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── sls/                  # Node.js + Express + MongoDB
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js
│   ├── ctn/                  # Python + Flask + Redis
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── requirements.txt
│   └── dashboard/            # React + Vite + Tailwind (monitoring UI)
│       ├── Dockerfile
│       ├── nginx.conf
│       └── components/
├── integration-services/
│   ├── transformer-oms-wms/  # EIP: Message Translator (JSON→XML)
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   └── package.json
│   └── api-gateway/          # EIP: Message Router (nginx)
│       ├── Dockerfile
│       └── nginx.conf
└── docs/
    ├── api-contracts.md
    ├── openapi-oms.yaml
    ├── openapi-wms.yaml
    ├── openapi-sls.yaml
    ├── openapi-ctn.yaml
    └── EDLIE.postman_collection.json
```

---

## Team

| Nama | NIM | Kontribusi |
|---|---|---|
| Aisya Devina | 102022400050 | OMS, Docker Compose, arsitektur sistem |
| Khalifa Almaira Setia | 102022400042 | WMS, Transformer, XML integration |
| Naufal Athallah Rachman | 102022400372 | SLS, MongoDB schema |
| Queen Naomi Liklikwatil | 102022400336 | CTN, Redis, Canonical Data Model |

Program Studi S1 Sistem Informasi — Fakultas Rekayasa Industri, Universitas Telkom 2026
## Deskripsi Sistem

EDLIE mengintegrasikan 4 sistem enterprise logistik yang sebelumnya beroperasi sebagai *information silos*, menggunakan **Event-Driven Architecture (EDA)** dan **Enterprise Application Integration (EAI)** berbasis RabbitMQ.

Setiap event di satu sistem secara otomatis memicu pembaruan di sistem lain — tanpa akses database lintas-sistem.

---

## Arsitektur: Enterprise Integration Patterns (EIP)

| # | Pattern | Komponen | Deskripsi |
|---|---|---|---|
| 1 | **Publish-Subscribe Channel** | RabbitMQ `logistics.events` | OMS publish sekali; WMS, SLS, CTN consume secara independen |
| 2 | **Message Translator** | `transformer-oms-wms` | Konversi format OMS JSON → WMS XML (heterogeneous data) |
| 3 | **Canonical Data Model** | CTN Redis store | Semua event dinormalisasi ke skema seragam |
| 4 | **Event-Driven Consumer** | WMS, SLS, CTN | Async consumption via message queue |
| 5 | **Dead Letter Channel** | `q.dlq.gagal` via `logistics.dlx` | Pesan gagal dirutekan ke DLQ setelah retry habis |
| 6 | **Idempotent Receiver** | Transformer, SLS, CTN | Mencegah pemrosesan duplikat via `message_id` |
| 7 | **Message Router / API Gateway** | nginx `api-gateway` | Routing terpusat, rate limiting, single entrypoint |

---

## Stack Teknologi

| Service | Port | Tech Stack | Database | Format |
|---|---|---|---|---|
| OMS — Order Management | `8001` | Node.js + Express | PostgreSQL | JSON |
| WMS — Warehouse Mgmt | `8002` | Python + FastAPI | MySQL | **XML** (legacy) |
| SLS — Shipping & Logistics | `8003` | Node.js + Express | MongoDB | JSON |
| CTN — Customer Tracking | `8004` | Python + Flask | Redis | JSON |
| API Gateway | `8080` | nginx | — | — |
| RabbitMQ Management | `15672` | — | — | — |

> Setiap service memiliki database sendiri dan **tidak diperbolehkan** mengakses database service lain secara langsung.
> Heterogenitas data: WMS menggunakan XML, semua sistem lain JSON.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose v2+

### 1. Clone & Setup

```bash
git clone https://github.com/kkkhaaal/TUGAS-BESAR-IAE-KELOMPOK-2
cd TUGAS-BESAR-IAE-KELOMPOK-2
cp .env.example .env
```

### 2. Jalankan Semua Service

```bash
docker compose up --build -d
```

Tunggu ~60 detik hingga semua service healthy, lalu cek:

```bash
docker compose ps
```

### 3. Trigger Alur Integrasi End-to-End

```bash
curl -X POST http://localhost:8080/api/pesanan \
  -H "Content-Type: application/json" \
  -d '{
    "pelanggan": {
      "nama": "Jane Doe",
      "email": "jane.doe@email.com"
    },
    "daftarBarang": [
      { "sku": "SKU-NEON-01", "qty": 2 }
    ],
    "totalHarga": 450000
  }'
```

Simpan `order_id` dari response, lalu monitor:

```bash
# Status tracking real-time (tunggu ~5 detik)
curl http://localhost:8080/api/tracking/<ORDER_ID>

# Detail di tiap sistem
curl http://localhost:8001/pesanan               # OMS - PostgreSQL
curl http://localhost:8002/api/v1/permintaan      # WMS - MySQL
curl http://localhost:8002/api/v1/inventaris     # WMS - Stock levels
curl http://localhost:8003/api/v1/pengiriman     # SLS - MongoDB

# RabbitMQ Management UI
open http://localhost:15672  # admin / admin123
```
## Reliable Messaging

### Dead Letter Queue (DLQ)
Pesan yang gagal diproses setelah **3x retry** (configurable via `TRANSFORMER_MAX_RETRIES`) dikirim ke `q.dlq.gagal` melalui `logistics.dlx`.

Monitor DLQ: http://localhost:15672/#/queues/%2F/q.dlq.gagal

### Idempotency
Setiap message dilengkapi `message_id` (UUID). Service yang menerima melakukan pengecekan duplikat sebelum memproses:
- Transformer: in-memory Set
- SLS: MongoDB unique index pada `package_details.ref_num`
- CTN: in-memory Set dengan `message_id`

---

## Struktur Project

```
EDLIE/
├── docker-compose.yml
├── .env
├── .env.example
├── README.md
├── apps/
│   ├── oms/          # Node.js + Express + PostgreSQL
│   │   ├── Dockerfile
│   │   ├── init.sql
│   │   ├── package.json
│   │   └── src/index.js
│   ├── wms/          # Python + FastAPI + MySQL (XML API)
│   │   ├── Dockerfile
│   │   ├── init.sql
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── sls/          # Node.js + Express + MongoDB
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js
│   └── ctn/          # Python + Flask + Redis
│       ├── Dockerfile
│       ├── main.py
│       └── requirements.txt
├── integration-services/
│   ├── transformer-oms-wms/  # EIP: Message Translator (JSON→XML)
│   │   ├── Dockerfile
│   │   ├── index.js
│   │   └── package.json
│   └── api-gateway/          # EIP: API Gateway (nginx)
│       ├── Dockerfile
│       └── nginx.conf
└── docs/
    └── api-contracts.md
```

---

## Development

```bash
# Lihat logs service tertentu
docker compose logs -f oms-app
docker compose logs -f transformer-oms-wms

# Restart service
docker compose restart wms-app

# Rebuild setelah perubahan kode
docker compose up --build oms-app -d

# Stop semua
docker compose down

# Stop dan hapus volumes (reset data)
docker compose down -v
```

---

## Team

| Nama | NIM | Kontribusi |
|---|---|---|
| Aisya Devina | 102022400050 | OMS, Docker Compose, arsitektur |
| Khalifa Almaira Setia | 102022400042 | WMS, Transformer, XML integration |
| Naufal Athallah Rachman | 102022400372 | SLS, MongoDB schema |
| Queen Naomi Liklikwatil | 102022400336 | CTN, Redis, Canonical Data Model |

Program Studi S1 Sistem Informasi — Fakultas Rekayasa Industri, Universitas Telkom 2026
