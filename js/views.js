/* ==========================================================================
   GAS LMS — Views.html (Bagian 1)
   Halaman: Dashboard (4 peran), Materi, Tugas, Kuis, Nilai.
   Setiap fungsi VIEW mengembalikan string HTML dan dirender dari App.data
   yang sudah ada di memori — tidak ada panggilan server saat berpindah.
   ========================================================================== */

const VIEW = {};     // id halaman → fungsi render (mengembalikan HTML)
const SETELAH = {};  // id halaman → hook setelah HTML disuntikkan (grafik, event)

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD — bercabang sesuai peran
   ══════════════════════════════════════════════════════════════════════ */

VIEW.dashboard = function () {
  const r = App.me.role;
  if (r === ROLE.SISWA)  return dashboardSiswa();
  if (r === ROLE.GURU)   return dashboardGuru();
  if (r === ROLE.KAPROG) return dashboardKaprog();
  return dashboardAdmin();
};

SETELAH.dashboard = function () {
  const r = App.me.role;
  if (r === ROLE.SISWA)  return grafikSiswa();
  if (r === ROLE.GURU)   return grafikGuru();
  if (r === ROLE.KAPROG) return grafikKaprog();
  grafikAdmin();
};

/* ── Dashboard Siswa ────────────────────────────────────────────────── */

function dashboardSiswa() {
  const d = App.data.dashboard;
  const g = cari.gamif(App.me.id);
  const lvInfo = infoLevel(Number(g.TotalEXP) || 0);
  const persenLevel = lvInfo.persen;

  const tugasBelum = (App.data.tugas || [])
    .filter(t => !(App.data.pengumpulan || []).some(p => p.TugasID === t.ID))
    .sort((a, b) => String(a.Deadline).localeCompare(String(b.Deadline)))
    .slice(0, 3);

  const lanjutBelajar = (App.data.materi || [])
    .map(m => {
      const p = (App.data.progress || []).find(x => x.MateriID === m.ID);
      return { m, status: p ? p.Status : 'Belum Dipelajari' };
    })
    .sort((a, b) => (a.status === 'Dipelajari' ? -1 : 1))
    .slice(0, 3);

  const lb = (App.data.leaderboard || []).filter(x => x.kelasId === App.me.kelasId).slice(0, 4);
  const pengumuman = (App.data.pengumuman || [])
    .filter(p => p.Level !== 'Kelas' || p.TargetKelasID === App.me.kelasId)
    .sort((a, b) => String(b.TanggalPost).localeCompare(String(a.TanggalPost)))[0];

  const badgeSaya = (App.data.badgeSiswa || []).filter(b => b.SiswaID === App.me.id).slice(0, 4);

  return (
    /* Banner sambutan + cincin level */
    '<div class="hero"><div class="row-between row-wrap" style="gap:20px">' +
      '<div class="grow" style="min-width:240px">' +
        '<div class="row row-wrap mb-sm">' +
          '<span class="chip"><i data-lucide="calendar"></i>' + esc(tglPendek(new Date().toISOString())) + '</span>' +
          '<span class="chip chip-primary">Semester ' + esc(App.data.config.semesterAktif || '') +
            ' ' + esc(App.data.config.tahunAjaranAktif || '') + '</span>' +
          '<span class="chip chip-exp"><i data-lucide="flame"></i>' + (g.StreakHari || 0) + ' Hari Berturut-turut</span>' +
        '</div>' +
        '<h1 class="page-title">Selamat datang kembali, ' + esc(App.me.nama.split(' ')[0]) + '</h1>' +
        '<p class="page-sub">' + esc(d.insight[0] || '') + '</p>' +
      '</div>' +
      '<div class="row" style="gap:14px">' +
        '<div class="level-ring" style="--pct:' + persenLevel + '%">' +
          '<span class="lv-cap">LVL</span><span class="lv-num tnum">' + (g.Level || 1) + '</span></div>' +
        '<div style="min-width:150px">' +
          '<div class="row-between mb-sm"><strong style="font-size:13.5px">' + esc(g.Gelar || '') + '</strong>' +
            '<span class="text-xs text-muted tnum">' + persenLevel + '%</span></div>' +
          progresBar(persenLevel, 'amber') +
          '<div class="row-between mt-sm text-xs text-muted tnum">' +
            '<span>' + angka(g.TotalEXP || 0) + ' EXP</span><span>' + angka(lvInfo.berikut) + ' EXP</span></div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +

    /* KPI */
    '<div class="stat-grid">' +
      kartuStat({ label: 'Materi Selesai', ikon: 'book-open-check',
        nilai: d.materiSelesai + '<span class="stat-unit">/' + d.totalMateri + '</span>',
        kaki: persenAman(d.materiSelesai, d.totalMateri) + '% modul tuntas', kakiIkon: 'trending-up', tren: 'up' }) +
      kartuStat({ label: 'Tugas Terkumpul', ikon: 'clipboard-check', warna: 'green',
        nilai: d.tugasTerkumpul + '<span class="stat-unit">/' + d.totalTugas + '</span>',
        kaki: tugasBelum.length ? tugasBelum.length + ' tugas belum dikirim' : 'Semua tugas terkirim',
        kakiIkon: tugasBelum.length ? 'clock' : 'check', tren: tugasBelum.length ? 'down' : 'up' }) +
      kartuStat({ label: 'Rata-Rata Nilai', ikon: 'award', warna: 'amber',
        nilai: d.rataNilai || '—',
        kaki: d.rataNilai >= d.kkm ? 'Di atas KKM ' + d.kkm : 'Di bawah KKM ' + d.kkm,
        kakiIkon: d.rataNilai >= d.kkm ? 'check-circle-2' : 'alert-triangle',
        tren: d.rataNilai >= d.kkm ? 'up' : 'down' }) +
      kartuStat({ label: 'Total EXP Belajar', ikon: 'zap', warna: 'amber',
        nilai: angka(d.totalEXP), satuan: 'EXP',
        kaki: 'Peringkat #' + d.peringkatKelas + ' dari ' + d.totalSiswaKelas + ' di kelas', kakiIkon: 'trophy' }) +
    '</div>' +

    '<div class="split">' +
      /* Kolom kiri */
      '<div class="stack">' +
        '<div class="card">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="alert-circle"></i>Tugas &amp; Proyek Mendatang</span>' +
          '<button class="btn btn-ghost btn-sm" onclick="navigasi(\'tugas\')">Semua Tugas <i data-lucide="chevron-right"></i></button></div>' +
          (tugasBelum.length
            ? tugasBelum.map(kartuTugasRingkas).join('')
            : '<div class="empty" style="padding:24px"><div class="empty-ico"><i data-lucide="party-popper"></i></div>' +
              '<h3>Tidak ada tugas tertunda</h3><p>Semua tugas sudah kamu kumpulkan. Gunakan waktu ini untuk mengulang materi.</p></div>') +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="line-chart"></i>Tren Nilai &amp; Capaian</span></div>' +
          '<div class="chart-box"><canvas id="chartTren"></canvas></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="play-circle"></i>Lanjutkan Belajar</span>' +
          '<button class="btn btn-ghost btn-sm" onclick="navigasi(\'materi\')">Daftar Modul <i data-lucide="chevron-right"></i></button></div>' +
          '<div class="grid grid-3">' + lanjutBelajar.map(x => kartuMateriMini(x.m, x.status)).join('') + '</div>' +
        '</div>' +
      '</div>' +

      /* Kolom kanan */
      '<div class="stack">' +
        '<div class="card">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="bar-chart-3"></i>Leaderboard Kelas</span>' +
          '<span class="chip chip-primary">' + esc(namaKelas(App.me.kelasId)) + '</span></div>' +
          lb.map(barisLeaderboard).join('') +
          '<button class="btn btn-secondary btn-block mt-md" onclick="navigasi(\'leaderboard\')">' +
          'Lihat Leaderboard Lengkap <i data-lucide="arrow-right"></i></button>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="medal"></i>Badge Prestasi</span>' +
          '<span class="text-xs text-muted tnum">' + (g.JumlahBadge || 0) + '/' + (App.data.badge || []).length + ' Terbuka</span></div>' +
          '<div class="grid grid-4" style="gap:10px">' +
            (badgeSaya.length ? badgeSaya.map(b => {
              const meta = cari.badge(b.BadgeID);
              return '<div class="badge-card unlocked" style="padding:6px"><div class="badge-ico" style="width:42px;height:42px">' +
                '<i data-lucide="' + esc(meta.Ikon || 'award') + '"></i></div>' +
                '<div class="badge-name" style="font-size:10.5px">' + esc(meta.NamaBadge || '') + '</div></div>';
            }).join('') : '<p class="text-sm text-muted">Belum ada badge. Selesaikan materi untuk membukanya.</p>') +
          '</div>' +
          '<button class="btn btn-secondary btn-block mt-md" onclick="navigasi(\'gamifikasi\')">' +
          'Pusat Gamifikasi <i data-lucide="arrow-right"></i></button>' +
        '</div>' +

        '<div class="insight"><h3><i data-lucide="sparkles"></i>Analisis Belajarmu</h3><ul>' +
          d.insight.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>' +

        (pengumuman ? '<div class="card card-int" onclick="navigasi(\'pengumuman\')">' +
          '<div class="card-head"><span class="card-title"><i data-lucide="megaphone"></i>Pengumuman Terbaru</span>' +
          (pengumuman.Prioritas === 'Penting' ? '<span class="chip chip-red">PENTING</span>' : '') + '</div>' +
          '<div class="td-strong mb-sm">' + esc(pengumuman.Judul) + '</div>' +
          '<p class="text-sm text-muted clamp-2">' + esc(pengumuman.Isi) + '</p>' +
          '<div class="row mt-md text-xs text-muted"><i data-lucide="user" style="width:13px;height:13px"></i>' +
          esc(namaOrang(pengumuman.PenulisID)) + ' · ' + esc(tglPendek(pengumuman.TanggalPost)) + '</div></div>' : '') +
      '</div>' +
    '</div>'
  );
}

function persenAman(a, b) { return b ? Math.round(a / b * 100) : 0; }

function infoLevel(totalEXP) {
  const tabel = (App.data.levels || []).map(l => ({ level: Number(l.Level), min: Number(l.EXPMin), gelar: l.Gelar }));
  if (!tabel.length) return { persen: 0, berikut: 0, min: 0 };
  let kini = tabel[0];
  tabel.forEach(t => { if (totalEXP >= t.min) kini = t; });
  const next = tabel.find(t => t.level === kini.level + 1) || kini;
  const rentang = Math.max(1, next.min - kini.min);
  return {
    persen : Math.min(100, Math.round((totalEXP - kini.min) / rentang * 100)),
    berikut: next.min, min: kini.min, gelar: kini.gelar, level: kini.level
  };
}

function kartuTugasRingkas(t) {
  const sisa = sisaWaktu(t.Deadline);
  const kelasKartu = sisa.lewat ? 'card-late' : (sisa.mendesak ? 'card-due' : '');
  return '<div class="card card-tight card-int ' + kelasKartu + ' mb-sm" onclick="navigasi(\'detailTugas\',{id:\'' + t.ID + '\'})">' +
    '<div class="row row-wrap mb-sm">' +
      '<span class="chip chip-primary">' + esc(t.Jenis) + '</span>' +
      '<span class="chip ' + (sisa.lewat ? 'chip-red' : (sisa.mendesak ? 'chip-amber' : '')) + '">' +
      '<i data-lucide="clock"></i>' + esc(sisa.teks) + '</span>' +
      chipEXP(t.EXP) +
    '</div>' +
    '<div class="td-strong mb-sm">' + esc(t.Judul) + '</div>' +
    '<p class="text-sm text-muted clamp-2">' + esc(t.Instruksi) + '</p>' +
    '<div class="row-between mt-md"><span class="text-xs text-muted">' + esc(kodeMapel(t.MapelID)) +
    ' · ' + esc(tglJam(t.Deadline)) + '</span>' +
    '<span class="btn btn-primary btn-sm">Kerjakan <i data-lucide="arrow-right"></i></span></div></div>';
}

function kartuMateriMini(m, status) {
  return '<div class="card card-tight card-int" onclick="navigasi(\'detailMateri\',{id:\'' + m.ID + '\'})">' +
    '<div class="thumb ' + pastelFormat(m.Tipe) + '" style="height:84px;margin-bottom:11px">' +
      '<span class="thumb-tag">' + esc(m.Tipe) + '</span>' +
      '<i data-lucide="' + ikonFormat(m.Tipe) + '" style="width:28px;height:28px"></i>' +
    '</div>' +
    '<div class="td-strong clamp-2" style="font-size:13px;line-height:18px">' + esc(m.Judul) + '</div>' +
    '<div class="row-between mt-sm">' +
      '<span class="text-xs text-muted">Pertemuan ' + esc(m.Pertemuan) + '</span>' +
      chipStatus(status) +
    '</div></div>';
}

function barisLeaderboard(x) {
  const saya = x.siswaId === App.me.id;
  const medali = x.peringkat <= 3 ? 'rank-' + x.peringkat : 'rank-n';
  return '<div class="lb-row' + (saya ? ' me' : '') + '">' +
    '<span class="rank-medal ' + medali + '">' + x.peringkat + '</span>' +
    '<div class="avatar avatar-sm">' + esc(inisial(x.nama)) + '</div>' +
    '<div class="grow" style="min-width:0"><div class="td-strong truncate" style="font-size:12.5px">' +
      esc(x.nama) + (saya ? ' <span class="chip chip-primary" style="height:18px;font-size:10px">KAMU</span>' : '') + '</div>' +
    '<div class="td-muted truncate">' + esc(x.gelar) + '</div></div>' +
    '<div class="text-right"><div class="td-strong tnum" style="font-size:13px">' + angka(x.totalEXP) + '</div>' +
    '<div class="td-muted">EXP</div></div></div>';
}

function grafikSiswa() {
  const d = App.data.dashboard;
  const tren = d.trenNilai || [];
  buatGrafik('chartTren', {
    type: 'line',
    data: {
      labels: tren.map(t => t.bulan),
      datasets: [{
        label: 'Rata-rata nilai', data: tren.map(t => t.rata),
        borderColor: '#7C5CFF', backgroundColor: 'rgba(124,92,255,.14)',
        fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#7C5CFF', borderWidth: 2
      }, {
        label: 'KKM', data: tren.map(() => d.kkm),
        borderColor: '#FF5C7A', borderDash: [6, 5], pointRadius: 0, fill: false, borderWidth: 1.5
      }]
    },
    options: opsiGrafik({ ySuggested: [50, 100] })
  });
}

/* ── Dashboard Guru ─────────────────────────────────────────────────── */

function dashboardGuru() {
  const d = App.data.dashboard;
  const antre = (App.data.pengumpulan || [])
    .filter(p => p.Status === 'Menunggu Penilaian' || p.Status === 'Terlambat')
    .sort((a, b) => String(b.TanggalKirim).localeCompare(String(a.TanggalKirim)))
    .slice(0, 5);

  return (
    (d.menungguPenilaian > 0
      ? '<div class="card card-due mb-md"><div class="row-between row-wrap">' +
        '<div class="row grow"><span class="stat-icon amber"><i data-lucide="alert-triangle"></i></span>' +
        '<div class="grow"><div class="td-strong">' + d.menungguPenilaian + ' tugas praktikum menunggu review</div>' +
        '<div class="text-sm text-muted">Siswa telah mengunggah jobsheet. Prioritaskan yang mendekati batas 48 jam.</div></div></div>' +
        '<button class="btn btn-primary" onclick="navigasi(\'penilaian\')">' +
        '<i data-lucide="check-square"></i> Buka Penilaian Kilat</button></div></div>' : '') +

    judulHal('Selamat datang, ' + App.me.nama,
      'Pengampu ' + (App.me.mapelIds || '').split(',').length + ' mata pelajaran produktif · ' +
      App.data.config.tahunAjaranAktif + ' ' + App.data.config.semesterAktif,
      '<button class="btn btn-primary" onclick="formTugas()"><i data-lucide="plus"></i> Buat Tugas Baru</button>' +
      '<button class="btn btn-secondary" onclick="formMateri()"><i data-lucide="upload"></i> Unggah Materi</button>') +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Total Siswa Diampu', ikon: 'users', nilai: d.totalSiswa,
        kaki: d.totalKelas + ' kelas aktif', kakiIkon: 'school' }) +
      kartuStat({ label: 'Tugas Belum Dinilai', ikon: 'clipboard-list', warna: 'amber',
        nilai: d.menungguPenilaian, satuan: 'berkas',
        kaki: d.sudahDinilai + ' sudah dinilai', kakiIkon: 'check-circle-2' }) +
      kartuStat({ label: 'Rata-Rata Nilai', ikon: 'trending-up', warna: 'green',
        nilai: d.rataNilaiKelas || '—', satuan: '/100',
        kaki: 'Target KKM ' + (App.data.config.kkmKejuruan || 75), kakiIkon: 'target' }) +
      kartuStat({ label: 'Materi & Tugas Terbit', ikon: 'library', nilai: d.totalMateri + d.totalTugas,
        kaki: d.totalMateri + ' materi · ' + d.totalTugas + ' tugas', kakiIkon: 'layers' }) +
    '</div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card">' +
        '<div class="card-head"><span class="card-title"><i data-lucide="inbox"></i>Tugas Masuk Terbaru</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="navigasi(\'penilaian\')">Semua <i data-lucide="chevron-right"></i></button></div>' +
        (antre.length ? '<div class="table-wrap"><table><thead><tr>' +
          '<th>Siswa</th><th>Tugas</th><th>Waktu Kirim</th><th>Status</th><th></th></tr></thead><tbody>' +
          antre.map(p => {
            const t = cari.tugas(p.TugasID), s = cari.siswa(p.SiswaID);
            return '<tr><td>' + barisAvatar(s.Nama, s.NomorInduk) + '</td>' +
              '<td><div class="td-strong truncate" style="max-width:220px">' + esc(t.Judul) + '</div>' +
              '<div class="td-muted">' + esc(kodeMapel(t.MapelID)) + ' · ' + esc(namaKelas(t.KelasID)) + '</div></td>' +
              '<td class="td-muted">' + esc(tglJam(p.TanggalKirim)) + '</td>' +
              '<td>' + chipStatus(p.Status) + '</td>' +
              '<td><button class="btn btn-primary btn-sm" onclick="formNilai(\'' + p.ID + '\')">' +
              '<i data-lucide="pen-line"></i> Beri Nilai</button></td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="empty" style="padding:24px"><div class="empty-ico"><i data-lucide="check-check"></i></div>' +
            '<h3>Antrean bersih</h3><p>Semua pengumpulan sudah dinilai.</p></div>') +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><span class="card-title"><i data-lucide="bar-chart-2"></i>Rasio Pengumpulan per Tugas</span></div>' +
        '<div class="chart-box"><canvas id="chartRasio"></canvas></div>' +
      '</div>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="trophy"></i>Top Gamifikasi Kelas</span></div>' +
        (App.data.leaderboard || []).slice(0, 5).map(barisLeaderboard).join('') + '</div>' +
      '<div class="insight"><h3><i data-lucide="sparkles"></i>Ringkasan Kelas</h3><ul>' +
        d.insight.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>' +
    '</div></div>'
  );
}

function grafikGuru() {
  const r = (App.data.dashboard.rasioPengumpulan || []).slice(0, 8);
  buatGrafik('chartRasio', {
    type: 'bar',
    data: {
      labels: r.map(x => potong(x.judul, 22)),
      datasets: [{
        label: '% terkumpul', data: r.map(x => x.persen),
        backgroundColor: r.map(x => x.persen >= 80 ? '#2FBF8F' : (x.persen >= 50 ? '#FF9F43' : '#FF5C7A')),
        borderRadius: 6, borderSkipped: false
      }]
    },
    options: opsiGrafik({ ySuggested: [0, 100], legend: false })
  });
}

function potong(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* ── Dashboard Kaprog ───────────────────────────────────────────────── */

function dashboardKaprog() {
  const d = App.data.dashboard;
  return (
    judulHal('Dashboard Jurusan TKJ',
      'Pemantauan capaian ' + d.totalKelas + ' rombel · ' + d.totalSiswa + ' siswa · ' + d.totalGuru + ' guru produktif',
      '<button class="btn btn-secondary" onclick="navigasi(\'rekap\')"><i data-lucide="download"></i> Rekap &amp; Laporan</button>') +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Rata-Rata Jurusan', ikon: 'gauge', warna: 'green', nilai: d.rataJurusan || '—', satuan: '/100',
        kaki: d.rataJurusan >= d.kkm ? 'Di atas KKM ' + d.kkm : 'Di bawah KKM ' + d.kkm,
        kakiIkon: d.rataJurusan >= d.kkm ? 'trending-up' : 'trending-down',
        tren: d.rataJurusan >= d.kkm ? 'up' : 'down' }) +
      kartuStat({ label: 'Total Siswa TKJ', ikon: 'users', nilai: d.totalSiswa, kaki: d.totalKelas + ' rombel aktif', kakiIkon: 'school' }) +
      kartuStat({ label: 'Materi Terbit', ikon: 'library', nilai: d.materiTerbit, kaki: 'Seluruh mapel produktif', kakiIkon: 'layers' }) +
      kartuStat({ label: 'Butuh Pendampingan', ikon: 'life-buoy', warna: 'red', nilai: (d.butuhPendampingan || []).length,
        satuan: 'siswa', kaki: 'Nilai di bawah KKM', kakiIkon: 'alert-triangle', tren: 'down' }) +
    '</div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="bar-chart-3"></i>Perbandingan Capaian Antar Kelas</span></div>' +
        '<div class="chart-box"><canvas id="chartKelas"></canvas></div></div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="table"></i>Rekap Seluruh Kelas</span></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Siswa</th><th>Rata Nilai</th>' +
        '<th>Rata EXP</th><th>Materi</th><th>Tugas</th></tr></thead><tbody>' +
        (d.perKelas || []).map(k =>
          '<tr><td class="td-strong">' + esc(k.nama) + '</td>' +
          '<td class="td-num tnum">' + k.jumlahSiswa + '</td>' +
          '<td class="td-num tnum" style="color:' + (k.rataNilai >= d.kkm ? 'var(--secondary-text)' : 'var(--danger-text)') + '">' +
            k.rataNilai + '</td>' +
          '<td class="td-num tnum">' + angka(k.rataEXP) + '</td>' +
          '<td class="td-num tnum">' + k.materiTerbit + '</td>' +
          '<td class="td-num tnum">' + k.tugasAktif + '</td></tr>').join('') +
        '</tbody></table></div></div>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="insight"><h3><i data-lucide="sparkles"></i>Catatan Supervisi</h3><ul>' +
        d.insight.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="star"></i>Siswa Berprestasi</span></div>' +
        (d.berprestasi || []).map(barisLeaderboard).join('') + '</div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="life-buoy"></i>Perlu Pendampingan</span></div>' +
        ((d.butuhPendampingan || []).length
          ? (d.butuhPendampingan || []).map(s =>
              '<div class="lb-row"><div class="avatar avatar-sm">' + esc(inisial(s.nama)) + '</div>' +
              '<div class="grow" style="min-width:0"><div class="td-strong truncate" style="font-size:12.5px">' + esc(s.nama) + '</div>' +
              '<div class="td-muted">' + esc(namaKelas(s.kelasId)) + '</div></div>' +
              '<span class="chip chip-red tnum">' + s.rata + '</span></div>').join('')
          : '<p class="text-sm text-muted">Tidak ada siswa di bawah KKM. Capaian jurusan sehat.</p>') +
      '</div>' +
    '</div></div>'
  );
}

function grafikKaprog() {
  const k = App.data.dashboard.perKelas || [];
  buatGrafik('chartKelas', {
    type: 'bar',
    data: {
      labels: k.map(x => x.nama),
      datasets: [
        { label: 'Rata nilai', data: k.map(x => x.rataNilai), backgroundColor: '#7C5CFF', borderRadius: 6, yAxisID: 'y' },
        { label: 'Rata EXP (÷100)', data: k.map(x => Math.round(x.rataEXP / 100)), backgroundColor: '#2FBF8F', borderRadius: 6, yAxisID: 'y' }
      ]
    },
    options: opsiGrafik({ ySuggested: [0, 100] })
  });
}

/* ── Dashboard Admin ────────────────────────────────────────────────── */

function dashboardAdmin() {
  const d = App.data.dashboard;
  const peran = d.perPeran || {};
  const logTerakhir = (App.data.notifikasi || []).slice(0, 4);

  return (
    judulHal('Admin Control Center',
      'Pemantauan sistem, data master, dan aktivitas seluruh pengguna GAS LMS',
      '<button class="btn btn-secondary" onclick="navigasi(\'log\')"><i data-lucide="activity"></i> Audit Log</button>' +
      '<button class="btn btn-primary" onclick="navigasi(\'pengaturan\')"><i data-lucide="settings"></i> Pengaturan Sistem</button>') +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Pengguna Terdaftar', ikon: 'users', nilai: angka(d.totalPengguna), satuan: 'akun',
        kaki: (peran.Siswa || 0) + ' siswa · ' + (peran.Guru || 0) + ' guru · ' + ((peran.Admin || 0) + (peran.Kaprog || 0)) + ' staf',
        kakiIkon: 'user-check' }) +
      kartuStat({ label: 'Aktif Hari Ini', ikon: 'activity', warna: 'green', nilai: d.aktifHariIni, satuan: 'login',
        kaki: 'Dari ' + d.totalPengguna + ' akun terdaftar', kakiIkon: 'trending-up', tren: 'up' }) +
      kartuStat({ label: 'Konten Pembelajaran', ikon: 'library', nilai: d.totalMateri + d.totalTugas + d.totalKuis,
        kaki: d.totalMateri + ' materi · ' + d.totalTugas + ' tugas · ' + d.totalKuis + ' kuis', kakiIkon: 'layers' }) +
      kartuStat({ label: 'Berkas Terkumpul', ikon: 'hard-drive', warna: 'amber', nilai: angka(d.totalPengumpulan),
        kaki: 'Tersimpan di Google Drive', kakiIkon: 'cloud' }) +
    '</div>' +

    '<div class="card mb-md"><div class="card-head"><span class="card-title"><i data-lucide="folder-cog"></i>Manajemen Master Data TKJ</span>' +
      '<span class="chip chip-primary">4 Modul Terkonfigurasi</span></div>' +
      '<div class="grid grid-4">' +
        kartuModulAdmin('graduation-cap', (App.data.kelas || []).length + ' Kelas TKJ', 'Data Kelas',
          'Kelola rombel X, XI, XII, pembagian wali kelas, dan kuota siswa.', 'master') +
        kartuModulAdmin('cpu', (App.data.mapel || []).length + ' Mapel SKKNI', 'Produktif &amp; Mapel',
          'Administrasi Infrastruktur Jaringan, MikroTik, Cloud Server, dan turunannya.', 'master') +
        kartuModulAdmin('calendar-days', esc(d.tahunAjaran + ' ' + d.semester), 'Tahun Ajaran',
          'Status semester aktif, kalender akademik, penguncian periode nilai.', 'pengaturan') +
        kartuModulAdmin('zap', (App.data.badge || []).length + ' Badge Aktif', 'Gamifikasi &amp; EXP',
          'Aturan perolehan EXP jobsheet, bonus streak, dan ambang level.', 'gamifKonfig') +
      '</div></div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="pie-chart"></i>Komposisi Pengguna</span></div>' +
        '<div class="chart-box sm"><canvas id="chartPeran"></canvas></div></div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="users"></i>Direktori Pengguna</span>' +
        '<button class="btn btn-primary btn-sm" onclick="formPengguna()"><i data-lucide="user-plus"></i> Tambah Pengguna</button></div>' +
        tabelPenggunaRingkas() + '</div>' +
    '</div>' +
    '<div class="stack">' +
      '<div class="insight"><h3><i data-lucide="sparkles"></i>Kesehatan Sistem</h3><ul>' +
        d.insight.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="shield-check"></i>Aktivitas Terbaru</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="navigasi(\'log\')">Lengkap <i data-lucide="external-link"></i></button></div>' +
        (logTerakhir.length ? logTerakhir.map(n =>
          '<div class="file-row"><div class="file-ico doc"><i data-lucide="activity"></i></div>' +
          '<div class="grow" style="min-width:0"><div class="td-strong truncate" style="font-size:12.5px">' + esc(n.Judul) + '</div>' +
          '<div class="td-muted truncate">' + esc(n.Pesan) + '</div></div>' +
          '<span class="text-xs text-muted">' + esc(String(n.Tanggal).slice(11, 16)) + '</span></div>').join('')
          : '<p class="text-sm text-muted">Belum ada aktivitas tercatat hari ini.</p>') + '</div>' +
    '</div></div>'
  );
}

function kartuModulAdmin(ik, chip, judul, desc, target) {
  return '<div class="card card-tight card-int" onclick="navigasi(\'' + target + '\')">' +
    '<div class="row-between mb-sm"><span class="stat-icon"><i data-lucide="' + ik + '"></i></span>' +
    '<span class="chip chip-primary">' + chip + '</span></div>' +
    '<div class="td-strong mb-sm">' + judul + '</div>' +
    '<p class="text-xs text-muted clamp-2">' + desc + '</p>' +
    '<div class="row mt-md text-xs" style="color:var(--primary);font-weight:600">Kelola ' +
    '<i data-lucide="arrow-right" style="width:13px;height:13px"></i></div></div>';
}

function tabelPenggunaRingkas() {
  const semua = (App.data.guru || []).concat(App.data.siswa || []).slice(0, 5);
  return '<div class="table-wrap"><table><thead><tr><th>Nama &amp; Identitas</th><th>Peran</th>' +
    '<th>Status</th><th>Terakhir Login</th></tr></thead><tbody>' +
    semua.map(u => '<tr><td>' + barisAvatar(u.Nama, 'No. Induk: ' + u.NomorInduk) + '</td>' +
      '<td>' + (u.Role ? '<span class="chip chip-primary">' + esc(u.Role) + '</span>'
                       : '<span class="chip">' + esc(namaKelas(u.KelasID)) + '</span>') + '</td>' +
      '<td>' + chipStatus(u.Status || 'Aktif') + '</td>' +
      '<td class="td-muted">' + esc(tglPendek(u.TerakhirLogin) || '—') + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '<button class="btn btn-secondary btn-block mt-md" onclick="navigasi(\'pengguna\')">' +
    'Lihat Seluruh ' + ((App.data.siswa || []).length + (App.data.guru || []).length) + ' Akun <i data-lucide="arrow-right"></i></button>';
}

function grafikAdmin() {
  const p = App.data.dashboard.perPeran || {};
  buatGrafik('chartPeran', {
    type: 'doughnut',
    data: {
      labels: Object.keys(p),
      datasets: [{ data: Object.values(p),
        backgroundColor: ['#7C5CFF', '#2FBF8F', '#FF9F43', '#7A7392'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { padding: 14, boxWidth: 12, font: { size: 12 } } } }
    }
  });
}

/** Opsi Chart.js standar agar seluruh grafik konsisten. */
function opsiGrafik(o) {
  o = o || {};
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: o.legend === false ? { display: false }
        : { position: 'bottom', labels: { padding: 14, boxWidth: 12, usePointStyle: true, font: { size: 12 } } },
      tooltip: { padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 12 } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: !o.ySuggested, suggestedMin: o.ySuggested ? o.ySuggested[0] : undefined,
           suggestedMax: o.ySuggested ? o.ySuggested[1] : undefined,
           grid: { drawBorder: false }, ticks: { font: { size: 11 } } }
    }
  };
}

/* ══════════════════════════════════════════════════════════════════════
   MATERI PEMBELAJARAN
   ══════════════════════════════════════════════════════════════════════ */

VIEW.materi = function () {
  const siswa = App.me.role === ROLE.SISWA;
  const f = App.filter.materi || (App.filter.materi = { q: '', tipe: 'Semua', status: 'Semua', mapel: 'Semua' });
  const daftar = saringMateri(f);
  const bisaKelola = App.me.role === ROLE.GURU || App.me.role === ROLE.ADMIN;

  const tipe = ['Semua', 'Jobsheet', 'PDF', 'Video', 'PPT'];

  return (
    judulHal(siswa ? 'Materi Pembelajaran TKJ' : 'Manajemen Materi Pembelajaran',
      siswa ? 'Modul teori, jobsheet praktikum lab jaringan, video tutorial, dan konfigurasi Cisco Packet Tracer serta MikroTik RouterOS.'
            : 'Kelola repositori materi ajar, jobsheet praktikum lab, dan referensi eksternal TKJ.',
      bisaKelola ? '<button class="btn btn-primary" onclick="formMateri()"><i data-lucide="plus"></i> Tambah Materi</button>' : '') +

    '<div class="card card-tight mb-md">' +
      '<div class="grid grid-3 mb-md">' +
        '<div class="input-icon"><i data-lucide="search"></i>' +
        '<input class="input" id="cariMateri" type="search" placeholder="Cari judul, topik, atau kata kunci (contoh: OSPF, VLAN)" value="' + esc(f.q) + '"></div>' +
        selectMapel('filterMapelMateri', f.mapel) +
        (siswa ? selectSederhana('filterStatusMateri', ['Semua', 'Belum Selesai', 'Sudah Selesai'], f.status)
               : selectKelas('filterKelasMateri', f.kelas || 'Semua')) +
      '</div>' +
      '<div class="tabs" style="margin:0">' +
        tipe.map(t => '<button class="tab' + (f.tipe === t ? ' active' : '') + '" data-tipe="' + t + '">' +
          esc(t === 'Semua' ? 'Semua Format' : t) +
          ' (' + (t === 'Semua' ? (App.data.materi || []).length
                                : (App.data.materi || []).filter(m => m.Tipe === t).length) + ')</button>').join('') +
      '</div>' +
    '</div>' +

    '<div id="daftarMateri">' + (daftar.length ? gridMateri(daftar, siswa, bisaKelola)
      : kosong('book-x', 'Materi tidak ditemukan',
          'Ubah kata kunci atau filter format untuk melihat modul lainnya.')) + '</div>'
  );
};

SETELAH.materi = function () {
  const f = App.filter.materi;
  const render = () => {
    const daftar = saringMateri(f);
    $('#daftarMateri').innerHTML = daftar.length
      ? gridMateri(daftar, App.me.role === ROLE.SISWA, App.me.role === ROLE.GURU || App.me.role === ROLE.ADMIN)
      : kosong('book-x', 'Materi tidak ditemukan', 'Ubah kata kunci atau filter format untuk melihat modul lainnya.');
    ikon();
  };
  // Pencarian didebounce & disaring lokal — tidak menyentuh server sama sekali.
  $('#cariMateri').addEventListener('input', debounce(e => { f.q = e.target.value; render(); }, 250));
  const fm = $('#filterMapelMateri');  if (fm) fm.onchange = e => { f.mapel = e.target.value; render(); };
  const fs = $('#filterStatusMateri'); if (fs) fs.onchange = e => { f.status = e.target.value; render(); };
  const fk = $('#filterKelasMateri');  if (fk) fk.onchange = e => { f.kelas = e.target.value; render(); };
  $$('.tab[data-tipe]').forEach(b => b.onclick = () => {
    f.tipe = b.dataset.tipe;
    $$('.tab[data-tipe]').forEach(x => x.classList.toggle('active', x === b));
    render();
  });
};

function saringMateri(f) {
  const q = String(f.q || '').toLowerCase();
  return (App.data.materi || []).filter(m => {
    if (f.tipe !== 'Semua' && m.Tipe !== f.tipe) return false;
    if (f.mapel && f.mapel !== 'Semua' && m.MapelID !== f.mapel) return false;
    if (f.kelas && f.kelas !== 'Semua' && m.KelasID !== f.kelas) return false;
    if (f.status && f.status !== 'Semua') {
      const p = (App.data.progress || []).find(x => x.MateriID === m.ID);
      const selesai = p && p.Status === 'Selesai';
      if (f.status === 'Sudah Selesai' && !selesai) return false;
      if (f.status === 'Belum Selesai' && selesai) return false;
    }
    if (!q) return true;
    return (m.Judul + ' ' + m.Deskripsi + ' ' + namaMapel(m.MapelID)).toLowerCase().indexOf(q) !== -1;
  });
}

function gridMateri(daftar, siswa, bisaKelola) {
  return '<div class="grid grid-3">' + daftar.map(m => {
    const p = (App.data.progress || []).find(x => x.MateriID === m.ID);
    const status = p ? p.Status : 'Belum Dipelajari';
    // Sampul pastel menggantikan baris chip: kategori langsung terbaca dari warna.
    return '<div class="card card-int" onclick="navigasi(\'detailMateri\',{id:\'' + m.ID + '\'})">' +
      '<div class="thumb ' + pastelFormat(m.Tipe) + '">' +
        '<span class="thumb-tag">' + esc(m.Tipe) + '</span>' +
        (siswa && status === 'Selesai'
          ? '<span class="thumb-fav" style="color:var(--secondary-text)" title="Sudah dituntaskan">' +
            '<i data-lucide="check"></i></span>'
          : '') +
        '<i data-lucide="' + ikonFormat(m.Tipe) + '"></i>' +
      '</div>' +
      '<div class="row-between mb-sm">' +
        '<span class="text-xs text-muted" style="font-weight:700">' + esc(kodeMapel(m.MapelID)) + '</span>' +
        (siswa ? chipStatus(status) : chipStatus(m.Status || 'Terbit')) +
      '</div>' +
      '<div class="td-strong clamp-2 mb-sm" style="font-size:14px;line-height:20px">' + esc(m.Judul) + '</div>' +
      '<p class="text-sm text-muted clamp-2 mb-md">' + esc(m.Deskripsi) + '</p>' +
      '<div class="row row-wrap mb-md text-xs text-muted">' +
        '<span class="row" style="gap:4px"><i data-lucide="hash" style="width:13px;height:13px"></i>Pertemuan ' + esc(m.Pertemuan) + '</span>' +
        '<span class="row" style="gap:4px"><i data-lucide="users" style="width:13px;height:13px"></i>' + esc(namaKelas(m.KelasID)) + '</span>' +
      '</div>' +
      progresBar(status === 'Selesai' ? 100 : (status === 'Dipelajari' ? 55 : 0),
                 status === 'Selesai' ? 'green' : 'amber') +
      '<div class="row-between mt-md">' + chipEXP(m.EXP) +
        // Tombol di dalam kartu yang bisa diklik: hentikan perambatan supaya
        // aksi ubah/hapus tidak ikut memicu navigasi kartu.
        '<div class="row" style="gap:6px">' +
          (bisaKelola ? '<button class="btn btn-ghost btn-sm" aria-label="Ubah materi" ' +
            'onclick="event.stopPropagation();formMateri(\'' + m.ID + '\')">' +
            '<i data-lucide="pen-line"></i></button>' +
            '<button class="btn btn-ghost btn-sm" aria-label="Hapus materi" ' +
            'onclick="event.stopPropagation();konfirmHapusMateri(\'' + m.ID + '\')">' +
            '<i data-lucide="trash-2"></i></button>' : '') +
          '<button class="btn btn-primary btn-sm" ' +
          'onclick="event.stopPropagation();navigasi(\'detailMateri\',{id:\'' + m.ID + '\'})">' +
          (siswa ? (status === 'Selesai' ? 'Buka Kembali' : 'Mulai Pelajari') : 'Detail') +
          ' <i data-lucide="arrow-right"></i></button>' +
        '</div>' +
      '</div></div>';
  }).join('') + '</div>';
}

/* ── Detail Materi ──────────────────────────────────────────────────── */

VIEW.detailMateri = function (param) {
  const m = cari.materi(param.id);
  if (!m.ID) return kosong('file-x', 'Materi tidak ditemukan', 'Materi mungkin telah dihapus oleh guru pengampu.');
  const p = (App.data.progress || []).find(x => x.MateriID === m.ID);
  const status = p ? p.Status : 'Belum Dipelajari';
  const siswa = App.me.role === ROLE.SISWA;

  return (
    '<button class="btn btn-ghost btn-sm mb-md" onclick="navigasi(\'materi\')">' +
    '<i data-lucide="arrow-left"></i> Kembali ke Materi</button>' +

    '<div class="card mb-md">' +
      '<div class="row row-wrap mb-md">' +
        '<span class="chip chip-primary"><i data-lucide="book-open"></i>' + esc(m.Tipe) + '</span>' +
        chipEXP(m.EXP) +
        (siswa ? chipStatus(status) : chipStatus(m.Status || 'Terbit')) +
      '</div>' +
      '<h1 class="page-title mb-sm">' + esc(m.Judul) + '</h1>' +
      '<p class="page-sub">' + esc(namaKelas(m.KelasID)) + ' · ' + esc(namaMapel(m.MapelID)) +
      ' · Pengampu: ' + esc(namaOrang(m.GuruID)) + '</p>' +
    '</div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="file-text"></i>Deskripsi &amp; Tujuan Pembelajaran</span></div>' +
        '<p class="text-sm" style="line-height:22px">' + esc(m.Deskripsi) + '</p></div>' +

      (m.FileUrl || m.LinkEksternal ? '<div class="card">' +
        '<div class="card-head"><span class="card-title"><i data-lucide="paperclip"></i>Berkas &amp; Tautan</span></div>' +
        (m.FileUrl ? barisBerkas(m.FileUrl, m.Judul + ' (' + m.Tipe + ')') : '') +
        (m.LinkEksternal ? '<div class="file-row"><div class="file-ico video"><i data-lucide="external-link"></i></div>' +
          '<div class="grow" style="min-width:0"><div class="td-strong truncate">Referensi eksternal</div>' +
          '<div class="td-muted truncate">' + esc(m.LinkEksternal) + '</div></div>' +
          '<a class="btn btn-secondary btn-sm" href="' + esc(m.LinkEksternal) + '" target="_blank" rel="noopener">' +
          '<i data-lucide="arrow-up-right"></i> Buka</a></div>' : '') +
        '</div>' : '') +
    '</div>' +

    '<div class="stack">' +
      (siswa ? '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="check-circle-2"></i>Progres Belajar</span></div>' +
        '<p class="text-sm text-muted mb-md">Tandai materi ini selesai setelah kamu memahami seluruh isinya. ' +
        'Kamu akan memperoleh ' + esc(m.EXP) + ' EXP.</p>' +
        (status === 'Selesai'
          ? '<div class="row" style="color:var(--secondary-text)"><i data-lucide="badge-check"></i>' +
            '<strong class="text-sm">Sudah ditandai selesai</strong></div>'
          : '<button class="btn btn-gamify btn-block" id="btnSelesaiMateri" onclick="tandaiSelesai(\'' + m.ID + '\')">' +
            '<i data-lucide="check"></i> Tandai Selesai Dipelajari</button>') +
        '</div>' : '') +

      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="info"></i>Informasi Modul</span></div>' +
        barisInfo('Mata Pelajaran', namaMapel(m.MapelID)) +
        barisInfo('Kelas Sasaran', namaKelas(m.KelasID)) +
        barisInfo('Pertemuan', 'Ke-' + m.Pertemuan) +
        barisInfo('Format', m.Tipe) +
        barisInfo('Diunggah', tglJam(m.TanggalUpload)) +
        barisInfo('Nilai EXP', m.EXP + ' EXP') +
      '</div>' +
    '</div></div>'
  );
};

function barisBerkas(url, nama) {
  const ik = ikonBerkas(nama);
  return '<div class="file-row"><div class="file-ico ' + ik[0] + '"><i data-lucide="' + ik[1] + '"></i></div>' +
    '<div class="grow" style="min-width:0"><div class="td-strong truncate">' + esc(nama) + '</div>' +
    '<div class="td-muted">Tersimpan di Google Drive sekolah</div></div>' +
    '<button class="btn btn-secondary btn-sm" onclick="pratinjau(\'' + js(url) + '\',\'' + js(nama) + '\')">' +
    '<i data-lucide="eye"></i> Pratinjau</button></div>';
}

function barisInfo(label, nilai) {
  return '<div class="row-between" style="padding:9px 0;border-bottom:1px solid var(--border)">' +
    '<span class="text-sm text-muted">' + esc(label) + '</span>' +
    '<span class="text-sm td-strong text-right">' + esc(nilai) + '</span></div>';
}

/* ── Select bantu ───────────────────────────────────────────────────── */

function selectSederhana(id, opsi, terpilih) {
  return '<select class="select" id="' + id + '">' + opsi.map(o =>
    '<option value="' + esc(o) + '"' + (o === terpilih ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
}

function selectMapel(id, terpilih, tanpaSemua) {
  const opsi = (tanpaSemua ? [] : ['<option value="Semua">Semua Mata Pelajaran</option>'])
    .concat((App.data.mapel || []).map(m =>
      '<option value="' + esc(m.ID) + '"' + (m.ID === terpilih ? ' selected' : '') + '>' +
      esc(m.KodeMapel) + ' — ' + esc(m.NamaMapel) + '</option>'));
  return '<select class="select" id="' + id + '">' + opsi.join('') + '</select>';
}

function selectKelas(id, terpilih, tanpaSemua) {
  const opsi = (tanpaSemua ? [] : ['<option value="Semua">Semua Kelas</option>'])
    .concat((App.data.kelas || []).map(k =>
      '<option value="' + esc(k.ID) + '"' + (k.ID === terpilih ? ' selected' : '') + '>' +
      esc(k.NamaKelas) + '</option>'));
  return '<select class="select" id="' + id + '">' + opsi.join('') + '</select>';
}
