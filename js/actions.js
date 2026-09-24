/* ==========================================================================
   GAS LMS — Actions.html
   Formulir modal dan seluruh aksi tulis (create / update / delete).
   Pola tetap: validasi di klien → panggil backend (yang memvalidasi RBAC
   sekali lagi) → muat ulang data → beri umpan balik.
   ========================================================================== */

/* ── MATERI ─────────────────────────────────────────────────────────── */

function formMateri(id) {
  const m = id ? cari.materi(id) : {};
  bukaModal({
    judul: id ? 'Ubah Materi Pembelajaran' : 'Publikasi Materi & Jobsheet Lab',
    lebar: 'lg',
    isi:
      medanTeks('mtJudul', 'Judul Materi / Jobsheet', m.Judul, true, 'text',
        'Contoh: Jobsheet 05 — Konfigurasi Routing Dinamis OSPF') +
      '<div class="grid grid-2">' +
        '<div class="field"><label class="label" for="mtMapel">Mata Pelajaran <span class="req">*</span></label>' +
        selectMapel('mtMapel', m.MapelID || (String(App.me.mapelIds || '').split(',')[0] || ''), true) + '</div>' +
        '<div class="field"><label class="label" for="mtKelas">Kelas Sasaran <span class="req">*</span></label>' +
        selectKelas('mtKelas', m.KelasID, true) + '</div>' +
      '</div>' +
      '<div class="grid grid-3">' +
        '<div class="field"><label class="label" for="mtTipe">Format</label>' +
        selectSederhana('mtTipe', ['Jobsheet', 'PDF', 'Video', 'PPT', 'Link'], m.Tipe || 'Jobsheet') + '</div>' +
        medanAngka('mtPertemuan', 'Pertemuan ke-', m.Pertemuan || 1, 1, 40) +
        medanAngka('mtEXP', 'Nilai EXP', m.EXP || 40, 0, 500) +
      '</div>' +
      medanArea('mtDeskripsi', 'Deskripsi & Tujuan Pembelajaran', m.Deskripsi, 3,
        'Peserta didik mampu mengonfigurasi … sesuai SOP Laboratorium Komputer TKJ SMK HKTI 2.') +
      medanTeks('mtLink', 'Tautan Referensi Eksternal (opsional)', m.LinkEksternal, false, 'url',
        'https://youtu.be/… atau tautan NetAcad') +
      '<div class="field"><label class="label" for="mtFile">Berkas Modul (opsional)</label>' +
      '<input class="input" id="mtFile" type="file" accept=".pdf,.ppt,.pptx,.zip,.pkt,.mp4,.doc,.docx">' +
      '<p class="hint">Maksimal ' + esc(App.data.config.maxUploadMB || 20) +
      ' MB. Berkas tersimpan di folder Materi pada Google Drive sekolah.</p></div>' +
      (m.FileUrl ? '<div class="mt-sm">' + barisBerkas(m.FileUrl, 'Berkas saat ini') + '</div>' : ''),
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: id ? 'Simpan Perubahan' : 'Publikasikan Sekarang', kelas: 'btn-primary', ikon: 'send',
        onClick: btn => simpanMateriAksi(id, m, btn) }
    ],
    fokus: '#mtJudul'
  });
}

function simpanMateriAksi(id, lama, btn) {
  const rec = {
    ID: id || '', Judul: $('#mtJudul').value.trim(), Deskripsi: $('#mtDeskripsi').value.trim(),
    MapelID: $('#mtMapel').value, KelasID: $('#mtKelas').value, Tipe: $('#mtTipe').value,
    Pertemuan: $('#mtPertemuan').value, EXP: $('#mtEXP').value,
    LinkEksternal: $('#mtLink').value.trim(),
    FileUrl: lama.FileUrl || '', FileId: lama.FileId || '', Status: 'Terbit'
  };
  if (!rec.Judul) { $('#mtJudul').classList.add('invalid'); $('#mtJudul').focus();
    return toast('Lengkapi data', 'Judul materi wajib diisi.', 'warning'); }

  const kirim = () => server('simpanMateri', [rec], () => {
    tutupModal();
    muatUlangData(() => { rakitNavigasi(); navigasi('materi');
      toast('Berhasil', id ? 'Materi diperbarui.' : 'Materi berhasil dipublikasikan.', 'success'); });
  }, { tombol: btn, teksProses: 'Menyimpan…' });

  const f = $('#mtFile').files;
  if (f && f.length) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Mengunggah berkas…';
    bacaBerkas(f, berkas => {
      server('unggahBerkas', [berkas[0].base64, berkas[0].nama, berkas[0].mime, 'materi'], hasil => {
        rec.FileUrl = hasil.fileUrl; rec.FileId = hasil.fileId;
        kirim();
      }, { gagal: () => { btn.disabled = false; btn.innerHTML = 'Coba Lagi'; } });
    });
  } else kirim();
}

function konfirmHapusMateri(id) {
  const m = cari.materi(id);
  konfirmasi('Hapus materi?',
    '"' + m.Judul + '" akan dihapus dari repositori. Riwayat progres siswa tetap tersimpan.',
    () => server('hapusMateri', [id], () => muatUlangData(() => {
      navigasi('materi'); toast('Terhapus', 'Materi dihapus dari repositori.', 'success');
    })));
}

function tandaiSelesai(materiId) {
  const m = cari.materi(materiId);
  // Optimistic UI: tampilan berubah lebih dulu, server menyusul.
  popEXP(m.EXP, 'materi tuntas');
  server('tandaiMateri', [materiId, 'Selesai'], hasil => {
    muatUlangData(() => {
      rakitNavigasi();
      navigasi('detailMateri', { id: materiId });
      if (hasil && hasil.badgeBaru && hasil.badgeBaru.length) rayakanBadge(hasil.badgeBaru);
      if (hasil && hasil.naikLevel) rayakanLevel(hasil.level, hasil.gelar);
    });
  }, { tombol: '#btnSelesaiMateri', teksProses: 'Menyimpan…' });
}

/* ── TUGAS ──────────────────────────────────────────────────────────── */

function formTugas(id) {
  const t = id ? cari.tugas(id) : {};
  bukaModal({
    judul: id ? 'Ubah Tugas & Praktikum' : 'Buat Tugas / Praktikum Baru',
    lebar: 'lg',
    isi:
      medanTeks('tgJudul', 'Nama Tugas', t.Judul, true, 'text',
        'Contoh: Praktikum 04 — Firewall Filter Rules MikroTik') +
      '<div class="grid grid-2">' +
        '<div class="field"><label class="label" for="tgMapel">Mata Pelajaran <span class="req">*</span></label>' +
        selectMapel('tgMapel', t.MapelID || (String(App.me.mapelIds || '').split(',')[0] || ''), true) + '</div>' +
        '<div class="field"><label class="label" for="tgKelas">Kelas <span class="req">*</span></label>' +
        selectKelas('tgKelas', t.KelasID, true) + '</div>' +
      '</div>' +
      '<div class="grid grid-3">' +
        '<div class="field"><label class="label" for="tgJenis">Jenis</label>' +
        selectSederhana('tgJenis', ['Praktik Lab', 'Proyek', 'Teori & Lab', 'Praktik Lapangan', 'Tugas Rumah'],
          t.Jenis || 'Praktik Lab') + '</div>' +
        medanAngka('tgBobot', 'Bobot Nilai', t.Bobot || 100, 0, 100) +
        medanAngka('tgEXP', 'Nilai EXP', t.EXP || 50, 0, 500) +
      '</div>' +
      '<div class="field"><label class="label" for="tgDeadline">Batas Waktu <span class="req">*</span></label>' +
      '<input class="input" id="tgDeadline" type="datetime-local" required value="' +
      esc(String(t.Deadline || '').replace(' ', 'T').slice(0, 16)) + '">' +
      '<p class="hint">Pengumpulan sebelum batas waktu mendapat bonus +20 EXP tepat waktu.</p></div>' +
      medanArea('tgInstruksi', 'Instruksi & Lembar Kerja', t.Instruksi, 5,
        'Uraikan topologi, alokasi port, langkah konfigurasi, dan bukti pengujian yang harus dilampirkan.'),
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: id ? 'Simpan Perubahan' : 'Terbitkan Tugas', kelas: 'btn-primary', ikon: 'send',
        onClick: btn => {
          const rec = {
            ID: id || '', Judul: $('#tgJudul').value.trim(), Instruksi: $('#tgInstruksi').value.trim(),
            MapelID: $('#tgMapel').value, KelasID: $('#tgKelas').value, Jenis: $('#tgJenis').value,
            Deadline: String($('#tgDeadline').value).replace('T', ' '),
            Bobot: $('#tgBobot').value, EXP: $('#tgEXP').value, Status: 'Aktif'
          };
          if (!rec.Judul || !rec.Deadline) return toast('Lengkapi data', 'Judul dan batas waktu wajib diisi.', 'warning');
          server('simpanTugas', [rec], () => {
            tutupModal();
            muatUlangData(() => { rakitNavigasi(); navigasi('tugas');
              toast('Berhasil', id ? 'Tugas diperbarui dan siswa diberi notifikasi.' :
                'Tugas terbit. Seluruh siswa kelas telah dinotifikasi.', 'success'); });
          }, { tombol: btn, teksProses: 'Menerbitkan…' });
        } }
    ],
    fokus: '#tgJudul'
  });
}

function konfirmHapusTugas(id) {
  const t = cari.tugas(id);
  konfirmasi('Hapus tugas?',
    '"' + t.Judul + '" beserta statusnya akan dihapus dari daftar. Berkas siswa di Drive tetap ada.',
    () => server('hapusTugas', [id], () => muatUlangData(() => {
      rakitNavigasi(); navigasi('tugas'); toast('Terhapus', 'Tugas dihapus.', 'success');
    })));
}

function kirimTugas(tugasId) {
  const t = cari.tugas(tugasId);
  const input = $('#fileTugas');
  const files = input ? Array.from(input.files || []) : [];
  const catatan = ($('#catatanTugas') || {}).value || '';
  const pgmLama = (App.data.pengumpulan || []).find(p => p.TugasID === tugasId && p.SiswaID === App.me.id);

  if (!files.length && !pgmLama) {
    return toast('Belum ada berkas', 'Pilih minimal satu berkas hasil praktikum sebelum mengirim.', 'warning');
  }
  const maxMB = Number(App.data.config.maxUploadMB) || 20;
  const kebesaran = files.find(f => f.size > maxMB * 1048576);
  if (kebesaran) {
    return toast('Berkas terlalu besar', kebesaran.name + ' melebihi ' + maxMB + ' MB.', 'danger');
  }

  const btn = $('#btnKirimTugas');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner-sm"></span> Membaca berkas…';

  bacaBerkas(files, berkas => {
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Mengunggah ke Drive…';
    server('kumpulkanTugas', [tugasId, berkas, catatan], hasil => {
      hapusLokal(LS.draft + 'tugas_' + tugasId);
      if (hasil.gamifikasi) popEXP(hasil.gamifikasi.exp, hasil.terlambat ? 'terlambat' : 'tepat waktu');
      muatUlangData(() => {
        rakitNavigasi();
        navigasi('detailTugas', { id: tugasId });
        toast(hasil.terlambat ? 'Terkirim (terlambat)' : 'Tugas terkirim',
          hasil.terlambat ? 'Berkas tercatat melewati batas waktu, bonus tepat waktu tidak diberikan.'
                          : 'Berkas tersimpan di Drive dan menunggu penilaian ' + namaOrang(t.GuruID) + '.',
          hasil.terlambat ? 'warning' : 'success');
        if (hasil.gamifikasi && hasil.gamifikasi.badgeBaru && hasil.gamifikasi.badgeBaru.length) {
          rayakanBadge(hasil.gamifikasi.badgeBaru);
        }
      });
    }, { tombol: btn, teksProses: 'Mengirim…' });
  });
}

/* ── PENILAIAN ──────────────────────────────────────────────────────── */

function formNilai(pengumpulanId) {
  const p = (App.data.pengumpulan || []).find(x => x.ID === pengumpulanId);
  if (!p) return toast('Data tidak ditemukan', 'Muat ulang halaman lalu coba lagi.', 'danger');
  const s = cari.siswa(p.SiswaID);
  const t = cari.tugas(p.TugasID);
  const berkas = String(p.FileNama || '').split(' | ').filter(Boolean);

  bukaModal({
    judul: 'Penilaian Tugas Praktikum',
    lebar: 'lg',
    isi:
      '<div class="card card-tight mb-md" style="background:var(--surface-alt);border:none">' +
        '<div class="row-between row-wrap">' + barisAvatar(s.Nama, namaKelas(s.KelasID) + ' · NISN ' + s.NomorInduk) +
        chipStatus(p.Status) + '</div>' +
        '<div class="td-strong text-sm mt-md">' + esc(t.Judul) + '</div>' +
        '<div class="text-xs text-muted">' + esc(kodeMapel(t.MapelID)) + ' · ' + esc(t.Jenis) +
        ' · dikirim ' + esc(tglJam(p.TanggalKirim)) + '</div>' +
      '</div>' +

      (berkas.length ? '<div class="field"><label class="label">Berkas Pengumpulan</label>' +
        berkas.map((n, i) => barisBerkas(String(p.FileUrl).split(' | ')[i] || '', n)).join('') + '</div>' : '') +

      (p.Catatan ? '<div class="card card-tight mb-md" style="background:var(--primary-soft);border:none">' +
        '<div class="text-xs text-muted mb-sm">Catatan siswa</div>' +
        '<p class="text-sm" style="font-style:italic">"' + esc(p.Catatan) + '"</p></div>' : '') +

      '<div class="grid grid-2">' +
        medanAngka('nlNilai', 'Nilai Akhir (0–100)', p.Nilai !== '' ? p.Nilai : '', 0, 100) +
        '<div class="field"><label class="label">Panduan Rubrik</label>' +
        '<div class="text-xs text-muted" style="line-height:18px">Kerapian topologi 20% · ' +
        'Ketepatan konfigurasi 40% · Hasil pengujian &amp; dokumentasi 40%</div></div>' +
      '</div>' +
      '<div class="row row-wrap mb-md">' +
        [95, 90, 85, 80, 75].map(n => '<button class="btn btn-secondary btn-sm" type="button" ' +
          'onclick="document.getElementById(\'nlNilai\').value=' + n + '">' + n + '</button>').join('') +
      '</div>' +
      medanArea('nlFeedback', 'Umpan Balik untuk Siswa', p.Feedback, 4,
        'Sebutkan yang sudah tepat dan satu hal konkret yang perlu diperbaiki pada jobsheet berikutnya.'),
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Simpan Nilai & Kirim Umpan Balik', kelas: 'btn-gamify', ikon: 'check-circle-2',
        onClick: btn => {
          const nilai = Number($('#nlNilai').value);
          if (isNaN(nilai) || nilai < 0 || nilai > 100) {
            $('#nlNilai').classList.add('invalid'); $('#nlNilai').focus();
            return toast('Nilai tidak valid', 'Masukkan angka antara 0 dan 100.', 'warning');
          }
          server('nilaiPengumpulan', [pengumpulanId, nilai, $('#nlFeedback').value.trim()], () => {
            tutupModal();
            muatUlangData(() => { rakitNavigasi(); navigasi(App.page);
              toast('Nilai tersimpan', s.Nama + ' menerima notifikasi skor ' + nilai + '.', 'success'); });
          }, { tombol: btn, teksProses: 'Menyimpan…' });
        } }
    ],
    fokus: '#nlNilai'
  });
}

/* ── KUIS ───────────────────────────────────────────────────────────── */

let soalDraf = [];

function formKuis(id) {
  const k = id ? cari.kuis(id) : {};
  soalDraf = [];

  const bukaFormulir = () => bukaModal({
    judul: id ? 'Ubah Kuis & Bank Soal' : 'Buat Kuis / Ujian Baru',
    lebar: 'lg',
    isi:
      medanTeks('ksJudul', 'Judul Kuis', k.Judul, true, 'text',
        'Contoh: Kuis Diagnostik 02 — Routing Dinamis OSPF') +
      '<div class="grid grid-2">' +
        '<div class="field"><label class="label" for="ksMapel">Mata Pelajaran <span class="req">*</span></label>' +
        selectMapel('ksMapel', k.MapelID || (String(App.me.mapelIds || '').split(',')[0] || ''), true) + '</div>' +
        '<div class="field"><label class="label" for="ksKelas">Kelas <span class="req">*</span></label>' +
        selectKelas('ksKelas', k.KelasID, true) + '</div>' +
      '</div>' +
      '<div class="grid grid-3">' +
        medanAngka('ksDurasi', 'Durasi (menit)', k.DurasiMenit || 30, 5, 180) +
        medanAngka('ksEXP', 'Nilai EXP', k.EXP || 25, 0, 300) +
        '<div class="field"><label class="label" for="ksDeadline">Batas Waktu</label>' +
        '<input class="input" id="ksDeadline" type="datetime-local" value="' +
        esc(String(k.Deadline || '').replace(' ', 'T').slice(0, 16)) + '"></div>' +
      '</div>' +
      '<div class="card card-tight" style="background:var(--surface-alt);border:none">' +
        '<div class="row-between mb-md"><span class="td-strong text-sm">Bank Soal</span>' +
        '<button class="btn btn-primary btn-sm" type="button" onclick="tambahSoalDraf()">' +
        '<i data-lucide="plus"></i> Tambah Soal</button></div>' +
        '<div id="daftarSoalDraf"></div>' +
      '</div>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: id ? 'Simpan Perubahan' : 'Terbitkan Kuis', kelas: 'btn-primary', ikon: 'send',
        onClick: btn => simpanKuisAksi(id, btn) }
    ],
    fokus: '#ksJudul'
  });

  if (id) {
    server('ambilSoalKuis', [id], data => {
      soalDraf = (data.soal || []).map(s => ({
        TipeSoal: s.TipeSoal, Pertanyaan: s.Pertanyaan, OpsiA: s.OpsiA, OpsiB: s.OpsiB,
        OpsiC: s.OpsiC, OpsiD: s.OpsiD, JawabanBenar: s.JawabanBenar, Poin: s.Poin
      }));
      bukaFormulir(); renderSoalDraf();
    }, { teksProses: 'Memuat soal…' });
  } else { bukaFormulir(); renderSoalDraf(); }
}

function tambahSoalDraf() {
  soalDraf.push({ TipeSoal: 'Pilihan Ganda', Pertanyaan: '', OpsiA: '', OpsiB: '', OpsiC: '', OpsiD: '',
                  JawabanBenar: 'A', Poin: 0 });
  renderSoalDraf();
}

function hapusSoalDraf(i) { soalDraf.splice(i, 1); renderSoalDraf(); }

function ubahSoalDraf(i, medan, nilai) { soalDraf[i][medan] = nilai; if (medan === 'TipeSoal') renderSoalDraf(); }

function renderSoalDraf() {
  const wadah = $('#daftarSoalDraf');
  if (!wadah) return;
  if (!soalDraf.length) {
    wadah.innerHTML = '<p class="text-sm text-muted">Belum ada soal. Tekan "Tambah Soal" untuk mulai menyusun.</p>';
    return;
  }
  const poin = Math.floor(100 / soalDraf.length);
  wadah.innerHTML = soalDraf.map((s, i) => {
    const pg = s.TipeSoal === 'Pilihan Ganda';
    const bs = s.TipeSoal === 'Benar/Salah';
    return '<div class="card card-tight mb-sm">' +
      '<div class="row-between mb-sm"><span class="chip chip-primary">Soal ' + (i + 1) + ' · ' + poin + ' poin</span>' +
      '<div class="row" style="gap:6px">' +
      '<select class="select" style="min-height:32px;width:auto;font-size:12px" ' +
      'onchange="ubahSoalDraf(' + i + ',\'TipeSoal\',this.value)">' +
      ['Pilihan Ganda', 'Benar/Salah', 'Isian Singkat', 'Esai'].map(t =>
        '<option' + (s.TipeSoal === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<button class="btn btn-secondary btn-sm" type="button" onclick="hapusSoalDraf(' + i + ')" ' +
      'aria-label="Hapus soal"><i data-lucide="trash-2"></i></button></div></div>' +

      '<textarea class="textarea" rows="2" placeholder="Tuliskan pertanyaan…" ' +
      'oninput="ubahSoalDraf(' + i + ',\'Pertanyaan\',this.value)">' + esc(s.Pertanyaan) + '</textarea>' +

      (pg ? '<div class="grid grid-2 mt-sm">' +
        ['A', 'B', 'C', 'D'].map(o =>
          '<input class="input" placeholder="Opsi ' + o + '" value="' + esc(s['Opsi' + o]) + '" ' +
          'oninput="ubahSoalDraf(' + i + ',\'Opsi' + o + '\',this.value)">').join('') + '</div>' : '') +

      (bs ? '<div class="text-xs text-muted mt-sm">Opsi otomatis: A = Benar, B = Salah.</div>' : '') +

      (s.TipeSoal === 'Esai'
        ? '<div class="text-xs text-muted mt-sm">Soal esai dinilai manual oleh guru setelah kuis dikumpulkan.</div>'
        : '<div class="row mt-sm"><span class="text-xs text-muted">Kunci jawaban:</span>' +
          (pg || bs
            ? '<select class="select" style="min-height:34px;width:auto" ' +
              'onchange="ubahSoalDraf(' + i + ',\'JawabanBenar\',this.value)">' +
              (pg ? ['A', 'B', 'C', 'D'] : ['A', 'B']).map(o =>
                '<option value="' + o + '"' + (s.JawabanBenar === o ? ' selected' : '') + '>' +
                (bs ? (o === 'A' ? 'A — Benar' : 'B — Salah') : o) + '</option>').join('') + '</select>'
            : '<input class="input" style="max-width:220px" placeholder="Jawaban benar" value="' +
              esc(s.JawabanBenar) + '" oninput="ubahSoalDraf(' + i + ',\'JawabanBenar\',this.value)">') +
          '</div>') +
      '</div>';
  }).join('');
  ikon();
}

function simpanKuisAksi(id, btn) {
  const kuis = {
    ID: id || '', Judul: $('#ksJudul').value.trim(), MapelID: $('#ksMapel').value,
    KelasID: $('#ksKelas').value, DurasiMenit: $('#ksDurasi').value, EXP: $('#ksEXP').value,
    Deadline: String($('#ksDeadline').value || '').replace('T', ' '), Status: 'Aktif'
  };
  if (!kuis.Judul) return toast('Lengkapi data', 'Judul kuis wajib diisi.', 'warning');
  if (!soalDraf.length) return toast('Bank soal kosong', 'Tambahkan minimal satu soal.', 'warning');
  const kosongSoal = soalDraf.findIndex(s => !String(s.Pertanyaan).trim());
  if (kosongSoal !== -1) return toast('Soal belum lengkap', 'Pertanyaan nomor ' + (kosongSoal + 1) + ' masih kosong.', 'warning');

  const poin = Math.floor(100 / soalDraf.length);
  const soal = soalDraf.map((s, i) => Object.assign({}, s, {
    Poin: i === soalDraf.length - 1 ? 100 - poin * (soalDraf.length - 1) : poin,
    OpsiA: s.TipeSoal === 'Benar/Salah' ? 'Benar' : s.OpsiA,
    OpsiB: s.TipeSoal === 'Benar/Salah' ? 'Salah' : s.OpsiB
  }));

  server('simpanKuis', [kuis, soal], () => {
    tutupModal();
    muatUlangData(() => { rakitNavigasi(); navigasi('kuis');
      toast('Berhasil', id ? 'Kuis diperbarui.' : 'Kuis terbit dan siswa telah dinotifikasi.', 'success'); });
  }, { tombol: btn, teksProses: 'Menyimpan…' });
}

function konfirmHapusKuis(id) {
  const k = cari.kuis(id);
  konfirmasi('Hapus kuis?', '"' + k.Judul + '" beserta seluruh soalnya akan dihapus permanen.',
    () => server('hapusKuis', [id], () => muatUlangData(() => {
      rakitNavigasi(); navigasi('kuis'); toast('Terhapus', 'Kuis dan bank soalnya dihapus.', 'success');
    })));
}

/* ── PENGUMUMAN ─────────────────────────────────────────────────────── */

function formPengumuman(id) {
  const p = id ? (App.data.pengumuman || []).find(x => x.ID === id) || {} : {};
  const levelTersedia = App.me.role === ROLE.ADMIN ? ['Sekolah', 'Jurusan', 'Kelas']
    : (App.me.role === ROLE.KAPROG ? ['Jurusan', 'Kelas'] : ['Kelas']);

  bukaModal({
    judul: id ? 'Ubah Pengumuman' : 'Buat Pengumuman Baru',
    lebar: 'lg',
    isi:
      medanTeks('pgJudul', 'Judul Pengumuman', p.Judul, true, 'text',
        'Contoh: Jadwal Gladi Bersih UKK Mandiri MTCNA 2026') +
      '<div class="grid grid-3">' +
        '<div class="field"><label class="label" for="pgLevel">Jenjang</label>' +
        selectSederhana('pgLevel', levelTersedia, p.Level || levelTersedia[0]) + '</div>' +
        '<div class="field"><label class="label" for="pgKelas">Kelas Sasaran</label>' +
        selectKelas('pgKelas', p.TargetKelasID) + '</div>' +
        '<div class="field"><label class="label" for="pgPrioritas">Prioritas</label>' +
        selectSederhana('pgPrioritas', ['Normal', 'Penting'], p.Prioritas || 'Normal') + '</div>' +
      '</div>' +
      medanArea('pgIsi', 'Isi Pengumuman', p.Isi, 6,
        'Tuliskan informasi lengkap: waktu, tempat, perlengkapan yang dibawa, dan pihak yang dapat dihubungi.') +
      '<p class="hint">Prioritas "Penting" juga mengirim surel ke pengguna terkait ' +
      '(bila notifikasi email diaktifkan di Pengaturan Sistem).</p>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: id ? 'Simpan Perubahan' : 'Terbitkan', kelas: 'btn-primary', ikon: 'megaphone',
        onClick: btn => {
          const rec = {
            ID: id || '', Judul: $('#pgJudul').value.trim(), Isi: $('#pgIsi').value.trim(),
            Level: $('#pgLevel').value,
            TargetKelasID: $('#pgLevel').value === 'Kelas' ? ($('#pgKelas').value === 'Semua' ? '' : $('#pgKelas').value) : '',
            Prioritas: $('#pgPrioritas').value
          };
          if (!rec.Judul || !rec.Isi) return toast('Lengkapi data', 'Judul dan isi wajib diisi.', 'warning');
          if (rec.Level === 'Kelas' && !rec.TargetKelasID) {
            return toast('Pilih kelas', 'Pengumuman tingkat kelas memerlukan kelas sasaran.', 'warning');
          }
          server('simpanPengumuman', [rec], () => {
            tutupModal();
            muatUlangData(() => { rakitNavigasi(); navigasi('pengumuman');
              toast('Terbit', 'Pengumuman tersebar ke pengguna terkait.', 'success'); });
          }, { tombol: btn, teksProses: 'Menerbitkan…' });
        } }
    ],
    fokus: '#pgJudul'
  });
}

function konfirmHapusPengumuman(id) {
  konfirmasi('Hapus pengumuman?', 'Pengumuman akan hilang dari papan informasi.',
    () => server('hapusPengumuman', [id], () => muatUlangData(() => {
      navigasi('pengumuman'); toast('Terhapus', 'Pengumuman dihapus.', 'success');
    })));
}

/* ── PENGGUNA (admin) ───────────────────────────────────────────────── */

function formPengguna(id) {
  const semua = (App.data.guru || []).concat(App.data.siswa || []);
  const u = id ? semua.find(x => x.ID === id) || {} : {};
  const peran = u.Role || (u.KelasID && !u.MapelIDs ? ROLE.SISWA : ROLE.SISWA);

  bukaModal({
    judul: id ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru',
    lebar: 'lg',
    isi:
      '<div class="grid grid-2">' +
        medanTeks('usNama', 'Nama Lengkap', u.Nama, true) +
        medanTeks('usNomor', 'NISN / NIP', u.NomorInduk, true, 'text', '0064128901') +
      '</div>' +
      '<div class="grid grid-2">' +
        medanTeks('usEmail', 'Email Institusi', u.Email, false, 'email', 'nama@smkhkti2.sch.id') +
        '<div class="field"><label class="label" for="usRole">Peran <span class="req">*</span></label>' +
        selectSederhana('usRole', [ROLE.SISWA, ROLE.GURU, ROLE.KAPROG, ROLE.ADMIN], peran) + '</div>' +
      '</div>' +
      '<div class="grid grid-2">' +
        '<div class="field"><label class="label" for="usKelas">Kelas (siswa) / Wali Kelas (guru)</label>' +
        selectKelas('usKelas', u.KelasID) + '</div>' +
        medanTeks('usMapel', 'ID Mapel Diampu (pisah koma)', u.MapelIDs, false, 'text', 'MPL-01,MPL-04') +
      '</div>' +
      medanTeks('usSandi', id ? 'Kata Sandi Baru (kosongkan bila tidak diubah)' : 'Kata Sandi Awal',
        '', false, 'password', id ? '••••••••' : 'Minimal 6 karakter') +
      '<p class="hint">Bila dikosongkan saat menambah pengguna baru, sandi default adalah ' +
      '<code>siswa123</code> untuk siswa dan <code>guru123</code> untuk staf.</p>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: id ? 'Simpan Perubahan' : 'Tambahkan Akun', kelas: 'btn-primary', ikon: 'user-plus',
        onClick: btn => {
          const rec = {
            ID: id || '', Nama: $('#usNama').value.trim(), NomorInduk: $('#usNomor').value.trim(),
            Email: $('#usEmail').value.trim(), Role: $('#usRole').value,
            KelasID: $('#usKelas').value === 'Semua' ? '' : $('#usKelas').value,
            MapelIDs: $('#usMapel').value.trim(), Status: u.Status || 'Aktif',
            SandiBaru: $('#usSandi').value
          };
          if (!rec.Nama || !rec.NomorInduk) {
            return toast('Lengkapi data', 'Nama dan nomor induk wajib diisi.', 'warning');
          }
          if (rec.SandiBaru && rec.SandiBaru.length < 6) {
            return toast('Sandi terlalu pendek', 'Gunakan minimal 6 karakter.', 'warning');
          }
          server('simpanPengguna', [rec], () => {
            tutupModal();
            muatUlangData(() => { navigasi('pengguna');
              toast('Tersimpan', 'Data akun ' + rec.Nama + ' diperbarui.', 'success'); });
          }, { tombol: btn, teksProses: 'Menyimpan…' });
        } }
    ],
    fokus: '#usNama'
  });
}

function formResetSandi(userId) {
  const semua = (App.data.guru || []).concat(App.data.siswa || []);
  const u = semua.find(x => x.ID === userId) || {};
  bukaModal({
    judul: 'Reset Kata Sandi',
    isi: '<p class="text-sm mb-md">Menetapkan kata sandi baru untuk <strong>' + esc(u.Nama) + '</strong>. ' +
      'Sampaikan sandi ini langsung kepada yang bersangkutan dan minta segera menggantinya.</p>' +
      medanTeks('rsSandi', 'Kata Sandi Baru', '', true, 'password', 'Minimal 6 karakter'),
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Reset Sandi', kelas: 'btn-danger', ikon: 'key-round',
        onClick: btn => {
          const sandi = $('#rsSandi').value;
          if (!sandi || sandi.length < 6) return toast('Sandi terlalu pendek', 'Gunakan minimal 6 karakter.', 'warning');
          server('resetSandiPengguna', [userId, sandi], () => {
            tutupModal(); toast('Berhasil', 'Kata sandi ' + u.Nama + ' telah direset.', 'success');
          }, { tombol: btn, teksProses: 'Mereset…' });
        } }
    ],
    fokus: '#rsSandi'
  });
}

function toggleStatusPengguna(userId, statusSekarang) {
  const baru = statusSekarang === 'Aktif' ? 'Nonaktif' : 'Aktif';
  const semua = (App.data.guru || []).concat(App.data.siswa || []);
  const u = semua.find(x => x.ID === userId) || {};
  konfirmasi(baru === 'Nonaktif' ? 'Nonaktifkan akun?' : 'Aktifkan kembali akun?',
    'Akun ' + u.Nama + ' akan ' + (baru === 'Nonaktif' ? 'tidak dapat masuk ke sistem.' : 'dapat masuk kembali.'),
    () => server('ubahStatusPengguna', [userId, baru], () => muatUlangData(() => {
      navigasi('pengguna'); toast('Status diperbarui', u.Nama + ' kini ' + baru + '.', 'success');
    })), baru === 'Nonaktif' ? 'Nonaktifkan' : 'Aktifkan');
}

/* ── DATA MASTER ────────────────────────────────────────────────────── */

function formKelas(id) {
  const k = id ? cari.kelas(id) : {};
  const guru = (App.data.guru || []).filter(g => g.Role === ROLE.GURU);
  bukaModal({
    judul: id ? 'Ubah Data Kelas' : 'Tambah Kelas Baru',
    isi:
      '<div class="grid grid-2">' +
        medanTeks('klNama', 'Nama Kelas', k.NamaKelas, true, 'text', 'XII TKJ 1') +
        '<div class="field"><label class="label" for="klTingkat">Tingkat</label>' +
        selectSederhana('klTingkat', ['X', 'XI', 'XII'], k.Tingkat || 'X') + '</div>' +
      '</div>' +
      '<div class="grid grid-2">' +
        medanTeks('klJurusan', 'Jurusan', k.Jurusan || 'TKJ') +
        medanTeks('klTahun', 'Tahun Ajaran', k.TahunAjaran || App.data.config.tahunAjaranAktif) +
      '</div>' +
      '<div class="field"><label class="label" for="klWali">Wali Kelas</label>' +
      '<select class="select" id="klWali">' + guru.map(g =>
        '<option value="' + esc(g.ID) + '"' + (g.ID === k.WaliKelasID ? ' selected' : '') + '>' +
        esc(g.Nama) + '</option>').join('') + '</select></div>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Simpan', kelas: 'btn-primary', ikon: 'save',
        onClick: btn => {
          const rec = { ID: id || '', NamaKelas: $('#klNama').value.trim(), Tingkat: $('#klTingkat').value,
            Jurusan: $('#klJurusan').value.trim(), TahunAjaran: $('#klTahun').value.trim(),
            WaliKelasID: $('#klWali').value };
          if (!rec.NamaKelas) return toast('Lengkapi data', 'Nama kelas wajib diisi.', 'warning');
          server('simpanMaster', ['Kelas', rec], () => {
            tutupModal(); muatUlangData(() => { navigasi('master');
              toast('Tersimpan', 'Data kelas diperbarui.', 'success'); });
          }, { tombol: btn, teksProses: 'Menyimpan…' });
        } }
    ],
    fokus: '#klNama'
  });
}

function formMapel(id) {
  const m = id ? cari.mapel(id) : {};
  const guru = (App.data.guru || []).filter(g => g.Role === ROLE.GURU);
  bukaModal({
    judul: id ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran',
    isi:
      '<div class="grid grid-2">' +
        medanTeks('mpKode', 'Kode Mapel', m.KodeMapel, true, 'text', 'AIJ') +
        '<div class="field"><label class="label" for="mpTingkat">Tingkat</label>' +
        selectSederhana('mpTingkat', ['X', 'XI', 'XII'], m.Tingkat || 'XII') + '</div>' +
      '</div>' +
      medanTeks('mpNama', 'Nama Mata Pelajaran', m.NamaMapel, true, 'text',
        'Administrasi Infrastruktur Jaringan') +
      '<div class="grid grid-2">' +
        '<div class="field"><label class="label" for="mpGuru">Guru Pengampu</label>' +
        '<select class="select" id="mpGuru">' + guru.map(g =>
          '<option value="' + esc(g.ID) + '"' + (g.ID === m.GuruID ? ' selected' : '') + '>' +
          esc(g.Nama) + '</option>').join('') + '</select></div>' +
        medanAngka('mpJam', 'Jam Pelajaran per Pekan', m.JamPerPekan || 4, 1, 20) +
      '</div>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Simpan', kelas: 'btn-primary', ikon: 'save',
        onClick: btn => {
          const rec = { ID: id || '', KodeMapel: $('#mpKode').value.trim().toUpperCase(),
            NamaMapel: $('#mpNama').value.trim(), Tingkat: $('#mpTingkat').value,
            GuruID: $('#mpGuru').value, JamPerPekan: $('#mpJam').value };
          if (!rec.KodeMapel || !rec.NamaMapel) return toast('Lengkapi data', 'Kode dan nama mapel wajib diisi.', 'warning');
          server('simpanMaster', ['Mapel', rec], () => {
            tutupModal(); muatUlangData(() => { navigasi('master');
              toast('Tersimpan', 'Mata pelajaran diperbarui.', 'success'); });
          }, { tombol: btn, teksProses: 'Menyimpan…' });
        } }
    ],
    fokus: '#mpKode'
  });
}

function formBadge(id) {
  const b = id ? cari.badge(id) : {};
  const kriteria = ['MATERI_SELESAI', 'TUGAS_DINILAI', 'TUGAS_TEPAT_WAKTU', 'TUGAS_NILAI_TINGGI',
                    'KUIS_SELESAI', 'KUIS_NILAI_TINGGI', 'STREAK', 'TOTAL_EXP'];
  bukaModal({
    judul: id ? 'Ubah Badge' : 'Tambah Badge Baru',
    isi:
      '<div class="grid grid-2">' +
        medanTeks('bdKode', 'Kode Badge', b.KodeBadge, true, 'text', 'PACKET_MASTER') +
        medanTeks('bdNama', 'Nama Badge', b.NamaBadge, true, 'text', 'Packet Master') +
      '</div>' +
      medanArea('bdDesk', 'Deskripsi Pencapaian', b.Deskripsi, 2,
        'Menyelesaikan 5 topologi Cisco Packet Tracer tanpa error sintaks.') +
      '<div class="grid grid-3">' +
        medanTeks('bdKategori', 'Kategori', b.Kategori || 'Praktikum Lab') +
        medanTeks('bdIkon', 'Nama Ikon (Lucide)', b.Ikon || 'award') +
        medanAngka('bdNilai', 'Ambang Kriteria', b.NilaiKriteria || 5, 1, 100000) +
      '</div>' +
      '<div class="field"><label class="label" for="bdKriteria">Kriteria Otomatis</label>' +
      selectSederhana('bdKriteria', kriteria, b.Kriteria || 'MATERI_SELESAI') +
      '<p class="hint">Sistem memeriksa kriteria ini setiap kali siswa memperoleh EXP.</p></div>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Simpan', kelas: 'btn-primary', ikon: 'save',
        onClick: btn => {
          const rec = { ID: id || '', KodeBadge: $('#bdKode').value.trim().toUpperCase(),
            NamaBadge: $('#bdNama').value.trim(), Deskripsi: $('#bdDesk').value.trim(),
            Kategori: $('#bdKategori').value.trim(), Ikon: $('#bdIkon').value.trim(),
            Kriteria: $('#bdKriteria').value, NilaiKriteria: $('#bdNilai').value };
          if (!rec.KodeBadge || !rec.NamaBadge) return toast('Lengkapi data', 'Kode dan nama badge wajib diisi.', 'warning');
          server('simpanMaster', ['Badge', rec], () => {
            tutupModal(); muatUlangData(() => { navigasi('gamifKonfig');
              toast('Tersimpan', 'Katalog badge diperbarui.', 'success'); });
          }, { tombol: btn, teksProses: 'Menyimpan…' });
        } }
    ],
    fokus: '#bdKode'
  });
}

function konfirmHapusMaster(sheet, id, nama) {
  konfirmasi('Hapus ' + sheet.toLowerCase() + '?',
    '"' + nama + '" akan dihapus dari data master. Pastikan tidak ada data yang masih merujuk padanya.',
    () => server('hapusMaster', [sheet, id], () => muatUlangData(() => {
      navigasi('master'); toast('Terhapus', sheet + ' dihapus.', 'success');
    })));
}

/* ── AKUN & PREFERENSI ──────────────────────────────────────────────── */

function formUbahSandi() {
  bukaModal({
    judul: 'Ubah Kata Sandi',
    isi:
      medanTeks('psLama', 'Kata Sandi Saat Ini', '', true, 'password') +
      medanTeks('psBaru', 'Kata Sandi Baru', '', true, 'password', 'Minimal 6 karakter') +
      medanTeks('psUlang', 'Ulangi Kata Sandi Baru', '', true, 'password') +
      '<div class="auth-note"><i data-lucide="shield-check"></i><span>Gunakan kombinasi huruf dan angka. ' +
      'Jangan memakai NISN atau tanggal lahir sebagai kata sandi.</span></div>',
    tombol: [
      { teks: 'Batal', kelas: 'btn-secondary' },
      { teks: 'Perbarui Sandi', kelas: 'btn-primary', ikon: 'key-round',
        onClick: btn => {
          const lama = $('#psLama').value, baru = $('#psBaru').value, ulang = $('#psUlang').value;
          if (!lama || !baru) return toast('Lengkapi data', 'Seluruh kolom wajib diisi.', 'warning');
          if (baru.length < 6) return toast('Terlalu pendek', 'Kata sandi baru minimal 6 karakter.', 'warning');
          if (baru !== ulang) return toast('Tidak cocok', 'Pengulangan kata sandi tidak sama.', 'warning');
          server('ubahSandi', [lama, baru], () => {
            tutupModal(); toast('Berhasil', 'Kata sandi berhasil diperbarui.', 'success');
          }, { tombol: btn, teksProses: 'Memperbarui…' });
        } }
    ],
    fokus: '#psLama'
  });
}

function simpanPreferensi() {
  const prefs = {
    tema  : document.documentElement.getAttribute('data-theme'),
    notif : $('#prefNotif').checked,
    suara : $('#prefSuara').checked
  };
  simpanLokal('lms_prefs', prefs);
  serverDiam('sinkronPreferensi', [prefs]);      // fire & forget, tidak memblokir UI
  toast('Tersimpan', 'Preferensi tampilan diperbarui.', 'success');
}

/* ── NOTIFIKASI ─────────────────────────────────────────────────────── */

function bukaNotifikasi(id, target) {
  serverDiam('tandaiNotifikasiDibaca', [[id]]);
  const n = (App.data.notifikasi || []).find(x => x.ID === id);
  if (n) n.Dibaca = 'YA';                        // optimistic: UI tidak menunggu server
  perbaruiHeader();
  rakitNavigasi();
  if (target && VIEW[target]) navigasi(target); else navigasi('notifikasi');
}

function tandaiSemuaDibaca() {
  (App.data.notifikasi || []).forEach(n => n.Dibaca = 'YA');
  perbaruiHeader();
  rakitNavigasi();
  navigasi('notifikasi');
  server('tandaiNotifikasiDibaca', [[]], () => {}, { diam: true });
  toast('Selesai', 'Seluruh notifikasi ditandai sudah dibaca.', 'success');
}

/* ── PERAYAAN GAMIFIKASI ────────────────────────────────────────────── */

function rayakanBadge(daftar) {
  const b = daftar[0];
  bukaModal({
    judul: 'Lencana Baru Terbuka',
    isi: '<div class="text-center" style="padding:10px 0">' +
      '<div class="badge-ico" style="width:78px;height:78px;margin:0 auto 16px;border-color:var(--secondary);' +
      'background:var(--secondary-soft);color:var(--secondary-text)">' +
      '<i data-lucide="' + esc(b.ikon || 'award') + '" style="width:34px;height:34px"></i></div>' +
      '<h2>' + esc(b.nama) + '</h2>' +
      '<p class="text-sm text-muted mt-sm">' + esc(b.deskripsi) + '</p>' +
      (daftar.length > 1 ? '<p class="text-xs text-muted mt-md">dan ' + (daftar.length - 1) +
        ' lencana lain terbuka bersamaan.</p>' : '') + '</div>',
    tombol: [
      { teks: 'Lihat Koleksi', kelas: 'btn-secondary', ikon: 'medal',
        onClick: () => { tutupModal(); navigasi('gamifikasi'); } },
      { teks: 'Lanjut Belajar', kelas: 'btn-primary' }
    ]
  });
}

function rayakanLevel(level, gelar) {
  toast('Naik ke Level ' + level, 'Gelar barumu: ' + gelar + '.', 'success');
}

/* ── EKSPOR CSV ─────────────────────────────────────────────────────── */

/**
 * Unduh CSV tanpa membuka tab baru — memakai Blob + anchor sementara,
 * sehingga aman dijalankan di dalam iframe.
 */
function unduhCSV(namaFile, kolom, baris) {
  const bersih = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const isi = '﻿' + [kolom.map(bersih).join(';')]
    .concat(baris.map(r => kolom.map(k => bersih(r[k])).join(';'))).join('\r\n');

  try {
    const blob = new Blob([isi], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Diunduh', namaFile + ' tersimpan di perangkat.', 'success');
  } catch (e) {
    // Sebagian browser memblokir unduhan dari dalam iframe — sediakan salinan manual.
    bukaModal({
      judul: 'Salin Data CSV',
      lebar: 'lg',
      isi: '<p class="text-sm text-muted mb-md">Peramban memblokir unduhan otomatis. ' +
        'Salin isi berikut lalu tempel ke Google Sheets atau Excel (pemisah titik koma).</p>' +
        '<textarea class="textarea" id="csvSalin" rows="12" readonly>' + esc(isi) + '</textarea>',
      tombol: [
        { teks: 'Tutup', kelas: 'btn-secondary' },
        { teks: 'Salin ke Papan Klip', kelas: 'btn-primary', ikon: 'copy',
          onClick: () => {
            const ta = document.getElementById('csvSalin');
            ta.select(); ta.setSelectionRange(0, 999999);
            try { document.execCommand('copy'); toast('Tersalin', 'Data siap ditempel.', 'success'); }
            catch (e2) { toast('Gagal menyalin', 'Pilih teks secara manual lalu tekan Ctrl+C.', 'warning'); }
          } }
      ]
    });
  }
}

function unduhCSVNilai() {
  const baris = (App.data.nilai || []).map(n => ({
    Mapel: kodeMapel(n.MapelID), Kategori: n.Kategori, Deskripsi: n.Deskripsi,
    Nilai: n.Nilai, KKM: n.KKM, Predikat: predikat(n.Nilai), Tanggal: n.TanggalInput
  }));
  if (!baris.length) return toast('Tidak ada data', 'Belum ada nilai untuk diekspor.', 'warning');
  unduhCSV('Rekap_Nilai_' + App.me.nomorInduk + '.csv',
    ['Mapel', 'Kategori', 'Deskripsi', 'Nilai', 'KKM', 'Predikat', 'Tanggal'], baris);
}

function unduhCSVLeger() {
  const baris = (App.data.pengumpulan || []).map(p => {
    const s = cari.siswa(p.SiswaID), t = cari.tugas(p.TugasID);
    return {
      NISN: s.NomorInduk, Nama: s.Nama, Kelas: namaKelas(s.KelasID),
      Mapel: kodeMapel(t.MapelID), Tugas: t.Judul, Jenis: t.Jenis,
      Status: p.Status, Nilai: p.Nilai, Dikirim: p.TanggalKirim, Feedback: p.Feedback
    };
  });
  if (!baris.length) return toast('Tidak ada data', 'Belum ada pengumpulan untuk diekspor.', 'warning');
  unduhCSV('Leger_Penilaian_' + new Date().toISOString().slice(0, 10) + '.csv',
    ['NISN', 'Nama', 'Kelas', 'Mapel', 'Tugas', 'Jenis', 'Status', 'Nilai', 'Dikirim', 'Feedback'], baris);
}

function unduhLaporanCSV() {
  const d = window._laporanTerakhir;
  if (!d || !d.baris.length) return toast('Belum ada laporan', 'Hasilkan laporan terlebih dahulu.', 'warning');
  unduhCSV(d.jenis + '_' + new Date().toISOString().slice(0, 10) + '.csv', Object.keys(d.baris[0]), d.baris);
}
