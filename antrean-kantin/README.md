# Antrean Kantin (HTML + CSS + JavaScript + PHP + MySQL)

Masalah: murid berdesakan dan menunggu lama di kantin. Solusi: pesan dari kelas, dapat nomor antrean,
pantau status pesanan, ambil saat siap.

## Isi folder
- index.html  : kerangka halaman        - style.css : desain
- app.js      : logika di browser       - api.php   : logika server (PHP)
- config.php  : koneksi MySQL           - database.sql : tabel + 3 kantin + 14 menu contoh
- uploads/    : dibuat otomatis (foto menu)

## Cara menjalankan (XAMPP)
1. Start Apache dan MySQL di XAMPP Control Panel.
2. Salin folder ini ke C:\xampp\htdocs\ dan beri nama antrean-kantin.
3. Buka http://localhost/phpmyadmin > Import > pilih database.sql > Import.
4. Buka http://localhost/antrean-kantin/
5. Dari HP satu WiFi: ganti localhost dengan IP laptop (cek dengan ipconfig).

## Akun staf (dibuat otomatis saat login pertama)
admin / admin123 | rina / rina123 | joko / joko123 | segar / segar123
Ganti password sebelum dipakai nyata.

## Alur
Murid: Pesan > pilih kantin > pilih menu > isi nama > dapat tiket (A-001) > Antrean saya (otomatis
update tiap 5 detik, bunyi + getar saat siap).
Penjual: Dapur (pesanan baru berbunyi) > Mulai masak > Siap diambil > Sudah diambil.
Layar: tampilkan di TV kantin (tombol Layar penuh) berisi nomor dimasak dan siap diambil.

## Fitur
Banyak kantin, menu berfoto, keranjang, nomor antrean per kantin per hari, estimasi waktu tunggu,
status 4 tahap, batalkan pesanan (selama belum dimasak), tutup/buka kantin, tandai menu habis,
kelola menu + upload foto, kelola kantin (admin), laporan (pendapatan, rata-rata tunggu, terlaris,
grafik 7 hari, per kantin), unduh CSV, mode gelap otomatis.

## Ikuti rencana 30 hari (slide 23)
Minggu 1 wawancara dan daftar kebutuhan | Minggu 2 prototipe pesan + status | Minggu 3 uji coba di satu kantin |
Minggu 4 perbaikan, presentasi, versi 1.0.

## Ide pengembangan
Notifikasi WhatsApp, pembayaran QRIS sungguhan, poin loyalitas, ulasan menu, login murid (NIS).

## Gambar / foto
- Menu dan barang contoh sudah punya gambar bawaan di folder img/.
- Foto sendiri: menu Barang/Menu > Tambah atau Ubah > pilih foto (JPG/PNG/WebP).
- Kalau foto tidak mau masuk: pastikan folder uploads ada di dalam folder aplikasi dan bisa ditulis
  (di Linux/hosting: chmod 777 uploads). Pesan error akan tampil di layar.
- Kalau database sudah terlanjur di-import, jalankan update-gambar.sql di phpMyAdmin.
- Aplikasi harus dibuka lewat http://localhost/..., bukan dengan klik dua kali file index.html.

## Kalau emoji tampil "??"
Itu karena karakter database rusak saat import. Aplikasi ini sudah memakai gambar (folder img/) dan tidak bergantung
pada emoji. Jika database sudah terlanjur di-import, cukup jalankan update-gambar.sql di phpMyAdmin.
Untuk import ulang yang bersih: hapus database lama, lalu import database.sql (file sudah aman dari masalah ini).
