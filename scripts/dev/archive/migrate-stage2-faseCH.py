#!/usr/bin/env python3
"""STAGE 2 (FASE C-H): pindahkan modules/*, events/*, bootstrap/* keluar dari app.js.
Section tiap simbol diambil dari app.js ASLI (nama simbol -> section), bukan dari nomor baris,
sehingga tahan terhadap pergeseran baris akibat fase sebelumnya."""
import re, os, sys, collections

ROOT='/opt/tracker-daily'; APP=f'{ROOT}/public/app.js'
ORIG='/tmp/app-before-faseA.js'
APPLY='--apply' in sys.argv

# ---------- peta nama simbol -> section dari file ASLI ----------
orig=open(ORIG,encoding='utf-8').read().split('\n')
OSEC=[('core-bootstrap',1,271),('auth+remote-sync',271,895),('habit-model',895,1148),('auth-screen',1148,1308),
 ('daily-tasks',1308,1652),('jadwal',1652,1861),('shell-router',1861,2064),('tasks+focus',2064,2832),
 ('goals',2832,3140),('projects',3140,3697),('notes',3697,4116),('report-legacy',4116,4327),('savings',4327,4705),
 ('budget',4705,4993),('transactions',4993,5282),('documents',5282,5683),('progress',5683,5899),
 ('dashboard',5899,6195),('habit-analytics',6195,6407),('miawai',6407,6597),('account',6597,6741),
 ('legacy-weekly',6741,7479),('bindEvents',7479,7949),('init',7949,7976),('laporan-export',7976,9000)]
def osec(ln):
    for n,a,b in OSEC:
        if a<=ln<b: return n
    return '?'
FR=re.compile(r'^  (?:async )?function ([A-Za-z0-9_$]+)\s*\(')
VR=re.compile(r'^  (const|let|var) ([A-Za-z0-9_$]+)\s*=')
name2sec={}
for i,l in enumerate(orig,1):
    m=FR.match(l) or VR.match(l)
    if m:
        nm=m.group(2) if VR.match(l) else m.group(1)
        name2sec[nm]=osec(i)
print('peta simbol asli:',len(name2sec))

# ---------- parse app.js saat ini ----------
src=open(APP,encoding='utf-8').read(); lines=src.split('\n')
FIRST=None
for i,l in enumerate(lines,1):
    if re.match(r'^(?:async\s+)?function\s+[A-Za-z_$]', l) or re.match(r'^(?:const|let|var)\s+[A-Za-z_$]', l):
        FIRST=i; break
BASE=0 if FIRST else 2
if re.match(r'^  ', lines[FIRST-1]): BASE=2
if BASE==0: lines=['  '+l if l.strip() else l for l in lines]
N=len(lines)
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
prev=0
for s in syms:
    lead=s['line']-1
    while lead>prev and (lines[lead-1].strip()=='' or lines[lead-1].strip().startswith(('//','/*','*'))): lead-=1
    s['full_start'],s['full_end']=lead+1,s['end']; prev=s['end']

F={'createHabit':'core/05-storage','createMonth':'core/05-storage','JADWAL_STORE_KEY':'modules/schedule','TASK_STORE_KEY':'modules/tasks','GOALS_STORE_KEY':'modules/goals',
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
EXISTING={'core/01-config','core/02-runtime-dom','core/03-state','core/04-utils','core/05-storage','core/06-toast',
 'core/07-theme','core/08-nav','core/09-router','auth/11-session','auth/12-oauth','auth/13-remote-sync','auth/14-auth-ui'}
def target(s):
    t=F.get(s['name'])
    if t is None:
        k=name2sec.get(s['name'])
        if k is None: t='UNKNOWN'
        elif k in ('core-bootstrap','auth+remote-sync'): t='core/03-state'
        elif k=='legacy-weekly': t='modules/habit-legacy'
        else: t=SECFILE.get(k,'UNMAPPED:'+k)
    return t
for s in syms: s['file']=target(s)
bad=sorted({s['file'] for s in syms if s['file'].startswith(('UNMAPPED','UNKNOWN'))})
clash=sorted({s['file'] for s in syms if s['file'] in EXISTING})
print('simbol diproses:',len(syms),'| problem:',bad or 'tidak ada','| simbol yang di-append ke file lama:',clash or 'tidak ada')
if bad: print('FATAL: hentikan'); sys.exit(1)
groups=collections.defaultdict(list)
for s in syms: groups[s['file']].append(s)
for f in list(groups):
    if f in EXISTING and f not in name2sec: pass
names={s['name']:s['file'] for s in syms}

def loadtime_lines(s):
    if s['kind']=='var': return [lines[ln-1] for ln in range(s['full_start'],s['full_end']+1)]
    out=[]
    for ln in range(s['full_start'],s['full_end']+1):
        raw=lines[ln-1]
        if not raw.startswith('  ') or raw.startswith('   '): continue
        st=raw.strip()
        if not st or st.startswith(('//','/*','*','}')) or ln==s['line']: continue
        out.append(raw)
    return out
edges=collections.defaultdict(set); esrc=collections.defaultdict(list)
for s in syms:
    txt=re.sub(r'\$\{[^}]*\}','','\n'.join(loadtime_lines(s)))
    for w in set(re.findall(r'(?<![\w.$])([A-Za-z_$][A-Za-z0-9_$]*)(?![\w${])',txt)):
        if w in names and w!=s['name'] and names[w]!=s['file']:
            edges[s['file']].add(names[w]); esrc[(s['file'],names[w])].append((s['line'],s['name']))
def keyf(f): return (2,0,0) if f=='bootstrap/30-init' else (1,0,min(s['line'] for s in groups[f]))
files=sorted([f for f in groups if f not in EXISTING],key=keyf)
order,temp,done,cyc=[],set(),set(),[]
def visit(f,st_):
    if f in done: return
    if f in temp: cyc.append(st_+[f]); return
    temp.add(f)
    for d in sorted(edges.get(f,()),key=keyf):
        if d in files: visit(d,st_+[f])
    temp.discard(f); done.add(f); order.append(f)
for f in files: visit(f,[])
if 'bootstrap/30-init' in order: order.remove('bootstrap/30-init'); order.append('bootstrap/30-init')
print('=== URUTAN (file baru) ===')
for f in order:
    loc=sum(s['full_end']-s['full_start']+1 for s in groups[f])
    print(f'  {f:<34} {loc:>5} baris {len(groups[f]):>3} simbol deps={sorted(edges.get(f,[])) or "-"}')
print('cycle:',cyc or 'tidak ada')
print('=== EDGE ==='); [print(f'  {a} <- {b} dari {srcs}') for (a,b),srcs in sorted(esrc.items())]
if not APPLY: print('(dry-run)'); sys.exit(0)

DETACH={}
for i,l in enumerate(lines,1):
    if l.strip()=='init();': DETACH[i]='bootstrap/30-init'
moved=set()
APPEND=[f for f in groups if f in EXISTING]
for f in APPEND:
    body=[]
    for s in sorted(groups[f],key=lambda x:x['line']):
        for ln in range(s['full_start'],s['full_end']+1):
            l=lines[ln-1]; body.append(l[2:] if l.startswith('  ') else l); moved.add(ln)
    fp=f'{ROOT}/public/js/{f}.js'
    cur=open(fp,encoding='utf-8').read().rstrip('\n')
    open(fp,'w').write(cur+'\n\n'+f'// --- ditambahkan dari app.js (STAGE 2): {", ".join(s["name"] for s in groups[f])} ---\n'+'\n'.join(body).rstrip('\n')+'\n')
    print('append ke',f,'->',[s['name'] for s in groups[f]])
for f in order:
    body=[]
    for s in sorted(groups[f],key=lambda x:x['line']):
        for ln in range(s['full_start'],s['full_end']+1):
            if ln in DETACH and DETACH[ln]!=f: continue
            l=lines[ln-1]; body.append(l[2:] if l.startswith('  ') else l); moved.add(ln)
    if f=='bootstrap/30-init':
        for ln,t in sorted(DETACH.items()):
            if t==f and ln not in moved: body.append(lines[ln-1].strip()); moved.add(ln)
    hdr=[f"// Tracker Daily — {f.split('/')[-1]}",
         "// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).",
         "// Classic script — urutan load: lihat <script> di public/index.html.",
         "'use strict';",""]
    p=f'{ROOT}/public/js/{f}.js'; os.makedirs(os.path.dirname(p),exist_ok=True)
    open(p,'w').write('\n'.join(hdr+body).rstrip('\n')+'\n')

rest=[l for i,l in enumerate(lines,1) if i not in moved]
clean=[]
for l in rest:
    st=l.strip()
    if st.startswith('(() =>') or st=='})();': continue
    if st=="'use strict';" and all(x.strip()=='' for x in clean): continue
    clean.append(l[2:] if l.startswith('  ') else l)
out=[]
for l in clean:
    if l.strip()=='' and out and out[-1].strip()=='': continue
    out.append(l)
code=[l for l in out if l.strip() and not l.strip().startswith('//')]
if code:
    print('PERINGATAN: masih ada',len(code),'baris kode di app.js ->',[c.strip()[:60] for c in code[:5]])
    open(APP,'w').write('\n'.join(["// Tracker Daily — app.js (sisa kode).","'use strict';",""]+out).rstrip('\n')+'\n')
else:
    open(APP,'w').write("// Tracker Daily — app.js (shim kompatibilitas).\n"
        "// SELURUH kode kini ada di public/js/**. File ini dipertahankan agar /app.js tidak 404.\n"
        "// JANGAN menambah kode di sini.\n")

ORDER_ALL=['runtime-config.js','js/core/01-config.js','js/core/04-utils.js','js/core/07-theme.js',
 'js/core/02-runtime-dom.js','js/core/05-storage.js','js/auth/11-session.js','js/core/03-state.js',
 'js/auth/13-remote-sync.js','js/auth/12-oauth.js','js/core/06-toast.js','js/core/08-nav.js',
 'js/auth/14-auth-ui.js','js/core/09-router.js']+[f'js/{f}.js' for f in order]
tags='\n'.join(f'  <script src="{p}?v=20260914-mod"></script>' for p in ORDER_ALL)
html=open(f'{ROOT}/public/index.html',encoding='utf-8').read()
html=re.sub(r'  <script src="[^"]+"></script>\n?','',html).replace('</body>',tags+'\n</body>')
open(f'{ROOT}/public/index.html','w').write(html)
print(f'\nSTAGE 2: {len(order)} file, {len(moved)} baris dipindah. sisa kode di app.js: {len(code)}')
print('total script tag:',len(ORDER_ALL))
