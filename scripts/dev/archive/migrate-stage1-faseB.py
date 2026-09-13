#!/usr/bin/env python3
"""Versi final mesin migrasi (anchor-based sections + detach init();)."""
import re, os, sys, collections

ROOT='/opt/tracker-daily'; APP=f'{ROOT}/public/app.js'
STAGE=int(sys.argv[1]) if len(sys.argv)>1 else 1
APPLY='--apply' in sys.argv
src=open(APP,encoding='utf-8').read(); lines=src.split('\n'); N=len(lines)
FUNC_RE=re.compile(r'^  (?:async )?function ([A-Za-z0-9_$]+)\s*\(')
VAR_RE =re.compile(r'^  (const|let|var) ([A-Za-z0-9_$]+)\s*=')
syms=[]
for i,l in enumerate(lines,1):
    m=FUNC_RE.match(l)
    if m: syms.append({'line':i,'kind':'fn','name':m.group(1)}); continue
    m=VAR_RE.match(l)
    if m: syms.append({'line':i,'kind':'var','name':m.group(2)})
syms.sort(key=lambda s:s['line'])
tail_close=N
for i in range(N,0,-1):
    if lines[i-1].strip()=='})();': tail_close=i; break
for k,s in enumerate(syms):
    nxt=syms[k+1]['line'] if k+1<len(syms) else tail_close+1
    e=nxt-1
    while e>s['line'] and (lines[e-1].strip()=='' or lines[e-1].strip().startswith(('//','/*','*'))): e-=1
    s['end']=e
prev_end=0
for s in syms:
    lead=s['line']-1
    while lead>prev_end and (lines[lead-1].strip()=='' or lines[lead-1].strip().startswith(('//','/*','*'))): lead-=1
    s['full_start'],s['full_end']=lead+1,s['end']; prev_end=s['end']
byname={s['name']:s for s in syms}

# ---- section by ANCHOR (tahan perubahan nomor baris) ----
ANCH=[('core-bootstrap',[None]),('auth+remote-sync',['createFreshState','getRemoteClientId']),
 ('habit-model',['ensureYear','ensureMonth']),('auth-screen',['refreshPwChecklistUi','renderAuthScreen']),
 ('daily-tasks',['DAILY_TASK_STORE_KEY','dailyTodayIso']),('jadwal',['JADWAL_STORE_KEY','jadwalMode']),
 ('shell-router',['renderShell']),('tasks+focus',['TASK_STORE_KEY','taskSeed']),('goals',['GOALS_STORE_KEY']),
 ('projects',['PROJ_STORE_KEY']),('notes',['NOTES_STORE_KEY']),('report-legacy',['repMonthKey']),
 ('savings',['SAVE_CATS']),('budget',['BUD_CATS']),('transactions',['TX_CATS_OUT']),('documents',['DOC_BASE_CATS']),
 ('progress',['progressTab','progTaskDone']),('dashboard',['renderPlaceholderView']),
 ('habit-analytics',['calculateCategoryBreakdown']),('miawai',['MIAW_MODELS']),('account',['accountPage']),
 ('legacy-weekly',['renderMonth']),('bindEvents',['bindEvents']),('init',['init']),('laporan-export',['LAP_SECTIONS'])]
resolved=[]
for n,cands in ANCH:
    ln=None
    for c in cands:
        if c is None: ln=1; break
        if c in byname: ln=byname[c]['line']; break
    if ln is None: print('FATAL anchor hilang untuk section',n,cands); sys.exit(1)
    resolved.append((n,ln))
ANCH=resolved
SEC=[]
for i,(n,a) in enumerate(ANCH):
    end=ANCH[i+1][1] if i+1<len(ANCH) else N+1
    SEC.append((n,a,end))
def sec(ln):
    for n,a,b in SEC:
        if a<=ln<b: return n
    return '?'

F={'$':'core/02-runtime-dom','dom':'core/02-runtime-dom','runtimeConfig':'core/02-runtime-dom',
 'supabaseConfig':'core/02-runtime-dom','remoteEnabled':'core/02-runtime-dom','runtimeYear':'core/02-runtime-dom',
 'uid':'core/04-utils','escapeHtml':'core/04-utils','clamp':'core/04-utils','normalizeHabitPoints':'core/04-utils',
 'suggestHabitPoints':'core/04-utils','habitPoints':'core/04-utils','roundPercent':'core/04-utils',
 'compactPercent':'core/04-utils','pointScore':'core/04-utils','daysInMonth':'core/04-utils',
 'focusedDayIndex':'core/04-utils','currentTrackingDate':'core/04-utils','weeksInMonth':'core/04-utils',
 'slotCountFor':'core/04-utils','slotLabel':'core/04-utils','slotTitle':'core/04-utils',
 'noteRandomB64url':'core/04-utils','canonicalUsername':'core/04-utils','evaluatePassword':'core/04-utils',
 'allPwChecksPass':'core/04-utils','val2':'core/04-utils',
 'createFreshState':'core/05-storage','loadState':'core/05-storage','saveState':'core/05-storage',
 'readStoreJson':'core/05-storage','buildStoresPayload':'core/05-storage','applyStoresPayload':'core/05-storage',
 'cloneStateSnapshot':'core/05-storage','isValidRemoteState':'core/05-storage','hasYearData':'core/05-storage',
 'ensureYear':'core/05-storage','ensureMonth':'core/05-storage','normalizeMonth':'core/05-storage',
 'getAllHabits':'core/05-storage',
 'showToast':'core/06-toast','applyTheme':'core/07-theme','initTheme':'core/07-theme',
 'buildYearOptions':'core/08-nav','renderYearOptions':'core/08-nav','renderMonthList':'core/08-nav',
 'renderShell':'core/09-router','openSidebar':'core/09-router','closeSidebar':'core/09-router',
 'renderPlaceholderView':'core/09-router','rerenderWithScroll':'core/09-router',
 'loadAuthSession':'auth/11-session','saveAuthSession':'auth/11-session','clearAuthSession':'auth/11-session',
 'authEmail':'auth/11-session','authDisplayName':'auth/11-session','mergeAuthUser':'auth/11-session',
 'completeLogin':'auth/11-session','isLoggedIn':'auth/11-session',
 'otpRemainingSeconds':'auth/12-oauth','pkceChallenge':'auth/12-oauth','startGoogleLogin':'auth/12-oauth',
 'consumeOAuthCallback':'auth/12-oauth','consumeOAuthHash':'auth/12-oauth','clearAuthHash':'auth/12-oauth',
 'startOtpCountdown':'auth/12-oauth',
 'getRemoteClientId':'auth/13-remote-sync','canSyncRemote':'auth/13-remote-sync','authFetch':'auth/13-remote-sync',
 'refreshAuthSession':'auth/13-remote-sync','getAccessToken':'auth/13-remote-sync','supabaseFetch':'auth/13-remote-sync',
 'hydrateRemoteState':'auth/13-remote-sync','queueRemoteSave':'auth/13-remote-sync','flushRemoteSave':'auth/13-remote-sync',
 'saveRemoteState':'auth/13-remote-sync',
 'refreshPwChecklistUi':'auth/14-auth-ui','refreshUsernamePreview':'auth/14-auth-ui',
 'renderAuthScreen':'auth/14-auth-ui','renderAuthPanel':'auth/14-auth-ui',
 'acctEyeSvg':'auth/14-auth-ui','renderAccountPasswordPage':'auth/14-auth-ui','refreshAcctPwUi':'auth/14-auth-ui',
 'renderAccountTab':'auth/14-auth-ui','resolveLoginEmail':'auth/14-auth-ui','loginWithPassword':'auth/14-auth-ui',
 'signupWithPassword':'auth/14-auth-ui','resendSignupOtp':'auth/14-auth-ui','verifyAuthOtp':'auth/14-auth-ui',
 'logoutAuth':'auth/14-auth-ui','updateAccountProfile':'auth/14-auth-ui','changeAccountPassword':'auth/14-auth-ui',
 'confirmAccountDeletion':'auth/14-auth-ui',
 'JADWAL_STORE_KEY':'modules/schedule','TASK_STORE_KEY':'modules/tasks','GOALS_STORE_KEY':'modules/goals',
 'PROJ_STORE_KEY':'modules/projects','NOTES_STORE_KEY':'modules/notes','DAILY_TASK_STORE_KEY':'modules/daily-tasks',
 'calculateHabitProgress':'modules/habit-analytics','calculateDailyRates':'modules/habit-analytics',
 'dailyPointSummary':'modules/habit-analytics','calculateMonthStats':'modules/habit-analytics',
 'calculateYearStats':'modules/habit-analytics','calculateCategoryBreakdown':'modules/habit-analytics',
 'scoreClass':'modules/habit-analytics','renderDailyPercentStrip':'modules/habit-analytics',
 'renderPointCalendar':'modules/habit-analytics','renderMetric':'modules/habit-analytics',
 'renderTrendChart':'modules/habit-analytics','renderHabitsTab':'modules/habit-analytics',
 'renderMonth':'modules/habit-legacy','renderHabitSection':'modules/habit-legacy',
 'renderDailyRateRow':'modules/habit-legacy','renderEmptyHabitRow':'modules/habit-legacy',
 'renderHabitRow':'modules/habit-legacy','calculateLeaderboards':'modules/habit-legacy',
 'renderLeaderboard':'modules/habit-legacy','findHabit':'modules/habit-legacy','addHabit':'modules/habit-legacy',
 'toggleSlot':'modules/habit-legacy','renameHabit':'modules/habit-legacy','editHabitPoints':'modules/habit-legacy',
 'toggleActive':'modules/habit-legacy','deleteHabit':'modules/habit-legacy','resetMonthChecks':'modules/habit-legacy'}
SECFILE={'daily-tasks':'modules/daily-tasks','jadwal':'modules/schedule','tasks+focus':'modules/tasks',
 'goals':'modules/goals','projects':'modules/projects','notes':'modules/notes','report-legacy':'modules/finance-reports-legacy',
 'savings':'modules/finance-savings','budget':'modules/finance-budget','transactions':'modules/finance-transactions',
 'documents':'modules/finance-documents','progress':'modules/progress','dashboard':'modules/dashboard',
 'miawai':'modules/miawai','laporan-export':'modules/laporan-export','shell-router':'core/09-router',
 'habit-model':'modules/habit-analytics','habit-analytics':'modules/habit-analytics',
 'auth-screen':'auth/14-auth-ui','account':'auth/14-auth-ui','bindEvents':'events/20-bind-events','init':'bootstrap/30-init'}
def target(s):
    if s['name'] in F: return F[s['name']]
    k=sec(s['line'])
    if k=='core-bootstrap': return 'core/03-state'
    if k=='auth+remote-sync': return 'core/04-utils'
    if k=='legacy-weekly': return 'auth/14-auth-ui' if s['line']>=byname['resolveLoginEmail']['line'] else 'modules/habit-legacy'
    return SECFILE.get(k,'UNMAPPED:'+k)
for s in syms: s['file']=target(s)
unmapped=sorted({s['file'] for s in syms if s['file'].startswith('UNMAPPED')})
groups=collections.defaultdict(list)
for s in syms: groups[s['file']].append(s)
names={s['name']:s['file'] for s in syms}

# ---- load-time dependency ----
def loadtime_lines(s):
    if s['kind']=='var':
        return [lines[ln-1] for ln in range(s['full_start'],s['full_end']+1)]
    out=[]
    for ln in range(s['full_start'],s['full_end']+1):
        raw=lines[ln-1]
        if not raw.startswith('  ') or raw.startswith('   '): continue
        st=raw.strip()
        if not st or st.startswith(('//','/*','*','}')) or ln==s['line']: continue
        out.append(raw)
    return out
EXISTING=['core/01-config','core/04-utils','core/07-theme']
edges=collections.defaultdict(set); edge_src=collections.defaultdict(list)
for s in syms:
    txt='\n'.join(loadtime_lines(s)); txt=re.sub(r'\$\{[^}]*\}','',txt)
    for w in set(re.findall(r'(?<![\w.$])([A-Za-z_$][A-Za-z0-9_$]*)(?![\w${])',txt)):
        if w in names and w!=s['name'] and names[w]!=s['file']:
            edges[s['file']].add(names[w]); edge_src[(s['file'],names[w])].append((s['line'],s['name']))
def keyfile(f):
    if f in EXISTING: return (0,EXISTING.index(f),0)
    if f=='bootstrap/30-init': return (2,0,0)
    return (1,0,min(s['line'] for s in groups[f]))
allfiles=EXISTING+sorted(groups,key=keyfile)
order,temp,done,cycles=[],set(),set(),[]
def visit(f,stack):
    if f in done: return
    if f in temp: cycles.append(stack+[f]); return
    temp.add(f)
    for dep in sorted(edges.get(f,()),key=keyfile):
        if dep in allfiles: visit(dep,stack+[f])
    temp.discard(f); done.add(f); order.append(f)
for f in allfiles: visit(f,[])
if 'bootstrap/30-init' in order: order.remove('bootstrap/30-init'); order.append('bootstrap/30-init')

print('=== URUTAN LOAD ===')
for f in order:
    loc=sum(s['full_end']-s['full_start']+1 for s in groups.get(f,[]))
    print(f'  {f:<38} {loc:>5} baris {len(groups.get(f,[])):>3} simbol deps={sorted(edges.get(f,[])) or "-"}{" (ada)" if f in EXISTING else ""}')
print('unmapped:',unmapped or 'tidak ada','| cycle:',cycles or 'tidak ada')
print('=== EDGE + ASAL ===')
for (a,b),srcs in sorted(edge_src.items()): print(f'  {a} <- {b}  dari {srcs}')
if not APPLY: print('\n(dry-run)'); sys.exit(0)

# ---- ekstraksi ----
DETACH={}   # baris -> file tujuan (statement top-level khusus)
for i,l in enumerate(lines,1):
    if l.strip()=='init();': DETACH[i]='bootstrap/30-init'
to_extract=[f for f in order if f not in EXISTING and (STAGE==2 or f.startswith(('core/','auth/')))]
moved=set()
for f in to_extract:
    body=[]
    for s in sorted(groups[f],key=lambda x:x['line']):
        for ln in range(s['full_start'],s['full_end']+1):
            if ln in DETACH and DETACH[ln]!=f: continue
            l=lines[ln-1]; body.append(l[2:] if l.startswith('  ') else l); moved.add(ln)
    if f=='bootstrap/30-init':
        for ln,tgt in sorted(DETACH.items()):
            if tgt==f and ln not in moved:
                body.append(lines[ln-1].strip()); moved.add(ln)
    hdr=[f"// Tracker Daily — {f.split('/')[-1]}",
         "// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).",
         "// Classic script — urutan load: lihat <script> di public/index.html.",
         "'use strict';",""]
    path=f'{ROOT}/public/js/{f}.js'; os.makedirs(os.path.dirname(path),exist_ok=True)
    open(path,'w').write('\n'.join(hdr+body).rstrip('\n')+'\n')

rest=[l for i,l in enumerate(lines,1) if i not in moved]
clean=[]
for l in rest:
    st=l.strip()
    if st.startswith('(() =>') or st.startswith('(function') or st=='})();': continue
    if st=="'use strict';" and all(x.strip()=='' for x in clean): continue
    clean.append(l[2:] if l.startswith('  ') else l)
out=[]
for l in clean:
    if l.strip()=='' and out and out[-1].strip()=='': continue
    out.append(l)
has_code=[l for l in out if l.strip() and not l.strip().startswith('//')]
if STAGE==2 and not has_code:
    header=["// Tracker Daily — app.js (shim kompatibilitas).",
            "// SELURUH kode kini ada di public/js/**. File ini dipertahankan agar /app.js tidak 404.",
            "// JANGAN menambah kode di sini.",""]
elif STAGE==2:
    header=["// Tracker Daily — sisa kode (lihat public/js/**).","'use strict';",""]
else:
    header=["// Tracker Daily — app.js (sisa setelah FASE B: modul belum dipindah).",
            "// Classic script: pembungkus IIFE sudah dibuka. Muat SETELAH js/core/* dan js/auth/*.","'use strict';",""]
open(APP,'w').write('\n'.join(header+out).rstrip('\n')+'\n')

html_path=f'{ROOT}/public/index.html'; html=open(html_path,encoding='utf-8').read()
loaded=['runtime-config.js']+[f'js/{f}.js' for f in order if (f in to_extract or f in EXISTING)]
if STAGE==1: loaded.append('app.js')
tags='\n'.join(f'  <script src="{p}?v=20260914-mod"></script>' for p in loaded)
html=re.sub(r'  <script src="[^"]+"></script>\n?','',html).replace('</body>',tags+'\n</body>')
open(html_path,'w').write(html)
print(f"\nSTAGE {STAGE}: {len(to_extract)} file, {len(moved)} baris dipindah.")
print('urutan <script>:'); [print('   ',p) for p in loaded]
print('sisa kode di app.js:', len(has_code),'baris')
