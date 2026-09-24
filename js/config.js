/* ==========================================================================
   GAS LMS — js/config.js
   Satu-satunya berkas yang perlu Anda sunting setelah mengunduh repo ini.
   Setelah diisi: git add . && git commit -m "isi config" && git push
   ========================================================================== */

const CONFIG = {

  /* ------------------------------------------------------------------
     1) URL API Google Apps Script  ← WAJIB DIISI
     ------------------------------------------------------------------
     Didapat dari: Apps Script → Deploy → New deployment → Web app
                   → Execute as: Me · Who has access: Anyone → Deploy
     Bentuknya selalu diakhiri /exec, bukan /dev.
     Contoh: https://script.google.com/macros/s/AKfycbxxxxxxxxxxxx/exec
  */
  // Saat berkas ini disajikan dari versi cadangan di dalam Apps Script,
  // URL-nya disuntikkan sendiri oleh server (window.__GAS_EXEC_URL__),
  // sehingga versi cadangan tidak pernah perlu dikonfigurasi manual.
  GAS_API_URL: (typeof window !== 'undefined' && window.__GAS_EXEC_URL__)
    || 'https://script.google.com/macros/s/AKfycbwSHIbnDEkD3ytIno1kUkrVyjCaYDI0jYR4_rtQwUol43KljrGIOm3Ee6Fc03dqQqsE/exec',

  /* ------------------------------------------------------------------
     2) Google OAuth Client ID  ← isi hanya jika tombol "Masuk dengan
        Akun Google" ingin difungsikan
     ------------------------------------------------------------------
     Dibuat di: console.cloud.google.com → APIs & Services → Credentials
                → Create Credentials → OAuth client ID → Web application
     Authorized JavaScript origins wajib berisi:
         https://sigitops.github.io
     Salin juga Client ID yang sama ke Script Properties di Apps Script
     dengan nama GOOGLE_CLIENT_ID, supaya backend bisa memverifikasi token.

     Biarkan kosong ('') untuk menyembunyikan tombol Google sepenuhnya —
     login NISN/NIP + kata sandi tetap berjalan normal.
  */
  GOOGLE_CLIENT_ID: '61731602259-7q5242o14vq0o1m43k19msdn43383se6.apps.googleusercontent.com',

  /* ------------------------------------------------------------------
     3) Pengaturan lanjutan — umumnya tidak perlu diubah
     ------------------------------------------------------------------ */

  // Batas waktu satu permintaan ke backend. Apps Script kadang lambat pada
  // pemanggilan pertama setelah lama menganggur (cold start).
  TIMEOUT_MS: 45000,

  // Percobaan ulang otomatis untuk kegagalan jaringan sementara.
  // Hanya berlaku untuk operasi baca; operasi tulis tidak pernah diulang
  // otomatis supaya tidak ada data ganda.
  RETRY: 1,

  // Ukuran unggahan maksimum di sisi klien (MB). Backend punya batasnya
  // sendiri di sheet AppConfig; nilai terkecil di antara keduanya berlaku.
  MAX_UPLOAD_MB: 15,

  // Ditampilkan di footer layar masuk.
  VERSI: '2.0 — Frontend GitHub Pages'
};

/* Peringatan dini di konsol bila config belum diisi, supaya tidak
   membingungkan saat halaman terbuka tapi tidak ada data yang muncul. */
if (!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.indexOf('script.google.com') === -1) {
  console.error(
    '[GAS LMS] CONFIG.GAS_API_URL belum diisi.\n' +
    'Buka js/config.js, isi dengan URL /exec dari deployment Apps Script Anda, ' +
    'lalu push ulang ke GitHub.'
  );
}
