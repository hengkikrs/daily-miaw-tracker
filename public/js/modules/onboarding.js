// Tracker Daily — modul onboarding (tutorial pop-up untuk akun baru)
// Classic script — urutan load: lihat <script> di public/index.html.
// Tutorial otomatis HANYA untuk akun yang BARU TERDAFTAR, dan hanya sekali
// per akun. Akun lama tidak pernah kena. Bisa dilewati kapan saja lewat tombol
// "Lewati tutorial" di bagian bawah, dan diputar ulang dari menu Akun.
'use strict';

const ONBOARDING_STEPS = [
  {
    view: 'dashboard',
    ico: '👋',
    title: 'Selamat datang di Miaw Tracker',
    text: 'Tracker ini menyatukan kebiasaan, tugas, target, catatan, dokumen, dan keuanganmu dalam satu tempat.',
    list: ['Semua data tersimpan di perangkatmu dan disinkronkan ke akun sendiri.', 'Tutorial ini ±1 menit — kamu bisa melewatinya kapan saja.'],
  },
  {
    view: 'habits',
    ico: '📅',
    title: '1. Isi Kebiasaan (Habit)',
    text: 'Habit adalah pondasi. Isi daftar kebiasaanmu, lalu centang kotaknya setiap kali selesai.',
    list: [
      'Ada tiga jadwal: harian, mingguan, dan bulanan (pilih saat menambah kebiasaan).',
      'Klik slot kotak untuk mencentang — nilai poin tersimpan otomatis.',
      'Streak dan skor bulanan dihitung dari centang ini.',
    ],
  },
  {
    view: 'task',
    ico: '✅',
    title: '2. Catat Task & Agenda Harian',
    text: 'Di Daily Task kamu menulis kegiatan hari ini, sedangkan Jadwal untuk agenda bertanggal.',
    list: [
      'Tambah kegiatan, pilih jenis (rutin/sekali) dan jamnya.',
      'Prioritas memberi warna: tinggi, sedang, rendah.',
      'Buka detail task untuk memakai sesi fokus (timer).',
    ],
  },
  {
    view: 'goals',
    ico: '🎯',
    title: '3. Tentukan Goals & Project',
    text: 'Goals adalah hasil besar yang ingin dicapai. Pecah menjadi Project, lalu Project Task yang bisa dicentang.',
    list: [
      'Buat goal: tulis judul, kategori, dan deadline-nya.',
      'Tambahkan milestone untuk memantau kemajuan.',
      'Project mewadahi task, catatan, dan berkasnya.',
    ],
  },
  {
    view: 'catatan',
    ico: '🗂️',
    title: '4. Simpan Catatan & Dokumen',
    text: 'Catatan untuk ide dan jurnal (autosave), Dokumen untuk berkas dan tautan penting.',
    list: [
      'Catatan mendukung tebal, miring, daftar, kutipan, dan tautan.',
      'Beri kategori agar mudah dicari lagi.',
      'Dokumen bisa diunggah atau ditautkan, lengkap dengan kategori.',
    ],
  },
  {
    view: 'transaksi',
    ico: '💰',
    title: '5. Catat Keuangan',
    text: 'Mulai dari Transaksi: catat uang masuk dan keluar setiap hari.',
    list: [
      'Kalender cashflow memperlihatkan hari masuk (hijau) dan keluar.',
      'Budget menahan pengeluaran per kategori tiap bulan.',
      'Tabungan memantau target dan progres setoran.',
    ],
  },
  {
    view: 'reports',
    ico: '📊',
    title: '6. Pantau Laporan',
    text: 'Laporan merangkum seluruh modul — bisa dilihat di layar atau diunduh sebagai PDF.',
    list: [
      'Pilih periode: bulan ini, 3 bulan, atau tahun ini.',
      'Aktifkan bagian yang ingin disertakan (Activity, Goals, Organization, Finance).',
      'MiawAI (menu terpisah) siap membantu merangkum dan menyusun rencana.',
    ],
  },
  {
    view: 'dashboard',
    ico: '🚀',
    title: 'Mulai dari tiga hal ini',
    text: 'Kamu tidak perlu mengisi semuanya sekarang. Cukup mulai dari yang paling kecil.',
    list: ['Tulis 1 kebiasaan harian.', 'Catat 1 task untuk hari ini.', 'Masukkan 1 transaksi (uang masuk/keluar).'],
  },
];

let obStep = 0;
let obOpen = false;
// Jendela waktu: akun dianggap BARU TERDAFTAR bila waktu pembuatan akun
// ≈ waktu login terakhir (data user dari Supabase).
const ONBOARDING_NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

function onboardingDone() {
  return Boolean(state && state.onboardingDone);
}

// Akun lama: created_at jauh sebelum last_sign_in_at → tidak pernah kena tutorial otomatis.
function onboardingFreshlyRegistered() {
  const user = (typeof authSession !== 'undefined' && authSession && authSession.user) || null;
  if (!user) return false;
  const created = Date.parse(user.created_at || user.inserted_at || '');
  const lastIn = Date.parse(user.last_sign_in_at || '');
  if (!created || !lastIn) return false;
  return Math.abs(lastIn - created) < ONBOARDING_NEW_ACCOUNT_WINDOW_MS;
}

// Tutorial otomatis HANYA untuk akun baru terdaftar, dan hanya sekali per akun:
// penanda dipasang begitu pop-up dibuka (bukan saat selesai), jadi tidak akan
// muncul lagi walau pop-up ditutup di tengah jalan.
function maybeStartOnboarding() {
  if (obOpen || onboardingDone()) return;
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) return;
  if (!onboardingFreshlyRegistered()) return;
  openOnboarding(0, true);
}

function openOnboarding(step, auto = false) {
  obOpen = true;
  obStep = clamp(step, 0, ONBOARDING_STEPS.length - 1);
  if (auto && !onboardingDone()) {
    state.onboardingDone = true;
    state.onboardingDoneAt = Date.now();
    saveState();
  }
  renderOnboarding();
}

function closeOnboarding(markDone) {
  obOpen = false;
  const wrap = document.getElementById('obWrap');
  if (wrap) wrap.remove();
  if (markDone && !onboardingDone()) {
    state.onboardingDone = true;
    state.onboardingDoneAt = Date.now();
    saveState();
  }
}

function obGoto(step) {
  obStep = clamp(step, 0, ONBOARDING_STEPS.length - 1);
  renderOnboarding();
}

function renderOnboarding() {
  let wrap = document.getElementById('obWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'obWrap';
    wrap.className = 'ob-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'obTitle');
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-ob-action]');
      if (!btn) return;
      const act = btn.dataset.obAction;
      if (act === 'next') obGoto(obStep + 1);
      if (act === 'prev') obGoto(obStep - 1);
      if (act === 'skip') { closeOnboarding(true); if (typeof showToast === 'function') showToast('Tutorial dilewati. Kamu bisa membukanya lagi di menu Akun.'); }
      if (act === 'done') { closeOnboarding(true); if (typeof showToast === 'function') showToast('Selamat memakai Miaw Tracker 🐱'); }
    });
    document.addEventListener('keydown', obKeyHandler);
  }

  const st = ONBOARDING_STEPS[obStep];
  const isLast = obStep === ONBOARDING_STEPS.length - 1;

  // pindahkan halaman di belakang pop-up agar konteks tutorial terlihat
  if (st.view && typeof activeView !== 'undefined' && activeView !== st.view) {
    activeView = st.view;
    if (typeof saveState === 'function') saveState();
    renderShell();
  }

  wrap.innerHTML = `
    <div class="ob-card">
      <header class="ob-head">
        <span class="ob-count">Langkah ${obStep + 1} dari ${ONBOARDING_STEPS.length}</span>
        <span class="ob-dots" aria-hidden="true">
          ${ONBOARDING_STEPS.map((_, i) => `<i class="${i === obStep ? 'on' : ''}"></i>`).join('')}
        </span>
      </header>

      <div class="ob-body">
        <span class="ob-ico">${st.ico}</span>
        <h2 class="ob-title" id="obTitle">${st.title}</h2>
        <p class="ob-text">${st.text}</p>
        <ul class="ob-list">${st.list.map((li) => `<li>${li}</li>`).join('')}</ul>
      </div>

      <footer class="ob-foot">
        <div class="ob-nav${obStep === 0 ? ' single' : ''}">
          ${obStep === 0 ? '' : '<button type="button" class="ob-btn ghost" data-ob-action="prev">← Kembali</button>'}
          ${isLast
            ? '<button type="button" class="ob-btn primary" data-ob-action="done">Mulai pakai tracker</button>'
            : '<button type="button" class="ob-btn primary" data-ob-action="next">Lanjut →</button>'}
        </div>
        <button type="button" class="ob-skip" data-ob-action="skip">Lewati tutorial</button>
      </footer>
    </div>
  `;

  const focusTarget = wrap.querySelector(isLast ? '[data-ob-action="done"]' : '[data-ob-action="next"]');
  if (focusTarget) focusTarget.focus();
}

function obKeyHandler(event) {
  if (!obOpen) {
    document.removeEventListener('keydown', obKeyHandler);
    return;
  }
  if (event.key === 'Escape') closeOnboarding(true);
  if (event.key === 'ArrowRight') obGoto(obStep + 1);
  if (event.key === 'ArrowLeft') obGoto(obStep - 1);
}
