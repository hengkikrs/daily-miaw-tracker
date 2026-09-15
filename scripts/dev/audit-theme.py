#!/usr/bin/env python3
# scripts/dev/audit-theme.py — audit warna & tema Miaw Tracker
# Pakai: python3 scripts/dev/audit-theme.py [--json]
#
# 1) Inventaris hex literal di luar blok token (:root / [data-theme="dark"]).
# 2) Tandai warna bernuansa dingin (biru/hijau/ungu) sebagai kandidat "tidak satu tema".
# 3) Hitung kontras WCAG untuk token tema + warna hardcode utama.
# Skrip ini alat audit, bukan bagian build. Laporan: docs/qa/ui-audit-warna-2026-09-15.md
import json
import os
import re
import sys
import collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public')
ROOT = os.path.normpath(ROOT)
HEXRE = re.compile(r'#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b')
BRAND_ALLOW = {'#4285f4', '#34a853', '#fbbc05', '#ea4335'}  # logo Google (aset brand)


def norm(h):
    h = h.lower().lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return '#' + h


def rgb(h):
    h = norm(h)[1:]
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lum(h):
    def f(v):
        v = v / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(h)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)


def hue_kind(h):
    r, g, b = rgb(h)
    if b > r + 12 and b > g + 6:
        return 'cool-biru'
    if g > r + 12 and g > b + 12:
        return 'cool-hijau'
    if b > r + 12 or (b > g + 12 and r > g):
        return 'cool-ungu/teal'
    if r > b + 12:
        return 'warm'
    return 'netral'


def files():
    out = [os.path.join(ROOT, 'styles.css'), os.path.join(ROOT, 'theme.css')]
    for base, _, names in os.walk(os.path.join(ROOT, 'js')):
        for n in sorted(names):
            if n.endswith('.js'):
                out.append(os.path.join(base, n))
    return out


def token_hexes():
    hexes = set()
    for rel in ('styles.css', 'theme.css'):
        txt = open(os.path.join(ROOT, rel), encoding='utf-8').read()
        for m in re.finditer(r'^(:root|\[data-theme="dark"\])\s*\{(.*?)^\}', txt, re.S | re.M):
            for v in re.findall(r'--[a-z0-9-]+\s*:\s*([^;]+);', m.group(2)):
                hit = HEXRE.match(v.strip())
                if hit:
                    hexes.add(norm(hit.group(0)))
    return hexes


def scan():
    usage = collections.defaultdict(list)
    for p in files():
        rel = os.path.relpath(p, ROOT)
        in_tokens = False
        for i, line in enumerate(open(p, encoding='utf-8', errors='replace'), 1):
            if re.match(r'^\s*(:root|\[data-theme="dark"\])\s*\{', line):
                in_tokens = True
            if in_tokens:
                if line.strip() == '}':
                    in_tokens = False
                continue
            # baris peta warna lama (LEGACY) memang harus memuat hex lama
            if 'LEGACY' in line or 'legacy' in line:
                continue
            # entri peta warna lama: '  '#lama': '#baru',  '
            if re.match(r"^\s*'#[0-9a-f]{6}':\s*'#[0-9a-f]{6}'", line, re.I):
                continue
            for m in HEXRE.finditer(line):
                h = norm(m.group(0))
                if h not in BRAND_ALLOW:
                    usage[h].append(f'{rel}:{i}')
    return usage


def main():
    tok = token_hexes()
    usage = scan()
    off = {h: v for h, v in usage.items() if h not in tok}
    cool = {h: v for h, v in off.items() if hue_kind(h).startswith('cool')}
    light = dict(panel='#fffdf9', bg='#faf6ef', text='#26201a', muted='#776b5e', green='#3d9a5f',
                 pink='#d05792', violet='#7c5cbf', orange='#e0682f', danger='#c93c30', teal='#e85d4f')
    dark = dict(panel='#211d17', bg='#16130f', text='#f3ede3', muted='#a89b88', green='#5cb87e',
                pink='#e077ab', violet='#a487e0', orange='#ef8148', danger='#e05a4d', teal='#ef7263')

    print('== hex literal di luar palet token:', len(off), '| pemakaian:', sum(len(v) for v in off.values()))
    print('== di antaranya nuansa dingin (kandidat tidak satu tema):', len(cool),
          '| pemakaian:', sum(len(v) for v in cool.values()))
    print()
    for h, locs in sorted(cool.items(), key=lambda kv: -len(kv[1])):
        print(f'{h}  {hue_kind(h):<14} x{len(locs):<3} light={contrast(h, light["panel"]):>5} dark={contrast(h, dark["panel"]):>5}  {"; ".join(locs[:3])}')
    print()
    print('== kontras token tema ==')
    for name, T in (('LIGHT', light), ('DARK', dark)):
        for fg in ('muted', 'text', 'green', 'pink', 'violet', 'orange', 'teal'):
            r = contrast(T[fg], T['panel'])
            print(f'   {name} {fg:6}/panel = {r:5} {"OK" if r >= 4.5 else ("BESAR-OK" if r >= 3 else "GAGAL")}')
    if '--json' in sys.argv:
        print(json.dumps({'off': off, 'cool': cool}, indent=1))


if __name__ == '__main__':
    main()
