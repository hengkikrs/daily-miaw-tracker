#!/usr/bin/env node
/**
 * Validator ringan tanpa dependency untuk Tracker Daily.
 *
 * Pakai:
 *   node scripts/dev/check-syntax.js
 *
 * Yang diperiksa:
 *   1. Kompilasi setiap file .js di public/ (classic script) — setara `node --check`.
 *   2. Deklarasi top-level (kolom 0) yang DUPLIKAT antar file → early SyntaxError di browser
 *      begitu app.js dibuka menjadi banyak classic script.
 *   3. Deklarasi top-level duplikat di dalam satu file.
 *   4. Untuk public/app.js yang masih berbentuk IIFE: melaporkan jumlah deklarasi top-level (indent 2)
 *      agar jumlah simbol bisa dibandingkan dengan docs/symbol-index.md.
 *
 * Exit code 0 = semua lulus, 1 = ada masalah.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const DECL_AT_COL0 = /^(?:async\s+function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const DECL_INDENT2 = /^  (?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^  (?:const|let|var)\s+([A-Za-z_$][\w$]*)/;

function listJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listJs(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out.sort();
}

const errors = [];
const warnings = [];
const globalDecls = new Map(); // nama -> [file, ...]

const files = listJs(PUBLIC_DIR);
if (files.length === 0) {
  errors.push('Tidak ada file .js di public/');
}

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');

  // 1. kompilasi
  try {
    new vm.Script(src, { filename: file });
  } catch (err) {
    errors.push(`${rel}: SYNTAX ERROR — ${err.message}`);
    continue;
  }

  // 2/3. deklarasi top-level kolom 0
  const seen = new Map();
  let indent2Count = 0;
  src.split('\n').forEach((line, i) => {
    const m = DECL_AT_COL0.exec(line);
    if (m) {
      const name = m[1];
      if (seen.has(name)) errors.push(`${rel}: deklarasi top-level duplikat '${name}' (baris ${seen.get(name)} dan ${i + 1})`);
      seen.set(name, i + 1);
      if (!globalDecls.has(name)) globalDecls.set(name, []);
      globalDecls.get(name).push(rel);
    }
    if (DECL_INDENT2.test(line)) indent2Count += 1;
  });

  const topLevel = seen.size;
  console.log(`${rel}: OK — ${src.split('\n').length} baris, ${topLevel} deklarasi top-level (kolom 0)${indent2Count ? `, ${indent2Count} deklarasi indent-2 (IIFE)` : ''}`);
}

for (const [name, where] of globalDecls) {
  if (where.length > 1) {
    errors.push(`'${name}' dideklarasikan di beberapa file: ${where.join(', ')} — ini SyntaxError bila semuanya classic script`);
  }
}

if (files.length && globalDecls.size === 0) {
  warnings.push('Tidak ada deklarasi top-level kolom 0 — kemungkinan semua file masih berbentuk IIFE (belum dibuka).');
}

console.log('');
if (warnings.length) warnings.forEach((w) => console.log(`WARN  ${w}`));
if (errors.length) {
  errors.forEach((e) => console.log(`FAIL  ${e}`));
  console.log(`\n${errors.length} masalah ditemukan.`);
  process.exit(1);
}
console.log(`LULUS — ${files.length} file diperiksa, 0 duplikat, 0 syntax error.`);
