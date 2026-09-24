/* ==========================================================================
   GAS LMS — JavaScript.html (Inti)
   Berisi: state aplikasi, utilitas UI, autentikasi, router SPA, navigasi.
   Halaman-halamannya sendiri ada di Views.html.

   Prinsip yang dipegang file ini:
   1. Navigasi murni client-side  → 0 ms, tidak ada permintaan jaringan saat pindah halaman.
   2. Optimistic UI + localStorage → aksi terasa instan, sinkron ke server di latar.
   3. Seluruh data awal ditarik   → satu kali lewat getInitialAppData().
   4. Tidak ada window.location / URL parameter di mana pun.
   5. Komunikasi ke backend lewat fetch (js/api.js), bukan google.script.run,
      karena frontend kini berdiri sendiri di GitHub Pages.
   ========================================================================== */

/* ── 1. STATE APLIKASI ──────────────────────────────────────────────── */

const App = {
  token      : null,
  me         : null,   // { id, nama, role, kelasId, ... }
  data       : {},     // seluruh koleksi hasil getInitialAppData
  page       : null,
  filter     : {},     // filter per halaman (disimpan lokal, tidak ke server)
  charts     : {},     // instance Chart.js aktif
  draftKuis  : {},     // jawaban kuis yang sedang dikerjakan
  timerKuis  : null,
  siap       : false
};

const ROLE = { ADMIN: 'Admin', GURU: 'Guru', SISWA: 'Siswa', KAPROG: 'Kaprog' };
const LS = {
  tema   : 'lms_tema',
  ingat  : 'lms_ingat_nomor',
  sesi   : 'lms_sesi',
  draft  : 'lms_draft_',
  filter : 'lms_filter'
};

/* ── 2. UTILITAS DASAR ──────────────────────────────────────────────── */

const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/** Escape HTML — semua data dari Sheets dianggap tidak tepercaya saat dirender. */
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Escape untuk string JavaScript yang berada DI DALAM atribut HTML
 * (misal onclick="fungsi('...')"). Tanpa ini, nama berkas yang memuat
 * tanda kutip tunggal akan memutus string dan merusak handler.
 */
function js(v) {
  return esc(String(v === null || v === undefined ? '' : v)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n'));
}

function angka(n) { return Number(n || 0).toLocaleString('id-ID'); }

function inisial(nama) {
  return String(nama || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();
}

/** "2026-09-22 14:05" → "22 Sep 2026" */
function tglPendek(s) {
  if (!s) return '-';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return String(s).slice(0, 10);
  const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return d.getDate() + ' ' + bln[d.getMonth()] + ' ' + d.getFullYear();
}

function tglJam(s) {
  if (!s) return '-';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return String(s);
  return tglPendek(s) + ', ' + String(d.getHours()).padStart(2, '0') + ':' +
         String(d.getMinutes()).padStart(2, '0') + ' WIB';
}

/** Selisih waktu menuju tenggat, dalam bahasa manusia. */
function sisaWaktu(deadline) {
  const d = new Date(String(deadline).replace(' ', 'T'));
  if (isNaN(d)) return { teks: String(deadline), lewat: false, mendesak: false };
  const selisih = d - new Date();
  const lewat = selisih < 0;
  const jam = Math.abs(selisih) / 3600000;
  let teks;
  if (jam < 1)       teks = Math.round(Math.abs(selisih) / 60000) + ' menit';
  else if (jam < 24) teks = Math.round(jam) + ' jam';
  else               teks = Math.round(jam / 24) + ' hari';
  return {
    teks : lewat ? 'Lewat ' + teks : 'Tersisa ' + teks,
    lewat, mendesak: !lewat && jam <= 48
  };
}

function predikat(n) {
  n = Number(n);
  if (n >= 93) return 'A';   if (n >= 85) return 'A-';
  if (n >= 78) return 'B+';  if (n >= 72) return 'B';
  if (n >= 65) return 'C+';  if (n >= 55) return 'C';
  return 'D';
}

function debounce(fn, ms) {
  let t;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), ms || 280);
  };
}

/** localStorage dibungkus try/catch — bisa diblokir di mode privat. */
function simpanLokal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function bacaLokal(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function hapusLokal(k) { try { localStorage.removeItem(k); } catch (e) {} }

/** Render ulang ikon Lucide setelah setiap penyuntikan HTML. */
function ikon() { try { lucide.createIcons(); } catch (e) {} }

/* ── 3. PENCARI REFERENSI (lookup lokal, tanpa panggilan server) ───── */

const cari = {
  mapel : id => (App.data.mapel  || []).find(m => m.ID === id) || {},
  kelas : id => (App.data.kelas  || []).find(k => k.ID === id) || {},
  siswa : id => (App.data.siswa  || []).find(s => s.ID === id) || {},
  guru  : id => (App.data.guru   || []).find(g => g.ID === id) || {},
  badge : id => (App.data.badge  || []).find(b => b.ID === id) || {},
  tugas : id => (App.data.tugas  || []).find(t => t.ID === id) || {},
  materi: id => (App.data.materi || []).find(m => m.ID === id) || {},
  kuis  : id => (App.data.kuis   || []).find(k => k.ID === id) || {},
  gamif : id => (App.data.gamifikasi || []).find(g => g.SiswaID === id) || {}
};

function namaMapel(id) { return cari.mapel(id).NamaMapel || '—'; }
function kodeMapel(id) { return cari.mapel(id).KodeMapel || '—'; }
function namaKelas(id) { return cari.kelas(id).NamaKelas || '—'; }
function namaOrang(id) { return (cari.guru(id).Nama || cari.siswa(id).Nama) || '—'; }

/* ── 4. TOAST, POP EXP, MODAL, PRATINJAU ───────────────────────────── */

function toast(judul, pesan, tipe) {
  tipe = tipe || 'info';
  const peta = { success: 'check-circle-2', danger: 'alert-octagon', warning: 'alert-triangle', info: 'info' };
  const host = $('#toastHost');
  const el = document.createElement('div');
  el.className = 'toast ' + tipe;
  el.setAttribute('role', tipe === 'danger' ? 'alert' : 'status');
  el.innerHTML =
    '<span class="toast-ico"><i data-lucide="' + peta[tipe] + '"></i></span>' +
    '<span class="grow"><span class="toast-title">' + esc(judul) + '</span>' +
    (pesan ? '<div class="toast-msg">' + esc(pesan) + '</div>' : '') + '</span>';
  host.appendChild(el);
  ikon();
  setTimeout(() => {
    el.style.transition = 'opacity .2s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, tipe === 'danger' ? 5200 : 3600);
}

/** Umpan balik perolehan EXP — muncul instan, tidak menunggu server. */
function popEXP(jumlah, keterangan) {
  if (!jumlah) return;
  const el = document.createElement('div');
  el.className = 'exp-pop';
  el.innerHTML = '<i data-lucide="zap"></i> +' + angka(jumlah) + ' EXP' +
                 (keterangan ? ' · ' + esc(keterangan) : '');
  document.body.appendChild(el);
  ikon();
  setTimeout(() => el.remove(), 2500);
}

let modalAksi = null;

/**
 * Modal serbaguna.
 * @param {object} opt { judul, isi, tombol:[{teks,kelas,ikon,onClick}], lebar:'lg' }
 */
function bukaModal(opt) {
  $('#modalTitle').textContent = opt.judul || '';
  $('#modalBody').innerHTML = opt.isi || '';
  $('#modalBox').className = 'modal' + (opt.lebar === 'lg' ? ' modal-lg' : '');

  const foot = $('#modalFoot');
  foot.innerHTML = '';
  (opt.tombol || [{ teks: 'Tutup', kelas: 'btn-secondary' }]).forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (t.kelas || 'btn-secondary');
    b.innerHTML = (t.ikon ? '<i data-lucide="' + t.ikon + '"></i> ' : '') + esc(t.teks);
    b.onclick = () => { if (t.onClick) t.onClick(b); else tutupModal(); };
    b.id = 'modalBtn' + i;
    foot.appendChild(b);
  });

  $('#modalBackdrop').classList.add('show');
  ikon();
  if (opt.fokus) setTimeout(() => { const f = $(opt.fokus); if (f) f.focus(); }, 60);
}

function tutupModal() {
  $('#modalBackdrop').classList.remove('show');
  $('#modalBody').innerHTML = '';
  modalAksi = null;
}

function konfirmasi(judul, pesan, onYa, tekstYa) {
  bukaModal({
    judul: judul,
    isi: '<p class="text-sm">' + esc(pesan) + '</p>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: tekstYa || 'Hapus', kelas: 'btn-danger', ikon: 'trash-2',
        onClick: () => { tutupModal(); onYa(); } }
    ]
  });
}

/** Pratinjau berkas di dalam modal — tidak pernah membuka tab baru (aman di iframe). */
function pratinjau(url, nama, mime) {
  const body = $('#previewBody');
  $('#previewTitle').textContent = nama || 'Pratinjau Dokumen';
  $('#previewUnduh').href = url || '#';

  if (!url) {
    body.innerHTML = '<div class="empty"><div class="empty-ico"><i data-lucide="file-x"></i></div>' +
      '<h3>Berkas belum tersedia</h3><p>Guru belum melampirkan berkas pada item ini.</p></div>';
  } else if (mime && mime.indexOf('image/') === 0) {
    body.innerHTML = '<img class="preview-img" src="' + esc(url) + '" alt="' + esc(nama) + '">';
  } else {
    const id = (String(url).match(/[-\w]{25,}/) || [])[0];
    const src = id ? 'https://drive.google.com/file/d/' + id + '/preview' : esc(url);
    body.innerHTML = '<iframe class="preview-frame" src="' + src + '" title="Pratinjau ' + esc(nama) + '"></iframe>';
  }
  $('#previewBackdrop').classList.add('show');
  ikon();
}

function tutupPratinjau() {
  $('#previewBackdrop').classList.remove('show');
  $('#previewBody').innerHTML = '';
}

/* ── 5. PEMANGGILAN SERVER (pembungkus tunggal) ─────────────────────── */

/**
 * Satu pintu ke backend. Bentuk pemanggilannya sengaja dipertahankan sama
 * persis seperti versi google.script.run, sehingga seluruh halaman dan
 * formulir tidak perlu diubah sama sekali saat pindah ke GitHub Pages —
 * hanya isi fungsi ini yang berganti dari RPC menjadi HTTP.
 *
 * Token sesi dikirim di dalam badan permintaan oleh apiCall(), bukan sebagai
 * argumen pertama, karena backend sekarang membacanya dari amplop JSON.
 *
 * @param {string}   fn      nama action yang terdaftar di ROUTER pada Kode.gs
 * @param {Array}    args    argumen fungsi, tanpa token
 * @param {function} sukses  dipanggil dengan res.data
 * @param {object}   opt     { tombol, teksProses, diam, gagal, toastSukses }
 */
function server(fn, args, sukses, opt) {
  opt = opt || {};
  const btn = opt.tombol ? (typeof opt.tombol === 'string' ? $(opt.tombol) : opt.tombol) : null;
  let htmlAsli = '';
  if (btn) {
    htmlAsli = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> ' + (opt.teksProses || 'Memproses…');
  }
  const pulihkan = () => { if (btn) { btn.disabled = false; btn.innerHTML = htmlAsli; ikon(); } };

  // Operasi baca boleh diulang otomatis; operasi tulis tidak pernah, supaya
  // tidak ada pengumpulan tugas atau penilaian ganda saat jaringan goyah.
  const bacaSaja = /^(getInitialAppData|ambilLogAktivitas|ambilLaporan|ambilSoalKuis|statistikDrive|ping)$/.test(fn);

  apiCall(fn, args, { retry: bacaSaja ? CONFIG.RETRY : 0 })
    .then(res => {
      pulihkan();
      if (!res) { if (!opt.diam) toast('Gagal', 'Tidak ada respons dari server.', 'danger'); return; }

      if (!res.success) {
        if (res.message === 'SESI_BERAKHIR' || /Sesi berakhir/i.test(res.message || '')) return sesiHabis();
        if (!opt.diam) toast('Gagal', res.message || 'Permintaan ditolak.', 'danger');
        if (opt.gagal) opt.gagal(res);
        return;
      }

      if (sukses) sukses(res.data, res.message);
      if (res.message && opt.toastSukses) toast('Berhasil', res.message, 'success');
    })
    .catch(err => {
      pulihkan();
      if (!opt.diam) toast('Kesalahan jaringan', (err && err.message) || 'Coba lagi sesaat.', 'danger');
      if (opt.gagal) opt.gagal({ message: err && err.message });
    });
}

/** Sinkron latar belakang: hasil diabaikan, kegagalan tidak mengganggu pengguna. */
function serverDiam(fn, args) {
  apiCall(fn, args).catch(() => {});
}

function sesiHabis() {
  App.token = null;
  App.me = null;
  hapusLokal(LS.sesi);
  $('#appScreen').classList.add('hide');
  $('#authScreen').classList.remove('hide');
  toast('Sesi berakhir', 'Silakan masuk kembali untuk melanjutkan.', 'warning');
}

/* ── 6. TEMA TERANG / GELAP ─────────────────────────────────────────── */

function terapkanTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const btn = $('#btnTema');
  if (btn) {
    btn.innerHTML = '<i data-lucide="' + (tema === 'dark' ? 'sun' : 'moon') + '"></i>';
    btn.setAttribute('aria-label', tema === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'dark' ? '#0B1220' : '#7C5CFF');
  ikon();
  warnaiUlangGrafik();
}

function gantiTema() {
  const baru = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  simpanLokal(LS.tema, baru);
  terapkanTema(baru);
}

/** Chart.js tidak ikut variabel CSS, jadi warnanya disetel ulang manual. */
function warnaiUlangGrafik() {
  const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
  const teks = gelap ? '#A79FC4' : '#7A7392';
  const garis = gelap ? '#2E2658' : '#EDE8F9';
  Object.values(App.charts).forEach(c => {
    if (!c || !c.options) return;
    if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) {
      c.options.plugins.legend.labels.color = teks;
    }
    ['x', 'y', 'r'].forEach(ax => {
      if (c.options.scales && c.options.scales[ax]) {
        if (c.options.scales[ax].ticks) c.options.scales[ax].ticks.color = teks;
        if (c.options.scales[ax].grid)  c.options.scales[ax].grid.color  = garis;
      }
    });
    c.update('none');
  });
}

function buatGrafik(id, konfigurasi) {
  const kanvas = document.getElementById(id);
  if (!kanvas) return;
  if (App.charts[id]) { App.charts[id].destroy(); delete App.charts[id]; }
  App.charts[id] = new Chart(kanvas, konfigurasi);
  warnaiUlangGrafik();
}

function bersihkanGrafik() {
  Object.keys(App.charts).forEach(k => { try { App.charts[k].destroy(); } catch (e) {} });
  App.charts = {};
}

/* ── 7. AUTENTIKASI ─────────────────────────────────────────────────── */

function pasangFormLogin() {
  const form = $('#loginForm');

  form.addEventListener('submit', e => {
    e.preventDefault();                       // tidak pernah submit ke URL
    const nomor = $('#inpNomorInduk').value.trim();
    const sandi = $('#inpSandi').value;
    const err = $('#errLogin');

    if (!nomor || !sandi) {
      err.classList.add('show');
      $('span', err).textContent = 'Nomor induk dan kata sandi wajib diisi.';
      $(!nomor ? '#inpNomorInduk' : '#inpSandi').focus();
      return;
    }
    err.classList.remove('show');

    server('doLogin', [nomor, sandi], data => {
      if ($('#inpIngat').checked) simpanLokal(LS.ingat, nomor); else hapusLokal(LS.ingat);
      mulaiSesi(data);
    }, {
      tombol: '#btnMasuk', teksProses: 'Memverifikasi…',
      diam: true,
      gagal: res => {
        err.classList.add('show');
        $('span', err).textContent = res.message || 'Login gagal.';
        $('#inpSandi').value = '';
        $('#inpSandi').focus();
      }
    });
  });

  siapkanGoogleSignIn();

  $('#btnLihatSandi').addEventListener('click', () => {
    const inp = $('#inpSandi');
    const lihat = inp.type === 'password';
    inp.type = lihat ? 'text' : 'password';
    $('#btnLihatSandi').innerHTML = '<i data-lucide="' + (lihat ? 'eye-off' : 'eye') + '"></i>';
    ikon();
  });

  $('#btnLupaSandi').addEventListener('click', () => {
    bukaModal({
      judul: 'Lupa Kata Sandi',
      isi: '<p class="text-sm">Pengaturan ulang kata sandi dilakukan oleh Admin TKJ demi menjaga ' +
           'keamanan data akademik.</p><div class="auth-note mt-md"><i data-lucide="mail"></i>' +
           '<span>Hubungi admin lewat wali kelas atau surel <strong>admin@smkhkti2.sch.id</strong> ' +
           'dengan menyertakan NISN/NIP dan nama lengkap.</span></div>',
      tombol: [{ teks: 'Mengerti', kelas: 'btn-primary' }]
    });
  });

  const ingat = bacaLokal(LS.ingat, '');
  if (ingat) { $('#inpNomorInduk').value = ingat; $('#inpIngat').checked = true; }
}

/* ── 7b. MASUK DENGAN AKUN GOOGLE (Google Identity Services) ────────── */

/** Memuat skrip pihak ketiga sekali saja. */
function muatSkrip(src, selesai, gagal) {
  if (document.querySelector('script[src="' + src + '"]')) return selesai();
  const s = document.createElement('script');
  s.src = src; s.async = true; s.defer = true;
  s.onload = selesai;
  s.onerror = gagal || (() => {});
  document.head.appendChild(s);
}

/**
 * Deployment Apps Script bermode "Anyone" tidak pernah tahu siapa pemanggilnya,
 * jadi Session.getActiveUser() selalu kosong. Identitas Google karena itu
 * dibuktikan dari sisi klien: GIS menerbitkan ID token bertanda tangan, lalu
 * backend memverifikasinya ke endpoint tokeninfo milik Google.
 */
function siapkanGoogleSignIn() {
  const clientId = String(CONFIG.GOOGLE_CLIENT_ID || '').trim();
  const wadah = $('#gsiButton');
  const pemisah = $('#authDivider');
  const tombolLama = $('#btnGoogle');

  // Belum dikonfigurasi: sembunyikan seluruh jalur Google, jangan tampilkan
  // tombol yang pasti gagal saat ditekan.
  if (!clientId) {
    [wadah, pemisah, tombolLama].forEach(el => el && el.classList.add('hide'));
    return;
  }

  tombolLama && tombolLama.classList.add('hide');

  muatSkrip('https://accounts.google.com/gsi/client', () => {
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback : tanganiKredensialGoogle,
        ux_mode  : 'popup',
        auto_select: false
      });
      google.accounts.id.renderButton(wadah, {
        type: 'standard', theme: 'outline', size: 'large',
        text: 'signin_with', shape: 'pill', locale: 'id',
        width: Math.min(360, wadah.offsetWidth || 360)
      });
    } catch (e) {
      wadah.innerHTML = '<p class="hint text-center">Tombol Google tidak dapat dimuat. ' +
                        'Gunakan NISN/NIP dan kata sandi.</p>';
    }
  }, () => {
    // Skrip Google terblokir (sering terjadi pada jaringan sekolah yang ketat).
    wadah.innerHTML = '<p class="hint text-center">Layanan Google tidak dapat dijangkau ' +
                      'dari jaringan ini. Gunakan NISN/NIP dan kata sandi.</p>';
  });
}

function tanganiKredensialGoogle(resp) {
  if (!resp || !resp.credential) return toast('Gagal', 'Token Google tidak diterima.', 'danger');
  const wadah = $('#gsiButton');
  const asli = wadah.innerHTML;
  wadah.innerHTML = '<div class="row" style="justify-content:center;gap:8px;padding:10px">' +
                    '<span class="spinner spinner-sm"></span>' +
                    '<span class="text-sm text-muted">Memverifikasi akun Google…</span></div>';

  server('doLoginGoogle', [resp.credential], data => mulaiSesi(data), {
    diam: true,
    gagal: res => {
      wadah.innerHTML = asli;
      toast('Login Google gagal', res.message || 'Akun tidak terdaftar di basis data sekolah.', 'danger');
    }
  });
}

/* ── 7c. SESI ───────────────────────────────────────────────────────── */

function mulaiSesi(data) {
  App.token = data.token;
  App.me = data.user;
  simpanLokal(LS.sesi, { token: data.token, waktu: Date.now() });

  $('#authScreen').classList.add('hide');
  $('#appScreen').classList.remove('hide');

  muatDataAwal(() => {
    toast('Selamat datang, ' + App.me.nama.split(' ')[0], rangkumanPeran(), 'success');
    if (data.bonusLogin && data.bonusLogin.exp > 0) {
      setTimeout(() => popEXP(data.bonusLogin.exp, 'streak ' + data.bonusLogin.streak + ' hari'), 900);
    }
  });
}

/**
 * Di GitHub Pages, memuat ulang halaman adalah hal biasa — beda dengan iframe
 * Apps Script dulu. Tanpa pemulihan sesi, setiap F5 akan melempar pengguna
 * kembali ke layar masuk. Token disimpan di localStorage dengan umur yang
 * disamakan dengan masa berlaku sesi di backend (8 jam).
 */
function pulihkanSesi() {
  const s = bacaLokal(LS.sesi, null);
  if (!s || !s.token) return false;

  const UMUR_MAKS = 8 * 60 * 60 * 1000;
  if (Date.now() - (s.waktu || 0) > UMUR_MAKS) { hapusLokal(LS.sesi); return false; }

  App.token = s.token;
  $('#authScreen').classList.add('hide');
  $('#appScreen').classList.remove('hide');
  // Bila token sudah dicabut server, getInitialAppData membalas SESI_BERAKHIR
  // dan server() otomatis memanggil sesiHabis() — pengguna kembali ke layar masuk.
  muatDataAwal();
  return true;
}

function rangkumanPeran() {
  const peta = {
    Siswa : 'Lanjutkan belajar dan kejar EXP hari ini.',
    Guru  : 'Cek antrean penilaian dan aktivitas kelasmu.',
    Admin : 'Pantau kesehatan sistem dan data master.',
    Kaprog: 'Tinjau capaian seluruh kelas TKJ.'
  };
  return peta[App.me.role] || '';
}

function keluar() {
  konfirmasi('Keluar dari sistem', 'Sesi belajarmu akan diakhiri. Lanjutkan?', () => {
    serverDiam('doLogout', []);
    App.token = null; App.me = null; App.data = {}; App.siap = false;
    bersihkanGrafik();
    hapusLokal(LS.sesi);
    $('#app-container').innerHTML = '';
    $('#appScreen').classList.add('hide');
    $('#authScreen').classList.remove('hide');
    $('#inpSandi').value = '';
    toast('Sampai jumpa', 'Kamu telah keluar dengan aman.', 'info');
  }, 'Ya, keluar');
}

/* ── 8. MUAT DATA AWAL (satu round-trip) ────────────────────────────── */

function muatDataAwal(selesai) {
  $('#app-container').innerHTML = kerangkaMuat();
  server('getInitialAppData', [], data => {
    App.data = data;
    App.me = data.me;
    App.siap = true;
    perbaruiHeader();
    rakitNavigasi();
    navigasi(halamanAwal());
    if (selesai) selesai();
  }, { gagal: () => { $('#app-container').innerHTML = kartuGalat(); ikon(); } });
}

function muatUlangData(setelah) {
  server('getInitialAppData', [], data => {
    App.data = data;
    App.me = data.me;
    perbaruiHeader();
    if (setelah) setelah();
  }, { diam: true });
}

function kerangkaMuat() {
  return '<div class="stat-grid">' +
    Array(4).fill('<div class="card stat-card"><div class="skel skel-card"></div></div>').join('') +
    '</div><div class="split"><div class="card"><div class="skel skel-line" style="width:40%"></div>' +
    '<div class="skel" style="height:200px;margin-top:16px"></div></div>' +
    '<div class="card"><div class="skel skel-line" style="width:55%"></div>' +
    '<div class="skel skel-line"></div><div class="skel skel-line" style="width:80%"></div></div></div>';
}

function kartuGalat() {
  return '<div class="empty"><div class="empty-ico"><i data-lucide="server-crash"></i></div>' +
    '<h3>Data gagal dimuat</h3><p>Periksa koneksi lalu muat ulang. Bila berulang, hubungi admin TKJ.</p>' +
    '<button class="btn btn-primary mt-md" onclick="muatDataAwal()">' +
    '<i data-lucide="refresh-cw"></i> Coba Lagi</button></div>';
}

/* ── 9. HEADER RINGKAS ──────────────────────────────────────────────── */

function perbaruiHeader() {
  const me = App.me;
  $('#navNama').textContent = me.nama;
  $('#navPeran').textContent = me.role === ROLE.SISWA
    ? namaKelas(me.kelasId)
    : (me.role === ROLE.GURU ? 'Guru Produktif TKJ' : me.role);
  $('#navAvatar').textContent = inisial(me.nama);
  $('#brandSub').textContent = (App.data.config && App.data.config.appSubtitle) || 'SMK HKTI 2 KLAMPOK';

  const belum = (App.data.notifikasi || []).filter(n => n.Dibaca !== 'YA').length;
  $('#notifDot').classList.toggle('hide', belum === 0);

  if (me.role === ROLE.SISWA) {
    const g = cari.gamif(me.id);
    $('#expVal').textContent = angka(g.TotalEXP || 0);
    $('#streakVal').textContent = g.StreakHari || 0;
    $('#chipExp').classList.remove('hide');
    $('#chipStreak').classList.remove('hide');
  } else {
    $('#chipExp').classList.add('hide');
    $('#chipStreak').classList.add('hide');
  }

  rakitPromoSidebar();
}

/**
 * Kartu ringkas di kaki sidebar. Isinya berbeda per peran: siswa melihat
 * progres level, guru melihat antrean penilaian, admin melihat status sistem.
 * Seluruhnya dihitung dari App.data — tidak ada panggilan server.
 */
function rakitPromoSidebar() {
  const el = $('#navPromo');
  if (!el) return;
  const me = App.me;

  if (me.role === ROLE.SISWA) {
    const g = cari.gamif(me.id);
    const lv = infoLevel(Number(g.TotalEXP) || 0);
    const sisa = Math.max(0, lv.berikut - (Number(g.TotalEXP) || 0));
    el.innerHTML =
      '<div class="row mb-sm" style="justify-content:center;gap:6px">' +
        '<i data-lucide="rocket" style="width:15px;height:15px;color:var(--primary)"></i>' +
        '<span class="text-xs" style="font-weight:800;color:var(--primary-strong)">Level ' + (g.Level || 1) + '</span>' +
      '</div>' +
      '<p>' + (sisa > 0 ? angka(sisa) + ' EXP lagi menuju level berikutnya.'
                        : 'Level tertinggi tercapai. Luar biasa.') + '</p>' +
      progresBar(lv.persen, 'amber') +
      '<button class="btn btn-primary btn-sm btn-block mt-md" onclick="navigasi(\'gamifikasi\')">' +
      'Pusat Gamifikasi <i data-lucide="arrow-right"></i></button>';
  } else if (me.role === ROLE.GURU) {
    const antre = hitungLencana('nilai');
    el.innerHTML =
      '<div class="row mb-sm" style="justify-content:center;gap:6px">' +
        '<i data-lucide="clipboard-check" style="width:15px;height:15px;color:var(--primary)"></i>' +
        '<span class="text-xs" style="font-weight:800;color:var(--primary-strong)">Antrean Penilaian</span>' +
      '</div>' +
      '<p>' + (antre ? antre + ' berkas praktikum menunggu review.' : 'Semua berkas sudah dinilai.') + '</p>' +
      '<button class="btn btn-primary btn-sm btn-block" onclick="navigasi(\'penilaian\')">' +
      'Buka Penilaian <i data-lucide="arrow-right"></i></button>';
  } else {
    const jml = (App.data.siswa || []).length + (App.data.guru || []).length;
    el.innerHTML =
      '<div class="row mb-sm" style="justify-content:center;gap:6px">' +
        '<i data-lucide="activity" style="width:15px;height:15px;color:var(--secondary-text)"></i>' +
        '<span class="text-xs" style="font-weight:800;color:var(--secondary-text)">Sistem Normal</span>' +
      '</div>' +
      '<p>' + angka(jml) + ' akun terdaftar · ' + esc(App.data.config.tahunAjaranAktif || '') + '</p>';
  }
  ikon();
}

/* ── 10. MENU PER PERAN ─────────────────────────────────────────────── */

const MENU = {
  Siswa: [
    { grup: 'Menu Utama' },
    { id: 'dashboard',  ikon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'materi',     ikon: 'book-open',        label: 'Materi Pembelajaran' },
    { id: 'tugas',      ikon: 'clipboard-list',   label: 'Tugas & Proyek', hitung: 'tugas' },
    { id: 'kuis',       ikon: 'file-check-2',     label: 'Kuis & Ujian',   hitung: 'kuis' },
    { id: 'nilai',      ikon: 'star',             label: 'Nilai Saya' },
    { grup: 'Aktivitas & Sosial' },
    { id: 'gamifikasi', ikon: 'trophy',           label: 'Gamifikasi' },
    { id: 'leaderboard',ikon: 'bar-chart-3',      label: 'Leaderboard' },
    { id: 'pengumuman', ikon: 'megaphone',        label: 'Pengumuman' },
    { id: 'notifikasi', ikon: 'bell',             label: 'Notifikasi', hitung: 'notif' },
    { grup: 'Akun' },
    { id: 'profil',     ikon: 'user',             label: 'Profil Pengguna' }
  ],
  Guru: [
    { grup: 'Overview' },
    { id: 'dashboard',  ikon: 'layout-dashboard', label: 'Dashboard Guru' },
    { id: 'penilaian',  ikon: 'check-square',     label: 'Penilaian & Leger', hitung: 'nilai' },
    { grup: 'Akademik & Konten' },
    { id: 'materi',     ikon: 'book-open',        label: 'Materi Pembelajaran' },
    { id: 'tugas',      ikon: 'clipboard-list',   label: 'Tugas & Praktikum' },
    { id: 'kuis',       ikon: 'file-check-2',     label: 'Kuis & Ujian' },
    { grup: 'Pemantauan' },
    { id: 'leaderboard',ikon: 'bar-chart-3',      label: 'Leaderboard Kelas' },
    { id: 'pengumuman', ikon: 'megaphone',        label: 'Pengumuman' },
    { id: 'notifikasi', ikon: 'bell',             label: 'Notifikasi', hitung: 'notif' },
    { grup: 'Akun' },
    { id: 'profil',     ikon: 'user',             label: 'Profil Pengguna' }
  ],
  Kaprog: [
    { grup: 'Overview' },
    { id: 'dashboard',  ikon: 'layout-dashboard', label: 'Dashboard Jurusan' },
    { id: 'rekap',      ikon: 'file-bar-chart',   label: 'Rekap & Laporan' },
    { grup: 'Pemantauan' },
    { id: 'materi',     ikon: 'book-open',        label: 'Materi Terbit' },
    { id: 'tugas',      ikon: 'clipboard-list',   label: 'Tugas Aktif' },
    { id: 'leaderboard',ikon: 'bar-chart-3',      label: 'Leaderboard TKJ' },
    { id: 'log',        ikon: 'activity',         label: 'Audit & Log' },
    { grup: 'Komunikasi' },
    { id: 'pengumuman', ikon: 'megaphone',        label: 'Pengumuman' },
    { id: 'notifikasi', ikon: 'bell',             label: 'Notifikasi', hitung: 'notif' },
    { grup: 'Akun' },
    { id: 'profil',     ikon: 'user',             label: 'Profil Pengguna' }
  ],
  Admin: [
    { grup: 'Overview' },
    { id: 'dashboard',  ikon: 'shield',           label: 'Admin Control Center' },
    { grup: 'Akademik & Konten' },
    { id: 'materi',     ikon: 'book-open',        label: 'Materi Pembelajaran' },
    { id: 'tugas',      ikon: 'clipboard-list',   label: 'Tugas & Praktikum' },
    { id: 'kuis',       ikon: 'file-check-2',     label: 'Kuis & Ujian' },
    { id: 'penilaian',  ikon: 'check-square',     label: 'Penilaian & Leger' },
    { grup: 'Manajemen Master' },
    { id: 'pengguna',   ikon: 'users',            label: 'Direktori Pengguna' },
    { id: 'master',     ikon: 'database',         label: 'Data Kelas & Mapel' },
    { id: 'gamifKonfig',ikon: 'zap',              label: 'Gamifikasi & EXP' },
    { id: 'log',        ikon: 'activity',         label: 'Audit & Log Aktivitas' },
    { id: 'pengaturan', ikon: 'settings',         label: 'Pengaturan Sistem' },
    { grup: 'Akun' },
    { id: 'profil',     ikon: 'user',             label: 'Profil Pengguna' }
  ]
};

/** Bottom nav mobile — maksimal 5 butir. */
const BOTTOM = {
  Siswa : ['dashboard', 'materi', 'tugas', 'nilai', 'profil'],
  Guru  : ['dashboard', 'penilaian', 'materi', 'tugas', 'profil'],
  Kaprog: ['dashboard', 'rekap', 'materi', 'leaderboard', 'profil'],
  Admin : ['dashboard', 'pengguna', 'materi', 'master', 'profil']
};

function hitungLencana(kunci) {
  const d = App.data;
  if (kunci === 'notif') return (d.notifikasi || []).filter(n => n.Dibaca !== 'YA').length;
  if (kunci === 'tugas') {
    const dikirim = (d.pengumpulan || []).map(p => p.TugasID);
    return (d.tugas || []).filter(t => dikirim.indexOf(t.ID) === -1).length;
  }
  if (kunci === 'kuis') {
    const dikerjakan = (d.hasilKuis || []).map(h => h.KuisID);
    return (d.kuis || []).filter(k => k.Status === 'Aktif' && dikerjakan.indexOf(k.ID) === -1).length;
  }
  if (kunci === 'nilai') {
    return (d.pengumpulan || []).filter(p => p.Status === 'Menunggu Penilaian' || p.Status === 'Terlambat').length;
  }
  return 0;
}

function rakitNavigasi() {
  const daftar = MENU[App.me.role] || MENU.Siswa;
  const ul = $('#navList');
  ul.innerHTML = daftar.map(m => {
    if (m.grup) return '<li class="nav-group-label">' + esc(m.grup) + '</li>';
    const n = m.hitung ? hitungLencana(m.hitung) : 0;
    return '<li><button class="nav-link" data-page="' + m.id + '">' +
      '<i data-lucide="' + m.ikon + '"></i><span class="grow truncate">' + esc(m.label) + '</span>' +
      (n > 0 ? '<span class="nav-badge' + (m.hitung === 'notif' ? '' : ' ok') + '">' + n + '</span>' : '') +
      '</button></li>';
  }).join('');
  $$('#navList .nav-link').forEach(b => b.onclick = () => navigasi(b.dataset.page));

  const bn = $('#bottomNav');
  const peta = {};
  daftar.forEach(m => { if (m.id) peta[m.id] = m; });
  bn.innerHTML = (BOTTOM[App.me.role] || BOTTOM.Siswa).map(id => {
    const m = peta[id]; if (!m) return '';
    const n = m.hitung ? hitungLencana(m.hitung) : 0;
    const label = m.label.split(' ')[0];
    return '<button class="bn-item" data-page="' + id + '">' +
      '<i data-lucide="' + m.ikon + '"></i>' + (n > 0 ? '<span class="bn-dot"></span>' : '') +
      '<span>' + esc(label) + '</span></button>';
  }).join('');
  bn.classList.add('show');
  $$('#bottomNav .bn-item').forEach(b => b.onclick = () => navigasi(b.dataset.page));

  $('#sidebar').classList.add('show');
  ikon();
}

function halamanAwal() { return 'dashboard'; }

/* ── 11. ROUTER SPA ─────────────────────────────────────────────────── */

/**
 * Satu-satunya cara berpindah halaman. Render dilakukan dari App.data yang
 * sudah ada di memori, jadi perpindahan tidak menyentuh server sama sekali.
 */
function navigasi(halaman, param) {
  if (!App.siap) return;
  const render = VIEW[halaman];
  if (!render) { toast('Halaman tidak ditemukan', halaman, 'warning'); return; }

  if (App.timerKuis && halaman !== 'kerjakanKuis') hentikanTimerKuis();
  bersihkanGrafik();

  App.page = halaman;
  const wadah = $('#app-container');
  wadah.innerHTML = render(param || {});
  wadah.scrollTop = 0;
  window.scrollTo(0, 0);

  $$('#navList .nav-link').forEach(b => b.classList.toggle('active', b.dataset.page === halaman));
  $$('#bottomNav .bn-item').forEach(b => b.classList.toggle('active', b.dataset.page === halaman));
  $('#topbarTitle').textContent = judulHalaman(halaman);

  tutupSidebar();
  ikon();

  // Hook setelah render (grafik, event listener, timer)
  if (SETELAH[halaman]) SETELAH[halaman](param || {});
}

function judulHalaman(h) {
  const daftar = MENU[App.me.role] || [];
  const m = daftar.find(x => x.id === h);
  if (m) return m.label;
  const ekstra = {
    detailTugas : 'Detail Tugas',
    detailMateri: 'Detail Materi',
    kerjakanKuis: 'Mengerjakan Kuis',
    hasilKuis   : 'Hasil Kuis',
    detailSiswa : 'Rekap Siswa'
  };
  return ekstra[h] || 'GAS LMS';
}

function bukaSidebar()  { $('#sidebar').classList.add('open');    $('#navScrim').classList.add('show'); }
function tutupSidebar() { $('#sidebar').classList.remove('open'); $('#navScrim').classList.remove('show'); }

/* ── 12. KOMPONEN HTML YANG DIPAKAI BERULANG ────────────────────────── */

function kartuStat(opt) {
  return '<div class="card stat-card">' +
    '<div class="stat-top"><span class="stat-label">' + esc(opt.label) + '</span>' +
    '<span class="stat-icon ' + (opt.warna || '') + '"><i data-lucide="' + opt.ikon + '"></i></span></div>' +
    '<div class="stat-value">' + opt.nilai +
      (opt.satuan ? '<span class="stat-unit">' + esc(opt.satuan) + '</span>' : '') + '</div>' +
    (opt.kaki ? '<div class="stat-foot ' + (opt.tren || '') + '">' +
      (opt.kakiIkon ? '<i data-lucide="' + opt.kakiIkon + '"></i>' : '') + esc(opt.kaki) + '</div>' : '') +
    '</div>';
}

function judulHal(judul, sub, aksiHtml) {
  return '<div class="page-head row-between row-wrap">' +
    '<div class="grow"><h1 class="page-title">' + esc(judul) + '</h1>' +
    (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '') + '</div>' +
    (aksiHtml ? '<div class="row row-wrap">' + aksiHtml + '</div>' : '') + '</div>';
}

function kosong(ikonNama, judul, pesan, aksiHtml) {
  return '<div class="card"><div class="empty"><div class="empty-ico">' +
    '<i data-lucide="' + ikonNama + '"></i></div><h3>' + esc(judul) + '</h3>' +
    '<p>' + esc(pesan) + '</p>' + (aksiHtml ? '<div class="mt-md">' + aksiHtml + '</div>' : '') +
    '</div></div>';
}

function chipStatus(status) {
  const peta = {
    'Dinilai'             : ['chip-green', 'check-circle-2'],
    'Menunggu Penilaian'  : ['chip-amber', 'clock'],
    'Terlambat'           : ['chip-red',   'alert-triangle'],
    'Belum Dikumpulkan'   : ['chip',       'circle-dashed'],
    'Selesai'             : ['chip-green', 'check-circle-2'],
    'Dipelajari'          : ['chip-amber', 'book-open'],
    'Belum Dipelajari'    : ['chip',       'circle-dashed'],
    'Aktif'               : ['chip-green', 'radio'],
    'Terbit'              : ['chip-green', 'check'],
    'Nonaktif'            : ['chip-red',   'ban'],
    'Draft'               : ['chip',       'file-edit']
  };
  const p = peta[status] || ['chip', 'circle'];
  return '<span class="chip ' + p[0] + '"><i data-lucide="' + p[1] + '"></i>' + esc(status) + '</span>';
}

function chipEXP(n) {
  return '<span class="chip chip-exp"><i data-lucide="zap"></i>+' + angka(n) + ' EXP</span>';
}

function barisAvatar(nama, sub, fotoUrl) {
  return '<div class="row"><div class="avatar avatar-sm">' + esc(inisial(nama)) + '</div>' +
    '<div class="grow" style="min-width:0"><div class="td-strong truncate">' + esc(nama) + '</div>' +
    (sub ? '<div class="td-muted truncate">' + esc(sub) + '</div>' : '') + '</div></div>';
}

function progresBar(persen, warna) {
  const p = Math.max(0, Math.min(100, Math.round(persen || 0)));
  return '<div class="bar"><div class="bar-fill ' + (warna || '') + '" style="width:' + p + '%"></div></div>';
}

/**
 * Memilih satu dari enam warna pastel secara deterministik dari sebuah kunci.
 * Dipakai untuk sampul materi, ikon kategori, dan avatar kelas — sehingga
 * item yang sama selalu mendapat warna yang sama setiap kali dirender.
 */
const PASTEL = ['t-lilac', 't-pink', 't-mint', 't-peach', 't-sky', 't-lemon'];
function pastel(kunci) {
  const s = String(kunci || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PASTEL[h % PASTEL.length];
}

/**
 * Warna sampul dipetakan tetap ke format materi, sehingga warna benar-benar
 * mengkodekan informasi (bukan sekadar hiasan) dan tidak pernah bentrok.
 */
function pastelFormat(tipe) {
  return { Jobsheet: 't-mint', PDF: 't-peach', Video: 't-sky',
           PPT: 't-lemon', Link: 't-pink' }[tipe] || 't-lilac';
}

/** Ikon besar untuk sampul materi berdasarkan formatnya. */
function ikonFormat(tipe) {
  return { PDF: 'file-text', Video: 'play-circle', Jobsheet: 'clipboard-list',
           PPT: 'presentation', Link: 'link' }[tipe] || 'book-open';
}

/** Ikon berkas berdasarkan ekstensi — membantu pengenalan cepat di lab. */
function ikonBerkas(nama) {
  const n = String(nama || '').toLowerCase();
  if (/\.(pkt|pka)$/.test(n))       return ['pkt',   'network'];
  if (/\.(mp4|mkv|mov|avi)$/.test(n)) return ['video', 'play-circle'];
  if (/\.(pdf)$/.test(n))           return ['',      'file-text'];
  if (/\.(ppt|pptx)$/.test(n))      return ['video', 'presentation'];
  if (/\.(doc|docx|md|txt)$/.test(n)) return ['doc', 'file-type'];
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return ['doc', 'folder-archive'];
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(n)) return ['doc', 'image'];
  return ['doc', 'file'];
}

/* ── 13. UNGGAH BERKAS (base64 → Drive) ─────────────────────────────── */

/** Baca beberapa File menjadi [{ base64, nama, mime }] untuk dikirim ke server. */
function bacaBerkas(fileList, selesai) {
  const files = Array.from(fileList || []);
  if (!files.length) return selesai([]);
  const hasil = [];
  let sisa = files.length;
  files.forEach(f => {
    const fr = new FileReader();
    fr.onload = () => {
      hasil.push({ base64: String(fr.result).split(',')[1], nama: f.name, mime: f.type });
      if (--sisa === 0) selesai(hasil);
    };
    fr.onerror = () => { if (--sisa === 0) selesai(hasil); };
    fr.readAsDataURL(f);
  });
}

/* ── 14. PEMASANGAN AWAL ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  terapkanTema(bacaLokal(LS.tema, 'light'));
  pasangFormLogin();

  $('#btnTema').addEventListener('click', gantiTema);
  $('#btnMenu').addEventListener('click', bukaSidebar);
  $('#navScrim').addEventListener('click', tutupSidebar);
  $('#btnKeluar').addEventListener('click', keluar);
  $('#btnNotif').addEventListener('click', () => navigasi('notifikasi'));

  $('#modalClose').addEventListener('click', tutupModal);
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') tutupModal(); });
  $('#previewClose').addEventListener('click', tutupPratinjau);
  $('#previewTutup').addEventListener('click', tutupPratinjau);
  $('#previewBackdrop').addEventListener('click', e => { if (e.target.id === 'previewBackdrop') tutupPratinjau(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#previewBackdrop').classList.contains('show')) return tutupPratinjau();
    if ($('#modalBackdrop').classList.contains('show')) return tutupModal();
    tutupSidebar();
  });

  const verEl = $('#appVersi');
  if (verEl) verEl.textContent = CONFIG.VERSI;

  ikon();
  setTimeout(() => {
    const boot = $('#bootScreen');
    boot.style.transition = 'opacity .25s ease';
    boot.style.opacity = '0';
    setTimeout(() => boot.style.display = 'none', 260);

    // Sesi yang masih hidup langsung membuka aplikasi; kalau tidak ada,
    // baru layar masuk yang ditampilkan.
    if (!pulihkanSesi()) {
      $('#authScreen').classList.remove('hide');
      $('#inpNomorInduk').focus();
    }
  }, 320);
});

/* ── 15. DIAGNOSTIK KONEKSI ─────────────────────────────────────────── */

/**
 * Dipanggil dari tombol "Uji Koneksi" pada layar masuk. Memisahkan tiga
 * penyebab kegagalan yang tampak sama bagi pengguna: config belum diisi,
 * deployment salah setelan, atau jaringan sekolah memblokir Google.
 */
async function ujiKoneksi() {
  const btn = $('#btnUjiKoneksi');
  const asli = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Menguji…';

  const url = String(CONFIG.GAS_API_URL || '');
  let judul, pesan, tipe;

  if (url.indexOf('script.google.com') === -1) {
    judul = 'Konfigurasi belum diisi';
    pesan = 'Berkas js/config.js masih memakai nilai bawaan. Isi GAS_API_URL dengan URL /exec dari deployment Apps Script.';
    tipe  = 'danger';
  } else if (await apiPing()) {
    judul = 'Backend terhubung';
    pesan = 'Server Apps Script membalas dengan normal. Silakan masuk.';
    tipe  = 'success';
  } else {
    judul = 'Backend tidak menjawab';
    pesan = 'Periksa tiga hal: URL berakhiran /exec, deployment disetel "Who has access: Anyone", ' +
            'dan jaringan ini tidak memblokir script.google.com.';
    tipe  = 'danger';
  }

  btn.disabled = false;
  btn.innerHTML = asli;
  ikon();
  toast(judul, pesan, tipe);
}
