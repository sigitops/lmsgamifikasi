/* ==========================================================================
   GAS LMS — Views2.html (Bagian 2)
   Halaman: Tugas & Proyek, Detail Tugas, Kuis & Ujian, Pengerjaan Kuis,
            Hasil Kuis, Nilai, Penilaian (guru).
   ========================================================================== */

/* ══════════════════════════════════════════════════════════════════════
   TUGAS & PROYEK
   ══════════════════════════════════════════════════════════════════════ */

VIEW.tugas = function () {
  const siswa = App.me.role === ROLE.SISWA;
  const bisaKelola = App.me.role === ROLE.GURU || App.me.role === ROLE.ADMIN;
  const f = App.filter.tugas || (App.filter.tugas = { q: '', status: 'Semua', mapel: 'Semua' });
  const daftar = saringTugas(f);

  const statSiswa = siswa ? ringkasanTugasSiswa() : null;

  return (
    judulHal(siswa ? 'Tugas & Proyek Praktikum' : 'Manajemen Tugas & Praktikum Lab',
      siswa ? 'Kerjakan jobsheet praktikum, unggah berkas konfigurasi, dan pantau umpan balik guru.'
            : 'Kelola jobsheet tugas, rubrik penilaian SKKNI, dan pemantauan tenggat siswa.',
      bisaKelola ? '<button class="btn btn-primary" onclick="formTugas()"><i data-lucide="plus"></i> Buat Tugas Baru</button>' : '') +

    (siswa ? '<div class="stat-grid">' +
      kartuStat({ label: 'Belum Dikerjakan', ikon: 'circle-dashed', warna: 'amber', nilai: statSiswa.belum,
        kaki: statSiswa.mendesak + ' mendekati tenggat', kakiIkon: 'clock' }) +
      kartuStat({ label: 'Menunggu Penilaian', ikon: 'hourglass', nilai: statSiswa.menunggu,
        kaki: 'Sudah dikirim ke guru', kakiIkon: 'send' }) +
      kartuStat({ label: 'Sudah Dinilai', ikon: 'check-circle-2', warna: 'green', nilai: statSiswa.dinilai,
        kaki: 'Rata-rata ' + (statSiswa.rata || '—'), kakiIkon: 'award' }) +
      kartuStat({ label: 'Terlambat', ikon: 'alert-triangle', warna: 'red', nilai: statSiswa.terlambat,
        kaki: statSiswa.terlambat ? 'Kehilangan bonus tepat waktu' : 'Rekam jejak bersih',
        kakiIkon: statSiswa.terlambat ? 'trending-down' : 'check', tren: statSiswa.terlambat ? 'down' : 'up' }) +
      '</div>' : '') +

    '<div class="card card-tight mb-md"><div class="grid grid-3">' +
      '<div class="input-icon"><i data-lucide="search"></i>' +
      '<input class="input" id="cariTugas" type="search" placeholder="Cari judul tugas atau instruksi" value="' + esc(f.q) + '"></div>' +
      selectMapel('filterMapelTugas', f.mapel) +
      selectSederhana('filterStatusTugas',
        siswa ? ['Semua', 'Belum Dikerjakan', 'Menunggu Penilaian', 'Dinilai', 'Terlambat']
              : ['Semua', 'Aktif', 'Lewat Tenggat'], f.status) +
    '</div></div>' +

    '<div id="daftarTugas">' + (daftar.length
      ? (siswa ? daftar.map(kartuTugasSiswa).join('') : tabelTugasGuru(daftar))
      : kosong('clipboard-x', 'Tidak ada tugas',
          siswa ? 'Belum ada tugas yang cocok dengan filter ini.' : 'Buat tugas pertama untuk kelas yang kamu ampu.')) +
    '</div>'
  );
};

SETELAH.tugas = function () {
  const f = App.filter.tugas;
  const siswa = App.me.role === ROLE.SISWA;
  const render = () => {
    const daftar = saringTugas(f);
    $('#daftarTugas').innerHTML = daftar.length
      ? (siswa ? daftar.map(kartuTugasSiswa).join('') : tabelTugasGuru(daftar))
      : kosong('clipboard-x', 'Tidak ada tugas', 'Ubah kata kunci atau filter untuk melihat tugas lainnya.');
    ikon();
  };
  $('#cariTugas').addEventListener('input', debounce(e => { f.q = e.target.value; render(); }, 250));
  $('#filterMapelTugas').onchange  = e => { f.mapel = e.target.value; render(); };
  $('#filterStatusTugas').onchange = e => { f.status = e.target.value; render(); };
};

function statusTugasSaya(t) {
  const p = (App.data.pengumpulan || []).find(x => x.TugasID === t.ID && x.SiswaID === App.me.id);
  if (!p) return { status: 'Belum Dikumpulkan', pgm: null };
  return { status: p.Status, pgm: p };
}

function ringkasanTugasSiswa() {
  const semua = App.data.tugas || [];
  let belum = 0, menunggu = 0, dinilai = 0, terlambat = 0, mendesak = 0;
  const nilai = [];
  semua.forEach(t => {
    const s = statusTugasSaya(t);
    if (s.status === 'Belum Dikumpulkan') {
      belum++;
      const w = sisaWaktu(t.Deadline);
      if (w.mendesak || w.lewat) mendesak++;
    } else if (s.status === 'Dinilai') { dinilai++; nilai.push(Number(s.pgm.Nilai) || 0); }
    else if (s.status === 'Terlambat') { terlambat++; menunggu++; }
    else menunggu++;
  });
  return {
    belum, menunggu, dinilai, terlambat, mendesak,
    rata: nilai.length ? Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length * 10) / 10 : 0
  };
}

function saringTugas(f) {
  const q = String(f.q || '').toLowerCase();
  const siswa = App.me.role === ROLE.SISWA;
  return (App.data.tugas || []).filter(t => {
    if (f.mapel !== 'Semua' && t.MapelID !== f.mapel) return false;
    if (f.status !== 'Semua') {
      if (siswa) {
        const s = statusTugasSaya(t).status;
        if (f.status === 'Belum Dikerjakan' && s !== 'Belum Dikumpulkan') return false;
        if (f.status !== 'Belum Dikerjakan' && s !== f.status) return false;
      } else {
        const lewat = sisaWaktu(t.Deadline).lewat;
        if (f.status === 'Aktif' && lewat) return false;
        if (f.status === 'Lewat Tenggat' && !lewat) return false;
      }
    }
    if (!q) return true;
    return (t.Judul + ' ' + t.Instruksi).toLowerCase().indexOf(q) !== -1;
  }).sort((a, b) => String(a.Deadline).localeCompare(String(b.Deadline)));
}

function kartuTugasSiswa(t) {
  const s = statusTugasSaya(t);
  const w = sisaWaktu(t.Deadline);
  const kelasKartu = s.status === 'Dinilai' ? 'card-done'
    : (s.status === 'Terlambat' || w.lewat ? 'card-late' : (w.mendesak ? 'card-due' : ''));

  return '<div class="card ' + kelasKartu + ' mb-md">' +
    '<div class="row-between row-wrap mb-sm">' +
      '<div class="row row-wrap">' +
        '<span class="chip chip-primary">' + esc(t.Jenis) + '</span>' +
        '<span class="chip">' + esc(kodeMapel(t.MapelID)) + '</span>' +
        chipEXP(t.EXP) +
      '</div>' +
      chipStatus(s.status) +
    '</div>' +
    '<div class="td-strong mb-sm" style="font-size:15px">' + esc(t.Judul) + '</div>' +
    '<p class="text-sm text-muted clamp-2 mb-md">' + esc(t.Instruksi) + '</p>' +
    (s.status === 'Dinilai'
      ? '<div class="card card-tight mb-md" style="background:var(--secondary-soft);border-color:var(--secondary)">' +
        '<div class="row-between"><span class="text-sm td-strong">Nilai diperoleh</span>' +
        '<span class="chip chip-green chip-lg tnum">' + esc(s.pgm.Nilai) + ' / 100 · ' + predikat(s.pgm.Nilai) + '</span></div>' +
        (s.pgm.Feedback ? '<p class="text-sm mt-sm" style="font-style:italic">"' + esc(s.pgm.Feedback) + '"</p>' : '') +
        '</div>' : '') +
    '<div class="row-between row-wrap">' +
      '<span class="chip ' + (w.lewat ? 'chip-red' : (w.mendesak ? 'chip-amber' : '')) + '">' +
      '<i data-lucide="clock"></i>' + esc(tglJam(t.Deadline)) + ' · ' + esc(w.teks) + '</span>' +
      '<button class="btn ' + (s.status === 'Belum Dikumpulkan' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" ' +
      'onclick="navigasi(\'detailTugas\',{id:\'' + t.ID + '\'})">' +
      (s.status === 'Belum Dikumpulkan' ? 'Kerjakan Sekarang' : 'Lihat Detail') +
      ' <i data-lucide="arrow-right"></i></button>' +
    '</div></div>';
}

function tabelTugasGuru(daftar) {
  return '<div class="card"><div class="table-wrap"><table><thead><tr>' +
    '<th>Nama Tugas &amp; Detail</th><th>Mapel &amp; Kelas</th><th>Jenis</th>' +
    '<th>Batas Waktu</th><th>Rasio Pengumpulan</th><th>Aksi</th></tr></thead><tbody>' +
    daftar.map(t => {
      const kumpul = (App.data.pengumpulan || []).filter(p => p.TugasID === t.ID).length;
      const totalSiswa = (App.data.siswa || []).filter(s => s.KelasID === t.KelasID).length || 1;
      const persen = Math.round(kumpul / totalSiswa * 100);
      const w = sisaWaktu(t.Deadline);
      return '<tr>' +
        '<td><div class="td-strong" style="max-width:280px">' + esc(t.Judul) + '</div>' +
          '<div class="td-muted clamp-2" style="max-width:280px">' + esc(t.Instruksi) + '</div></td>' +
        '<td><div class="td-strong">' + esc(kodeMapel(t.MapelID)) + '</div>' +
          '<div class="td-muted">' + esc(namaKelas(t.KelasID)) + '</div></td>' +
        '<td><span class="chip chip-primary">' + esc(t.Jenis) + '</span></td>' +
        '<td><span class="chip ' + (w.lewat ? 'chip-red' : (w.mendesak ? 'chip-amber' : '')) + '">' +
          '<i data-lucide="clock"></i>' + esc(tglJam(t.Deadline)) + '</span></td>' +
        '<td style="min-width:160px"><div class="row-between text-xs mb-sm tnum">' +
          '<span>' + kumpul + ' / ' + totalSiswa + ' siswa</span><span>' + persen + '%</span></div>' +
          progresBar(persen, persen >= 80 ? 'green' : (persen >= 50 ? 'amber' : 'red')) + '</td>' +
        '<td><div class="row" style="gap:6px">' +
          '<button class="btn btn-secondary btn-sm" onclick="navigasi(\'detailTugas\',{id:\'' + t.ID + '\'})" aria-label="Detail">' +
          '<i data-lucide="eye"></i></button>' +
          '<button class="btn btn-secondary btn-sm" onclick="formTugas(\'' + t.ID + '\')" aria-label="Ubah">' +
          '<i data-lucide="pen-line"></i></button>' +
          '<button class="btn btn-secondary btn-sm" onclick="konfirmHapusTugas(\'' + t.ID + '\')" aria-label="Hapus">' +
          '<i data-lucide="trash-2"></i></button>' +
        '</div></td></tr>';
    }).join('') + '</tbody></table></div></div>';
}

/* ── Detail Tugas (siswa mengerjakan / guru meninjau) ────────────────── */

VIEW.detailTugas = function (param) {
  const t = cari.tugas(param.id);
  if (!t.ID) return kosong('file-x', 'Tugas tidak ditemukan', 'Tugas mungkin telah dihapus guru pengampu.');
  return App.me.role === ROLE.SISWA ? detailTugasSiswa(t) : detailTugasGuru(t);
};

SETELAH.detailTugas = function (param) {
  const zone = $('#dropzoneTugas');
  if (!zone) return;
  const input = $('#fileTugas');
  zone.onclick = () => input.click();
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('over'); };
  zone.ondragleave = () => zone.classList.remove('over');
  zone.ondrop = e => {
    e.preventDefault(); zone.classList.remove('over');
    input.files = e.dataTransfer.files;
    tampilkanBerkasTerpilih();
  };
  input.onchange = tampilkanBerkasTerpilih;

  // Draf catatan disimpan lokal agar tidak hilang saat berpindah halaman.
  const kunciDraf = LS.draft + 'tugas_' + param.id;
  const catatan = $('#catatanTugas');
  const draf = bacaLokal(kunciDraf, '');
  if (draf && !catatan.value) catatan.value = draf;
  catatan.addEventListener('input', debounce(() => simpanLokal(kunciDraf, catatan.value), 600));
};

function detailTugasSiswa(t) {
  const s = statusTugasSaya(t);
  const w = sisaWaktu(t.Deadline);
  const terkunci = s.status === 'Dinilai';

  return (
    '<button class="btn btn-ghost btn-sm mb-md" onclick="navigasi(\'tugas\')">' +
    '<i data-lucide="arrow-left"></i> Kembali ke Tugas</button>' +

    '<div class="card ' + (w.lewat ? 'card-late' : (w.mendesak ? 'card-due' : '')) + ' mb-md">' +
      '<div class="row-between row-wrap mb-md">' +
        '<div class="row row-wrap">' +
          '<span class="chip chip-primary"><i data-lucide="flask-conical"></i>' + esc(t.Jenis) + '</span>' +
          '<span class="chip chip-green"><i data-lucide="zap"></i>+' + esc(t.EXP) + ' EXP' +
            (w.lewat ? '' : ' &amp; bonus tepat waktu') + '</span>' +
        '</div>' +
        '<span class="chip ' + (w.lewat ? 'chip-red' : 'chip-amber') + '"><i data-lucide="timer"></i>' +
          esc(tglJam(t.Deadline)) + ' (' + esc(w.teks) + ')</span>' +
      '</div>' +
      '<h1 class="page-title mb-sm">' + esc(t.Judul) + '</h1>' +
      '<p class="page-sub">' + esc(namaKelas(t.KelasID)) + ' · ' + esc(namaMapel(t.MapelID)) +
      ' · Pengampu: ' + esc(namaOrang(t.GuruID)) + '</p>' +
    '</div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head">' +
        '<span class="card-title"><i data-lucide="list-checks"></i>Instruksi &amp; Lembar Kerja</span>' +
        '<span class="chip">Bobot: ' + esc(t.Bobot) + ' Poin</span></div>' +
        '<div class="card card-tight" style="background:var(--primary-soft);border-color:transparent">' +
        '<p class="text-sm" style="line-height:22px">' + esc(t.Instruksi) + '</p></div>' +
        (t.FileLampiranUrl ? '<div class="mt-md">' + barisBerkas(t.FileLampiranUrl, 'Jobsheet ' + t.Judul) + '</div>' : '') +
      '</div>' +

      (terkunci ? '<div class="card card-done">' +
        '<div class="card-head"><span class="card-title"><i data-lucide="badge-check"></i>Hasil Penilaian</span>' +
        '<span class="chip chip-green chip-lg tnum">' + esc(s.pgm.Nilai) + ' / 100 · ' + predikat(s.pgm.Nilai) + '</span></div>' +
        (s.pgm.Feedback ? '<p class="text-sm" style="line-height:22px;font-style:italic">"' + esc(s.pgm.Feedback) + '"</p>' +
          '<div class="row mt-md text-xs text-muted"><i data-lucide="user" style="width:13px;height:13px"></i>' +
          esc(namaOrang(s.pgm.DinilaiOleh)) + ' · ' + esc(tglJam(s.pgm.TanggalDinilai)) + '</div>'
          : '<p class="text-sm text-muted">Guru belum menuliskan umpan balik.</p>') +
        '</div>' : '') +
    '</div>' +

    '<div class="stack">' +
      '<div class="card">' +
        '<div class="card-head"><span class="card-title"><i data-lucide="upload-cloud"></i>Pengumpulan Tugas</span>' +
        chipStatus(s.status) + '</div>' +

        (terkunci
          ? '<p class="text-sm text-muted">Tugas sudah dinilai dan tidak dapat diunggah ulang.</p>'
          : '<div class="dropzone" id="dropzoneTugas" role="button" tabindex="0" ' +
              'aria-label="Pilih berkas untuk diunggah">' +
              '<i data-lucide="upload-cloud"></i>' +
              '<div class="td-strong text-sm">Seret dan lepas berkas ke sini</div>' +
              '<div class="text-xs text-muted mt-sm">atau klik untuk memilih dari perangkat</div>' +
              '<div class="text-xs text-muted mt-sm">Format: .pkt, .pdf, .zip, .rar, .png — maks ' +
              esc(App.data.config.maxUploadMB || 20) + ' MB per berkas</div>' +
            '</div>' +
            '<input type="file" id="fileTugas" multiple class="hide" ' +
              'accept=".pkt,.pka,.pdf,.zip,.rar,.7z,.png,.jpg,.jpeg,.doc,.docx,.txt,.rsc,.cfg">' +
            '<div id="berkasTerpilih" class="mt-md"></div>' +

            '<div class="field mt-md"><label class="label" for="catatanTugas">Catatan Tambahan untuk Guru</label>' +
            '<textarea class="textarea" id="catatanTugas" rows="3" maxlength="500" ' +
            'placeholder="Tuliskan kendala praktikum, IP host khusus, atau catatan konfigurasi switch…">' +
            esc(s.pgm ? s.pgm.Catatan : '') + '</textarea>' +
            '<p class="hint">Draf tersimpan otomatis di perangkat ini.</p></div>' +

            '<button class="btn btn-gamify btn-block" id="btnKirimTugas" onclick="kirimTugas(\'' + t.ID + '\')">' +
            '<i data-lucide="send"></i> ' + (s.pgm ? 'Kirim Ulang Tugas' : 'Kirim Tugas Sekarang') +
            ' (+' + esc(t.EXP) + ' EXP)</button>') +

        (s.pgm && s.pgm.FileNama ? '<div class="mt-md"><div class="label">Berkas terkirim</div>' +
          String(s.pgm.FileNama).split(' | ').map((n, i) =>
            barisBerkas(String(s.pgm.FileUrl).split(' | ')[i] || '', n)).join('') +
          '<div class="text-xs text-muted mt-sm">Dikirim ' + esc(tglJam(s.pgm.TanggalKirim)) + '</div></div>' : '') +
      '</div>' +

      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="clipboard-check"></i>Rubrik Penilaian</span></div>' +
        rubrikBaris('Kerapian topologi &amp; tata letak port', 20) +
        rubrikBaris('Ketepatan konfigurasi &amp; standar SKKNI', 40) +
        rubrikBaris('Hasil pengujian &amp; dokumentasi', 40) +
      '</div>' +
    '</div></div>'
  );
}

function rubrikBaris(nama, bobot) {
  return '<div class="mb-md"><div class="row-between text-sm mb-sm">' +
    '<span>' + nama + '</span><span class="text-muted tnum">Bobot ' + bobot + '%</span></div>' +
    progresBar(bobot, 'amber') + '</div>';
}

function tampilkanBerkasTerpilih() {
  const files = Array.from(($('#fileTugas') || {}).files || []);
  const wadah = $('#berkasTerpilih');
  if (!wadah) return;
  if (!files.length) { wadah.innerHTML = ''; return; }
  wadah.innerHTML = '<div class="label">Daftar berkas siap kirim (' + files.length + ')</div>' +
    files.map(f => {
      const ik = ikonBerkas(f.name);
      return '<div class="file-row"><div class="file-ico ' + ik[0] + '"><i data-lucide="' + ik[1] + '"></i></div>' +
        '<div class="grow" style="min-width:0"><div class="td-strong truncate">' + esc(f.name) + '</div>' +
        '<div class="td-muted tnum">' + (f.size / 1048576).toFixed(2) + ' MB · Siap dikirim</div></div></div>';
    }).join('');
  ikon();
}

function detailTugasGuru(t) {
  const daftarSiswa = (App.data.siswa || []).filter(s => s.KelasID === t.KelasID);
  const pgm = (App.data.pengumpulan || []).filter(p => p.TugasID === t.ID);

  return (
    '<button class="btn btn-ghost btn-sm mb-md" onclick="navigasi(\'tugas\')">' +
    '<i data-lucide="arrow-left"></i> Kembali</button>' +

    '<div class="card mb-md"><div class="row-between row-wrap mb-md">' +
      '<div class="row row-wrap"><span class="chip chip-primary">' + esc(t.Jenis) + '</span>' +
      '<span class="chip">' + esc(kodeMapel(t.MapelID)) + ' · ' + esc(namaKelas(t.KelasID)) + '</span>' +
      chipEXP(t.EXP) + '</div>' +
      '<button class="btn btn-secondary btn-sm" onclick="formTugas(\'' + t.ID + '\')">' +
      '<i data-lucide="pen-line"></i> Ubah Tugas</button></div>' +
      '<h1 class="page-title mb-sm">' + esc(t.Judul) + '</h1>' +
      '<p class="page-sub">' + esc(t.Instruksi) + '</p></div>' +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Total Siswa', ikon: 'users', nilai: daftarSiswa.length }) +
      kartuStat({ label: 'Sudah Mengumpulkan', ikon: 'inbox', warna: 'green', nilai: pgm.length,
        kaki: Math.round(pgm.length / (daftarSiswa.length || 1) * 100) + '% rasio', kakiIkon: 'percent' }) +
      kartuStat({ label: 'Menunggu Dinilai', ikon: 'hourglass', warna: 'amber',
        nilai: pgm.filter(p => p.Status !== 'Dinilai').length }) +
      kartuStat({ label: 'Rata-Rata Nilai', ikon: 'award',
        nilai: (() => { const n = pgm.filter(p => p.Nilai !== '').map(p => Number(p.Nilai));
          return n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length * 10) / 10 : '—'; })() }) +
    '</div>' +

    '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="users"></i>Status Pengumpulan Seluruh Siswa</span></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Siswa</th><th>Status</th><th>Waktu Kirim</th>' +
      '<th>Berkas</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>' +
      daftarSiswa.map(s => {
        const p = pgm.find(x => x.SiswaID === s.ID);
        return '<tr><td>' + barisAvatar(s.Nama, 'NISN ' + s.NomorInduk) + '</td>' +
          '<td>' + chipStatus(p ? p.Status : 'Belum Dikumpulkan') + '</td>' +
          '<td class="td-muted">' + (p ? esc(tglJam(p.TanggalKirim)) : '—') + '</td>' +
          '<td>' + (p && p.FileNama
            ? '<button class="btn btn-ghost btn-sm" onclick="pratinjau(\'' +
              js(String(p.FileUrl).split(' | ')[0]) + '\',\'' + js(String(p.FileNama).split(' | ')[0]) + '\')">' +
              '<i data-lucide="eye"></i> Lihat</button>'
            : '<span class="td-muted">—</span>') + '</td>' +
          '<td class="td-num tnum">' + (p && p.Nilai !== '' ? esc(p.Nilai) : '—') + '</td>' +
          '<td>' + (p ? '<button class="btn btn-primary btn-sm" onclick="formNilai(\'' + p.ID + '\')">' +
            '<i data-lucide="pen-line"></i> ' + (p.Status === 'Dinilai' ? 'Ubah Nilai' : 'Beri Nilai') + '</button>'
            : '<span class="td-muted text-xs">Menunggu</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>'
  );
}

/* ══════════════════════════════════════════════════════════════════════
   KUIS & UJIAN
   ══════════════════════════════════════════════════════════════════════ */

VIEW.kuis = function () {
  const siswa = App.me.role === ROLE.SISWA;
  const daftar = App.data.kuis || [];
  const bisaKelola = App.me.role === ROLE.GURU || App.me.role === ROLE.ADMIN;

  if (!daftar.length) {
    return judulHal('Kuis & Ujian', 'Evaluasi pemahaman materi kejuruan.') +
      kosong('file-question', 'Belum ada kuis',
        siswa ? 'Guru belum menerbitkan kuis untuk kelasmu.' : 'Buat kuis pertama untuk kelas yang kamu ampu.',
        bisaKelola ? '<button class="btn btn-primary" onclick="formKuis()"><i data-lucide="plus"></i> Buat Kuis</button>' : '');
  }

  return (
    judulHal(siswa ? 'Kuis & Ujian' : 'Manajemen Kuis & Ujian',
      siswa ? 'Penilaian objektif dinilai otomatis oleh sistem; soal esai ditinjau guru.'
            : 'Susun bank soal pilihan ganda, benar/salah, isian singkat, dan esai.',
      bisaKelola ? '<button class="btn btn-primary" onclick="formKuis()"><i data-lucide="plus"></i> Buat Kuis Baru</button>' : '') +

    '<div class="grid grid-2">' + daftar.map(k => {
      const hasil = (App.data.hasilKuis || []).find(h => h.KuisID === k.ID && h.SiswaID === App.me.id);
      const w = k.Deadline ? sisaWaktu(k.Deadline) : null;
      const totalPeserta = (App.data.hasilKuis || []).filter(h => h.KuisID === k.ID).length;
      const siswaKelas = (App.data.siswa || []).filter(s => s.KelasID === k.KelasID).length || 1;

      return '<div class="card">' +
        '<div class="row-between row-wrap mb-md">' +
          '<span class="chip chip-primary"><i data-lucide="file-check-2"></i>' + esc(kodeMapel(k.MapelID)) + '</span>' +
          (siswa ? (hasil ? chipStatus('Dinilai') : chipStatus(k.Status)) : chipStatus(k.Status)) +
        '</div>' +
        '<div class="td-strong mb-sm" style="font-size:15px">' + esc(k.Judul) + '</div>' +
        '<div class="row row-wrap mb-md text-xs text-muted">' +
          '<span class="row" style="gap:4px"><i data-lucide="timer" style="width:13px;height:13px"></i>' + esc(k.DurasiMenit) + ' menit</span>' +
          '<span class="row" style="gap:4px"><i data-lucide="list" style="width:13px;height:13px"></i>' + esc(k.JumlahSoal) + ' soal</span>' +
          '<span class="row" style="gap:4px"><i data-lucide="users" style="width:13px;height:13px"></i>' + esc(namaKelas(k.KelasID)) + '</span>' +
        '</div>' +
        (w ? '<div class="mb-md"><span class="chip ' + (w.lewat ? 'chip-red' : (w.mendesak ? 'chip-amber' : '')) + '">' +
          '<i data-lucide="clock"></i>' + esc(tglJam(k.Deadline)) + '</span></div>' : '') +

        (siswa
          ? (hasil
              ? '<div class="card card-tight mb-md" style="background:var(--secondary-soft);border-color:var(--secondary)">' +
                '<div class="row-between"><span class="text-sm td-strong">Skor akhir</span>' +
                '<span class="chip chip-green chip-lg tnum">' + esc(hasil.Skor) + ' / 100</span></div>' +
                '<div class="text-xs text-muted mt-sm tnum">' + esc(hasil.JumlahBenar) + ' benar · ' +
                esc(hasil.JumlahSalah) + ' salah · ' + esc(tglJam(hasil.TanggalKerjakan)) + '</div></div>' +
                '<button class="btn btn-secondary btn-block" onclick="navigasi(\'hasilKuis\',{id:\'' + k.ID + '\'})">' +
                '<i data-lucide="bar-chart-2"></i> Lihat Rincian Hasil</button>'
              : '<div class="row-between">' + chipEXP(k.EXP) +
                '<button class="btn btn-primary btn-sm" onclick="mulaiKuis(\'' + k.ID + '\')">' +
                'Mulai Kerjakan <i data-lucide="arrow-right"></i></button></div>')
          : '<div class="mb-md"><div class="row-between text-xs mb-sm tnum"><span>' + totalPeserta + ' / ' + siswaKelas +
            ' siswa mengerjakan</span><span>' + Math.round(totalPeserta / siswaKelas * 100) + '%</span></div>' +
            progresBar(totalPeserta / siswaKelas * 100, 'green') + '</div>' +
            '<div class="row" style="gap:6px">' +
            '<button class="btn btn-secondary btn-sm grow" onclick="formKuis(\'' + k.ID + '\')">' +
            '<i data-lucide="pen-line"></i> Ubah</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="konfirmHapusKuis(\'' + k.ID + '\')" aria-label="Hapus kuis">' +
            '<i data-lucide="trash-2"></i></button></div>') +
        '</div>';
    }).join('') + '</div>'
  );
};

/* ── Pengerjaan kuis ────────────────────────────────────────────────── */

let soalAktif = [];
let kuisAktif = null;
let indeksSoal = 0;
let mulaiKuisPada = 0;

function mulaiKuis(kuisId) {
  server('ambilSoalKuis', [kuisId], data => {
    kuisAktif = data.kuis;
    soalAktif = data.soal;
    indeksSoal = 0;
    App.draftKuis = bacaLokal(LS.draft + 'kuis_' + kuisId, {}) || {};
    mulaiKuisPada = Date.now();
    navigasi('kerjakanKuis', { id: kuisId });
  }, { teksProses: 'Menyiapkan soal…' });
}

VIEW.kerjakanKuis = function () {
  if (!kuisAktif) return kosong('file-x', 'Kuis belum dimuat', 'Kembali ke daftar kuis lalu pilih kuis yang ingin dikerjakan.');
  const q = soalAktif[indeksSoal];
  const jawab = App.draftKuis[q.ID];
  const opsi = [['A', q.OpsiA], ['B', q.OpsiB], ['C', q.OpsiC], ['D', q.OpsiD]].filter(o => o[1]);
  const terjawab = Object.keys(App.draftKuis).filter(k => App.draftKuis[k]).length;

  return (
    '<div class="card mb-md"><div class="row-between row-wrap">' +
      '<div class="row grow" style="min-width:220px">' +
        '<span class="brand-mark">R</span>' +
        '<div class="grow"><div class="td-strong">' + esc(kuisAktif.Judul) + '</div>' +
        '<div class="text-xs text-muted">' + esc(namaMapel(kuisAktif.MapelID)) + ' · ' + esc(namaKelas(kuisAktif.KelasID)) + '</div></div>' +
      '</div>' +
      '<div class="row row-wrap">' +
        '<span class="chip chip-amber chip-lg"><i data-lucide="timer"></i>Sisa <span id="sisaWaktuKuis" class="tnum">--:--</span></span>' +
        '<span class="chip chip-primary chip-lg tnum">Soal ' + (indeksSoal + 1) + ' dari ' + soalAktif.length + '</span>' +
        '<button class="btn btn-gamify" id="btnSelesaiKuis" onclick="konfirmSelesaiKuis()">' +
        '<i data-lucide="check-circle-2"></i> Selesaikan &amp; Kumpulkan</button>' +
      '</div>' +
    '</div></div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card">' +
        '<div class="row-between row-wrap mb-md">' +
          '<div class="row"><span class="chip chip-primary chip-lg">#' + (indeksSoal + 1) + '</span>' +
          '<div><div class="td-strong">Pertanyaan Nomor ' + (indeksSoal + 1) + '</div>' +
          '<div class="text-xs text-muted">' + esc(q.TipeSoal) + '</div></div></div>' +
          '<span class="chip chip-exp"><i data-lucide="zap"></i>' + esc(q.Poin) + ' Poin</span>' +
        '</div>' +

        '<p class="mb-md" style="font-size:15px;line-height:24px">' + esc(q.Pertanyaan) + '</p>' +

        (opsi.length
          ? opsi.map(o =>
              '<button class="opt' + (jawab === o[0] ? ' selected' : '') + '" ' +
              'onclick="pilihJawaban(\'' + q.ID + '\',\'' + o[0] + '\')" ' +
              'aria-pressed="' + (jawab === o[0] ? 'true' : 'false') + '">' +
              '<span class="opt-key">' + o[0] + '</span>' +
              '<span class="opt-text grow">' + esc(o[1]) + '</span>' +
              (jawab === o[0] ? '<i data-lucide="check-circle-2" style="width:17px;height:17px;color:var(--primary)"></i>' : '') +
              '</button>').join('')
          : '<div class="field"><label class="label" for="jawabanIsian">Jawaban kamu</label>' +
            '<textarea class="textarea" id="jawabanIsian" rows="4" placeholder="Tuliskan jawabanmu…" ' +
            'oninput="pilihJawaban(\'' + q.ID + '\', this.value)">' + esc(jawab || '') + '</textarea></div>') +

        '<div class="row-between mt-md">' +
          '<button class="btn btn-secondary" onclick="pindahSoal(-1)"' + (indeksSoal === 0 ? ' disabled' : '') + '>' +
          '<i data-lucide="arrow-left"></i> Sebelumnya</button>' +
          '<button class="btn btn-primary" onclick="pindahSoal(1)"' +
          (indeksSoal === soalAktif.length - 1 ? ' disabled' : '') + '>Berikutnya <i data-lucide="arrow-right"></i></button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="grid-3x3"></i>Navigasi Soal</span>' +
        '<span class="chip chip-primary tnum">' + terjawab + '/' + soalAktif.length + '</span></div>' +
        '<div class="qnav">' + soalAktif.map((s, i) =>
          '<button class="qnav-btn' + (App.draftKuis[s.ID] ? ' answered' : '') +
          (i === indeksSoal ? ' current' : '') + '" onclick="keSoal(' + i + ')" ' +
          'aria-label="Soal ' + (i + 1) + (App.draftKuis[s.ID] ? ', sudah dijawab' : ', belum dijawab') + '">' +
          (i + 1) + '</button>').join('') + '</div>' +
        '<div class="row row-wrap mt-md text-xs text-muted">' +
          '<span class="row" style="gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:var(--primary)"></span>Sudah dijawab</span>' +
          '<span class="row" style="gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:var(--surface-alt);border:1px solid var(--border)"></span>Belum</span>' +
        '</div></div>' +

      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="shield-check"></i>Panduan &amp; Integritas</span></div>' +
        panduanKuis(1, 'Jawaban tersimpan otomatis', 'Setiap opsi yang kamu pilih langsung disimpan di perangkat ini.') +
        panduanKuis(2, 'Penilaian objektif otomatis', 'Pilihan ganda, benar/salah, dan isian singkat dinilai server saat dikumpulkan.') +
        panduanKuis(3, 'Batas waktu', 'Kuis tertutup otomatis dan langsung dinilai saat hitungan mundur mencapai 00:00.') +
      '</div>' +
    '</div></div>'
  );
};

SETELAH.kerjakanKuis = function () { jalankanTimerKuis(); };

function panduanKuis(no, judul, isi) {
  return '<div class="row mb-md" style="align-items:flex-start;gap:10px">' +
    '<span class="rank-medal rank-n" style="background:var(--primary-soft);color:var(--primary-strong)">' + no + '</span>' +
    '<div class="grow"><div class="td-strong text-sm">' + judul + '</div>' +
    '<div class="text-xs text-muted" style="line-height:17px">' + isi + '</div></div></div>';
}

function pilihJawaban(soalId, nilai) {
  App.draftKuis[soalId] = nilai;                       // UI instan, tanpa server
  simpanLokal(LS.draft + 'kuis_' + kuisAktif.ID, App.draftKuis);
  if (soalAktif[indeksSoal].OpsiA) navigasi('kerjakanKuis', { id: kuisAktif.ID });
  else {
    const btn = $$('.qnav-btn')[indeksSoal];
    if (btn) btn.classList.toggle('answered', !!nilai);
  }
}

function pindahSoal(delta) {
  const baru = indeksSoal + delta;
  if (baru < 0 || baru >= soalAktif.length) return;
  indeksSoal = baru;
  navigasi('kerjakanKuis', { id: kuisAktif.ID });
}

function keSoal(i) { indeksSoal = i; navigasi('kerjakanKuis', { id: kuisAktif.ID }); }

function jalankanTimerKuis() {
  hentikanTimerKuis();
  const batas = Number(kuisAktif.DurasiMenit) * 60;
  const tik = () => {
    const lewat = Math.floor((Date.now() - mulaiKuisPada) / 1000);
    const sisa = Math.max(0, batas - lewat);
    const el = $('#sisaWaktuKuis');
    if (el) {
      el.textContent = String(Math.floor(sisa / 60)).padStart(2, '0') + ':' + String(sisa % 60).padStart(2, '0');
      if (sisa <= 60) el.parentElement.className = 'chip chip-red chip-lg';
    }
    if (sisa <= 0) { hentikanTimerKuis(); kirimKuis(true); }
  };
  tik();
  App.timerKuis = setInterval(tik, 1000);
}

function hentikanTimerKuis() {
  if (App.timerKuis) { clearInterval(App.timerKuis); App.timerKuis = null; }
}

function konfirmSelesaiKuis() {
  const belum = soalAktif.filter(s => !App.draftKuis[s.ID]).length;
  konfirmasi('Kumpulkan kuis?',
    belum ? 'Masih ada ' + belum + ' soal yang belum dijawab. Soal kosong dihitung salah. Tetap kumpulkan?'
          : 'Seluruh soal sudah terjawab. Jawaban tidak dapat diubah setelah dikumpulkan.',
    () => kirimKuis(false), 'Ya, kumpulkan');
}

function kirimKuis(otomatis) {
  const durasi = Math.floor((Date.now() - mulaiKuisPada) / 1000);
  hentikanTimerKuis();
  server('kirimJawabanKuis', [kuisAktif.ID, App.draftKuis, durasi], data => {
    hapusLokal(LS.draft + 'kuis_' + kuisAktif.ID);
    if (data.gamifikasi) popEXP(data.gamifikasi.exp, 'kuis selesai');
    const id = kuisAktif.ID;
    muatUlangData(() => {
      rakitNavigasi();
      bukaModal({
        judul: otomatis ? 'Waktu habis — kuis dikumpulkan' : 'Kuis selesai dinilai',
        isi: '<div class="text-center" style="padding:8px 0">' +
          '<div class="stat-icon green" style="width:56px;height:56px;margin:0 auto 14px">' +
          '<i data-lucide="check-circle-2" style="width:28px;height:28px"></i></div>' +
          '<div class="stat-value tnum">' + data.skor + ' <span class="stat-unit">/100</span></div>' +
          '<p class="text-sm text-muted mt-sm">' + data.benar + ' benar · ' + data.salah + ' salah dari ' +
          data.totalSoal + ' soal</p>' +
          (data.adaEsai ? '<p class="text-xs text-muted mt-sm">Soal esai menunggu penilaian guru.</p>' : '') +
          (data.gamifikasi ? '<div class="mt-md">' + chipEXP(data.gamifikasi.exp) + '</div>' : '') +
          '</div>',
        tombol: [
          { teks: 'Lihat Rincian', kelas: 'btn-secondary', ikon: 'bar-chart-2',
            onClick: () => { tutupModal(); navigasi('hasilKuis', { id: id }); } },
          { teks: 'Kembali ke Kuis', kelas: 'btn-primary',
            onClick: () => { tutupModal(); navigasi('kuis'); } }
        ]
      });
    });
  }, { tombol: '#btnSelesaiKuis', teksProses: 'Mengumpulkan…' });
}

VIEW.hasilKuis = function (param) {
  const k = cari.kuis(param.id);
  const h = (App.data.hasilKuis || []).find(x => x.KuisID === param.id && x.SiswaID === App.me.id);
  if (!h) return kosong('file-x', 'Hasil belum tersedia', 'Kamu belum mengerjakan kuis ini.');

  return (
    '<button class="btn btn-ghost btn-sm mb-md" onclick="navigasi(\'kuis\')">' +
    '<i data-lucide="arrow-left"></i> Kembali ke Kuis</button>' +
    judulHal(k.Judul, namaMapel(k.MapelID) + ' · dikerjakan ' + tglJam(h.TanggalKerjakan)) +
    '<div class="stat-grid">' +
      kartuStat({ label: 'Skor Akhir', ikon: 'award', warna: 'green', nilai: h.Skor, satuan: '/100',
        kaki: 'Predikat ' + predikat(h.Skor), kakiIkon: 'star' }) +
      kartuStat({ label: 'Jawaban Benar', ikon: 'check-circle-2', warna: 'green', nilai: h.JumlahBenar }) +
      kartuStat({ label: 'Jawaban Salah', ikon: 'x-circle', warna: 'red', nilai: h.JumlahSalah }) +
      kartuStat({ label: 'Durasi Pengerjaan', ikon: 'timer', warna: 'amber',
        nilai: Math.floor(Number(h.DurasiDetik) / 60), satuan: 'menit',
        kaki: 'Batas ' + k.DurasiMenit + ' menit', kakiIkon: 'clock' }) +
    '</div>' +
    '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="info"></i>Catatan</span></div>' +
    '<p class="text-sm text-muted">Kunci jawaban tidak ditampilkan agar bank soal tetap dapat dipakai ulang. ' +
    'Diskusikan pembahasan bersama guru pengampu pada pertemuan berikutnya.</p></div>'
  );
};

/* ══════════════════════════════════════════════════════════════════════
   NILAI (siswa)
   ══════════════════════════════════════════════════════════════════════ */

VIEW.nilai = function () {
  const d = App.data.dashboard;
  const nilai = App.data.nilai || [];
  const kkm = Number(App.data.config.kkmKejuruan) || 75;

  if (!nilai.length) {
    return judulHal('Rekap & Analitik Nilai', 'Transkrip capaian kompetensi akademik dan praktikum kejuruan TKJ.') +
      kosong('bar-chart-off', 'Belum ada nilai', 'Nilai akan muncul setelah guru menilai tugas atau kuis yang kamu kumpulkan.');
  }

  return (
    judulHal('Rekap & Analitik Nilai Siswa',
      'Transkrip capaian kompetensi akademik, praktikum kejuruan TKJ, dan riwayat penilaian semester aktif.',
      '<button class="btn btn-secondary" onclick="unduhCSVNilai()"><i data-lucide="table"></i> Ekspor CSV</button>' +
      '<button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i> Cetak Rekap</button>') +

    '<div class="card card-tight mb-md"><div class="row row-wrap">' +
      '<span class="chip chip-primary"><i data-lucide="user"></i>' + esc(App.me.nama) + '</span>' +
      '<span class="chip">NISN ' + esc(App.me.nomorInduk) + '</span>' +
      '<span class="chip">' + esc(namaKelas(App.me.kelasId)) + '</span>' +
      '<span class="chip">Semester ' + esc(App.data.config.semesterAktif) + ' ' + esc(App.data.config.tahunAjaranAktif) + '</span>' +
      '<span class="chip ' + (d.rataNilai >= kkm ? 'chip-green' : 'chip-red') + '">' +
      '<i data-lucide="target"></i>KKM ' + kkm + ' · ' + (d.rataNilai >= kkm ? 'Di Atas KKM' : 'Di Bawah KKM') + '</span>' +
    '</div></div>' +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Rata-Rata Nilai', ikon: 'bar-chart-3', nilai: d.rataNilai,
        kaki: 'Predikat ' + predikat(d.rataNilai), kakiIkon: 'star' }) +
      kartuStat({ label: 'Total Penilaian', ikon: 'clipboard-check', warna: 'green', nilai: nilai.length,
        kaki: 'Tugas, praktik, dan kuis', kakiIkon: 'layers' }) +
      kartuStat({ label: 'Di Atas KKM', ikon: 'check-circle-2', warna: 'green',
        nilai: nilai.filter(n => Number(n.Nilai) >= kkm).length + ' / ' + nilai.length,
        kaki: Math.round(nilai.filter(n => Number(n.Nilai) >= kkm).length / nilai.length * 100) + '% ketercapaian',
        kakiIkon: 'percent' }) +
      kartuStat({ label: 'Peringkat Kelas', ikon: 'trophy', warna: 'amber',
        nilai: '#' + d.peringkatKelas, satuan: '/' + d.totalSiswaKelas,
        kaki: esc(namaKelas(App.me.kelasId)), kakiIkon: 'users' }) +
    '</div>' +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="line-chart"></i>Tren Nilai &amp; Capaian Semester</span></div>' +
        '<div class="chart-box"><canvas id="chartTrenNilai"></canvas></div></div>' +

      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="table"></i>Rincian Penilaian per Mata Pelajaran</span></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Mapel &amp; Jobsheet</th><th>Kategori</th>' +
        '<th>KKM</th><th>Nilai</th><th>Predikat</th><th>Status</th></tr></thead><tbody>' +
        nilai.slice().sort((a, b) => String(b.TanggalInput).localeCompare(String(a.TanggalInput))).map(n =>
          '<tr><td><div class="td-strong" style="max-width:280px">' + esc(kodeMapel(n.MapelID)) + ': ' + esc(n.Deskripsi) + '</div>' +
          '<div class="td-muted">' + esc(tglPendek(n.TanggalInput)) + ' · ' + esc(namaOrang(n.GuruID)) + '</div></td>' +
          '<td><span class="chip">' + esc(n.Kategori) + '</span></td>' +
          '<td class="td-num tnum">' + esc(n.KKM) + '</td>' +
          '<td class="td-num tnum" style="color:' + (Number(n.Nilai) >= kkm ? 'var(--secondary-text)' : 'var(--danger-text)') + '">' +
            esc(n.Nilai) + '</td>' +
          '<td><span class="chip chip-primary">' + predikat(n.Nilai) + '</span></td>' +
          '<td>' + (Number(n.Nilai) >= kkm ? '<span class="chip chip-green"><i data-lucide="check"></i>Tuntas</span>'
            : '<span class="chip chip-red"><i data-lucide="alert-triangle"></i>Remedial</span>') + '</td></tr>').join('') +
        '</tbody></table></div></div>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="radar"></i>Capaian per Mapel</span>' +
        '<span class="chip chip-primary">' + (d.capaianMapel || []).length + ' Mapel</span></div>' +
        (d.capaianMapel || []).map(c =>
          '<div class="mb-md"><div class="row-between text-sm mb-sm">' +
          '<span class="truncate grow">' + esc(c.nama) + '</span>' +
          '<span class="td-strong tnum">' + c.rata + ' <span class="text-muted text-xs">(' + predikat(c.rata) + ')</span></span></div>' +
          progresBar(c.rata, c.rata >= kkm ? 'green' : 'red') + '</div>').join('') +
      '</div>' +
      '<div class="insight"><h3><i data-lucide="sparkles"></i>Analisis Capaian</h3><ul>' +
        (d.insight || []).map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>' +
    '</div></div>'
  );
};

SETELAH.nilai = function () {
  const tren = App.data.dashboard.trenNilai || [];
  const kkm = Number(App.data.config.kkmKejuruan) || 75;
  buatGrafik('chartTrenNilai', {
    type: 'line',
    data: {
      labels: tren.map(t => t.bulan),
      datasets: [
        { label: 'Rata-rata nilai', data: tren.map(t => t.rata), borderColor: '#7C5CFF',
          backgroundColor: 'rgba(124,92,255,.14)', fill: true, tension: .35, borderWidth: 2, pointRadius: 4 },
        { label: 'Batas KKM', data: tren.map(() => kkm), borderColor: '#FF5C7A',
          borderDash: [6, 5], pointRadius: 0, borderWidth: 1.5, fill: false }
      ]
    },
    options: opsiGrafik({ ySuggested: [50, 100] })
  });
};

/* ══════════════════════════════════════════════════════════════════════
   PENILAIAN (guru & admin)
   ══════════════════════════════════════════════════════════════════════ */

VIEW.penilaian = function () {
  const f = App.filter.nilai || (App.filter.nilai = { status: 'Menunggu Penilaian', q: '' });
  const daftar = saringPenilaian(f);

  return (
    judulHal('Penilaian & Leger Kelas',
      'Tinjau berkas praktikum, berikan skor sesuai rubrik SKKNI, dan tuliskan umpan balik.',
      '<button class="btn btn-secondary" onclick="unduhCSVLeger()"><i data-lucide="table"></i> Ekspor Leger CSV</button>') +

    '<div class="card card-tight mb-md"><div class="grid grid-2">' +
      '<div class="input-icon"><i data-lucide="search"></i>' +
      '<input class="input" id="cariNilai" type="search" placeholder="Cari nama siswa atau judul tugas" value="' + esc(f.q) + '"></div>' +
      selectSederhana('filterStatusNilai', ['Menunggu Penilaian', 'Terlambat', 'Dinilai', 'Semua'], f.status) +
    '</div></div>' +

    '<div id="daftarPenilaian">' + tabelPenilaian(daftar) + '</div>'
  );
};

SETELAH.penilaian = function () {
  const f = App.filter.nilai;
  const render = () => { $('#daftarPenilaian').innerHTML = tabelPenilaian(saringPenilaian(f)); ikon(); };
  $('#cariNilai').addEventListener('input', debounce(e => { f.q = e.target.value; render(); }, 250));
  $('#filterStatusNilai').onchange = e => { f.status = e.target.value; render(); };
};

function saringPenilaian(f) {
  const q = String(f.q || '').toLowerCase();
  return (App.data.pengumpulan || []).filter(p => {
    if (f.status !== 'Semua' && p.Status !== f.status) return false;
    if (!q) return true;
    const s = cari.siswa(p.SiswaID), t = cari.tugas(p.TugasID);
    return ((s.Nama || '') + ' ' + (t.Judul || '')).toLowerCase().indexOf(q) !== -1;
  }).sort((a, b) => String(b.TanggalKirim).localeCompare(String(a.TanggalKirim)));
}

function tabelPenilaian(daftar) {
  if (!daftar.length) {
    return kosong('check-check', 'Tidak ada berkas pada filter ini',
      'Ganti filter status untuk melihat pengumpulan lain.');
  }
  return '<div class="card"><div class="table-wrap"><table><thead><tr>' +
    '<th>Siswa</th><th>Tugas &amp; Mapel</th><th>Waktu Kirim</th><th>Berkas</th>' +
    '<th>Status</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>' +
    daftar.map(p => {
      const s = cari.siswa(p.SiswaID), t = cari.tugas(p.TugasID);
      const berkas = String(p.FileNama || '').split(' | ').filter(Boolean);
      return '<tr><td>' + barisAvatar(s.Nama, namaKelas(s.KelasID) + ' · ' + s.NomorInduk) + '</td>' +
        '<td><div class="td-strong" style="max-width:240px">' + esc(t.Judul) + '</div>' +
        '<div class="td-muted">' + esc(kodeMapel(t.MapelID)) + ' · ' + esc(t.Jenis) + '</div></td>' +
        '<td class="td-muted">' + esc(tglJam(p.TanggalKirim)) + '</td>' +
        '<td>' + (berkas.length
          ? berkas.map((n, i) => '<button class="btn btn-ghost btn-sm" onclick="pratinjau(\'' +
              js(String(p.FileUrl).split(' | ')[i] || '') + '\',\'' + js(n) + '\')">' +
              '<i data-lucide="file"></i> ' + esc(potong(n, 16)) + '</button>').join('')
          : '<span class="td-muted">—</span>') + '</td>' +
        '<td>' + chipStatus(p.Status) + '</td>' +
        '<td class="td-num tnum">' + (p.Nilai !== '' ? esc(p.Nilai) : '—') + '</td>' +
        '<td><button class="btn btn-primary btn-sm" onclick="formNilai(\'' + p.ID + '\')">' +
        '<i data-lucide="pen-line"></i> ' + (p.Status === 'Dinilai' ? 'Ubah' : 'Nilai') + '</button></td></tr>';
    }).join('') + '</tbody></table></div></div>';
}
