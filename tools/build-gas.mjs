#!/usr/bin/env node
/* ==========================================================================
   tools/build-gas.mjs
   Membangkitkan berkas .html untuk versi cadangan di Google Apps Script
   dari sumber yang sama dengan versi GitHub Pages (css/ dan js/).

   Kenapa ada skrip ini
   --------------------
   Versi cadangan di Apps Script memakai kode yang persis sama dengan versi
   GitHub Pages. Kalau berkas .html-nya disalin manual, dalam beberapa pekan
   keduanya pasti berbeda tanpa ada yang menyadari — dan bug yang sudah
   diperbaiki di satu sisi akan muncul lagi di sisi lain. Skrip ini membuat
   repo ini jadi satu-satunya sumber kebenaran.

   Cara pakai
   ----------
     node tools/build-gas.mjs

   Hasilnya ada di folder build-gas/. Salin isi tiap berkas ke berkas HTML
   dengan nama yang sama di editor Apps Script.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const KELUAR = join(AKAR, 'build-gas');

const baca = (...p) => readFileSync(join(AKAR, ...p), 'utf8');
const tulis = (nama, isi) => {
  writeFileSync(join(KELUAR, nama), isi);
  const kb = (Buffer.byteLength(isi) / 1024).toFixed(1);
  console.log(`  ✓ ${nama.padEnd(20)} ${kb.padStart(7)} KB`);
};

mkdirSync(KELUAR, { recursive: true });

console.log('\nMembangun versi cadangan Apps Script dari sumber repo…\n');

/* ── 1. Stylesheet ──────────────────────────────────────────────────── */
tulis('Stylesheet.html', '<style>\n' + baca('css', 'style.css') + '\n</style>\n');

/* ── 2. Berkas JavaScript, satu per satu ────────────────────────────── */
const skrip = [
  ['js/config.js',  'Config.html'],
  ['js/api.js',     'Api.html'],
  ['js/app.js',     'App.html'],
  ['js/views.js',   'Views.html'],
  ['js/views2.js',  'Views2.html'],
  ['js/views3.js',  'Views3.html'],
  ['js/actions.js', 'Actions.html']
];
for (const [sumber, tujuan] of skrip) {
  tulis(tujuan, '<script>\n' + baca(...sumber.split('/')) + '\n</script>\n');
}

/* ── 3. Index versi Apps Script ─────────────────────────────────────── */
// Diturunkan dari index.html: tag <link> dan <script src> diganti scriptlet
// include(), dan URL /exec disuntikkan server supaya cadangan tidak perlu
// dikonfigurasi terpisah.
let index = baca('index.html');

index = index
  .replace(
    '  <link rel="stylesheet" href="css/style.css">',
    "  <?!= include('Stylesheet') ?>"
  )
  .replace(
    /<!-- ══ Skrip aplikasi[\s\S]*?<script src="js\/actions\.js"><\/script>/,
    [
      '<!-- URL /exec disuntikkan server: versi cadangan tidak perlu diisi manual. -->',
      "<script>window.__GAS_EXEC_URL__ = '<?= ScriptApp.getService().getUrl() ?>';</script>",
      "<?!= include('Config') ?>",
      "<?!= include('Api') ?>",
      "<?!= include('App') ?>",
      "<?!= include('Views') ?>",
      "<?!= include('Views2') ?>",
      "<?!= include('Views3') ?>",
      "<?!= include('Actions') ?>"
    ].join('\n')
  )
  // <base target="_top"> wajib ada di dalam iframe HtmlService supaya tautan
  // keluar tidak terbuka di dalam bingkai sandbox.
  .replace('<meta name="theme-color"', '<base target="_top">\n  <meta name="theme-color"');

tulis('Index.html', index);

/* ── 4. Pemeriksaan hasil ───────────────────────────────────────────── */
const dibuat = readdirSync(KELUAR).sort();
const wajib = ['Actions.html','Api.html','App.html','Config.html','Index.html',
               'Stylesheet.html','Views.html','Views2.html','Views3.html'];
const kurang = wajib.filter(w => !dibuat.includes(w));

console.log('');
if (kurang.length) {
  console.error('✗ Berkas belum lengkap: ' + kurang.join(', '));
  process.exit(1);
}
if (!index.includes("include('Actions')") || index.includes('js/app.js')) {
  console.error('✗ Index.html gagal diubah — pola <script src> tidak cocok. Periksa index.html.');
  process.exit(1);
}

console.log(`Selesai. ${dibuat.length} berkas siap disalin ke Apps Script.`);
console.log('Nama berkas di editor Apps Script harus sama persis (tanpa .html).\n');
