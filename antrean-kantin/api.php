<?php
// API Antrean Kantin. Murid tidak perlu login; staf (penjual/admin) wajib login.
require __DIR__ . '/config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$aksi = $_GET['aksi'] ?? '';
$in = json_decode(file_get_contents('php://input'), true) ?: [];

function keluar($d, int $k = 200) { http_response_code($k); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function butuh(): array { if (empty($_SESSION['u'])) keluar(['error' => 'Belum masuk'], 401); return $_SESSION['u']; }
function admin(): void { if (butuh()['role'] !== 'admin') keluar(['error' => 'Hanya admin'], 403); }
// kantin yang sedang dikelola: penjual = kantinnya sendiri, admin = pilihan (0 = semua)
function kerja(): int { $u = butuh(); return $u['role'] === 'penjual' ? (int)$u['stan_id'] : (int)($_GET['stan_id'] ?? $GLOBALS['in']['stan_id'] ?? 0); }
function milik(PDO $pdo, string $tabel, int $id): int {
    $s = $pdo->prepare("SELECT stan_id FROM $tabel WHERE id=?"); $s->execute([$id]); $sid = $s->fetchColumn();
    if ($sid === false) keluar(['error' => 'Data tidak ditemukan'], 404);
    $u = butuh();
    if ($u['role'] === 'penjual' && (int)$sid !== (int)$u['stan_id']) keluar(['error' => 'Bukan kantin kamu'], 403);
    return (int)$sid;
}
function simpanFoto(string $d): ?string {
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,#', $d, $m)) throw new Exception('Format foto tidak didukung. Pakai JPG, PNG, atau WebP');
    $bin = base64_decode(substr($d, strpos($d, ',') + 1), true);
    if (!$bin) throw new Exception('Foto rusak, coba pilih foto lain');
    if (strlen($bin) > 1500000) throw new Exception('Foto terlalu besar');
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception('Folder uploads belum ada. Buat folder bernama uploads di dalam folder aplikasi');
    if (!is_writable($dir)) throw new Exception('Folder uploads tidak bisa ditulis. Beri izin tulis (chmod 777 uploads)');
    $f = 'uploads/' . bin2hex(random_bytes(8)) . '.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]);
    if (file_put_contents(__DIR__ . '/' . $f, $bin) === false) throw new Exception('Gagal menyimpan foto ke folder uploads');
    return $f;
}
function ambilPesanan(PDO $pdo, int $id): array {
    $s = $pdo->prepare("SELECT p.*, UNIX_TIMESTAMP(p.waktu)*1000 AS t, UNIX_TIMESTAMP(p.waktu_masak)*1000 AS tm, s.kode, s.nama AS stan, s.emoji AS semoji, s.warna FROM pesanan p JOIN stan s ON s.id=p.stan_id WHERE p.id=?");
    $s->execute([$id]); $p = $s->fetch();
    $d = $pdo->prepare("SELECT i.nama AS n, i.harga AS h, i.qty AS q, COALESCE(m.waktu,5) AS w FROM pesanan_item i LEFT JOIN menu m ON m.id=i.menu_id WHERE i.pesanan_id=?");
    $d->execute([$id]); $items = $d->fetchAll();
    $ahead = 0; $est = 0;
    if (in_array($p['status'], ['menunggu', 'dimasak'])) {
        $a = $pdo->prepare("SELECT COUNT(*) FROM pesanan WHERE stan_id=? AND DATE(waktu)=DATE(?) AND status IN ('menunggu','dimasak') AND id<?");
        $a->execute([$p['stan_id'], $p['waktu'], $id]); $ahead = (int)$a->fetchColumn();
        $w = max(array_map(fn($i) => (int)$i['w'], $items) ?: [3]);
        $est = $p['status'] === 'dimasak' ? max(1, $w - (int)floor((time() * 1000 - (float)$p['tm']) / 60000)) : $ahead * 3 + $w;
    }
    return ['id' => (int)$p['id'], 'kode' => $p['kode'] . sprintf('%03d', $p['nomor']), 'stan' => $p['stan'], 'sid' => (int)$p['stan_id'], 'semoji' => $p['semoji'], 'warna' => $p['warna'],
        'nama' => $p['nama'], 'kelas' => $p['kelas'], 'catatan' => $p['catatan'], 'total' => (int)$p['total'], 'metode' => $p['metode'], 'status' => $p['status'], 't' => (float)$p['t'],
        'ahead' => $ahead, 'est' => $est,
        'items' => array_map(fn($i) => ['n' => $i['n'], 'h' => (int)$i['h'], 'q' => (int)$i['q']], $items)];
}

try {
    $pdo = db();
    switch ($aksi) {
        case 'login':
            if (!(int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn()) {
                $ins = $pdo->prepare("INSERT INTO users (username,nama,password,role,stan_id) VALUES (?,?,?,?,?)");
                $ins->execute(['admin', 'Admin Sekolah', password_hash('admin123', PASSWORD_DEFAULT), 'admin', null]);
                $ins->execute(['rina', 'Bu Rina', password_hash('rina123', PASSWORD_DEFAULT), 'penjual', 1]);
                $ins->execute(['joko', 'Pak Joko', password_hash('joko123', PASSWORD_DEFAULT), 'penjual', 2]);
                $ins->execute(['segar', 'Es & Jus Segar', password_hash('segar123', PASSWORD_DEFAULT), 'penjual', 3]);
            }
            $s = $pdo->prepare("SELECT * FROM users WHERE username=?"); $s->execute([trim($in['u'] ?? '')]); $u = $s->fetch();
            if (!$u || !password_verify($in['p'] ?? '', $u['password'])) keluar(['error' => 'Nama pengguna atau kata sandi salah'], 422);
            session_regenerate_id(true);
            $_SESSION['u'] = ['nama' => $u['nama'], 'role' => $u['role'], 'stan_id' => $u['stan_id'] ? (int)$u['stan_id'] : null];
            keluar($_SESSION['u']);

        case 'logout': $_SESSION = []; session_destroy(); keluar(['ok' => true]);
        case 'me': keluar(['u' => $_SESSION['u'] ?? null]);

        case 'katalog':
            $st = $pdo->query("SELECT s.id, s.kode, s.nama, s.emoji, s.warna, s.buka, (SELECT COUNT(*) FROM pesanan p WHERE p.stan_id=s.id AND DATE(p.waktu)=CURDATE() AND p.status IN ('menunggu','dimasak')) AS antre FROM stan s ORDER BY s.id")->fetchAll();
            $mn = $pdo->query("SELECT id, stan_id, nama, kategori, harga, emoji, foto, waktu, tersedia FROM menu ORDER BY kategori, nama")->fetchAll();
            foreach ($st as &$s) {
                foreach (['id', 'buka', 'antre'] as $f) $s[$f] = (int)$s[$f];
                $s['menu'] = array_values(array_map(fn($m) => ['id' => (int)$m['id'], 'nama' => $m['nama'], 'kategori' => $m['kategori'], 'harga' => (int)$m['harga'], 'emoji' => $m['emoji'], 'foto' => $m['foto'], 'waktu' => (int)$m['waktu'], 'tersedia' => (int)$m['tersedia']], array_filter($mn, fn($m) => (int)$m['stan_id'] === $s['id'])));
            }
            keluar(['stans' => $st]);

        case 'pesan':
            $nama = trim($in['nama'] ?? ''); $items = $in['items'] ?? [];
            if ($nama === '' || mb_strlen($nama) > 40) keluar(['error' => 'Isi namamu dulu ya'], 422);
            if (!$items || count($items) > 15) keluar(['error' => 'Pilih menu dulu'], 422);
            $s = $pdo->prepare("SELECT * FROM stan WHERE id=?"); $s->execute([(int)($in['stan_id'] ?? 0)]); $stan = $s->fetch();
            if (!$stan) keluar(['error' => 'Kantin tidak ditemukan'], 404);
            if (!$stan['buka']) keluar(['error' => $stan['nama'] . ' sedang tutup'], 422);
            $pdo->beginTransaction(); $total = 0; $baris = [];
            foreach ($items as $it) {
                $q = min(20, max(1, (int)($it['q'] ?? 0)));
                $m = $pdo->prepare("SELECT * FROM menu WHERE id=? AND stan_id=?"); $m->execute([(int)($it['id'] ?? 0), $stan['id']]); $m = $m->fetch();
                if (!$m) throw new Exception('Menu tidak ditemukan');
                if (!$m['tersedia']) throw new Exception($m['nama'] . ' sudah habis');
                $total += $m['harga'] * $q; $baris[] = [$m, $q];
            }
            $n = $pdo->prepare("SELECT COALESCE(MAX(nomor),0)+1 FROM pesanan WHERE stan_id=? AND DATE(waktu)=CURDATE() FOR UPDATE"); $n->execute([$stan['id']]);
            $pdo->prepare("INSERT INTO pesanan (stan_id,nomor,nama,kelas,catatan,total,metode) VALUES (?,?,?,?,?,?,?)")
                ->execute([$stan['id'], (int)$n->fetchColumn(), $nama, mb_substr(trim($in['kelas'] ?? ''), 0, 20), mb_substr(trim($in['catatan'] ?? ''), 0, 120), $total, ($in['metode'] ?? '') === 'QRIS' ? 'QRIS' : 'Bayar di kantin']);
            $pid = (int)$pdo->lastInsertId();
            foreach ($baris as [$m, $q]) $pdo->prepare("INSERT INTO pesanan_item (pesanan_id,menu_id,nama,harga,qty) VALUES (?,?,?,?,?)")->execute([$pid, $m['id'], $m['nama'], $m['harga'], $q]);
            $pdo->commit();
            keluar(ambilPesanan($pdo, $pid));

        case 'status':
            $ids = array_slice(array_filter(array_map('intval', explode(',', $_GET['ids'] ?? ''))), 0, 15);
            $o = []; foreach ($ids as $i) { $c = $pdo->prepare("SELECT COUNT(*) FROM pesanan WHERE id=?"); $c->execute([$i]); if ($c->fetchColumn()) $o[] = ambilPesanan($pdo, $i); }
            keluar(['pesanan' => $o]);

        case 'batalkan':
            $s = $pdo->prepare("UPDATE pesanan SET status='batal' WHERE id=? AND status='menunggu'"); $s->execute([(int)($in['id'] ?? 0)]);
            if (!$s->rowCount()) keluar(['error' => 'Pesanan sudah diproses, tidak bisa dibatalkan'], 422);
            keluar(['ok' => true]);

        case 'layar':
            $st = $pdo->query("SELECT id, kode, nama, emoji, warna, buka FROM stan ORDER BY id")->fetchAll();
            foreach ($st as &$s) {
                $q = $pdo->prepare("SELECT status, CONCAT(?, LPAD(nomor,3,'0')) AS kode FROM pesanan WHERE stan_id=? AND DATE(waktu)=CURDATE() AND status IN ('menunggu','dimasak','siap') ORDER BY id");
                $q->execute([$s['kode'], $s['id']]); $r = $q->fetchAll();
                $s['dimasak'] = array_values(array_column(array_filter($r, fn($x) => $x['status'] === 'dimasak'), 'kode'));
                $s['siap'] = array_slice(array_values(array_column(array_filter($r, fn($x) => $x['status'] === 'siap'), 'kode')), -12);
                $s['menunggu'] = count(array_filter($r, fn($x) => $x['status'] === 'menunggu'));
            }
            keluar(['stans' => $st]);

        case 'dapur':
            $sid = kerja();
            if (!$sid) $sid = (int)$pdo->query("SELECT MIN(id) FROM stan")->fetchColumn();
            $st = $pdo->prepare("SELECT id,kode,nama,emoji,warna,buka FROM stan WHERE id=?"); $st->execute([$sid]); $stan = $st->fetch();
            $ids = $pdo->prepare("SELECT id FROM pesanan WHERE stan_id=? AND DATE(waktu)=CURDATE() AND status IN ('menunggu','dimasak','siap') ORDER BY id"); $ids->execute([$sid]);
            $akt = array_map(fn($i) => ambilPesanan($pdo, (int)$i), $ids->fetchAll(PDO::FETCH_COLUMN));
            $r = $pdo->prepare("SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM pesanan WHERE stan_id=? AND DATE(waktu)=CURDATE() AND status<>'batal'"); $r->execute([$sid]); $r = $r->fetch();
            $w = $pdo->prepare("SELECT AVG(TIMESTAMPDIFF(MINUTE,waktu,waktu_siap)) FROM pesanan WHERE stan_id=? AND DATE(waktu)=CURDATE() AND waktu_siap IS NOT NULL"); $w->execute([$sid]);
            keluar(['stan' => $stan, 'orders' => $akt, 'hari' => (int)$r['c'], 'omzet' => (int)$r['t'], 'tunggu' => round((float)$w->fetchColumn(), 1)]);

        case 'ubah':
            $id = (int)($in['id'] ?? 0); milik($pdo, 'pesanan', $id);
            $cur = $pdo->prepare("SELECT status FROM pesanan WHERE id=?"); $cur->execute([$id]); $cur = $cur->fetchColumn();
            $ok = ['menunggu' => ['dimasak', 'batal'], 'dimasak' => ['siap', 'batal'], 'siap' => ['selesai', 'batal']];
            $to = $in['status'] ?? '';
            if (!in_array($to, $ok[$cur] ?? [])) keluar(['error' => 'Perubahan status tidak valid'], 422);
            $kol = ['dimasak' => ', waktu_masak=NOW()', 'siap' => ', waktu_siap=NOW()', 'selesai' => ', waktu_selesai=NOW()', 'batal' => ''][$to];
            $pdo->prepare("UPDATE pesanan SET status=? $kol WHERE id=?")->execute([$to, $id]);
            keluar(['ok' => true]);

        case 'buka':
            $sid = kerja(); if (!$sid) keluar(['error' => 'Pilih kantin'], 422);
            $pdo->prepare("UPDATE stan SET buka=1-buka WHERE id=?")->execute([$sid]); keluar(['ok' => true]);

        case 'toggle':
            $id = (int)($in['id'] ?? 0); milik($pdo, 'menu', $id);
            $pdo->prepare("UPDATE menu SET tersedia=1-tersedia WHERE id=?")->execute([$id]); keluar(['ok' => true]);

        case 'simpan_menu':
            $u = butuh(); $nama = trim($in['nama'] ?? ''); $harga = (int)($in['harga'] ?? 0);
            if ($nama === '' || $harga <= 0) keluar(['error' => 'Nama dan harga wajib diisi'], 422);
            $foto = !empty($in['foto_data']) ? simpanFoto($in['foto_data']) : null;
            $v = [$nama, $in['kategori'] ?? 'Makanan', $harga, mb_substr($in['emoji'] ?? '🍽️', 0, 8), max(1, (int)($in['waktu'] ?? 5)), $foto];
            if (!empty($in['id'])) {
                milik($pdo, 'menu', (int)$in['id']); $v[] = (int)$in['id'];
                $pdo->prepare("UPDATE menu SET nama=?, kategori=?, harga=?, emoji=?, waktu=?, foto=COALESCE(?,foto) WHERE id=?")->execute($v);
            } else {
                $sid = $u['role'] === 'penjual' ? (int)$u['stan_id'] : (int)($in['stan_id'] ?? 0);
                if (!$sid) keluar(['error' => 'Pilih kantin dulu'], 422);
                array_unshift($v, $sid);
                $pdo->prepare("INSERT INTO menu (stan_id,nama,kategori,harga,emoji,waktu,foto) VALUES (?,?,?,?,?,?,?)")->execute($v);
            }
            keluar(['ok' => true]);

        case 'hapus_menu':
            $id = (int)($in['id'] ?? 0); milik($pdo, 'menu', $id);
            $pdo->prepare("DELETE FROM menu WHERE id=?")->execute([$id]); keluar(['ok' => true]);

        case 'simpan_stan':
            admin(); $nama = trim($in['nama'] ?? ''); $kode = strtoupper(substr(trim($in['kode'] ?? ''), 0, 1)); $w = $in['warna'] ?? '#4F46E5';
            if ($nama === '' || !preg_match('/^[A-Z]$/', $kode) || !preg_match('/^#[0-9a-fA-F]{6}$/', $w)) keluar(['error' => 'Isi nama, kode huruf A-Z, dan warna'], 422);
            $v = [$kode, $nama, mb_substr($in['emoji'] ?? '🍽️', 0, 8), $w];
            if (!empty($in['id'])) { $v[] = (int)$in['id']; $pdo->prepare("UPDATE stan SET kode=?, nama=?, emoji=?, warna=? WHERE id=?")->execute($v); }
            else $pdo->prepare("INSERT INTO stan (kode,nama,emoji,warna) VALUES (?,?,?,?)")->execute($v);
            keluar(['ok' => true]);

        case 'laporan':
            $u = butuh(); $sid = $u['role'] === 'penjual' ? (int)$u['stan_id'] : (int)($_GET['stan_id'] ?? 0);
            $w = "(?=0 OR p.stan_id=?)";
            $q = function (string $sql) use ($pdo, $sid) { $s = $pdo->prepare($sql); $s->execute([$sid, $sid]); return $s; };
            $h = $q("SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM pesanan p WHERE DATE(waktu)=CURDATE() AND status<>'batal' AND $w")->fetch();
            $b = (int)$q("SELECT COUNT(*) FROM pesanan p WHERE DATE(waktu)=CURDATE() AND status='batal' AND $w")->fetchColumn();
            $tg = round((float)$q("SELECT AVG(TIMESTAMPDIFF(MINUTE,waktu,waktu_siap)) FROM pesanan p WHERE DATE(waktu)=CURDATE() AND waktu_siap IS NOT NULL AND $w")->fetchColumn(), 1);
            $top = $q("SELECT i.nama AS n, SUM(i.qty) AS q FROM pesanan_item i JOIN pesanan p ON p.id=i.pesanan_id WHERE DATE(p.waktu)=CURDATE() AND p.status<>'batal' AND $w GROUP BY i.nama ORDER BY q DESC LIMIT 5")->fetchAll();
            $mg = $q("SELECT DATE(waktu) AS d, COUNT(*) AS c, SUM(total) AS t FROM pesanan p WHERE waktu >= CURDATE() - INTERVAL 6 DAY AND status<>'batal' AND $w GROUP BY DATE(waktu)")->fetchAll();
            $per = $u['role'] === 'admin' ? $pdo->query("SELECT s.nama, s.emoji, COUNT(p.id) AS c, COALESCE(SUM(p.total),0) AS t FROM stan s LEFT JOIN pesanan p ON p.stan_id=s.id AND DATE(p.waktu)=CURDATE() AND p.status<>'batal' GROUP BY s.id ORDER BY s.id")->fetchAll() : [];
            keluar(['hari' => (int)$h['c'], 'omzet' => (int)$h['t'], 'batal' => $b, 'tunggu' => $tg, 'top' => $top, 'minggu' => $mg, 'per' => $per]);

        case 'csv':
            $u = butuh(); $sid = $u['role'] === 'penjual' ? (int)$u['stan_id'] : 0;
            header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="pesanan-kantin.csv"');
            $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
            fputcsv($o, ['Kode', 'Waktu', 'Kantin', 'Nama', 'Kelas', 'Status', 'Menu', 'Qty', 'Harga', 'Total pesanan']);
            $s = $pdo->prepare("SELECT CONCAT(s.kode,LPAD(p.nomor,3,'0')), p.waktu, s.nama, p.nama, p.kelas, p.status, i.nama, i.qty, i.harga, p.total FROM pesanan p JOIN stan s ON s.id=p.stan_id JOIN pesanan_item i ON i.pesanan_id=p.id WHERE (?=0 OR p.stan_id=?) ORDER BY p.id");
            $s->execute([$sid, $sid]); while ($r = $s->fetch(PDO::FETCH_NUM)) fputcsv($o, $r);
            exit;

        default: keluar(['error' => 'Aksi tidak dikenal'], 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    keluar(['error' => $e->getMessage()], 400);
}
