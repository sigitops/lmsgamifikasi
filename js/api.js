/* ==========================================================================
   GAS LMS — js/api.js
   Jembatan HTTP ke backend Apps Script. Menggantikan google.script.run.

   Aturan penting yang tidak boleh diubah
   --------------------------------------
   Apps Script tidak dapat menyetel header respons sendiri, sehingga ia tidak
   bisa menjawab permintaan preflight OPTIONS. Artinya setiap permintaan dari
   GitHub Pages WAJIB berupa "simple request" menurut aturan CORS:

     • Content-Type hanya boleh text/plain, application/x-www-form-urlencoded,
       atau multipart/form-data. Memakai application/json akan memicu
       preflight dan permintaan langsung gagal.
     • Tidak boleh ada header kustom. Itu sebabnya token sesi dikirim di
       dalam badan permintaan, bukan lewat header Authorization.

   Apps Script juga membalas dengan redirect 302 ke googleusercontent.com;
   fetch mengikutinya secara otomatis dan respons akhirnya sudah ber-CORS.
   ========================================================================== */

/* ── Penanda status koneksi, dibaca oleh lapisan UI ──────────────────── */
const ApiState = {
  online      : true,
  terakhirGagal: 0,
  sedangJalan : 0
};

/**
 * Memanggil satu action di backend.
 *
 * @param {string} action  nama fungsi yang terdaftar di ROUTER pada Kode.gs
 * @param {Array}  args    argumen fungsi, TANPA token (token disisipkan di sini)
 * @param {object} opt     { timeout, retry, token }
 * @return {Promise<{success:boolean,data:any,message:string}>}
 */
async function apiCall(action, args, opt) {
  opt = opt || {};
  const url = CONFIG.GAS_API_URL;

  if (!url || url.indexOf('script.google.com') === -1) {
    return {
      success: false,
      data: null,
      message: 'URL backend belum dikonfigurasi. Hubungi admin TKJ (js/config.js belum diisi).'
    };
  }

  // App dideklarasikan dengan const di app.js. Deklarasi const pada skrip
  // klasik TIDAK menjadi properti window, jadi `window.App` selalu undefined —
  // pengecekan harus lewat typeof, bukan lewat objek window.
  const tokenAktif = (opt.token !== undefined)
    ? opt.token
    : (typeof App !== 'undefined' && App ? App.token : null);

  const amplop = JSON.stringify({
    action : action,
    token  : tokenAktif,
    args   : args || [],
    v      : CONFIG.VERSI
  });

  const maksPercobaan = 1 + (opt.retry !== undefined ? opt.retry : 0);
  let galatTerakhir = null;

  for (let percobaan = 1; percobaan <= maksPercobaan; percobaan++) {
    const ctrl = new AbortController();
    const jamPasir = setTimeout(() => ctrl.abort(), opt.timeout || CONFIG.TIMEOUT_MS);
    ApiState.sedangJalan++;

    try {
      const res = await fetch(url, {
        method  : 'POST',
        headers : { 'Content-Type': 'text/plain;charset=utf-8' },  // jangan diubah
        body    : amplop,
        redirect: 'follow',
        signal  : ctrl.signal
      });

      if (!res.ok) throw new Error('Server membalas HTTP ' + res.status);

      const teks = await res.text();
      let hasil;
      try {
        hasil = JSON.parse(teks);
      } catch (e) {
        // Biasanya terjadi saat deployment belum disetel "Anyone": Apps Script
        // mengembalikan halaman login Google, bukan JSON.
        throw new Error(
          teks.indexOf('<') === 0
            ? 'Backend mengembalikan halaman HTML, bukan data. Periksa pengaturan ' +
              'deployment: "Who has access" harus Anyone.'
            : 'Respons backend tidak dapat dibaca.'
        );
      }

      ApiState.online = true;
      return hasil;

    } catch (err) {
      galatTerakhir = err;
      const dibatalkan = err.name === 'AbortError';
      // Hanya percobaan terakhir yang dianggap gagal permanen.
      if (percobaan < maksPercobaan && !dibatalkan) {
        await new Promise(r => setTimeout(r, 700 * percobaan));
        continue;
      }
      ApiState.online = false;
      ApiState.terakhirGagal = Date.now();
      return {
        success: false,
        data   : null,
        message: dibatalkan
          ? 'Permintaan melebihi batas waktu. Jaringan lambat atau server sedang sibuk.'
          : ('Tidak dapat menghubungi server: ' + (err.message || 'kesalahan jaringan') + '.')
      };
    } finally {
      clearTimeout(jamPasir);
      ApiState.sedangJalan--;
    }
  }

  return { success: false, data: null, message: galatTerakhir ? galatTerakhir.message : 'Gagal.' };
}

/**
 * Cek kesehatan backend lewat GET. Dipakai saat halaman pertama dibuka
 * untuk membedakan "config salah" dari "server sedang bermasalah".
 */
async function apiPing() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(CONFIG.GAS_API_URL + '?action=ping', { signal: ctrl.signal });
    const j = await res.json();
    return !!(j && j.success);
  } catch (e) {
    return false;
  }
}
