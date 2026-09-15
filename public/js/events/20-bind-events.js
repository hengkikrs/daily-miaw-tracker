// Tracker Daily — 20-bind-events
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function bindEvents() {
  dom.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  dom.menuBtn.addEventListener('click', openSidebar);
  dom.overlay.addEventListener('click', closeSidebar);

  dom.yearSelect.addEventListener('change', () => {
    activeYear = Number(dom.yearSelect.value);
    ensureYear(activeYear);
    saveState();
    renderShell();
  });

  dom.monthList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-month]');
    if (!button) return;

    activeMonth = Number(button.dataset.month);
    activeView = 'month';
    mobileDailyExpanded = false;
    mobileOpenSections = new Set(['daily']);
    saveState();
    renderShell();
    closeSidebar();
  });

  dom.authScreen.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'authLoginForm') loginWithPassword(event.target);
    if (event.target.id === 'authSignupForm') signupWithPassword(event.target);
    if (event.target.id === 'authOtpForm') verifyAuthOtp(event.target);
  });

  dom.authScreen.addEventListener('input', (event) => {
    const id = event.target.id;
    if (id === 'authPassword' && authMode === 'signup') refreshPwChecklistUi(event.target.value);
    if (id === 'authName') refreshUsernamePreview(event.target.value);
  });

  dom.authScreen.addEventListener('click', (event) => {
    const button = event.target.closest('[data-auth-action]');
    if (!button) return;

    if (button.dataset.authAction === 'toggle-pw') {
      const input = dom.authScreen.querySelector('#authPassword');
      if (!input) return;
      authPwVisible = !authPwVisible;
      input.type = authPwVisible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(authPwVisible));
      button.setAttribute('aria-label', authPwVisible ? 'Sembunyikan password' : 'Tampilkan password');
      button.querySelector('.eye-open').style.display = authPwVisible ? 'none' : '';
      button.querySelector('.eye-off').style.display = authPwVisible ? '' : 'none';
      input.focus();
      return;
    }

    if (button.dataset.authAction === 'start-signup' || button.dataset.authAction === 'start-login') {
      authMode = button.dataset.authAction === 'start-signup' ? 'signup' : 'login';
      authOtpEmail = '';
      authPendingPassword = '';
      authPendingName = '';
      authPendingUsername = '';
      authPwVisible = false;
      authPwChecks = { len: false, upper: false, other: false };
      authOtpResendAt = 0;
      renderAuthScreen();
      return;
    }

    if (button.dataset.authAction === 'to-landing') {
      authMode = 'landing';
      authOtpEmail = '';
      authPendingPassword = '';
      authPwVisible = false;
      authOtpResendAt = 0;
      renderAuthScreen();
      return;
    }

    if (button.dataset.authAction === 'switch-mode') {
      authMode = authMode === 'login' ? 'signup' : 'login';
      authOtpEmail = '';
      authPendingPassword = '';
      authPendingName = '';
      authPendingUsername = '';
      authPwVisible = false;
      authPwChecks = { len: false, upper: false, other: false };
      authOtpResendAt = 0;
      renderAuthScreen();
    }

    if (button.dataset.authAction === 'back-to-signup') {
      authOtpEmail = '';
      authPendingPassword = '';
      authPwVisible = false;
      authOtpResendAt = 0;
      renderAuthScreen();
    }

    if (button.dataset.authAction === 'resend-signup') resendSignupOtp();
    if (button.dataset.authAction === 'google') startGoogleLogin();
  });

  dom.authPanel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-auth-action]');
    if (!button) return;

    if (button.dataset.authAction === 'logout') logoutAuth();
  });

  document.addEventListener('click', (event) => {
    const groupToggle = event.target.closest('[data-group-toggle]');
    if (groupToggle) {
      const key = groupToggle.dataset.groupToggle;
      if (openNavGroups.has(key)) {
        openNavGroups.delete(key);
      } else {
        openNavGroups.add(key);
      }
      saveState();
      syncNavGroups();
      return;
    }

    const jadwalCheckEl = event.target.closest('[data-jadwal-check]');
    if (jadwalCheckEl) { handleJadwalAction(jadwalCheckEl); return; }
    const jadwalBtn = event.target.closest('[data-jadwal-mode],[data-jadwal-prev],[data-jadwal-next],[data-jadwal-day],[data-jadwal-add],[data-jadwal-cancel],[data-jadwal-ev],[data-jadwal-task]');
    if (jadwalBtn && event.target.tagName !== 'INPUT' && handleJadwalAction(jadwalBtn)) return;

  const goalBtn = event.target.closest('[data-goal-add],[data-goal-back],[data-goal-filter],[data-goal-open],[data-goal-cat],[data-goal-term],[data-goal-add-again],[data-goal-ms-add],[data-goal-ms-cancel],[data-goal-ms-del],[data-goal-edit],[data-goal-del],[data-goal-del-cancel],[data-goal-del-confirm],[data-goal-cal-prev],[data-goal-cal-next],[data-goal-cal-day],[data-goal-cal-page],[data-goal-proj]');
  if (goalBtn && handleGoalAction(goalBtn)) return;

  const progBtn = event.target.closest('[data-progress-tab]');
  if (progBtn && handleProgressAction(progBtn)) return;

  const projBtn = event.target.closest('[data-proj-add],[data-proj-form-back],[data-proj-filter],[data-proj-open],[data-proj-back],[data-proj-tab],[data-proj-tfilter],[data-proj-menu],[data-proj-icon],[data-proj-color],[data-proj-status],[data-proj-edit],[data-proj-archive],[data-proj-del],[data-proj-task-add],[data-proj-note-add],[data-proj-file-add],[data-proj-note-del],[data-proj-file-del],[data-goal-from-proj],[data-pt-add-task],[data-pt-edit],[data-pt-edit-cancel],[data-pt-del],[data-proj-setstatus]');
  if (projBtn && handleProjectAction(projBtn)) return;

  const noteBtn = event.target.closest('[data-note-new],[data-note-tab],[data-note-tagfil],[data-note-tag],[data-note-open],[data-note-menu],[data-note-menu-close],[data-note-sheet-close],[data-note-dmenu],[data-note-back],[data-note-tpl],[data-note-edit],[data-note-edit2],[data-note-pin],[data-note-fav],[data-note-arch],[data-note-del],[data-note-epin],[data-note-efav],[data-note-cat],[data-note-cmd]');
  if (noteBtn && event.target.tagName !== 'INPUT' && handleNoteAction(noteBtn)) return;

  const docBtn = event.target.closest('button[data-doc-new],button[data-doc-link],button[data-doc-upload],button[data-doc-import],div[data-doc-pickfile],button[data-doc-pickfile],button[data-doc-addcat],button[data-doc-tab],button[data-doc-favfil],button[data-doc-mtype],button[data-doc-menu],button[data-doc-menu-close],button[data-doc-closeform],div[data-doc-closeform],div[data-doc-sheet-close],button[data-doc-moveopen],button[data-doc-open2],button[data-doc-move],button[data-doc-edit],button[data-doc-fav],button[data-doc-del],tr[data-doc-open]');
  if (docBtn && event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && !(docBtn.classList.contains('doc-modal-wrap') && event.target.closest('.doc-modal')) && !(docBtn.classList.contains('note-sheet-wrap') && event.target.closest('.note-sheet')) && handleDocAction(docBtn)) return;

  const txBtn = event.target.closest('[data-tx-ftype],[data-tx-ftype-btn],[data-tx-mprev],[data-tx-mnext],[data-tx-mtoday],[data-tx-day],[data-tx-dayclear],[data-tx-focus],[data-tx-canceledit],[data-tx-edit],[data-tx-del]');
  if (txBtn && handleTxAction(txBtn)) return;
  const budBtn = event.target.closest('[data-bud-mprev],[data-bud-mnext],[data-bud-mtoday],[data-bud-filter],[data-bud-open],[data-bud-back],[data-bud-new],[data-bud-edit],[data-bud-del],[data-bud-cancelform],[data-bud-newtx],[data-bud-cancelform2],[data-bud-gotx]');
  if (budBtn && handleBudAction(budBtn)) return;
  const svBtn = event.target.closest('[data-sv-filter],[data-sv-open],[data-sv-back],[data-sv-new],[data-sv-newtx],[data-sv-deposit],[data-sv-edit],[data-sv-archive],[data-sv-del],[data-sv-cancelform],[data-sv-cancelform2],[data-sv-pick-ic],[data-sv-pick-color]');
  if (svBtn && handleSaveAction(svBtn)) return;
  const repBtn = event.target.closest('[data-rep-goto]');
  if (repBtn && handleRepAction(repBtn)) return;

  const lapBtn = event.target.closest('[data-lap-mode],[data-lap-sec],[data-lap-all],[data-lap-ai],[data-lap-dl]');
  if (lapBtn && handleLaporanAction(lapBtn)) return;

    const dailyBtn = event.target.closest('[data-daily-tab],[data-daily-add],[data-daily-cancel],[data-daily-toggle],[data-daily-open],[data-daily-jadwal],[data-daily-delete],[data-daily-back],[data-daily-rtedit],[data-daily-rtdel],[data-daily-rt-toggle],[data-daily-edit],[data-daily-focus-start],[data-daily-focus-pause],[data-daily-focus-stop]');
    if (dailyBtn && handleDailyAction(dailyBtn)) return;
    const dashBtn = event.target.closest('[data-dash-go]');
    if (dashBtn && handleDashAction(dashBtn)) return;

    const taskBtn = event.target.closest('[data-task-open],[data-task-back],[data-task-toggle],[data-task-filter],[data-task-delete],[data-task-add],[data-task-cancel],[data-task-menu],[data-task-edit],[data-task-cancel-edit],[data-task-focus],[data-task-focus-pause],[data-task-add-close],[data-task-options],[data-task-add-again],[data-task-sub-add],[data-task-sub-del],[data-task-att-add],[data-task-att-del]');
    if (taskBtn && event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && event.target.tagName !== 'TEXTAREA' && handleTaskAction(taskBtn)) return;

    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      activeView = viewButton.dataset.view;
      const groupKey = NAV_GROUP_OF[activeView];
      if (groupKey) openNavGroups.add(groupKey);
      if (activeView === 'habits') {
        const current = currentTrackingDate();
        activeYear = current.year;
        activeMonth = current.monthIndex;
        mobileDailyExpanded = false;
        mobileOpenSections = new Set(['daily']);
      }
      saveState();
      renderShell();
      closeSidebar();
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      // Tap di area sel (bukan cuma checkbox kecil) = toggle slot
      const cell = event.target.closest('td.slot-cell[data-slot-index]');
      if (cell) {
        const box = cell.querySelector('input.slot-check:not(:disabled)');
        if (box) box.click();
      }
      return;
    }

    const { action, category, habitId, month } = actionButton.dataset;

    if (action === 'jump-month') {
      activeMonth = Number(month);
      activeView = 'month';
      mobileDailyExpanded = false;
      mobileOpenSections = new Set(['daily']);
      saveState();
      renderShell();
      return;
    }

    if (action === 'toggle-daily-full') {
      mobileDailyExpanded = !mobileDailyExpanded;
      renderShell();
      return;
    }

    if (action === 'toggle-mobile-section') {
      if (mobileOpenSections.has(category)) {
        mobileOpenSections.delete(category);
      } else {
        mobileOpenSections.add(category);
      }
      renderShell();
      return;
    }

    if (action === 'rename-habit') renameHabit(category, habitId);
    if (action === 'edit-points') editHabitPoints(category, habitId);
    if (action === 'toggle-active') toggleActive(category, habitId);
    if (action === 'delete-habit') deleteHabit(category, habitId);
    if (action === 'reset-month') resetMonthChecks();
    if (action === 'delete-account-data') { accountDeleteOpen = true; renderShell(); dom.content.querySelector('#acctDelConfirm')?.focus(); return; }
    if (action === 'acct-del-noop') return;
    if (action === 'account-delete-cancel') { accountDeleteOpen = false; renderShell(); return; }
    if (action === 'account-delete-confirm') confirmAccountDeletion();
    if (action === 'account-password-page') { accountPage = 'password'; acctNewPwVisible = false; acctPwDraft = { pw: '', confirm: '' }; renderShell(); return; }
    if (action === 'account-back') { accountPage = 'main'; acctPwDraft = { pw: '', confirm: '' }; renderShell(); return; }
    if (action === 'acct-eye-on' || action === 'acct-eye-off') {
      const form = dom.content.querySelector('#accountPasswordForm');
      if (form) acctPwDraft = { pw: form.password.value, confirm: form.confirmPassword.value };
      acctNewPwVisible = action === 'acct-eye-on';
      renderShell();
      const inp = dom.content.querySelector('#accountPasswordForm [name=password]');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      refreshAcctPwUi(acctPwDraft.pw);
      return;
    }
    /* --- MiawAI --- */
    const miawQ = event.target.closest('[data-miaw-q]');
    if (miawQ) { miawSend(miawQ.dataset.miawQ); return; }
    const miawRm = event.target.closest('[data-miaw-rmfile]');
    if (miawRm) { miawFiles.splice(Number(miawRm.dataset.miawRmfile), 1); renderShell(); return; }
    if (action === 'miaw-new') { miawMessages = []; miawFiles = []; miawDraft = ''; miawContextSent = false; renderShell(); return; }
    if (action === 'miaw-attach') { dom.content.querySelector('#miawFile')?.click(); return; }
    if (action === 'miaw-send') {
      const inp = dom.content.querySelector('#miawInput');
      miawSend(inp ? inp.value : miawDraft);
      return;
    }
  });

  dom.content.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target && event.target.id === 'miawInput' && !miawBusy) {
      event.preventDefault();
      miawSend(event.target.value);
    }
  });

  dom.content.addEventListener('change', (event) => {
    const miawModelSel = event.target.closest('#miawModelSel');
    if (miawModelSel) { miawModel = miawModelSel.value; renderShell(); return; }
    const lapModelSel = event.target.closest('#lapAiModel');
    if (lapModelSel) { lapAiModel = lapModelSel.value; renderShell(); return; }
    const miawFileEl = event.target.closest('#miawFile');
    if (miawFileEl) { handleMiawFiles(miawFileEl); return; }
    const dailyRt = event.target.closest('[data-daily-rt]');
    if (dailyRt) { handleDailyAction(dailyRt); return; }
    const dailyTgl = event.target.closest('[data-daily-toggle]');
    if (dailyTgl && activeView === 'task') { handleDailyAction(dailyTgl); return; }
    const taskCheck = event.target.closest('[data-task-toggle],[data-task-sub]');
    if (taskCheck) handleTaskAction(taskCheck);
    const projChk = event.target.closest('[data-proj-ms],[data-proj-task],[data-proj-search],[data-pt-move]');

    if (projChk && projChk.matches('[data-pt-move]')) {
      const tid = projChk.dataset.ptMove; const dest = projChk.value;
      if (dest) { const tasks = loadTasks(); const t = tasks.find((x) => x.id === tid); if (t) { t.project = dest; saveTasks(); } renderShell(); }
    } else if (projChk) handleProjectChange(projChk);
    const noteSortEl = event.target.closest('[data-note-sort]');
    if (noteSortEl) { noteSort = noteSortEl.value; renderShell(); }
    const docTypeEl = event.target.closest('[data-doc-ftype]');
    if (docTypeEl) { docType = docTypeEl.value; renderShell(); }
    const docSortEl = event.target.closest('[data-doc-sort]');
    if (docSortEl) { docSort = docSortEl.value; renderShell(); }
    const docFileEl = event.target.closest('#docForm input[type="file"], #docImportInput');
    if (docFileEl) {
      if (docFileEl.id === 'docImportInput') handleDocImport(docFileEl);
      else handleDocFilePick(docFileEl);
    }
    const noteChk = event.target.closest('.note-body input[type="checkbox"]');
    if (noteChk && noteId) {
      if (noteChk.checked) noteChk.setAttribute('checked', ''); else noteChk.removeAttribute('checked');
      const host = dom.content.querySelector('.note-body');
      if (host) noteSetField(noteId, { body: sanitizeNoteHtml(host.innerHTML) });
    }
    const noteEdChk = event.target.closest('.note-editor input[type="checkbox"]');
    if (noteEdChk && noteId) {
      if (noteEdChk.checked) noteEdChk.setAttribute('checked', ''); else noteEdChk.removeAttribute('checked');
      const host = dom.content.querySelector('.note-editor');
      if (host) { noteEditorSave({ body: sanitizeNoteHtml(host.innerHTML) }); }
    }
    const goalMs = event.target.closest('[data-goal-ms]');
    if (goalMs) {
      const [gid, mid] = goalMs.dataset.goalMs.split(':');
      const items = loadGoals();
      const g = items.find((x) => x.id === gid);
      if (g) {
        const mi = (g.milestones || []).find((x) => x.id === mid);
        if (mi) {
          mi.done = goalMs.checked;
          if (g.status !== 'selesai' && (g.milestones || []).length && g.milestones.every((x) => x.done)) g.status = 'selesai';
          if (g.status === 'selesai' && !g.milestones.every((x) => x.done)) g.status = 'aktif';
          saveGoals(items);
          renderShell();
        }
      }
    }
  });

  dom.content.addEventListener('input', (event) => {
    const acctPw = event.target.closest('#accountPasswordForm [name=password]');
    if (acctPw) { refreshAcctPwUi(acctPw.value); }
    const delInp = event.target.closest('#acctDelConfirm');
    if (delInp) {
      const go = dom.content.querySelector('#acctDelGo');
      if (go) go.disabled = delInp.value.trim().toLowerCase() !== 'ya, saya ingin hapus akun';
    }
    const projSearch = event.target.closest('[data-proj-search]');
    if (projSearch) handleProjectChange(projSearch);
    const noteEl = event.target.closest('[data-note-search],[data-note-title],[data-note-tags],[data-note-body]');
    if (noteEl) handleNoteInput(noteEl);
    const docEl = event.target.closest('[data-doc-search]');
    if (docEl) handleDocSearch(docEl.value);
    const budEl = event.target.closest('#budForm [name]');
    if (budEl && budFormOpen) { const f = dom.content.querySelector('#budForm'); if (f) budDraft = budDraftFrom(f); }
    const svEl = event.target.closest('#svForm [name]');
    if (svEl && saveFormOpen) { const f = dom.content.querySelector('#svForm'); if (f) saveDraft = svDraftFrom(f); }
    const svTxEl = event.target.closest('#svTxForm [name]');
    if (svTxEl && saveTxOpen) { const f = dom.content.querySelector('#svTxForm'); if (f) saveTxDraft = { svId: f.stxSv.value, kind: f.stxKind.value, amount: f.stxAmount.value, date: f.stxDate.value, source: f.stxSource.value, note: f.stxNote.value }; }
  });

  dom.content.addEventListener('change', (event) => {
    const svSwitch = event.target.closest('#svTxForm [name=stxSv]');
    if (svSwitch && saveTxOpen) { const f = dom.content.querySelector('#svTxForm'); if (f) { saveTxDraft = { svId: f.stxSv.value, kind: f.stxKind.value, amount: f.stxAmount.value, date: f.stxDate.value, source: f.stxSource.value, note: f.stxNote.value }; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ block: 'center' }); } }
  });

  dom.content.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'projForm') { submitProjectForm(event.target); return; }
    if (event.target.id === 'docForm') { submitDocForm(event.target); return; }
    if (event.target.id === 'txForm') { submitTxForm(event.target); return; }
    if (event.target.id === 'budForm') { submitBudForm(event.target); return; }
    if (event.target.id === 'budTxForm') { submitBudTxForm(event.target); return; }
    if (event.target.id === 'svForm') { submitSvForm(event.target); return; }
    if (event.target.id === 'svTxForm') { submitSvTxForm(event.target); return; }
    if (event.target.id === 'noteCaptureForm') {
      const input = event.target.querySelector('input[name="q"]');
      const text = (input.value || '').trim();
      if (!text) return;
      input.value = '';
      const n = noteCapture(text);
      noteId = n.id; notePage = 'editor';
      renderShell();
      return;
    }
    if (event.target.id === 'projTaskForm' || event.target.id === 'projNoteForm' || event.target.id === 'projFileForm' || event.target.id === 'ptEditForm') { submitProjectSubForm(event.target); return; }
    if (event.target.id === 'taskComposer') {
      const form = event.target;
      const title = form.querySelector('#taskQuickInput').value.trim();
      if (!title) { taskAdding = false; renderShell(); return; }
      const date = form.querySelector('#taskQuickWhen').value || taskTodayIso();
      const project = form.querySelector('#taskQuickProj').value.trim() || firstProjName();
      if (!project) { showToast('Buat project dulu — task harus berdasarkan project.', true); return; }
      loadTasks().push({ id: `t${Date.now()}`, title, project, tag: '', time: '', priority: 'low', date, done: false });
      taskAdding = false;
      if (date !== taskTodayIso()) taskFilter = 'all';
      saveTasks();
      renderShell();
      return;
    }
    if (event.target.id === 'taskAddForm') {
      const form = event.target;
      if (submitTaskAdd(form, false)) {
        taskPageAdding = false;
        logActivityLastTask('Task dibuat');
        renderShell();
      }
      return;
    }
    if (event.target.id === 'goalAddForm') {
      event.preventDefault();
      submitGoalForm(event.target, false);
      return;
    }
    if (event.target.id === 'goalMsForm') {
      event.preventDefault();
      submitGoalMsForm(event.target);
      return;
    }
    if (event.target.id === 'dailyAddForm') {
      event.preventDefault();
      dailySubmitAdd(event.target);
      return;
    }
    if (event.target.id === 'jadwalAddForm') {
      event.preventDefault();
      const form = event.target;
      const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
      const title = val('title');
      if (!title) return;
      const items = loadJadwalEvents();
      const date = val('date') || taskTodayIso();
      if (jadwalEditingId) {
        const ev = items.find((x) => x.id === jadwalEditingId);
        if (ev) { ev.title = title; ev.date = date; ev.time = val('time') || '09:00'; ev.category = val('category') || 'Pribadi'; ev.kind = val('kind') === 'task' ? 'task' : 'event'; }
        jadwalEditingId = null;
      } else {
        items.push({ id: `j${Date.now()}`, title, date, time: val('time') || '09:00', category: val('category') || 'Pribadi', kind: val('kind') === 'task' ? 'task' : 'event' });
      }
      saveJadwalEvents(items);
      jadwalSelIso = date;
      jadwalAdding = false;
      renderShell();
      return;
    }
    if (event.target.id === 'taskEditForm') {
      const form = event.target;
      const t = loadTasks().find((x) => x.id === taskDetailId);
      if (t) {
        const title = form.querySelector('[name=title]').value.trim();
        if (title && title !== t.title) { t.title = title; logTaskActivity(t, 'Judul diubah'); }
        const proj = form.querySelector('[name=project]').value.trim();
        if (!proj) { showToast('Task harus berdasarkan project — pilih project.', true); return; }
        if (proj !== (t.project || '')) { t.project = proj; logTaskActivity(t, 'Project diubah'); }
        const date = form.querySelector('[name=date]').value;
        const time = form.querySelector('[name=time]').value;
        if (date !== (t.date || '') || time !== (t.time || '')) { t.date = date; t.time = time; logTaskActivity(t, 'Deadline diubah'); }
        const prio = form.querySelector('[name=priority]').value;
        if (prio !== t.priority) { t.priority = prio; logTaskActivity(t, 'Prioritas diubah'); }
        const notes = form.querySelector('[name=notes]').value.trim();
        if (notes !== (t.notes || '')) { t.notes = notes; logTaskActivity(t, 'Deskripsi diperbarui'); }
        saveTasks();
      }
      taskEditing = false;
      renderShell();
      return;
    }
    if (event.target.id === 'habitForm') addHabit(event.target);
    if (event.target.id === 'accountProfileForm') updateAccountProfile(event.target);
    if (event.target.id === 'accountPasswordForm') changeAccountPassword(event.target);
  });

  dom.content.addEventListener('change', (event) => {
    const syncEl = event.target.closest('[data-add-sync]');
    if (syncEl) {
      const read = syncEl.parentElement.querySelector('.task-add-read');
      if (read) read.textContent = syncEl.dataset.addSync === 'date' ? taskDateRead(syncEl.value) : taskTimeRead(syncEl.value);
    }
    const input = event.target.closest('[data-action="toggle-slot"]');
    if (!input) return;
    toggleSlot(input);
  });

  // Pulihkan sesi fokus yang berjalan setelah reload
  {
    const running = loadTasks().find((x) => x.focusAt);
    if (running) {
      focusTaskId = running.id;
      if (!focusInterval) focusInterval = setInterval(tickFocusDisplay, 1000);
    }
    // sesi fokus daily task (kegiatan sekali / rutinitas) juga dilanjutkan setelah reload
    const dailyRunningTask = loadDailyTasks().find((x) => x && x.id && x.focusAt);
    const dailyRunningRoutine = dailyRunningTask ? null : loadDailyRoutines().find((r) => r.focusAt);
    if (dailyRunningTask || dailyRunningRoutine) {
      dailyFocusKey = dailyRunningTask ? `task:${dailyRunningTask.id}` : `rutin:${dailyRunningRoutine.id}`;
      if (!dailyFocusInterval) dailyFocusInterval = setInterval(dailyTickFocus, 1000);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') queueRemoteSave({ immediate: true, keepalive: true });
  });

  window.addEventListener('pagehide', () => {
    queueRemoteSave({ immediate: true, keepalive: true });
  });
}
