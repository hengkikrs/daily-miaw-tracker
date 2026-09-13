#!/usr/bin/env node
/**
 * Regenerasi docs/symbol-index.md (peta navigasi 1 baris per simbol).
 *
 * Pakai:
 *   node scripts/dev/gen-symbol-index.js
 *
 * Output: daftar deklarasi top-level per file + nomor baris.
 * - Untuk public/app.js yang masih IIFE: deklarasi di indent 2 = level atas IIFE (inilah 588 simbol).
 * - Untuk file yang sudah dipotong (classic script): deklarasi di kolom 0.
 *
 * Jalankan ulang setiap kali file dipindah/ditambah agar nomor baris tetap akurat.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'docs', 'symbol-index.md');

const RE_COL0 = /^(?:async\s+function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const RE_IND2 = /^  (?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^  (?:const|let|var)\s+([A-Za-z_$][\w$]*)/;

function listJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listJs(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out.sort();
}

const lines = [];
lines.push('# Symbol Index (generated)');
lines.push('');
lines.push('> Hasil `node scripts/dev/gen-symbol-index.js`. **Jangan edit manual** — jalankan ulang setelah memindah/menambah kode.');
lines.push('> Gunakan file ini untuk menemukan nomor baris, lalu baca hanya rentang tersebut dengan `read_file(offset, limit)`.');
lines.push('');

let total = 0;
for (const file of listJs(PUBLIC_DIR)) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const rows = [];
  src.split('\n').forEach((line, i) => {
    let m = RE_COL0.exec(line);
    if (m) { rows.push({ n: m[1], l: i + 1, ind: 0 }); return; }
    m = RE_IND2.exec(line);
    if (m) rows.push({ n: m[1] || m[2], l: i + 1, ind: 2 });
  });
  if (!rows.length) continue;
  total += rows.length;
  const deep = rows.filter((r) => r.ind === 2).length;
  lines.push(`## ${rel} (${src.split('\n').length} baris, ${rows.length} simbol${deep ? ` — ${deep} di dalam IIFE` : ''})`);
  lines.push('');
  lines.push(rows.map((r) => `\`${r.n}\`@${r.l}`).join(' · '));
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push(`Total simbol terindeks: ${total}.`);
fs.writeFileSync(OUT, `${lines.join('\n')}\n`);
console.log(`docs/symbol-index.md diperbarui: ${total} simbol.`);
