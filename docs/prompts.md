# Panduan Prompting — Tracker Daily (hemat token, sesuai struktur modular)

Repo ini sudah dipecah jadi 33 modul di `public/js/**` (sejak rilis `ui42`). Dokumen ini
berisi cara menulis prompt supaya agen **langsung bekerja pada file yang benar** dan tidak
memboroskan token dengan membaca seluruh repo.

Angka di bawah ini **terukur**, bukan klaim: estimasi token = byte/4.

---

## 1. Empat aturan dasar (berlaku di semua prompt)

1. **Sebut repo + peta navigasi.** `Kerjakan di /opt/tracker-daily. Baca AGENTS.md dan docs/navigation.md dulu.`
   → 1.674 + 1.478 ≈ **3.152 token sekali**, menghindari pembacaan buta.
2. **Sebut modul/view-nya.** `view catatan` / `modules/notes.js` / `finance-transactions.js`.
   → menghilangkan biaya discovery (grep + baca window besar).
3. **Sebut batasannya.** `Jangan ubah storage key, struktur data tersimpan, auth, atau endpoint api/.`
   → mencegah agen "menjelajah" untuk memastikan.
4. **Sebut cara validasinya.** `Validasi: node scripts/dev/check-syntax.js + uji view terkait.`
   → validasi jadi output kecil (bukan membaca kode).

**Header mini siap tempel (untuk chat singkat):**
```
Di /opt/tracker-daily. Ikuti AGENTS.md + docs/navigation.md. Jangan baca semua modul —
cari simbol dulu (docs/symbol-index.md), baca file modul yang relevan saja.
Jangan ubah storage key / struktur data / auth / api. Validasi: scripts/dev/check-syntax.js.
Laporkan file yang kamu baca.
```

---

## 2. Template per jenis tugas

### A. Fitur/ubah UI di modul yang sudah ada
```
Di /opt/tracker-daily (ikutilah AGENTS.md).
Tujuan: <hasil yang diinginkan>.
Target: view <nama-view> → public/js/modules/<file>.js.
Acuan: docs/modules/<modul>.md + docs/navigation.md (untuk data-action/dispatch).
Batasan: jangan ubah storage key, struktur data, auth, api/; jangan sentuh modul lain.
Terima kasih, sertakan: fungsi yang diubah + bukti uji view tersebut.
Validasi: node scripts/dev/check-syntax.js, lalu uji 1 view itu di browser lokal
       (python3 -m http.server 8899 --directory public).
```

### B. Bugfix kecil / perilaku aneh
```
Di /opt/tracker-daily. Gejala: <apa yang terjadi> vs <yang diharapkan>.
Dugaan lokasi: modules/<file>.js (view <view>).
Cari dulu penyebabnya dengan mencari simbol/atribut (docs/symbol-index.md), jangan baca seluruh file.
Perbaiki minimal (tanpa refactor tambahan), lalu tunjukkan baris yang berubah + cara uji.
```

### C. Perubahan lintas modul (store/field baru)
```
Di /opt/tracker-daily. Tujuan: <mis. tambah field "tagihan" pada transaksi>.
Rencana wajib sebelum mengedit: sebutkan modul yang terdampak
(form, render, laporan, dashboard, budget/savings turunan) dan konfirmasi apakah
field ikut tersinkron (buildStoresPayload/state blob).
Baca hanya file yang kamu sebut. Jangan ubah nama key atau bentuk data lama (tambahan harus aditif).
Validasi: check-syntax + coverage_check.py --orig-from-git pre-refactor-baseline + uji view terkait.
```

### D. Debug ("kenapa X tidak jalan")
```
Di /opt/tracker-daily. Perilaku: <gejala>. Reproduksi: <langkah>.
Hipotesis dulu (1-3 kandidat + file yang akan diperiksa), baru baca kode.
Jangan membaca lebih dari 2 file sebelum menyebut hipotesis.
Setelah ketemu: perbaikan minimal + bukti (output test/DOM) + risiko regresi.
```

### E. QA / cek regresi
```
Di /opt/tracker-daily. Uji <fitur/route> di build lokal (port 8899) dengan sesi palsu.
Gunakan checklist di docs/qa/report.md sebagai acuan cakupan.
Laporkan: hasil per item, error console, dan apa yang TIDAK teruji (jangan klaim lulus tanpa bukti).
```

### F. Rilis & deploy
```
Di /opt/tracker-daily. Naikkan cache-bust SEMUA aset ke ?v=<YYYYMMDD>-ui<NN+1>
(yaitu 33 <script> + styles.css + theme.css + runtime-config.js — jangan hanya <script>).
Validasi: check-syntax + coverage_check.py + uji lokal, lalu deploy produksi dengan
token di /tmp/.vtok (jangan pernah echo), dan verifikasi produksi: jumlah token baru di HTML,
runtime-config terisi, /api/lookup-user → 404 not_found, 17 view render, 0 error.
```

### G. Review kode / audit
```
Di /opt/tracker-daily. Tinjau perubahan pada <file/modul>.
Fokus: kebenaran, kemungkinan regresi pada modul lain, kepatuhan AGENTS.md.
Jangan menulis ulang; cukup temuan + usulan minimal, dengan bukti baris.
```

---

## 3. Anti-pola prompt → versi hematnya

| Prompt boros | Kenapa boros | Versi hemat |
|---|---|---|
| "Perbaiki halaman catatan" | agen harus menebak modul → grep + baca window besar | "Ubah view `catatan` → `modules/notes.js`" |
| "Cek seluruh aplikasi" | memicu pembacaan hampir semua file (≈114 rb token) | "Uji 3 view: dashboard, transaksi, reports — sesuai checklist docs/qa/report.md" |
| "Rapikan kode ini" | refactor buta → baca banyak file tanpa arah | "Batas: fungsi `noteFiltered` di `modules/notes.js` saja" |
| "Kenapa data tidak sinkron?" | eksplorasi luas tanpa hipotesis | "Dugaan: `buildStoresPayload`/`queueRemoteSave` di `core/05-storage.js` + `auth/13-remote-sync.js`; verifikasi dulu" |
| "Deploy" (tanpa detail) | agen harus menebak prosedur rilis | pakai template F |
| "Baca app.js" | `app.js` kini **shim 3 baris** | "Baca `modules/<modul>.js`; peta ada di `docs/navigation.md`" |

**Dampak terukur (per tugas modul):** pola tepat sasaran ≈ **8–10 rb token**; pola "baca file besar lalu ulang" ≈ **42–63 rb token** (selisih ~80%). Perbandingan apel-ke-apel dengan struktur lama: **-36% s/d -49%** (lihat `docs/decisions/refactor-log.md`).

---

## 4. Yang SUDAH diterapkan di mesin ini (2026-09-14)

Status konfigurasi (terverifikasi, bukan asumsi):

```yaml
agent:
  coding_context: on          # posture coding dipaksa di semua platform, termasuk Telegram
  coding_instructions: "<aturan repo Tracker Daily, 583 karakter>"
```

**Bukti verifikasi** (memanggil `resolve_runtime_mode(platform='telegram', cwd='/home/ubuntu', config=…)`):

| | profil | blok brief | blok instruksi | tambahan prompt |
|---|---|---|---|---|
| Sebelum (`auto`) | general, `is_coding=False` | 0 | 0 | 0 token |
| Sesudah (`on` + instruksi) | **coding, `is_coding=True`** | 2.626 char | 620 char (instruksi kita) | **≈812 token/sesi** |

- Blok instruksi **benar-benar terkirim** (isi `trailing[0]` = "Operator instructions (from config): Saat mengerjakan kode di /opt/tracker-daily …").
- Snapshot workspace = kosong karena cwd `/home/ubuntu` bukan repo → tidak ada biaya tambahan dari situ.
- Biaya +812 token dibayar **sekali per sesi** (prefix sistem stabil → ikut prompt cache, tidak dihitung ulang tiap turn).
- Balik modal pada tugas kode pertama: satu tugas modul menghemat ≈6–7 rb token (terukur), pola "baca window besar" ≈20–35 rb token.
- Efek samping yang perlu diketahui: sesi **non-koding** (mis. tanya berita) juga menerima brief coding generik (~656 token). Kalau tidak mau, kembalikan ke `auto`.
- Konfigurasi dibaca saat **sesi dimulai** — aktif pada sesi berikutnya (`/new`), bukan di percakapan yang sedang berjalan (agar prompt cache tidak rusak).

**Cara membatalkan:**
```bash
hermes config set agent.coding_context auto
hermes config set agent.coding_instructions ""
```

### Prompt biasa yang sekarang sudah cukup

Dengan instruksi tetap di atas, prompt pendek seperti ini sudah memadai:
- `Tambah filter tag di halaman catatan`
- `Tombol simpan di form Budget tidak muncul di HP, cek`
- `Perbaiki angka total di laporan bulan ini`
- `Ubah warna tombol Tambah Dokumen jadi hijau`
- `Deploy rilis ui43`

Alasannya: instruksi tetap sudah memaksa urutan **AGENTS.md → docs/navigation.md → file modul**, larangan membaca semua modul, larangan mengubah storage key/auth/api, dan kewajiban validasi `check-syntax.js` + laporan file yang dibaca.

Opsi lain (tetap berlaku):
1. **Baris tambahan di prompt** bila ingin lebih eksplisit: `Ikuti AGENTS.md di /opt/tracker-daily.`
2. **CLI/TUI dari folder repo** (`cd /opt/tracker-daily && hermes`) → posture coding otomatis tanpa `on`.
3. **Tugas terjadwal / kanban:** set `workdir: /opt/tracker-daily` → `AGENTS.md`/context file direktori itu ikut disuntik.

---

## 5. Checklist hemat token untuk tugas panjang

- [ ] Sebut repo + modul/view + batasan + cara validasi (4 aturan di §1).
- [ ] Minta agen **menyebut rencana file yang akan dibaca** sebelum membaca (maks 2–3 file dulu).
- [ ] Larang eksplisit: "jangan baca `docs/symbol-index.md` penuh (≈7,5 rb token) — pakai pencarian."
- [ ] Minta **bukti uji** (output script/DOM), bukan narasi.
- [ ] Minta laporan akhir: file yang dibaca, baris yang diubah, hasil validasi.
- [ ] Untuk tugas besar: pecah per fase (1 fase = 1 commit) supaya konteks tidak menumpuk.

**Target biaya per tugas (acuan):** bugfix satu fungsi ≈ **2–5 rb token**; fitur satu modul ≈ **8–12 rb token**;
perubahan lintas modul (+laporan/dashboard) ≈ **15–25 rb token**; QA satu rilis ≈ **20–30 rb token**
(termasuk menjalankan browser, bukan membaca kode).
