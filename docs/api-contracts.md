# EDLIE — API Contracts & Message Schemas

## Overview: Data Heterogeneity

| System | External Format | Internal Event Format |
|---|---|---|
| OMS | JSON (REST) | JSON (Canonical) |
| WMS | XML (legacy SOAP-style) | JSON (Canonical) |
| SLS | JSON (REST) | JSON (Canonical) |
| CTN | JSON (REST) | JSON (Canonical) — Redis |

> The Transformer service performs the critical JSON→XML translation (EIP: Message Translator) before forwarding to WMS.

---

## API Gateway

**Base URL (unified entrypoint):** `http://localhost:8080`

| Route | Target | Description |
|---|---|---|
| `GET /health` | Gateway | Gateway health |
| `POST /api/pesanan` | OMS :8001 | Create order (Indonesian payload)
| `GET /api/pesanan` | OMS :8001 | List orders |
| `GET /api/warehouse/requests` | WMS :8002 | List WMS requests |
| `GET /api/warehouse/inventory` | WMS :8002 | View inventory |
| `GET /api/shipments` | SLS :8003 | List shipments |
| `GET /api/tracking/:order_id` | CTN :8004 | Get tracking info |

---

## OMS — Order Management System
**Direct URL:** `http://localhost:8001`

### POST /pesanan
Creates order and publishes `pesanan.dibuat` event (OMS uses Indonesian field names).

**Request (JSON):**
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

**Response (201):**
```json
{
  "pesan": "Pesanan berhasil dibuat dan event dipublikasikan",
  "id_pesanan": "PSN-20260602-A1B2C3",
  "data": { ... }
}
```

**Event Published to `logistics.events` (routing key: `pesanan.dibuat`):**
```json
{
  "id_pesanan": "PSN-20260602-A1B2C3",
  "pelanggan": { "nama": "Jane Doe", "email": "jane.doe@email.com" },
  "daftar_barang": [{ "sku": "SKU-NEON-01", "qty": 2 }],
  "total_harga": 450000,
  "waktu": "2026-06-02T13:30:00Z",
  "tipe_event": "pesanan.dibuat",
  "sumber": "OMS",
  "id_pesan": "uuid-v4"
}
```

---

## Transformer (Integration Layer)
**EIP: Message Translator** — Internal service, no REST API.

Consumes JSON from `q.wms.masuk`, transforms, POSTs XML to WMS.

**Input (JSON from queue):** → same as `order.created` event above

**Output (XML POST to WMS) — after transformation:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<permintaan_gudang>
  <id>WMS-REQ-09981</id>
  <referensi_pesanan>PSN-20260602-A1B2C3</referensi_pesanan>
  <aksi>ALOKASI_DAN_KEMAS</aksi>
  <id_pesan>uuid-v4</id_pesan>
  <lokasi_pengambilan>WH-JAKARTA-01</lokasi_pengambilan>
  <alamat_tujuan>Jl. Sudirman No. 12, Jakarta Selatan</alamat_tujuan>
  <daftar_barang>
    <barang>
      <kode_sku>SKU-NEON-01</kode_sku>
      <jumlah>2</jumlah>
    </barang>
  </daftar_barang>
</permintaan_gudang>
```

---

## WMS — Warehouse Management System
**Direct URL:** `http://localhost:8002`

### POST /api/v1/alokasi *(internal - called by Transformer)*
Accepts XML payload.

**Event Published (routing key: `gudang.dikemas`):**
```json
{
  "tipe_event": "gudang.dikemas",
  "sumber": "WMS",
  "id_pesanan": "PSN-20260602-A1B2C3",
  "id_permintaan_gudang": "WMS-REQ-09981",
  "daftar_barang": [{ "sku": "SKU-NEON-01", "qty": 2 }],
  "id_gudang": "WH-JAKARTA-01",
  "alamat_tujuan": "Jl. Sudirman No. 12, Jakarta Selatan",
  "waktu": "2026-06-02T13:31:00Z",
  "id_pesan": "uuid-v4"
}
```

### GET /api/v1/inventaris
Returns current inventory levels.

### GET /api/v1/permintaan
Returns warehouse processing history.

---

## SLS — Shipping & Logistics System
**Direct URL:** `http://localhost:8003`

Consumes `gudang.dikemas` from `q.sls.masuk`.

**MongoDB Document (SLS-specific schema — different from WMS MySQL schema):**
```json
{
  "id_pengiriman": "KIRIM-88291",
  "asal": "WH-JAKARTA-01",
  "alamat_tujuan": "Jl. Sukapura No. 20, Bandung",
  "detail_paket": {
    "berat_kg": 1.5,
    "nomor_referensi": "PSN-20260602-A1B2C3",
    "daftar_barang": [{ "sku": "SKU-NEON-01", "qty": 2 }]
  },
  "status": "DIMANIFES",
  "nomor_resi": "RESI-00123456",
  "dibuat_pada": "2026-06-02T13:32:00Z"
}
```

**Event Published (routing key: `pengiriman.dimanifes`):**
```json
{
  "tipe_event": "SHIPMENT_MANIFESTED",
  "routing_key": "pengiriman.dimanifes",
  "sumber": "SLS",
  "id_pesanan": "PSN-20260602-A1B2C3",
  "id_pengiriman": "KIRIM-88291",
  "nomor_resi": "RESI-00123456",
  "status": "DIMANIFES",
  "waktu": "2026-06-02T13:32:00Z",
  "id_pesan": "uuid-v4"
}
```

---

## CTN — Customer Tracking & Notification
**Direct URL:** `http://localhost:8004`

### GET /api/v1/pelacakan/:id_pesanan
Returns canonical tracking view (EIP: Canonical Data Model).

**Response:**
```json
{
  "order_id": "ORD-20260602-A1B2C3",
  "current_status": {
    "order_id": "ORD-20260602-A1B2C3",
    "status": "SHIPPED",
    "last_updated": "2026-06-02T13:32:00Z",
    "source": "SLS",
    "awb": "AWB-00123456",
    "shipment_id": "SHIP-88291"
  },
  "timeline": [
    {
      "status": "ORDER_PLACED",
      "event_type": "order.created",
      "source": "OMS",
      "timestamp": "2026-06-02T13:30:00Z",
      "metadata": { "customer": { "name": "Jane Doe" }, "total_price": 450000 }
    },
    {
      "status": "PACKING_COMPLETE",
      "event_type": "warehouse.packed",
      "source": "WMS",
      "timestamp": "2026-06-02T13:31:00Z",
      "metadata": { "warehouse_id": "WH-JAKARTA-01" }
    },
    {
      "status": "SHIPPED",
      "event_type": "shipment.manifested",
      "source": "SLS",
      "timestamp": "2026-06-02T13:32:00Z",
      "metadata": { "awb": "AWB-00123456", "shipment_id": "SHIP-88291" }
    }
  ],
  "total_events": 3
}
```

---

## RabbitMQ Message Broker

| Exchange | Type | Description |
|---|---|---|
| `logistics.events` | `topic` | Main event bus |
| `logistics.dlx` | `topic` | Dead Letter Exchange |

| Queue | Exchange | Routing Key(s) | Consumer |
|---|---|---|---|
| `q.wms.masuk` | `logistics.events` | `pesanan.dibuat` | Transformer |
| `q.sls.masuk` | `logistics.events` | `gudang.dikemas` | SLS |
| `q.ctn.aggregator` | `logistics.events` | `pesanan.#`, `gudang.#`, `pengiriman.#` | CTN |
| `q.dlq.gagal` | `logistics.dlx` | `#` | Manual inspection |

### Dead Letter Queue (DLQ)
Messages that fail after all retries (or cannot be parsed) are routed to `q.dlq.gagal` via `logistics.dlx`.
Monitor via RabbitMQ Management UI: http://localhost:15672/#/queues/%2F/q.dlq.gagal

### Idempotency Limitation
Transformer idempotency uses an in-memory `Set` of processed message IDs. This is sufficient for the demo flow, but the state is lost if the container restarts. For production, this should be moved to persistent shared storage such as Redis.
