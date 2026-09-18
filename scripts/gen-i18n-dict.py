#!/usr/bin/env python3
"""
Generate public/js/core/06b-i18n-dict.js dari locales/en.json.
Key di en.json = slug stabil, value = terjemahan EN.
Kita butuh reverse map: teks Indonesia (dari id.json) → teks Inggris (dari en.json).
Output: const I18N_EN = { "teks Indonesia": "English text", ... };
"""
import json, os

base = '/opt/tracker-daily/public'
id_path = os.path.join(base, 'locales', 'id.json')
en_path = os.path.join(base, 'locales', 'en.json')
out_path = os.path.join(base, 'js', 'core', '06b-i18n-dict.js')

with open(id_path, encoding='utf-8') as f:
    id_dict = json.load(f)
with open(en_path, encoding='utf-8') as f:
    en_dict = json.load(f)

# Build reverse map: ID text → EN text
reverse = {}
for key in id_dict:
    id_text = id_dict[key]
    en_text = en_dict.get(key, id_text)
    if id_text != en_text:  # skip identity mappings
        reverse[id_text] = en_text

print(f"id.json keys: {len(id_dict)}")
print(f"en.json keys: {len(en_dict)}")
print(f"reverse map entries (non-identity): {len(reverse)}")

# Write as JS
header = """// Tracker Daily — 06b-i18n-dict.js
// AUTO-GENERATED from public/locales/id.json + en.json by scripts/gen-i18n-dict.py
// JANGAN edit manual. Edit locales/*.json lalu jalankan ulang script ini.
// Kamus terjemahan EN (kunci = teks Indonesia persis yang dirender modul).
// Dipakai translateDom() di 06-lang.js saat bahasa EN aktif.
'use strict';

const I18N_EN = """

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(header)
    json.dump(reverse, f, ensure_ascii=False, indent=1)
    f.write(';\n')

print(f"wrote {out_path} ({os.path.getsize(out_path)} bytes)")
