# GAS LMS — Frontend

Platform pembelajaran terpadu dan gamifikasi untuk Program Keahlian Teknik Komputer & Jaringan, SMK HKTI 2 Purwareja Klampok.

Repo ini berisi **frontend saja**. Backend berjalan di Google Apps Script dan diakses lewat HTTP sebagai REST API.

**Situs:** https://sigitops.github.io/lmsgamifikasi/

---

## Arsitektur

```
Peramban siswa / guru
        │
        │  fetch() POST, Content-Type: text/plain
        ▼
GitHub Pages  ──────────►  Google Apps Script (/exec)
(HTML/CSS/JS statis)       doPost → ROUTER → fungsi bisnis
                                   │
                                   ├── Google Sheets  (21 sheet, basis data)
                                   ├── Google Drive   (jobsheet, .pkt, laporan)
                                   └── Gmail          (notifikasi penting)
```

Frontend tidak pernah menyentuh Sheets atau Drive secara langsung. Seluruh akses melewati backend, yang memvalidasi token sesi dan hak peran pada setiap permintaan.

### Kenapa `Content-Type: text/plain`

Apps Script tidak dapat menyetel header respons, sehingga tidak bisa menjawab permintaan preflight `OPTIONS`. Karena itu setiap permintaan dari domain lain wajib berupa *simple request*: hanya `text/plain`, `application/x-www-form-urlencoded`, atau `multipart/form-data`, dan tanpa header kustom.

Konsekuensinya, token sesi dikirim di dalam badan permintaan, bukan lewat header `Authorization`. Mengubah header menjadi `application/json` akan membuat seluruh aplikasi berhenti bekerja.

---

## Struktur berkas

```
lmsgamifikasi/
├── index.html            ← halaman tunggal, WAJIB di root repo
├── css/
│   └── style.css         ← sistem desain "Lavender Campus"
├── js/
│   ├── config.js         ← SATU-SATUNYA berkas yang perlu Anda sunting
│   ├── api.js            ← jembatan HTTP ke Apps Script
│   ├── app.js            ← state, router SPA, autentikasi, komponen dasar
│   ├── views.js          ← dashboard 4 peran, materi
│   ├── views2.js         ← tugas, kuis, nilai, penilaian
│   ├── views3.js         ← gamifikasi, leaderboard, admin, laporan
│   └── actions.js        ← seluruh formulir dan aksi tulis
├── tools/
│   └── build-gas.mjs     ← membangkitkan versi cadangan untuk Apps Script
├── .nojekyll             ← mencegah GitHub memproses berkas sebagai Jekyll
└── README.md
```

---

## Pemasangan singkat

1. Deploy `Kode.gs` sebagai Web App di Apps Script (*Execute as: Me*, *Who has access: Anyone*), salin URL `/exec`.
2. Isi `js/config.js` → `GAS_API_URL` dengan URL tersebut.
3. `git add . && git commit -m "isi config" && git push`
4. Settings → Pages → Deploy from branch → `main` / `(root)` → Save.

Panduan lengkap langkah demi langkah ada di **PANDUAN-DEPLOY.md**.

---

## Cara memperbarui

```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```

GitHub Pages membangun ulang dalam 1–2 menit. Kalau halaman masih menampilkan versi lama, tekan `Ctrl+Shift+R`.

---

## Versi cadangan di Apps Script

Bila jaringan sekolah memblokir `github.io`, aplikasi yang sama dapat disajikan langsung dari Apps Script. Jangan menyalin berkas secara manual — bangkitkan dari sumber ini:

```bash
node tools/build-gas.mjs
```

Hasilnya ada di `build-gas/`. Salin isi tiap berkas ke berkas HTML dengan nama sama di editor Apps Script, lalu buka URL `/exec` tanpa parameter.

Versi cadangan memakai kode yang identik dan mengambil URL API-nya sendiri secara otomatis, jadi tidak ada konfigurasi terpisah yang bisa ketinggalan.

---

## Catatan keamanan

URL `/exec` bersifat publik — itu memang syarat agar bisa dipanggil dari GitHub Pages. Pengamanan karena itu bertumpu pada backend, bukan pada kerahasiaan URL:

- Setiap fungsi tulis memvalidasi token sesi dan hak peran di sisi server. Menyembunyikan tombol di antarmuka bukan pengamanan.
- Hanya action yang terdaftar di `ROUTER` pada `Kode.gs` yang dapat dipanggil. Fungsi internal seperti `hashPassword` tidak dapat dijangkau dari internet.
- Login dibatasi 5 percobaan gagal per nomor induk, lalu terkunci 15 menit.
- Pesan galat untuk akun tidak ada dan sandi salah sengaja dibuat sama, supaya endpoint ini tidak bisa dipakai memetakan NISN yang valid.
- Kata sandi disimpan sebagai hash SHA-256 bersalt, tidak pernah dalam bentuk asli.

Berkas di repo ini tidak memuat kredensial apa pun. `GAS_API_URL` dan `GOOGLE_CLIENT_ID` memang dirancang untuk publik.

---

© 2026 Program Keahlian Teknik Komputer & Jaringan · SMK HKTI 2 Purwareja Klampok
