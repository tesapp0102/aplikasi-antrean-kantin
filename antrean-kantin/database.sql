SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS antrean_kantin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE antrean_kantin;

CREATE TABLE IF NOT EXISTS stan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode CHAR(1) NOT NULL,
  nama VARCHAR(60) NOT NULL,
  emoji VARCHAR(8) NOT NULL DEFAULT '',
  warna CHAR(7) NOT NULL DEFAULT '#4F46E5',
  buka TINYINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(60) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','penjual') NOT NULL DEFAULT 'penjual',
  stan_id INT NULL
);

CREATE TABLE IF NOT EXISTS menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stan_id INT NOT NULL,
  nama VARCHAR(80) NOT NULL,
  kategori VARCHAR(30) NOT NULL DEFAULT 'Makanan',
  harga INT NOT NULL,
  emoji VARCHAR(8) NOT NULL DEFAULT '',
  foto VARCHAR(120) NULL,
  waktu INT NOT NULL DEFAULT 5,
  tersedia TINYINT NOT NULL DEFAULT 1,
  FOREIGN KEY (stan_id) REFERENCES stan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pesanan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stan_id INT NOT NULL,
  nomor INT NOT NULL,
  nama VARCHAR(40) NOT NULL,
  kelas VARCHAR(20) NOT NULL DEFAULT '',
  catatan VARCHAR(120) NOT NULL DEFAULT '',
  total INT NOT NULL,
  metode VARCHAR(20) NOT NULL DEFAULT 'Bayar di kantin',
  status ENUM('menunggu','dimasak','siap','selesai','batal') NOT NULL DEFAULT 'menunggu',
  waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  waktu_masak DATETIME NULL,
  waktu_siap DATETIME NULL,
  waktu_selesai DATETIME NULL,
  FOREIGN KEY (stan_id) REFERENCES stan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pesanan_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pesanan_id INT NOT NULL,
  menu_id INT NULL,
  nama VARCHAR(80) NOT NULL,
  harga INT NOT NULL,
  qty INT NOT NULL,
  FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE CASCADE
);

INSERT INTO stan (kode,nama,emoji,warna) VALUES
('A','Kantin Bu Rina','','#F97316'),
('B','Bakso Pak Joko','','#E11D48'),
('C','Es & Jus Segar','','#0891B2');

INSERT INTO menu (stan_id,nama,kategori,harga,emoji,waktu) VALUES
(1,'Nasi uduk komplit','Makanan',12000,'',6),(1,'Ayam geprek','Makanan',14000,'',8),
(1,'Mie goreng telur','Makanan',10000,'',6),(1,'Gorengan (3 pcs)','Snack',3000,'',2),(1,'Telur dadar','Makanan',4000,'',3),
(2,'Bakso urat','Makanan',13000,'',5),(2,'Mie ayam bakso','Makanan',14000,'',6),(2,'Bakso goreng','Snack',8000,'',4),(2,'Es teh manis','Minuman',3000,'',1),
(3,'Es jeruk','Minuman',5000,'',2),(3,'Jus alpukat','Minuman',10000,'',4),(3,'Es teh manis','Minuman',3000,'',1),(3,'Kopi susu dingin','Minuman',8000,'',3),(3,'Air mineral','Minuman',3000,'',1);
-- Akun staf dibuat otomatis saat login pertama (lihat api.php).

-- Gambar contoh bawaan (folder img/)
UPDATE menu SET foto='img/nasi-uduk.svg' WHERE nama='Nasi uduk komplit' AND foto IS NULL;
UPDATE menu SET foto='img/ayam-geprek.svg' WHERE nama='Ayam geprek' AND foto IS NULL;
UPDATE menu SET foto='img/mie-goreng.svg' WHERE nama='Mie goreng telur' AND foto IS NULL;
UPDATE menu SET foto='img/gorengan.svg' WHERE nama='Gorengan (3 pcs)' AND foto IS NULL;
UPDATE menu SET foto='img/telur-dadar.svg' WHERE nama='Telur dadar' AND foto IS NULL;
UPDATE menu SET foto='img/bakso-urat.svg' WHERE nama='Bakso urat' AND foto IS NULL;
UPDATE menu SET foto='img/mie-ayam-bakso.svg' WHERE nama='Mie ayam bakso' AND foto IS NULL;
UPDATE menu SET foto='img/bakso-goreng.svg' WHERE nama='Bakso goreng' AND foto IS NULL;
UPDATE menu SET foto='img/es-teh.svg' WHERE nama='Es teh manis' AND foto IS NULL;
UPDATE menu SET foto='img/es-jeruk.svg' WHERE nama='Es jeruk' AND foto IS NULL;
UPDATE menu SET foto='img/jus-alpukat.svg' WHERE nama='Jus alpukat' AND foto IS NULL;
UPDATE menu SET foto='img/kopi-susu.svg' WHERE nama='Kopi susu dingin' AND foto IS NULL;
UPDATE menu SET foto='img/air-mineral.svg' WHERE nama='Air mineral' AND foto IS NULL;
