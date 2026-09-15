#!/usr/bin/env node
// scripts/dev/check-theme.js — guardrail tema Miaw Tracker.
//
// Gagal (exit 1) bila menemukan warna hex literal di luar blok token
// (:root / [data-theme="dark"]) pada styles.css, theme.css, dan public/js/**.
//
// Pengecualian yang diizinkan:
//   - aset brand: logo Google (#4285F4 #34A853 #FBBC05 #EA4335)
//   - baris peta warna lama (komentar berisi "LEGACY"/"legacy") di JS
//   - palet khusus cetak/PDF di js/modules/laporan-export.js (wajib hex literal)
//
// Pakai: node scripts/dev/check-theme.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'public');
const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const BRAND = new Set(['#4285f4', '#34a853', '#fbbc05', '#ea4335']);
const PRINT_OK = ['js/modules/laporan-export.js'];

function norm(h) {
  const v = h.toLowerCase().replace('#', '');
  return '#' + (v.length === 3 ? v.split('').map((c) => c + c).join('') : v);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = [path.join(ROOT, 'styles.css'), path.join(ROOT, 'theme.css')].concat(walk(path.join(ROOT, 'js')));
const tokenHexes = new Set();

for (const rel of ['styles.css', 'theme.css']) {
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const blocks = txt.match(/^(:root|\[data-theme="dark"\])\s*\{[\s\S]*?^\}/gm) || [];
  for (const b of blocks) {
    for (const line of b.split('\n')) {
      const m = line.match(/--[a-z0-9-]+\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/);
      if (m) tokenHexes.add(norm(m[1]));
    }
  }
}

const problems = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (PRINT_OK.includes(rel)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inTokens = false;
  lines.forEach((line, i) => {
    if (/^\s*(:root|\[data-theme="dark"\])\s*\{/.test(line)) inTokens = true;
    if (inTokens) {
      if (line.trim() === '}') inTokens = false;
      return;
    }
    if (/legacy/i.test(line)) return;
    // entri peta warna lama: '  '#lama': '#baru',  '
    if (/^\s*'#[0-9a-f]{6}':\s*'#[0-9a-f]{6}'/i.test(line)) return;
    const hits = line.match(HEX) || [];
    for (const h of hits) {
      const n = norm(h);
      if (BRAND.has(n) || tokenHexes.has(n)) continue;
      problems.push(`${rel}:${i + 1}  ${n}  →  ${line.trim().slice(0, 90)}`);
    }
  });
}

if (problems.length) {
  console.error(`GAGAL — ${problems.length} warna hex di luar token tema:\n` + problems.map((p) => '  ' + p).join('\n'));
  console.error('\nGunakan token dari theme.css (mis. var(--green-strong), var(--chart-1), var(--cat-karier)).');
  process.exit(1);
}

console.log(`LULUS — tidak ada hex literal di luar token tema (${files.length} file diperiksa, ${tokenHexes.size} hex token).`);
