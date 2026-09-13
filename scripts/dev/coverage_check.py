#!/usr/bin/env python3
"""
Bukti cakupan (multiset) untuk refactor modular Tracker Daily.

Membandingkan isi kode `public/app.js` VERSI ASLI (masih satu IIFE) dengan
gabungan seluruh file `public/js/**` yang dimuat `index.html`:

  - tidak ada baris kode yang HILANG
  - tidak ada baris yang DUPLIKAT

Pakai:
  python3 scripts/dev/coverage_check.py --orig /path/app-asli.js
  python3 scripts/dev/coverage_check.py --orig-from-git pre-refactor-baseline

Keluar dengan kode 1 bila ada selisih.
"""
import argparse, collections, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MARKERS = ('// Tracker Daily —', '// Dipisah dari', '// Classic script', '// JANGAN', '// SELURUH',
           '// Simbol:', '// Dimuat sebagai', '// --- ditambahkan dari app.js', '// sisa kode')


def read_orig(args):
    if args.orig_from_git:
        out = subprocess.run(['git', '-C', ROOT, 'show', f'{args.orig_from_git}:public/app.js'],
                             capture_output=True, text=True, check=True).stdout
        return out.split('\n'), f'git {args.orig_from_git}:public/app.js'
    with open(args.orig, encoding='utf-8') as fh:
        return fh.read().split('\n'), args.orig


def normalize_original(lines):
    out = []
    for line in lines:
        st = line.strip()
        if st.startswith('(() =>') or st.startswith('(function') or st == '})();':
            continue
        if st == "'use strict';" and not out:
            continue
        out.append(line[2:] if line.startswith('  ') else line)
    return [l for l in out if l.strip()]


def normalize_new(path):
    out = []
    with open(path, encoding='utf-8') as fh:
        for line in fh.read().split('\n'):
            st = line.strip()
            if st.startswith(MARKERS):
                continue
            if st == "'use strict';" and not out:
                continue
            out.append(line)
    return [l for l in out if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--orig')
    ap.add_argument('--orig-from-git')
    args = ap.parse_args()
    if not args.orig and not args.orig_from_git:
        ap.error('butuh --orig atau --orig-from-git')

    lines, label = read_orig(args)
    orig = normalize_original(lines)

    html = open(os.path.join(ROOT, 'public', 'index.html'), encoding='utf-8').read()
    order = [p for p in re.findall(r'<script src="([^"?]+)', html) if p.endswith('.js')]
    new, missing = [], []
    for p in order:
        if p == 'runtime-config.js':
            continue
        fp = os.path.join(ROOT, 'public', p)
        if not os.path.exists(fp):
            missing.append(p); continue
        new += normalize_new(fp)

    co, cn = collections.Counter(orig), collections.Counter(new)
    lost, extra = co - cn, cn - co
    print(f'sumber asli            : {label}')
    print(f'baris kode asli        : {len(orig)}')
    print(f'baris kode gabungan    : {len(new)}')
    print(f'file js dimuat         : {len(order)}')
    print(f'file hilang            : {missing or "tidak ada"}')
    print(f'baris HILANG           : {sum(lost.values())}')
    print(f'baris DUPLIKAT/BARU    : {sum(extra.values())}')
    for l, n in list(lost.items())[:10]:
        print(f'  [HILANG x{n}] {l[:100]}')
    for l, n in list(extra.items())[:10]:
        print(f'  [DUPLIKAT x{n}] {l[:100]}')
    ok = not lost and not extra and not missing
    print('COVERAGE:', 'LULUS (kode utuh, tidak ada duplikasi)' if ok else 'GAGAL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
