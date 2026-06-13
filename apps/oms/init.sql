CREATE TABLE IF NOT EXISTS pesanan (
    id SERIAL PRIMARY KEY,
    id_pesanan VARCHAR(50) UNIQUE NOT NULL,
    nama_pelanggan VARCHAR(255) NOT NULL,
    email_pelanggan VARCHAR(255) NOT NULL,
    daftar_barang JSONB NOT NULL,
    total_harga NUMERIC(12,2) NOT NULL,
    lokasi_pengambilan VARCHAR(100),
    alamat_tujuan VARCHAR(500),
    status VARCHAR(50) DEFAULT 'DIBUAT',
    dibuat_pada TIMESTAMPTZ DEFAULT NOW(),
    diperbarui_pada TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pesanan_id ON pesanan(id_pesanan);
CREATE INDEX idx_pesanan_status ON pesanan(status);
