/* ==========================================================================
   GAS LMS — Views3.html (Bagian 3)
   Halaman: Gamifikasi, Leaderboard, Pengumuman, Notifikasi, Profil,
            Direktori Pengguna, Data Master, Konfigurasi Gamifikasi,
            Audit Log, Pengaturan Sistem, Rekap Kaprog.
   ========================================================================== */

/* ══════════════════════════════════════════════════════════════════════
   PUSAT GAMIFIKASI (siswa)
   ══════════════════════════════════════════════════════════════════════ */

VIEW.gamifikasi = function () {
  const g = cari.gamif(App.me.id);
  const lv = infoLevel(Number(g.TotalEXP) || 0);
  const semuaBadge = App.data.badge || [];
  const punya = (App.data.badgeSiswa || []).filter(b => b.SiswaID === App.me.id);
  const idPunya = punya.map(b => b.BadgeID);
  const lb = App.data.leaderboard || [];
  const posisi = lb.find(x => x.siswaId === App.me.id) || {};
  const sekelas = lb.filter(x => x.kelasId === App.me.kelasId);
  const peringkatKelas = sekelas.findIndex(x => x.siswaId === App.me.id) + 1;

  const misi = susunMisiHarian();

  return (
    judulHal('Pusat Gamifikasi & Prestasi Belajar',
      'Pantau perolehan EXP, progres level kejuruan TKJ, koleksi badge kompetensi, dan misi harian.') +

    '<div class="split mb-md"><div class="card">' +
      '<div class="row row-wrap mb-md" style="gap:16px">' +
        '<div class="level-ring" style="--pct:' + lv.persen + '%;width:76px;height:76px">' +
          '<span class="lv-cap">LVL</span><span class="lv-num tnum" style="font-size:22px">' + (g.Level || 1) + '</span></div>' +
        '<div class="grow" style="min-width:200px">' +
          '<div class="row row-wrap mb-sm"><strong style="font-size:17px">' + esc(App.me.nama) + '</strong>' +
          '<span class="chip chip-primary">' + esc(namaKelas(App.me.kelasId)) + '</span></div>' +
          '<div class="row row-wrap mb-sm">' +
            '<span class="chip chip-exp"><i data-lucide="award"></i>' + esc(g.Gelar || '') + '</span>' +
            '<span class="chip chip-green"><i data-lucide="trophy"></i>Peringkat #' + (peringkatKelas || '-') +
            ' di ' + esc(namaKelas(App.me.kelasId)) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="row-between mb-sm">' +
        '<span class="stat-value tnum" style="margin:0">' + angka(g.TotalEXP || 0) +
        '<span class="stat-unit">/ ' + angka(lv.berikut) + ' EXP</span></span>' +
        '<span class="chip chip-green tnum">' + lv.persen + '% Selesai</span>' +
      '</div>' +
      progresBar(lv.persen, 'amber') +
      '<p class="text-xs text-muted mt-sm tnum">Level saat ini: Level ' + (g.Level || 1) +
      ' · Butuh ' + angka(Math.max(0, lv.berikut - (Number(g.TotalEXP) || 0))) + ' EXP lagi menuju level berikutnya.</p>' +

      '<div class="grid grid-3 mt-md">' +
        miniStat('Koleksi Badge', idPunya.length + ' / ' + semuaBadge.length,
          Math.round(idPunya.length / (semuaBadge.length || 1) * 100) + '% terbuka') +
        miniStat('Materi Tuntas', (App.data.progress || []).filter(p => p.Status === 'Selesai').length,
          'dari ' + (App.data.materi || []).length + ' modul') +
        miniStat('EXP Pekan Ini', angka(g.EXPPekanIni || 0), 'akumulasi 7 hari') +
      '</div>' +
    '</div>' +

    '<div class="card"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="flame"></i>Streak Belajar</span>' +
      '<span class="chip chip-exp chip-lg tnum">' + (g.StreakHari || 0) + ' Hari</span></div>' +
      '<p class="text-sm text-muted mb-md">Streak bertambah setiap kali kamu masuk dan belajar pada hari berbeda ' +
      'secara berurutan. Satu hari terlewat akan mengulangnya dari nol.</p>' +
      '<div class="row" style="gap:6px;justify-content:space-between">' +
        ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((h, i) => {
          const aktif = i < Math.min(7, Number(g.StreakHari) || 0);
          return '<div class="text-center grow"><div style="width:100%;aspect-ratio:1;max-width:38px;margin:0 auto;' +
            'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
            'background:' + (aktif ? 'var(--secondary-soft)' : 'var(--surface-alt)') + ';' +
            'color:' + (aktif ? 'var(--secondary-text)' : 'var(--text-faint)') + '">' +
            '<i data-lucide="' + (aktif ? 'check' : 'circle') + '" style="width:16px;height:16px"></i></div>' +
            '<div class="text-xs text-muted mt-sm">' + h + '</div></div>';
        }).join('') +
      '</div>' +
      '<div class="card card-tight mt-md" style="background:var(--tertiary-soft);border-color:transparent">' +
      '<div class="row"><i data-lucide="zap" style="width:17px;height:17px;color:var(--tertiary-text)"></i>' +
      '<span class="text-sm">Bertahan 7 hari berturut-turut memberi bonus ' + esc(100) + ' EXP setiap pekan.</span></div></div>' +
    '</div></div>' +

    '<div class="card mb-md"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="target"></i>Misi Harian &amp; Quest Lab TKJ</span>' +
      '<span class="chip chip-primary tnum">' + misi.filter(m => m.selesai).length + '/' + misi.length + ' Selesai</span></div>' +
      '<div class="grid grid-4">' + misi.map(m =>
        '<div class="card card-tight ' + (m.selesai ? 'card-done' : '') + '">' +
        '<div class="row-between mb-sm"><span class="chip ' + (m.selesai ? 'chip-green' : 'chip-amber') + '">' +
        esc(m.kategori) + '</span>' + (m.selesai ? '<i data-lucide="check-circle-2" style="width:17px;height:17px;color:var(--secondary-text)"></i>' : '') + '</div>' +
        '<div class="td-strong text-sm clamp-2 mb-sm">' + esc(m.judul) + '</div>' +
        '<p class="text-xs text-muted clamp-2 mb-md">' + esc(m.deskripsi) + '</p>' +
        '<div class="row-between text-xs mb-sm tnum"><span class="text-muted">Progres</span>' +
        '<span class="td-strong">' + m.progres + ' / ' + m.target + '</span></div>' +
        progresBar(m.progres / m.target * 100, m.selesai ? 'green' : 'amber') +
        '<div class="mt-md">' + chipEXP(m.exp) + '</div></div>').join('') +
      '</div></div>' +

    '<div class="card"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="medal"></i>Koleksi Badge Kompetensi</span>' +
      '<span class="chip chip-primary tnum">' + idPunya.length + ' dari ' + semuaBadge.length + ' terbuka</span></div>' +
      '<div class="badge-grid">' + semuaBadge.map(b => {
        const dapat = idPunya.indexOf(b.ID) !== -1;
        const rec = punya.find(x => x.BadgeID === b.ID);
        return '<div class="badge-card card ' + (dapat ? 'unlocked' : 'locked') + '">' +
          '<div class="badge-ico"><i data-lucide="' + esc(dapat ? (b.Ikon || 'award') : 'lock') + '"></i>' +
          (dapat ? '<span class="badge-check"><i data-lucide="check"></i></span>' : '') + '</div>' +
          '<div class="badge-name">' + esc(b.NamaBadge) + '</div>' +
          '<div class="badge-desc clamp-2">' + esc(b.Deskripsi) + '</div>' +
          '<div class="mt-md"><span class="chip" style="height:20px;font-size:10px">' + esc(b.Kategori) + '</span></div>' +
          (dapat ? '<div class="text-xs text-muted mt-sm">' + esc(tglPendek(rec.TanggalDapat)) + '</div>'
                 : '<div class="text-xs text-muted mt-sm">Syarat: ' + esc(labelKriteria(b.Kriteria)) + ' ' + esc(b.NilaiKriteria) + '</div>') +
          '</div>';
      }).join('') + '</div></div>'
  );
};

function miniStat(label, nilai, sub) {
  return '<div class="card card-tight" style="box-shadow:none;background:var(--surface-alt)">' +
    '<div class="text-xs text-muted">' + esc(label) + '</div>' +
    '<div class="td-strong tnum mt-sm" style="font-size:17px">' + nilai + '</div>' +
    '<div class="text-xs text-muted">' + esc(sub) + '</div></div>';
}

function labelKriteria(k) {
  return {
    MATERI_SELESAI: 'Materi selesai', TUGAS_DINILAI: 'Tugas dinilai',
    TUGAS_TEPAT_WAKTU: 'Tugas tepat waktu', TUGAS_NILAI_TINGGI: 'Tugas nilai ≥ 90',
    KUIS_SELESAI: 'Kuis selesai', KUIS_NILAI_TINGGI: 'Kuis skor ≥ 90',
    STREAK: 'Streak hari', TOTAL_EXP: 'Total EXP'
  }[k] || k;
}

/** Misi harian dihitung dari data lokal — tidak perlu sheet tambahan. */
function susunMisiHarian() {
  const prog = App.data.progress || [];
  const pgm = App.data.pengumpulan || [];
  const hasil = App.data.hasilKuis || [];
  const g = cari.gamif(App.me.id);
  const hariIni = new Date().toISOString().slice(0, 10);

  const mk = (kategori, judul, deskripsi, progres, target, exp) => ({
    kategori, judul, deskripsi,
    progres: Math.min(progres, target), target, exp,
    selesai: progres >= target
  });

  return [
    mk('Praktikum', 'Selesaikan 1 jobsheet praktikum',
       'Unggah berkas konfigurasi dan laporan pada salah satu tugas praktik lab.',
       pgm.filter(p => String(p.TanggalKirim).slice(0, 10) === hariIni).length, 1, 50),
    mk('Modul', 'Tuntaskan 1 materi pembelajaran',
       'Tandai satu modul sebagai selesai dipelajari untuk menjaga ritme belajar.',
       prog.filter(p => p.Status === 'Selesai' && String(p.TanggalSelesai).slice(0, 10) === hariIni).length, 1, 40),
    mk('Evaluasi', 'Raih skor kuis di atas 85',
       'Kerjakan kuis evaluasi mandiri dan capai skor minimal 85 poin.',
       hasil.filter(h => Number(h.Skor) >= 85).length, 1, 40),
    mk('Konsistensi', 'Pertahankan streak 7 hari',
       'Masuk dan belajar setiap hari untuk membuka bonus konsistensi mingguan.',
       Number(g.StreakHari) || 0, 7, 100)
  ];
}

/* ══════════════════════════════════════════════════════════════════════
   LEADERBOARD
   ══════════════════════════════════════════════════════════════════════ */

VIEW.leaderboard = function () {
  const f = App.filter.lb || (App.filter.lb = { kelas: App.me.role === ROLE.SISWA ? App.me.kelasId : 'Semua' });
  const daftar = saringLeaderboard(f);
  const tiga = daftar.slice(0, 3);
  const saya = daftar.find(x => x.siswaId === App.me.id);

  return (
    judulHal('Leaderboard & Peringkat Siswa TKJ',
      'Peringkat prestasi belajar berbasis akumulasi EXP, capaian praktikum lab jaringan, dan konsistensi tugas harian.') +

    '<div class="card card-tight mb-md"><div class="grid grid-2">' +
      selectKelas('filterKelasLB', f.kelas) +
      '<div class="input-icon"><i data-lucide="search"></i>' +
      '<input class="input" id="cariLB" type="search" placeholder="Cari nama siswa atau NISN"></div>' +
    '</div></div>' +

    (saya ? '<div class="card mb-md" style="border-color:var(--primary)">' +
      '<div class="row-between row-wrap">' +
      '<div class="row grow" style="min-width:220px">' +
        '<span class="rank-medal ' + (saya.peringkat <= 3 ? 'rank-' + saya.peringkat : 'rank-n') + '" ' +
        'style="width:34px;height:34px;font-size:14px">' + saya.peringkat + '</span>' +
        '<div class="avatar">' + esc(inisial(saya.nama)) + '</div>' +
        '<div class="grow"><div class="row row-wrap"><strong>' + esc(saya.nama) + '</strong>' +
        '<span class="chip chip-primary">KAMU</span></div>' +
        '<div class="text-xs text-muted">' + esc(saya.gelar) + ' · Level ' + saya.level + ' · Streak ' + saya.streak + ' hari</div></div>' +
      '</div>' +
      '<div class="row row-wrap">' +
        '<span class="chip chip-exp chip-lg tnum"><i data-lucide="zap"></i>' + angka(saya.totalEXP) + ' EXP</span>' +
        '<span class="chip chip-green chip-lg tnum"><i data-lucide="medal"></i>' + saya.badge + ' Badge</span>' +
      '</div></div>' +
      (saya.peringkat > 1 ? '<p class="text-sm text-muted mt-md">Butuh <strong class="tnum">' +
        angka(daftar[saya.peringkat - 2].totalEXP - saya.totalEXP + 1) + ' EXP</strong> lagi untuk menyalip ' +
        esc(daftar[saya.peringkat - 2].nama) + ' di peringkat #' + (saya.peringkat - 1) + '.</p>' : '') +
      '</div>' : '') +

    (tiga.length === 3 ? '<div class="card mb-md">' +
      '<div class="text-center mb-md"><div class="text-xs text-muted" style="letter-spacing:.08em">PODIUM KEHORMATAN</div>' +
      '<h2 class="mt-sm">Tiga Jawara Jaringan</h2></div>' +
      '<div class="podium">' +
        [1, 0, 2].map(i => {
          const x = tiga[i];
          const first = i === 0;
          return '<div class="podium-item' + (first ? ' first' : '') + '">' +
            '<div class="avatar ' + (first ? 'avatar-lg' : '') + '" style="margin:0 auto">' + esc(inisial(x.nama)) + '</div>' +
            '<div class="td-strong truncate mt-sm" style="font-size:12.5px">' + esc(x.nama) + '</div>' +
            '<div class="text-xs text-muted tnum">' + angka(x.totalEXP) + ' EXP</div>' +
            '<div class="podium-step"><div class="podium-rank">#' + x.peringkat + '</div>' +
            '<div class="text-xs text-muted truncate">' + esc(x.gelar) + '</div></div></div>';
        }).join('') +
      '</div></div>' : '') +

    '<div class="card"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="list-ordered"></i>Papan Peringkat Lengkap</span>' +
      '<span class="chip chip-primary tnum" id="jumlahLB">' + daftar.length + ' Siswa</span></div>' +
      '<div id="tabelLB">' + tabelLeaderboard(daftar) + '</div></div>' +

    '<div class="card mt-md"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="scale"></i>Panduan Perolehan EXP &amp; Fair Play</span></div>' +
      '<div class="grid grid-4">' +
        kartuAturanEXP('monitor-play', 'Praktikum &amp; Lab', 'Menyelesaikan jobsheet Packet Tracer, MikroTik, atau konfigurasi Linux Server.', '+50 s/d +150 EXP') +
        kartuAturanEXP('file-check-2', 'Kuis &amp; Ujian', 'Uji pemahaman materi sub-topik routing, firewall, dan subnetting.', '+15 s/d +55 EXP') +
        kartuAturanEXP('clock', 'Tepat Waktu', 'Bonus instan untuk pengiriman tugas sebelum batas waktu guru pengampu.', '+20 EXP bonus') +
        kartuAturanEXP('flame', 'Streak Harian', 'Konsistensi membaca materi dan aktif di lab minimal 15 menit per hari.', '+25 s/d +100 EXP') +
      '</div>' +
      '<div class="card card-tight mt-md" style="background:var(--primary-soft);border-color:transparent">' +
      '<div class="row" style="align-items:flex-start;gap:10px">' +
      '<i data-lucide="shield-check" style="width:17px;height:17px;color:var(--primary);margin-top:2px"></i>' +
      '<span class="text-sm">Integritas akademik: seluruh perolehan EXP dicatat dengan riwayat aktivitas di server. ' +
      'Duplikasi jobsheet rekan atau penggunaan skrip otomatis berakibat reset EXP berkala.</span></div></div>' +
    '</div>'
  );
};

SETELAH.leaderboard = function () {
  const f = App.filter.lb;
  const render = () => {
    const d = saringLeaderboard(f);
    $('#tabelLB').innerHTML = tabelLeaderboard(d);
    $('#jumlahLB').textContent = d.length + ' Siswa';
    ikon();
  };
  $('#filterKelasLB').onchange = e => { f.kelas = e.target.value; render(); };
  $('#cariLB').addEventListener('input', debounce(e => { f.q = e.target.value; render(); }, 250));
};

function saringLeaderboard(f) {
  const q = String(f.q || '').toLowerCase();
  return (App.data.leaderboard || [])
    .filter(x => (f.kelas === 'Semua' || x.kelasId === f.kelas))
    .filter(x => !q || (x.nama + ' ' + x.nomorInduk).toLowerCase().indexOf(q) !== -1);
}

function tabelLeaderboard(daftar) {
  if (!daftar.length) return kosong('users', 'Tidak ada siswa', 'Ubah filter kelas atau kata kunci pencarian.');
  return '<div class="table-wrap"><table><thead><tr><th>Posisi</th><th>Nama Siswa</th><th>Kelas</th>' +
    '<th>Gelar Keahlian</th><th>Badge</th><th>Streak</th><th>Total EXP</th></tr></thead><tbody>' +
    daftar.map(x => '<tr' + (x.siswaId === App.me.id ? ' style="background:var(--primary-soft)"' : '') + '>' +
      '<td><span class="rank-medal ' + (x.peringkat <= 3 ? 'rank-' + x.peringkat : 'rank-n') + '">' + x.peringkat + '</span></td>' +
      '<td>' + barisAvatar(x.nama + (x.siswaId === App.me.id ? ' (kamu)' : ''), 'NISN ' + x.nomorInduk) + '</td>' +
      '<td class="td-muted">' + esc(namaKelas(x.kelasId)) + '</td>' +
      '<td><span class="chip chip-primary">' + esc(x.gelar) + '</span></td>' +
      '<td class="td-num tnum">' + x.badge + '</td>' +
      '<td><span class="chip chip-exp"><i data-lucide="flame"></i>' + x.streak + ' Hari</span></td>' +
      '<td class="td-num tnum" style="color:var(--primary-strong);font-size:14px">' + angka(x.totalEXP) + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function kartuAturanEXP(ik, judul, isi, nilai) {
  return '<div class="card card-tight"><span class="stat-icon"><i data-lucide="' + ik + '"></i></span>' +
    '<div class="td-strong mt-sm">' + judul + '</div>' +
    '<p class="text-xs text-muted clamp-2 mt-sm">' + isi + '</p>' +
    '<div class="mt-md"><span class="chip chip-exp">' + nilai + '</span></div></div>';
}

/* ══════════════════════════════════════════════════════════════════════
   PENGUMUMAN
   ══════════════════════════════════════════════════════════════════════ */

VIEW.pengumuman = function () {
  const bisaBuat = App.me.role !== ROLE.SISWA;
  const daftar = (App.data.pengumuman || [])
    .filter(p => p.Level !== 'Kelas' || App.me.role !== ROLE.SISWA || p.TargetKelasID === App.me.kelasId)
    .sort((a, b) => String(b.TanggalPost).localeCompare(String(a.TanggalPost)));

  return (
    judulHal('Papan Informasi & Pengumuman Sekolah',
      'Informasi resmi akademik, agenda praktikum lab jaringan, sertifikasi kejuruan, dan agenda SMK HKTI 2.',
      bisaBuat ? '<button class="btn btn-primary" onclick="formPengumuman()"><i data-lucide="plus"></i> Buat Pengumuman</button>' : '') +

    (daftar.length ? '<div class="split"><div class="stack">' +
      daftar.map(p => {
        const penting = p.Prioritas === 'Penting';
        return '<div class="card ' + (penting ? 'card-late' : '') + '">' +
          '<div class="row-between row-wrap mb-md">' +
            '<div class="row row-wrap">' +
              (penting ? '<span class="chip chip-red"><i data-lucide="alert-circle"></i>PENTING</span>' : '') +
              '<span class="chip chip-primary">' + esc(p.Level) +
              (p.Level === 'Kelas' && p.TargetKelasID ? ' · ' + esc(namaKelas(p.TargetKelasID)) : '') + '</span>' +
            '</div>' +
            '<span class="text-xs text-muted">' + esc(tglJam(p.TanggalPost)) + '</span>' +
          '</div>' +
          '<div class="row mb-md"><div class="avatar avatar-sm">' + esc(inisial(namaOrang(p.PenulisID))) + '</div>' +
          '<div><div class="td-strong text-sm">' + esc(namaOrang(p.PenulisID)) + '</div>' +
          '<div class="text-xs text-muted">' + esc(cari.guru(p.PenulisID).Role || 'Pengajar') + '</div></div></div>' +
          '<h3 class="mb-sm">' + esc(p.Judul) + '</h3>' +
          '<p class="text-sm" style="line-height:22px">' + esc(p.Isi) + '</p>' +
          (p.FileUrl ? '<div class="mt-md">' + barisBerkas(p.FileUrl, 'Lampiran ' + p.Judul) + '</div>' : '') +
          (bisaBuat ? '<div class="row mt-md" style="gap:6px">' +
            '<button class="btn btn-secondary btn-sm" onclick="formPengumuman(\'' + p.ID + '\')">' +
            '<i data-lucide="pen-line"></i> Ubah</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="konfirmHapusPengumuman(\'' + p.ID + '\')">' +
            '<i data-lucide="trash-2"></i> Hapus</button></div>' : '') +
          '</div>';
      }).join('') + '</div>' +

      '<div class="stack">' +
        '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="calendar-days"></i>Agenda Terdekat</span></div>' +
          agendaTerdekat() + '</div>' +
        '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="bar-chart-2"></i>Statistik Papan</span></div>' +
          barisInfo('Total pengumuman', daftar.length) +
          barisInfo('Tingkat sekolah', daftar.filter(p => p.Level === 'Sekolah').length) +
          barisInfo('Tingkat jurusan', daftar.filter(p => p.Level === 'Jurusan').length) +
          barisInfo('Tingkat kelas', daftar.filter(p => p.Level === 'Kelas').length) +
        '</div>' +
      '</div></div>'
      : kosong('megaphone-off', 'Belum ada pengumuman', 'Informasi resmi dari sekolah akan tampil di sini.'))
  );
};

function agendaTerdekat() {
  const item = []
    .concat((App.data.tugas || []).map(t => ({ tgl: t.Deadline, judul: t.Judul, tipe: 'Tenggat Tugas', ik: 'clipboard-list' })))
    .concat((App.data.kuis || []).filter(k => k.Deadline).map(k => ({ tgl: k.Deadline, judul: k.Judul, tipe: 'Kuis', ik: 'file-check-2' })))
    .filter(x => !sisaWaktu(x.tgl).lewat)
    .sort((a, b) => String(a.tgl).localeCompare(String(b.tgl)))
    .slice(0, 5);

  if (!item.length) return '<p class="text-sm text-muted">Tidak ada agenda dalam waktu dekat.</p>';
  return item.map(x => {
    const w = sisaWaktu(x.tgl);
    return '<div class="row mb-md" style="align-items:flex-start;gap:11px">' +
      '<div class="stat-icon ' + (w.mendesak ? 'amber' : '') + '" style="width:40px;height:40px">' +
      '<i data-lucide="' + x.ik + '"></i></div>' +
      '<div class="grow" style="min-width:0"><div class="td-strong text-sm clamp-2">' + esc(x.judul) + '</div>' +
      '<div class="text-xs text-muted">' + esc(x.tipe) + ' · ' + esc(tglJam(x.tgl)) + '</div>' +
      '<div class="text-xs" style="color:' + (w.mendesak ? 'var(--tertiary-text)' : 'var(--text-muted)') + '">' +
      esc(w.teks) + '</div></div></div>';
  }).join('');
}

/* ══════════════════════════════════════════════════════════════════════
   NOTIFIKASI
   ══════════════════════════════════════════════════════════════════════ */

VIEW.notifikasi = function () {
  const daftar = (App.data.notifikasi || [])
    .slice().sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)));
  const belum = daftar.filter(n => n.Dibaca !== 'YA').length;

  return (
    judulHal('Pusat Notifikasi & Aktivitas',
      'Pembaruan tugas, penerbitan nilai, perolehan EXP dan badge, serta peringatan batas waktu.',
      belum ? '<button class="btn btn-secondary" id="btnBacaSemua" onclick="tandaiSemuaDibaca()">' +
        '<i data-lucide="check-check"></i> Tandai Semua Dibaca (' + belum + ')</button>' : '') +

    (daftar.length ? daftar.map(n => {
      const ikMap = { Nilai: 'award', Gamifikasi: 'zap', Badge: 'medal', Tugas: 'clipboard-list',
                      Deadline: 'alarm-clock', Materi: 'book-open', Kuis: 'file-check-2', Pengumuman: 'megaphone' };
      const warna = { Nilai: 'green', Gamifikasi: 'amber', Badge: 'amber', Deadline: 'red' }[n.Tipe] || '';
      const baru = n.Dibaca !== 'YA';
      return '<div class="card card-tight card-int mb-sm' + (baru ? ' card-due' : '') + '" ' +
        'onclick="bukaNotifikasi(\'' + n.ID + '\',\'' + js(n.TargetPage) + '\')">' +
        '<div class="row" style="align-items:flex-start;gap:12px">' +
        '<div class="stat-icon ' + warna + '"><i data-lucide="' + (ikMap[n.Tipe] || 'bell') + '"></i></div>' +
        '<div class="grow" style="min-width:0">' +
          '<div class="row row-wrap mb-sm"><span class="chip chip-primary">' + esc(n.Tipe) + '</span>' +
          (baru ? '<span class="chip chip-red">Baru</span>' : '') + '</div>' +
          '<div class="td-strong text-sm">' + esc(n.Judul) + '</div>' +
          '<p class="text-sm text-muted mt-sm">' + esc(n.Pesan) + '</p>' +
          '<div class="text-xs text-muted mt-sm">' + esc(tglJam(n.Tanggal)) + '</div>' +
        '</div>' +
        '<i data-lucide="chevron-right" style="width:17px;height:17px;color:var(--text-faint)"></i>' +
        '</div></div>';
    }).join('')
      : kosong('bell-off', 'Belum ada notifikasi', 'Pemberitahuan tugas, nilai, dan badge akan tampil di sini.'))
  );
};

/* ══════════════════════════════════════════════════════════════════════
   PROFIL
   ══════════════════════════════════════════════════════════════════════ */

VIEW.profil = function () {
  const me = App.me;
  const siswa = me.role === ROLE.SISWA;
  const g = siswa ? cari.gamif(me.id) : {};
  const d = App.data.dashboard;

  return (
    '<div class="card mb-md" style="padding:0;overflow:hidden">' +
      '<div style="height:96px;background:linear-gradient(120deg,var(--primary),var(--primary-hover))"></div>' +
      '<div style="padding:0 20px 20px;margin-top:-34px">' +
        '<div class="row row-wrap" style="align-items:flex-end;gap:16px">' +
          '<div class="avatar avatar-lg" style="border:4px solid var(--surface);width:76px;height:76px">' +
          esc(inisial(me.nama)) + '</div>' +
          '<div class="grow" style="min-width:200px;padding-bottom:4px">' +
            '<div class="row row-wrap"><h2>' + esc(me.nama) + '</h2>' +
            '<span class="chip chip-primary">' + esc(me.role) + '</span>' +
            (siswa ? '<span class="chip">' + esc(namaKelas(me.kelasId)) + '</span>' : '') + '</div>' +
            '<p class="text-sm text-muted mt-sm">No. Induk ' + esc(me.nomorInduk) + ' · ' + esc(me.email) + '</p>' +
          '</div>' +
          '<button class="btn btn-secondary" onclick="formUbahSandi()"><i data-lucide="key-round"></i> Ubah Kata Sandi</button>' +
        '</div>' +

        (siswa ? '<div class="card card-tight mt-md" style="background:var(--surface-alt);border:none">' +
          '<div class="row row-wrap" style="gap:16px">' +
          '<div class="level-ring" style="--pct:' + infoLevel(Number(g.TotalEXP) || 0).persen + '%">' +
          '<span class="lv-cap">LVL</span><span class="lv-num tnum">' + (g.Level || 1) + '</span></div>' +
          '<div class="grow" style="min-width:180px">' +
            '<div class="td-strong">' + esc(g.Gelar || '') + '</div>' +
            '<div class="text-xs text-muted tnum mb-sm">' + angka(g.TotalEXP || 0) + ' / ' +
            angka(infoLevel(Number(g.TotalEXP) || 0).berikut) + ' EXP</div>' +
            progresBar(infoLevel(Number(g.TotalEXP) || 0).persen, 'amber') + '</div>' +
          '<div class="row row-wrap">' +
            '<span class="chip chip-exp"><i data-lucide="flame"></i>' + (g.StreakHari || 0) + ' Hari</span>' +
            '<span class="chip chip-green"><i data-lucide="medal"></i>' + (g.JumlahBadge || 0) + ' Badge</span>' +
          '</div></div></div>' : '') +
      '</div>' +
    '</div>' +

    (siswa ? '<div class="stat-grid">' +
      kartuStat({ label: 'Rata-Rata Nilai', ikon: 'bar-chart-3', nilai: d.rataNilai || '—',
        kaki: 'Predikat ' + predikat(d.rataNilai || 0), kakiIkon: 'star' }) +
      kartuStat({ label: 'Modul Tuntas', ikon: 'book-open-check', warna: 'green',
        nilai: d.materiSelesai + ' / ' + d.totalMateri,
        kaki: persenAman(d.materiSelesai, d.totalMateri) + '% progres', kakiIkon: 'trending-up' }) +
      kartuStat({ label: 'Tugas Terkumpul', ikon: 'clipboard-check',
        nilai: d.tugasTerkumpul + ' / ' + d.totalTugas, kaki: 'Sepanjang semester', kakiIkon: 'calendar' }) +
      kartuStat({ label: 'Peringkat Jurusan', ikon: 'trophy', warna: 'amber', nilai: '#' + d.peringkatJurusan,
        kaki: 'Dari seluruh siswa TKJ', kakiIkon: 'users' }) +
    '</div>' : '') +

    '<div class="split"><div class="card">' +
      '<div class="card-head"><span class="card-title"><i data-lucide="id-card"></i>Data Pokok</span>' +
      '<span class="chip chip-green"><i data-lucide="shield-check"></i>Terverifikasi</span></div>' +
      barisInfo('Nama Lengkap', me.nama) +
      barisInfo(siswa ? 'NISN' : 'NIP', me.nomorInduk) +
      barisInfo('Email Institusi', me.email) +
      barisInfo('Peran dalam Sistem', me.role) +
      (siswa ? barisInfo('Kelas & Rombel', namaKelas(me.kelasId)) : '') +
      (siswa ? barisInfo('Wali Kelas', namaOrang(cari.kelas(me.kelasId).WaliKelasID)) : '') +
      (me.role === ROLE.GURU ? barisInfo('Mapel Diampu',
        String(me.mapelIds || '').split(',').filter(Boolean).map(kodeMapel).join(', ')) : '') +
      barisInfo('Tahun Ajaran Aktif', App.data.config.tahunAjaranAktif + ' — ' + App.data.config.semesterAktif) +
      barisInfo('Terakhir Masuk', tglJam(me.terakhirLogin)) +
      '<p class="hint mt-md">Perubahan data pokok dilakukan melalui admin TKJ agar tetap selaras dengan Dapodik.</p>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="sliders-horizontal"></i>Preferensi Tampilan</span></div>' +
        '<label class="check"><input type="checkbox" id="prefTema" ' +
        (document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : '') + ' onchange="gantiTema()">' +
        '<span><span class="check-text">Mode gelap</span>' +
        '<span class="check-sub">Nyaman untuk sesi praktikum malam di lab.</span></span></label>' +
        '<label class="check"><input type="checkbox" id="prefNotif" checked>' +
        '<span><span class="check-text">Notifikasi dalam aplikasi</span>' +
        '<span class="check-sub">Pemberitahuan tugas, nilai, dan perolehan badge.</span></span></label>' +
        '<label class="check"><input type="checkbox" id="prefSuara">' +
        '<span><span class="check-text">Efek suara gamifikasi</span>' +
        '<span class="check-sub">Nada singkat saat naik level atau membuka badge.</span></span></label>' +
        '<button class="btn btn-secondary btn-block mt-md" onclick="simpanPreferensi()">' +
        '<i data-lucide="save"></i> Simpan Preferensi</button>' +
      '</div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="shield"></i>Keamanan Akun</span></div>' +
        '<p class="text-sm text-muted mb-md">Gunakan kata sandi unik minimal 8 karakter. Jangan bagikan ' +
        'akun kepada siswa lain — seluruh aktivitas tercatat dalam audit log.</p>' +
        '<button class="btn btn-primary btn-block" onclick="formUbahSandi()">' +
        '<i data-lucide="key-round"></i> Ubah Kata Sandi</button>' +
        '<button class="btn btn-secondary btn-block mt-sm" onclick="keluar()">' +
        '<i data-lucide="log-out"></i> Keluar dari Sistem</button>' +
      '</div>' +
    '</div></div>'
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ADMIN — DIREKTORI PENGGUNA
   ══════════════════════════════════════════════════════════════════════ */

VIEW.pengguna = function () {
  const f = App.filter.pengguna || (App.filter.pengguna = { q: '', peran: 'Semua' });
  const daftar = saringPengguna(f);
  const siswa = (App.data.siswa || []).length;
  const guru = (App.data.guru || []).filter(g => g.Role === ROLE.GURU).length;
  const staf = (App.data.guru || []).filter(g => g.Role !== ROLE.GURU).length;

  return (
    judulHal('Direktori Pengguna LMS',
      'Manajemen akses guru produktif, siswa TKJ, dan staf laboratorium.',
      '<button class="btn btn-primary" onclick="formPengguna()"><i data-lucide="user-plus"></i> Tambah Pengguna</button>') +

    '<div class="stat-grid">' +
      kartuStat({ label: 'Total Akun', ikon: 'users', nilai: siswa + guru + staf }) +
      kartuStat({ label: 'Siswa TKJ', ikon: 'graduation-cap', warna: 'green', nilai: siswa }) +
      kartuStat({ label: 'Guru Produktif', ikon: 'user-check', warna: 'amber', nilai: guru }) +
      kartuStat({ label: 'Admin & Kaprog', ikon: 'shield', nilai: staf }) +
    '</div>' +

    '<div class="card card-tight mb-md"><div class="grid grid-2">' +
      '<div class="input-icon"><i data-lucide="search"></i>' +
      '<input class="input" id="cariPengguna" type="search" placeholder="Cari nama, NISN/NIP, atau email" value="' + esc(f.q) + '"></div>' +
      selectSederhana('filterPeran', ['Semua', 'Siswa', 'Guru', 'Admin', 'Kaprog'], f.peran) +
    '</div></div>' +

    '<div id="daftarPengguna">' + tabelPengguna(daftar) + '</div>'
  );
};

SETELAH.pengguna = function () {
  const f = App.filter.pengguna;
  const render = () => { $('#daftarPengguna').innerHTML = tabelPengguna(saringPengguna(f)); ikon(); };
  $('#cariPengguna').addEventListener('input', debounce(e => { f.q = e.target.value; render(); }, 250));
  $('#filterPeran').onchange = e => { f.peran = e.target.value; render(); };
};

function saringPengguna(f) {
  const q = String(f.q || '').toLowerCase();
  const semua = (App.data.guru || []).concat(
    (App.data.siswa || []).map(s => Object.assign({}, s, { Role: ROLE.SISWA })));
  return semua
    .filter(u => f.peran === 'Semua' || u.Role === f.peran)
    .filter(u => !q || (u.Nama + ' ' + u.NomorInduk + ' ' + (u.Email || '')).toLowerCase().indexOf(q) !== -1);
}

function tabelPengguna(daftar) {
  if (!daftar.length) return kosong('user-x', 'Pengguna tidak ditemukan', 'Ubah kata kunci atau filter peran.');
  return '<div class="card"><div class="table-wrap"><table><thead><tr>' +
    '<th>Nama Lengkap &amp; Identitas</th><th>Peran &amp; Kelas</th><th>Email</th>' +
    '<th>Status Akun</th><th>Terakhir Login</th><th>Aksi</th></tr></thead><tbody>' +
    daftar.map(u => '<tr>' +
      '<td>' + barisAvatar(u.Nama, (u.Role === ROLE.SISWA ? 'NISN: ' : 'NIP: ') + u.NomorInduk) + '</td>' +
      '<td><span class="chip chip-primary">' + esc(u.Role) + '</span>' +
        (u.KelasID ? ' <span class="chip">' + esc(namaKelas(u.KelasID)) + '</span>' : '') + '</td>' +
      '<td class="td-muted truncate" style="max-width:200px">' + esc(u.Email || '—') + '</td>' +
      '<td>' + chipStatus(u.Status || 'Aktif') + '</td>' +
      '<td class="td-muted">' + esc(tglPendek(u.TerakhirLogin) || '—') + '</td>' +
      '<td><div class="row" style="gap:6px">' +
        '<button class="btn btn-secondary btn-sm" onclick="formPengguna(\'' + u.ID + '\')" aria-label="Ubah akun">' +
        '<i data-lucide="pen-line"></i></button>' +
        '<button class="btn btn-secondary btn-sm" onclick="formResetSandi(\'' + u.ID + '\')" aria-label="Reset sandi">' +
        '<i data-lucide="key-round"></i></button>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleStatusPengguna(\'' + u.ID + '\',\'' +
          js(u.Status || 'Aktif') + '\')" aria-label="Aktif / nonaktifkan">' +
        '<i data-lucide="' + ((u.Status || 'Aktif') === 'Aktif' ? 'user-x' : 'user-check') + '"></i></button>' +
      '</div></td></tr>').join('') + '</tbody></table></div></div>';
}

/* ══════════════════════════════════════════════════════════════════════
   ADMIN — DATA MASTER (Kelas & Mapel)
   ══════════════════════════════════════════════════════════════════════ */

VIEW.master = function () {
  return (
    judulHal('Data Kelas & Mata Pelajaran',
      'Kelola rombel TKJ, pembagian wali kelas, dan mata pelajaran produktif beserta guru pengampu.') +

    '<div class="split"><div class="card">' +
      '<div class="card-head"><span class="card-title"><i data-lucide="graduation-cap"></i>Data Kelas</span>' +
      '<button class="btn btn-primary btn-sm" onclick="formKelas()"><i data-lucide="plus"></i> Tambah Kelas</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Tingkat</th><th>Wali Kelas</th>' +
      '<th>Siswa</th><th>Aksi</th></tr></thead><tbody>' +
      (App.data.kelas || []).map(k => {
        const jml = (App.data.siswa || []).filter(s => s.KelasID === k.ID).length;
        return '<tr><td class="td-strong">' + esc(k.NamaKelas) + '</td>' +
          '<td><span class="chip">' + esc(k.Tingkat) + '</span></td>' +
          '<td class="td-muted">' + esc(namaOrang(k.WaliKelasID)) + '</td>' +
          '<td class="td-num tnum">' + jml + '</td>' +
          '<td><div class="row" style="gap:6px">' +
          '<button class="btn btn-secondary btn-sm" onclick="formKelas(\'' + k.ID + '\')" aria-label="Ubah kelas">' +
          '<i data-lucide="pen-line"></i></button>' +
          '<button class="btn btn-secondary btn-sm" onclick="konfirmHapusMaster(\'Kelas\',\'' + k.ID + '\',\'' +
            js(k.NamaKelas) + '\')" aria-label="Hapus kelas"><i data-lucide="trash-2"></i></button>' +
          '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

    '<div class="card">' +
      '<div class="card-head"><span class="card-title"><i data-lucide="cpu"></i>Mata Pelajaran</span>' +
      '<button class="btn btn-primary btn-sm" onclick="formMapel()"><i data-lucide="plus"></i> Tambah</button></div>' +
      (App.data.mapel || []).map(m =>
        '<div class="file-row"><div class="file-ico doc"><i data-lucide="book"></i></div>' +
        '<div class="grow" style="min-width:0"><div class="td-strong truncate">' + esc(m.KodeMapel) + ' — ' + esc(m.NamaMapel) + '</div>' +
        '<div class="td-muted truncate">Tingkat ' + esc(m.Tingkat) + ' · ' + esc(namaOrang(m.GuruID)) +
        ' · ' + esc(m.JamPerPekan) + ' JP/pekan</div></div>' +
        '<button class="btn btn-secondary btn-sm" onclick="formMapel(\'' + m.ID + '\')" aria-label="Ubah mapel">' +
        '<i data-lucide="pen-line"></i></button></div>').join('') +
    '</div></div>'
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ADMIN — KONFIGURASI GAMIFIKASI
   ══════════════════════════════════════════════════════════════════════ */

VIEW.gamifKonfig = function () {
  const aturan = [
    ['LOGIN_HARIAN', 'Login harian', 25], ['BUKA_MATERI', 'Membuka materi', 10],
    ['SELESAI_MATERI', 'Menuntaskan materi', 40], ['TONTON_VIDEO', 'Menonton video sampai selesai', 30],
    ['KERJAKAN_KUIS', 'Mengerjakan kuis', 15], ['KUIS_NILAI_TINGGI', 'Bonus skor kuis ≥ 90', 40],
    ['KUMPUL_TUGAS', 'Mengumpulkan tugas', 50], ['TEPAT_WAKTU', 'Bonus tepat waktu', 20],
    ['NILAI_TUGAS_TINGGI', 'Bonus nilai tugas ≥ 90', 30], ['SELESAI_PROYEK', 'Menuntaskan proyek praktik', 120],
    ['STREAK_MINGGUAN', 'Bonus streak 7 hari', 100]
  ];

  return (
    judulHal('Gamifikasi & Konfigurasi EXP',
      'Aturan perolehan EXP, ambang level kejuruan, dan kriteria badge otomatis.') +

    '<div class="split"><div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="zap"></i>Aturan Perolehan EXP</span>' +
        '<span class="chip chip-green">' + (App.data.config.gamifikasiAktif === 'AKTIF' ? 'Aktif' : 'Nonaktif') + '</span></div>' +
        '<p class="text-sm text-muted mb-md">Nilai berikut adalah konstanta EXP_RULE di Kode.gs. ' +
        'Ubah lewat editor Apps Script agar seluruh modul tetap memakai satu sumber perhitungan.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>Kode Aktivitas</th><th>Deskripsi</th><th>EXP</th></tr></thead><tbody>' +
        aturan.map(a => '<tr><td><code>' + a[0] + '</code></td><td class="td-muted">' + a[1] + '</td>' +
          '<td class="td-num tnum" style="color:var(--tertiary-text)">+' + a[2] + '</td></tr>').join('') +
        '</tbody></table></div></div>' +

      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="trending-up"></i>Ambang Level Kejuruan</span>' +
        '<span class="chip chip-primary">' + (App.data.levels || []).length + ' Level</span></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Level</th><th>EXP Minimum</th><th>Gelar Keahlian</th></tr></thead><tbody>' +
        (App.data.levels || []).map(l => '<tr><td class="td-strong tnum">' + esc(l.Level) + '</td>' +
          '<td class="td-num tnum">' + angka(l.EXPMin) + '</td>' +
          '<td><span class="chip chip-primary">' + esc(l.Gelar) + '</span></td></tr>').join('') +
        '</tbody></table></div></div>' +
    '</div>' +

    '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="medal"></i>Katalog Badge</span>' +
      '<button class="btn btn-primary btn-sm" onclick="formBadge()"><i data-lucide="plus"></i> Tambah</button></div>' +
      (App.data.badge || []).map(b =>
        '<div class="file-row"><div class="file-ico pkt"><i data-lucide="' + esc(b.Ikon || 'award') + '"></i></div>' +
        '<div class="grow" style="min-width:0"><div class="td-strong truncate">' + esc(b.NamaBadge) + '</div>' +
        '<div class="td-muted truncate">' + esc(labelKriteria(b.Kriteria)) + ' ≥ ' + esc(b.NilaiKriteria) +
        ' · ' + esc(b.Kategori) + '</div></div>' +
        '<button class="btn btn-secondary btn-sm" onclick="formBadge(\'' + b.ID + '\')" aria-label="Ubah badge">' +
        '<i data-lucide="pen-line"></i></button></div>').join('') +
    '</div></div>'
  );
};

/* ══════════════════════════════════════════════════════════════════════
   AUDIT & LOG AKTIVITAS
   ══════════════════════════════════════════════════════════════════════ */

VIEW.log = function () {
  return (
    judulHal('Audit & Log Aktivitas',
      'Kronologis transaksi pengguna: login, perubahan nilai, unggah berkas, dan penghapusan data.',
      '<button class="btn btn-secondary" onclick="muatLog()"><i data-lucide="refresh-cw"></i> Muat Ulang</button>') +
    '<div class="card" id="wadahLog">' + kerangkaMuat() + '</div>'
  );
};

SETELAH.log = function () { muatLog(); };

function muatLog() {
  const wadah = $('#wadahLog');
  if (!wadah) return;
  wadah.innerHTML = '<div class="empty"><div class="spinner"></div><p class="text-sm text-muted mt-md">Memuat log…</p></div>';
  server('ambilLogAktivitas', [300], daftar => {
    const warnaAksi = a => /HAPUS|DITOLAK|WARNING/.test(a) ? 'chip-red'
      : (/LOGIN|LOGOUT/.test(a) ? 'chip' : (/NILAI|TAMBAH|SIMPAN/.test(a) ? 'chip-green' : 'chip-primary'));
    wadah.innerHTML = daftar.length
      ? '<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' +
        daftar.map(l => '<tr><td class="td-muted" style="white-space:nowrap">' + esc(tglJam(l.Tanggal)) + '</td>' +
          '<td>' + barisAvatar(l.NamaUser, l.UserID) + '</td>' +
          '<td><span class="chip ' + warnaAksi(l.Aksi) + '">' + esc(l.Aksi) + '</span></td>' +
          '<td class="td-muted" style="max-width:420px">' + esc(l.Detail) + '</td></tr>').join('') +
        '</tbody></table></div>'
      : '<div class="empty"><div class="empty-ico"><i data-lucide="file-search"></i></div>' +
        '<h3>Log kosong</h3><p>Belum ada aktivitas tercatat.</p></div>';
    ikon();
  }, { diam: true });
}

/* ══════════════════════════════════════════════════════════════════════
   PENGATURAN SISTEM (admin)
   ══════════════════════════════════════════════════════════════════════ */

VIEW.pengaturan = function () {
  const c = App.data.config || {};
  return (
    judulHal('Pengaturan Sistem',
      'Identitas aplikasi, tahun ajaran aktif, KKM kejuruan, dan kebijakan unggahan berkas.') +

    '<div class="split"><div class="card">' +
      '<div class="card-head"><span class="card-title"><i data-lucide="settings"></i>Konfigurasi Aplikasi</span></div>' +
      '<form id="formPengaturan" novalidate>' +
        medanTeks('cfgAppName', 'Nama Aplikasi', c.appName, true) +
        medanTeks('cfgAppSubtitle', 'Nama Institusi', c.appSubtitle, true) +
        '<div class="grid grid-2">' +
          medanTeks('cfgTahun', 'Tahun Ajaran Aktif', c.tahunAjaranAktif, true) +
          '<div class="field"><label class="label" for="cfgSemester">Semester Aktif</label>' +
          '<select class="select" id="cfgSemester">' +
          ['Ganjil', 'Genap'].map(s => '<option' + (c.semesterAktif === s ? ' selected' : '') + '>' + s + '</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<div class="grid grid-2">' +
          medanAngka('cfgKKM', 'KKM Kejuruan', c.kkmKejuruan, 0, 100) +
          medanAngka('cfgMaxUpload', 'Batas Unggah per Berkas (MB)', c.maxUploadMB, 1, 100) +
        '</div>' +
        '<label class="check"><input type="checkbox" id="cfgGamif" ' + (c.gamifikasiAktif === 'AKTIF' ? 'checked' : '') + '>' +
        '<span><span class="check-text">Aktifkan sistem gamifikasi</span>' +
        '<span class="check-sub">EXP, level, badge, dan leaderboard berjalan otomatis.</span></span></label>' +
        '<label class="check"><input type="checkbox" id="cfgEmail" ' + (c.notifikasiEmail === 'AKTIF' ? 'checked' : '') + '>' +
        '<span><span class="check-text">Kirim notifikasi email untuk pengumuman penting</span>' +
        '<span class="check-sub">Memakai kuota Gmail harian akun pemilik skrip.</span></span></label>' +
        '<button class="btn btn-primary btn-block mt-md" type="submit" id="btnSimpanPengaturan">' +
        '<i data-lucide="save"></i> Simpan Pengaturan</button>' +
      '</form>' +
    '</div>' +

    '<div class="stack">' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="hard-drive"></i>Penyimpanan Drive</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="cekDrive()"><i data-lucide="refresh-cw"></i> Periksa</button></div>' +
        '<div id="infoDrive"><p class="text-sm text-muted">Tekan "Periksa" untuk menghitung berkas di folder aplikasi.</p></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><span class="card-title"><i data-lucide="database"></i>Sumber Data</span></div>' +
        barisInfo('Spreadsheet ID', potong(c.spreadsheetId || '-', 22)) +
        barisInfo('Folder Root ID', potong(c.rootFolderId || '-', 22)) +
        barisInfo('Email Admin', c.adminEmail || '-') +
        '<p class="hint mt-md">Struktur folder Drive: Materi, Tugas, Proyek Praktik, Foto Profil, ' +
        'dan Laporan &amp; Sertifikat — dibuat otomatis oleh setupAppEnvironment().</p>' +
      '</div>' +
    '</div></div>'
  );
};

SETELAH.pengaturan = function () {
  $('#formPengaturan').addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      appName        : $('#cfgAppName').value.trim(),
      appSubtitle    : $('#cfgAppSubtitle').value.trim(),
      tahunAjaranAktif: $('#cfgTahun').value.trim(),
      semesterAktif  : $('#cfgSemester').value,
      kkmKejuruan    : $('#cfgKKM').value,
      maxUploadMB    : $('#cfgMaxUpload').value,
      gamifikasiAktif: $('#cfgGamif').checked ? 'AKTIF' : 'NONAKTIF',
      notifikasiEmail: $('#cfgEmail').checked ? 'AKTIF' : 'NONAKTIF'
    };
    if (!data.appName || !data.tahunAjaranAktif) {
      return toast('Lengkapi data', 'Nama aplikasi dan tahun ajaran wajib diisi.', 'warning');
    }
    server('simpanPengaturan', [data], () => {
      muatUlangData(() => toast('Tersimpan', 'Pengaturan sistem diperbarui.', 'success'));
    }, { tombol: '#btnSimpanPengaturan', teksProses: 'Menyimpan…' });
  });
};

function cekDrive() {
  server('statistikDrive', [], d => {
    $('#infoDrive').innerHTML =
      barisInfo('Berkas terdeteksi', d.jumlahBerkas + ' berkas') +
      barisInfo('Total ukuran', d.ukuranMB + ' MB') +
      '<a class="btn btn-secondary btn-block mt-md" href="' + esc(d.urlFolder) + '" target="_blank" rel="noopener">' +
      '<i data-lucide="external-link"></i> Buka Folder di Drive</a>';
    ikon();
  });
}

/* ══════════════════════════════════════════════════════════════════════
   KAPROG — REKAP & LAPORAN
   ══════════════════════════════════════════════════════════════════════ */

VIEW.rekap = function () {
  return (
    judulHal('Rekap & Laporan Jurusan TKJ',
      'Hasilkan rekap individu siswa, rekap kelas, dan rekap nilai untuk keperluan supervisi akademik.') +

    '<div class="card card-tight mb-md"><div class="grid grid-4">' +
      '<div class="field" style="margin:0"><label class="label" for="jenisLaporan">Jenis Laporan</label>' +
      '<select class="select" id="jenisLaporan">' +
        '<option value="rekap-siswa">Rekap Individu Siswa</option>' +
        '<option value="rekap-kelas">Rekap per Kelas</option>' +
        '<option value="rekap-nilai">Rekap Nilai Rinci</option>' +
      '</select></div>' +
      '<div class="field" style="margin:0"><label class="label" for="filterKelasRekap">Kelas</label>' +
      selectKelas('filterKelasRekap', 'Semua') + '</div>' +
      '<div class="field" style="margin:0"><label class="label" for="filterMapelRekap">Mata Pelajaran</label>' +
      selectMapel('filterMapelRekap', 'Semua') + '</div>' +
      '<div class="field" style="margin:0"><label class="label">&nbsp;</label>' +
      '<button class="btn btn-primary btn-block" id="btnBuatLaporan" onclick="buatLaporan()">' +
      '<i data-lucide="play"></i> Hasilkan Laporan</button></div>' +
    '</div></div>' +

    '<div id="hasilLaporan">' + kosong('file-bar-chart',
      'Belum ada laporan dihasilkan',
      'Pilih jenis laporan dan filter di atas, lalu tekan "Hasilkan Laporan".') + '</div>'
  );
};

function buatLaporan() {
  const jenis = $('#jenisLaporan').value;
  const filter = {
    kelasId: $('#filterKelasRekap').value === 'Semua' ? null : $('#filterKelasRekap').value,
    mapelId: $('#filterMapelRekap').value === 'Semua' ? null : $('#filterMapelRekap').value
  };
  server('ambilLaporan', [jenis, filter], data => {
    if (!data.baris.length) {
      $('#hasilLaporan').innerHTML = kosong('file-x', 'Tidak ada data',
        'Filter yang dipilih tidak menghasilkan baris apa pun.');
      return ikon();
    }
    const kolom = Object.keys(data.baris[0]);
    window._laporanTerakhir = data;
    $('#hasilLaporan').innerHTML =
      '<div class="card"><div class="card-head">' +
      '<span class="card-title"><i data-lucide="table"></i>' + esc(judulLaporan(jenis)) + '</span>' +
      '<div class="row"><span class="chip chip-primary tnum">' + data.baris.length + ' baris</span>' +
      '<button class="btn btn-secondary btn-sm" onclick="unduhLaporanCSV()"><i data-lucide="download"></i> CSV</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="window.print()"><i data-lucide="printer"></i> Cetak</button></div></div>' +
      '<div class="table-wrap"><table><thead><tr>' + kolom.map(k => '<th>' + esc(k) + '</th>').join('') +
      '</tr></thead><tbody>' + data.baris.map(r => '<tr>' + kolom.map(k =>
        '<td' + (typeof r[k] === 'number' ? ' class="td-num tnum"' : '') + '>' + esc(r[k]) + '</td>').join('') +
        '</tr>').join('') + '</tbody></table></div>' +
      '<p class="hint mt-md">Dibuat ' + esc(tglJam(data.dibuat)) + ' oleh ' + esc(App.me.nama) + '.</p></div>';
    ikon();
  }, { tombol: '#btnBuatLaporan', teksProses: 'Menghitung…' });
}

function judulLaporan(j) {
  return { 'rekap-siswa': 'Rekap Individu Siswa', 'rekap-kelas': 'Rekap per Kelas',
           'rekap-nilai': 'Rekap Nilai Rinci' }[j] || 'Laporan';
}

/* ── Medan form yang dipakai berulang ───────────────────────────────── */

function medanTeks(id, label, nilai, wajib, tipe, placeholder) {
  return '<div class="field"><label class="label" for="' + id + '">' + esc(label) +
    (wajib ? ' <span class="req">*</span>' : '') + '</label>' +
    '<input class="input" id="' + id + '" type="' + (tipe || 'text') + '" value="' + esc(nilai || '') + '"' +
    (wajib ? ' required' : '') + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '></div>';
}

function medanAngka(id, label, nilai, min, max) {
  return '<div class="field"><label class="label" for="' + id + '">' + esc(label) + '</label>' +
    '<input class="input" id="' + id + '" type="number" inputmode="numeric" value="' + esc(nilai || '') + '"' +
    (min !== undefined ? ' min="' + min + '"' : '') + (max !== undefined ? ' max="' + max + '"' : '') + '></div>';
}

function medanArea(id, label, nilai, baris, placeholder) {
  return '<div class="field"><label class="label" for="' + id + '">' + esc(label) + '</label>' +
    '<textarea class="textarea" id="' + id + '" rows="' + (baris || 3) + '"' +
    (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '>' + esc(nilai || '') + '</textarea></div>';
}
