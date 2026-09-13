# scripts/dev/archive

Skrip **sekali pakai** yang dipakai untuk refactor modular (2026-09-14). Disimpan sebagai bukti/provenance.
Jangan dijalankan lagi pada repo saat ini — semuanya mengasumsikan `public/app.js` masih berisi satu IIFE.

- `migrate-stage1-faseB.py` — membuka pembungkus IIFE + memindahkan `core/*` dan `auth/*`.
- `migrate-stage2-faseCH.py` — memindahkan `modules/*`, `events/*`, `bootstrap/*`; `app.js` menjadi shim.

Validator yang MASIH berguna (ada di `scripts/dev/`):
- `check-syntax.js` — kompilasi + deteksi deklarasi top-level duplikat.
- `gen-symbol-index.js` — regenerasi `docs/symbol-index.md`.
- `coverage_check.py` — bukti multiset: tidak ada baris kode hilang/duplikat antar file.
