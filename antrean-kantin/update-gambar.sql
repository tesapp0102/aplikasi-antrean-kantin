-- Jalankan ini di phpMyAdmin jika database sudah terlanjur di-import.
USE antrean_kantin;
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
