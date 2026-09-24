# Panduan Migrasi GAS LMS — Backend Apps Script + Frontend GitHub Pages

**Repo:** `https://github.com/sigitops/lmsgamifikasi`
**Situs nanti:** `https://sigitops.github.io/lmsgamifikasi/`

Ikuti urutannya. Backend dulu, baru frontend — karena frontend memerlukan URL yang dihasilkan backend.

---

## Ringkasan yang berubah

| | Sebelum | Sesudah |
|---|---|---|
| Frontend | HtmlService di dalam Apps Script | Berkas statis di GitHub Pages |
| Komunikasi | `google.script.run` | `fetch()` HTTP ke `/exec` |
| Keluaran backend | HTML | JSON |
| Login Google | `Session.getActiveUser()` | Google Identity Services + verifikasi ID token |
| Sesi saat halaman di-refresh | Hilang | Bertahan (localStorage, 8 jam) |
| URL `/exec` | Privat (login Google) | Publik, diamankan token + pembatasan percobaan |

Logika bisnis di backend tidak diubah sama sekali. Yang berubah hanya cara frontend memanggilnya.

---

# BAGIAN A — BACKEND (Google Apps Script)

## A1. Perbarui Kode.gs

1. Buka proyek Apps Script GAS LMS yang sudah ada.
2. Buka berkas **Kode.gs**, blok semua isinya (`Ctrl+A`), hapus.
3. Tempel seluruh isi **Kode.gs** yang baru.
4. Simpan (`Ctrl+S`).

Kalau ini instalasi baru, jalankan dulu `setupAppEnvironment()` sekali seperti pada panduan sebelumnya.

## A2. Izinkan akses jaringan keluar

Verifikasi token Google memerlukan `UrlFetchApp`. Di editor Apps Script:

**⚙️ Project Settings** → centang **"Show appsscript.json manifest file in editor"**

Buka berkas `appsscript.json` yang muncul, ganti isinya dengan berkas `appsscript.json` yang disertakan. Yang penting ada baris ini:

```json
"https://www.googleapis.com/auth/script.external_request"
```

Tanpa itu, tombol Google akan selalu gagal dengan pesan izin.

## A3. Uji router sebelum deploy

Di editor Apps Script, pilih fungsi **`ujiAPI`** dari dropdown → **▶ Run** → buka **Execution log**.

Yang harus terlihat:

```
1. ping (publik)          : ✅ OK
2. tanpa token ditolak     : ✅ OK
3. token palsu ditolak     : ✅ OK
4. fungsi internal ditolak : ✅ OK
5. login siswa contoh      : ✅ OK
6. muat data dengan token  : ✅ OK — 8 materi terbaca
7. logout                  : ✅ OK
```

Nomor 2, 3, dan 4 adalah uji keamanan. Kalau salah satunya `❌`, **jangan lanjut deploy** — artinya ada action yang bisa dipanggil tanpa token dari internet.

Nomor 5 boleh `⚠️` kalau sandi bawaan sudah Anda ganti. Itu wajar.

## A4. Deploy sebagai Web App

**Deploy → New deployment → Web app**

| Kolom | Nilai | Kenapa |
|---|---|---|
| Description | `API v2` | bebas |
| Execute as | **Me** | agar skrip punya akses ke Sheets & Drive Anda |
| Who has access | **Anyone** | wajib; tanpa ini GitHub Pages akan menerima halaman login Google, bukan JSON |

Klik **Deploy**, lalu **salin URL yang berakhiran `/exec`**.

> ⚠️ Pastikan `/exec`, bukan `/dev`. URL `/dev` hanya bisa dibuka oleh pemilik skrip dan akan selalu gagal dari GitHub Pages.

**Simpan URL ini.** Bentuknya kira-kira:
```
https://script.google.com/macros/s/AKfycbx.................../exec
```

## A5. Uji cepat lewat peramban

Buka di tab baru:
```
URL_EXEC_ANDA?action=ping
```

Jawaban yang benar adalah JSON seperti ini:
```json
{"success":true,"data":{"app":"GAS LMS","siap":true},"message":"Backend aktif."}
```

Kalau yang muncul halaman login Google → setelan *Who has access* belum **Anyone**. Ulangi A4 dan buat deployment baru.

---

# BAGIAN B — LOGIN GOOGLE (opsional, bisa dilewati)

Lewati bagian ini kalau cukup login NISN/NIP. Aplikasi tetap berjalan penuh; tombol Google otomatis disembunyikan.

## B1. Buat OAuth Client ID

1. Buka `https://console.cloud.google.com`
2. Pilih proyek, atau buat baru (nama bebas, misal `GAS LMS TKJ`)
3. **APIs & Services → OAuth consent screen**
   - User Type: **Internal** kalau sekolah punya Google Workspace, **External** kalau tidak
   - Isi nama aplikasi, email dukungan, email developer → Save
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `GAS LMS Web`
   - **Authorized JavaScript origins** → Add URI:
     ```
     https://sigitops.github.io
     ```
     > Hanya domainnya, tanpa `/lmsgamifikasi` dan tanpa garis miring di akhir. Ini paling sering salah.
   - Authorized redirect URIs: **kosongkan**
5. **Create** → salin **Client ID** (berakhiran `.apps.googleusercontent.com`)

## B2. Simpan Client ID di backend

Di editor Apps Script, buka fungsi `setelGoogleClientId()` di bagian bawah `Kode.gs`, ganti baris:

```javascript
const CLIENT_ID = 'GANTI_DENGAN_CLIENT_ID_ANDA.apps.googleusercontent.com';
```

lalu jalankan fungsi itu sekali. Log akan menampilkan `✅ GOOGLE_CLIENT_ID tersimpan.`

## B3. Simpan Client ID yang sama di frontend

Nanti di Bagian C, isi juga `GOOGLE_CLIENT_ID` pada `js/config.js` dengan nilai yang sama.

> Backend memverifikasi bahwa token yang masuk memang diterbitkan untuk Client ID ini. Kalau keduanya berbeda, login akan ditolak dengan pesan "Token Google bukan untuk aplikasi ini".

---

# BAGIAN C — FRONTEND (GitHub Pages)

## C1. Siapkan folder

1. Unduh dan ekstrak **`lmsgamifikasi.zip`**.
2. Hasil ekstraksi adalah folder bernama `lmsgamifikasi`.

**Folder inilah yang nanti di-`git init`.** Jangan naik satu level, jangan masuk lebih dalam.

Isinya harus begini:

```
lmsgamifikasi\
├── index.html        ← harus terlihat di sini
├── README.md
├── .nojekyll
├── css\
│   └── style.css
├── js\
│   ├── config.js
│   ├── api.js
│   ├── app.js
│   ├── views.js
│   ├── views2.js
│   ├── views3.js
│   └── actions.js
└── tools\
    └── build-gas.mjs
```

> Kalau `index.html` tidak terlihat langsung di dalam folder ini, Anda salah folder. Situs akan 404 dan tidak ada satu pun perintah git yang memberi peringatan.

## C2. Isi konfigurasi — LAKUKAN SEBELUM PUSH PERTAMA

Buka `js/config.js` dengan Notepad, VS Code, atau editor teks apa pun.

**Ganti baris ini:**
```javascript
    || 'GANTI_DENGAN_URL_EXEC_ANDA',
```
**Menjadi:**
```javascript
    || 'https://script.google.com/macros/s/AKfycbx..../exec',
```

Kalau Anda mengerjakan Bagian B, isi juga:
```javascript
  GOOGLE_CLIENT_ID: '1234567890-abcdef.apps.googleusercontent.com',
```

Simpan berkasnya.

## C3. Pasang Git (lewati kalau sudah ada)

- **Windows:** unduh di `https://git-scm.com/download/win`, pasang dengan pengaturan bawaan.
- **Mac:** buka Terminal, ketik `git --version`; macOS menawarkan pemasangan otomatis.

Buka **PowerShell** atau **Git Bash**, lalu periksa:
```bash
git --version
```
Harus muncul nomor versi.

## C4. Setel identitas Git (sekali seumur hidup komputer)

```bash
git config --global user.name "Eko Sigit Subangun"
git config --global user.email "ekosigits611@gmail.com"
```

`user.name` hanya label di riwayat commit, bukan username GitHub. `user.email` sebaiknya sama dengan email akun GitHub supaya commit terhubung ke profil Anda.

## C5. Buat repository di GitHub

Di `github.com`: tombol **+** → **New repository**

| Kolom | Nilai |
|---|---|
| Repository name | `lmsgamifikasi` |
| Visibility | **Public** |
| Add a README file | **jangan dicentang** |
| Add .gitignore | **None** |
| Choose a license | **None** |

Klik **Create repository**. Biarkan halaman yang muncul tetap terbuka.

> **Kenapa Public?** GitHub Pages gratis hanya untuk repo publik. Ini aman — tidak ada kredensial di berkas frontend. URL API dan Client ID memang dirancang untuk publik.

## C6. Buka terminal di folder yang benar

Cara tercepat di Windows: buka folder `lmsgamifikasi` di File Explorer, klik address bar, ketik `powershell`, tekan Enter.

Atau manual:
```powershell
cd "C:\path\ke\lmsgamifikasi"
```

**Verifikasi dulu sebelum lanjut:**
```powershell
dir
```
(di Git Bash / Mac / Linux: `ls -la`)

`index.html` **harus** terlihat. Kalau yang muncul justru folder `lmsgamifikasi` lagi, masuk dulu: `cd lmsgamifikasi`.

## C7. Push pertama

Jalankan satu per satu:

```bash
git init
```
Normal: `Initialized empty Git repository in ...`

```bash
git add .
```
Ada **titik** di akhir. Normal: tidak ada keluaran sama sekali.

```bash
git commit -m "Frontend GAS LMS versi awal"
```
Normal: muncul daftar berkas, misal `create mode 100644 index.html`.

```bash
git branch -M main
```
Normal: tidak ada keluaran.

```bash
git remote add origin https://github.com/sigitops/lmsgamifikasi.git
```
Normal: tidak ada keluaran. Kalau muncul `remote origin already exists`, lewati saja.

```bash
git push -u origin main
```

Saat diminta:
- **Username:** `sigitops`
- **Password:** **Personal Access Token**, bukan kata sandi akun GitHub

> 💡 Saat mengetik atau menempel token, **layar tetap kosong** — tidak ada bintang atau karakter yang muncul. Itu normal, bukan tanda gagal. Di PowerShell tempel dengan klik kanan; di Git Bash dengan `Shift+Insert`. Lalu tekan Enter.

Tanda berhasil: `Writing objects: 100%` dan `* [new branch] main -> main`.

### Kalau muncul "Password authentication is not supported"

Itu bukan galat fatal, hanya tanda Anda perlu token:

1. Buka `https://github.com/settings/tokens`
2. **Generate new token** → **Generate new token (classic)**
3. Note: `git-push-lms` · Expiration: `90 days`
4. Centang scope **`repo`** (ini wajib)
5. **Generate token** → salin token `ghp_...` — **hanya tampil sekali**, simpan dulu di Notepad
6. Jalankan `git push -u origin main` lagi, tempel token sebagai password

Kalau terminal terasa terlalu ribet, alternatifnya **GitHub Desktop** (`https://desktop.github.com`): login lewat browser → **Add Local Repository** → pilih folder → **Publish repository**.

## C8. Aktifkan GitHub Pages

Buka `https://github.com/sigitops/lmsgamifikasi` → tab **Settings** → sidebar kiri **Pages**.

| Kolom | Nilai |
|---|---|
| Source | **Deploy from a branch** |
| Branch | **main** · **/ (root)** |
| Enforce HTTPS | ✅ dicentang |

**Save.** Tunggu 1–2 menit, muat ulang halaman. Akan muncul:

> Your site is live at `https://sigitops.github.io/lmsgamifikasi/`

## C9. Uji

1. Buka `https://sigitops.github.io/lmsgamifikasi/`
2. Tekan tombol **"Uji Koneksi ke Server"** di bawah form masuk. Harus muncul "Backend terhubung".
3. Masuk dengan `0064128901` / `siswa123`
4. Tekan `F5`. Anda harus **tetap masuk** — bukan kembali ke layar login.
5. Buka **F12 → Network**, klik menu mana pun. Tidak boleh ada galat CORS.

---

# BAGIAN D — VERSI CADANGAN DI APPS SCRIPT

Berguna kalau jaringan lab memblokir `github.io`. Aplikasi yang sama disajikan langsung dari Apps Script.

Jangan menyalin berkas secara manual — dalam beberapa pekan kedua versi pasti berbeda tanpa ada yang menyadari. Bangkitkan dari sumber:

```bash
node tools/build-gas.mjs
```

Butuh Node.js (`https://nodejs.org`). Hasilnya ada di folder `build-gas/` berisi 9 berkas.

Di editor Apps Script, buat berkas HTML dengan nama **persis** berikut (tanpa `.html` saat mengetik nama), lalu tempel isinya:

`Index` · `Stylesheet` · `Config` · `Api` · `App` · `Views` · `Views2` · `Views3` · `Actions`

Buat **New deployment**, lalu buka URL `/exec` tanpa parameter apa pun. Aplikasi lengkap akan muncul.

Versi cadangan mengambil URL API-nya sendiri secara otomatis, jadi tidak ada konfigurasi terpisah yang bisa ketinggalan diisi.

---

# BAGIAN E — CARA MEMPERBARUI NANTI

Setiap ada perubahan berkas, dari folder `lmsgamifikasi`:

```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```

GitHub Pages membangun ulang dalam 1–2 menit. Kalau masih tampil versi lama, itu cache peramban: `Ctrl+Shift+R`, atau buka di jendela Incognito.

Kalau yang diubah adalah `Kode.gs`, buat **New deployment** di Apps Script. Mengedit saja tidak cukup — URL lama masih menjalankan kode versi lama.

---

# TROUBLESHOOTING

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Halaman 404 dari GitHub Pages | `index.html` tidak di root repo | Buka repo di browser. Kalau yang terlihat folder, bukan `index.html`, Anda `git init` di folder yang salah. Lihat prosedur di bawah |
| Halaman tampil polos tanpa warna | Folder `css/` dan `js/` tidak terkirim | Jangan unggah lewat tombol "Add file → Upload files" di web GitHub; itu meratakan struktur folder. Gunakan `git push` dari terminal |
| "URL backend belum dikonfigurasi" | `js/config.js` masih nilai bawaan | Isi `GAS_API_URL`, lalu `git add . && git commit -m "fix config" && git push` |
| "Backend mengembalikan halaman HTML, bukan data" | Deployment bukan "Anyone" | Apps Script → Deploy → New deployment → Who has access: **Anyone** |
| Galat CORS di Console | Header `Content-Type` diubah | Harus tetap `text/plain;charset=utf-8` di `js/api.js`. `application/json` memicu preflight yang tidak bisa dijawab Apps Script |
| Tombol Google tidak muncul | `GOOGLE_CLIENT_ID` kosong | Normal dan disengaja. Isi Bagian B kalau ingin difungsikan |
| "Token Google bukan untuk aplikasi ini" | Client ID di `config.js` ≠ Script Properties | Samakan keduanya |
| Login Google gagal, Console menyebut origin | Origin belum terdaftar | Google Cloud Console → Credentials → tambahkan `https://sigitops.github.io` (tanpa path, tanpa garis miring akhir) |
| Selalu keluar sendiri setiap refresh | Sesi lewat 8 jam | Wajar. Masuk lagi |
| "Akun terkunci sementara 15 menit" | 5 kali salah sandi | Tunggu 15 menit, atau minta admin reset sandi |
| Permintaan pertama lambat sekali | Cold start Apps Script | Normal. Permintaan berikutnya jauh lebih cepat |
| `LF will be replaced by CRLF` | Beda format baris Windows/Linux | Abaikan, ini peringatan biasa |
| `src refspec main does not match any` | Belum ada commit | Jalankan `git add .` lalu `git commit -m "..."` dulu |

### Prosedur perbaikan: salah folder yang di-push

Gejalanya khas — situs 404, semua perintah git sukses tanpa satu pun galat, dan di halaman repo yang terlihat adalah folder, bukan `index.html`.

Jangan hapus repo dan ulang dari nol. Cukup push ulang dari folder yang benar:

```powershell
cd "C:\path\ke\lmsgamifikasi"
dir
```
Pastikan `index.html` terlihat. Lalu:
```powershell
git init
git add .
git commit -m "Fix: push dari folder yang benar"
git branch -M main
git remote add origin https://github.com/sigitops/lmsgamifikasi.git
git push -u origin main --force
```

`--force` menimpa isi repo dengan versi lokal. Aman di sini karena isi lama memang struktur yang salah, tapi Anda berhak tahu apa yang sedang dijalankan.

---

# GLOSARIUM

- **Repository (repo)** — folder proyek di GitHub
- **Commit** — menyimpan perubahan dengan catatan; seperti Save, tapi berriwayat dan bisa dibatalkan
- **Push** — mengirim commit dari komputer ke GitHub
- **Branch** — cabang versi proyek; yang dipakai di sini `main`
- **Personal Access Token** — "kata sandi khusus" dari GitHub untuk operasi Git lewat terminal
- **CORS** — aturan peramban tentang siapa boleh memanggil siapa antar-domain
- **Preflight** — permintaan `OPTIONS` yang dikirim peramban sebelum permintaan "rumit". Apps Script tidak bisa menjawabnya, itulah sebabnya aplikasi ini hanya mengirim permintaan sederhana
- **Cold start** — jeda pada permintaan pertama setelah skrip lama menganggur

---

# AKUN DEMO

Ganti seluruh sandi ini sebelum dipakai siswa sungguhan.

| Peran | Nomor Induk | Sandi |
|---|---|---|
| Admin | `198001012005011001` | `admin123` |
| Guru | `198504122009031004` | `guru123` |
| Kaprog | `197806152003121002` | `guru123` |
| Siswa | `0064128901` | `siswa123` |

---

© 2026 Program Keahlian Teknik Komputer & Jaringan · SMK HKTI 2 Purwareja Klampok
