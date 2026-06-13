CREATE TABLE IF NOT EXISTS permintaan_gudang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_permintaan VARCHAR(50) UNIQUE NOT NULL,
    referensi_pesanan VARCHAR(50) NOT NULL,
    aksi VARCHAR(50) NOT NULL,
    daftar_barang JSON NOT NULL,
    lokasi_pengambilan VARCHAR(100),
    alamat_tujuan VARCHAR(500),
    status VARCHAR(50) DEFAULT 'DITERIMA',
    dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventaris (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_sku VARCHAR(50) UNIQUE NOT NULL,
    nama_produk VARCHAR(255),
    jumlah_stok INT DEFAULT 0,
    jumlah_dialokasikan INT DEFAULT 0
);

INSERT INTO inventaris (kode_sku, nama_produk, jumlah_stok) VALUES
('SKU-NEON-01', 'Widget Neon Alpha', 100),
('SKU-NEON-02', 'Widget Neon Beta', 50),
('SKU-BOLT-01', 'Konektor Bolt X', 200)
ON DUPLICATE KEY UPDATE jumlah_stok = VALUES(jumlah_stok);
