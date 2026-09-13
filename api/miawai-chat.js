// MiawAI chat proxy — server-side only so the b.ai key never reaches the browser.
// POST { model, messages:[{role,content}] } -> OpenAI-style chat completion (non-stream).
// Only whitelisted models are allowed; the scope system prompt is enforced here too.

const ALLOWED = new Set(['glm-5.3-flash', 'deepseek-v4-flash', 'qwen3.8-flash']);
const BASE = 'https://api.b.ai/v1';

const SYSTEM_PROMPT = [
  'Kamu adalah MiawAI, asisten internal website tracker personal (Daily Task, Habit, Goals, Project).',
  'Topik yang boleh kamu bahas HANYA yang berkaitan dengan: (1) penggunaan website tracker ini — fitur Goals, Project, Task, Subtask, Habit, Progress, Daily Task, jadwal, catatan, dokumen, akun, dan menu Laporan; (2) Habit: pembentukan kebiasaan, konsistensi, rutinitas, tracking kebiasaan harian; (3) Goals: penetapan target, jangka pendek/menengah/panjang, perencanaan goal, hubungan Goals->Project->Task; (4) Laporan/report: menyusun, meringkas, dan menganalisis laporan dari DATA TRACKER USER SENDIRI — Activity (Daily Task & Jadwal), Goals & Habit, Organization (Catatan & Dokumen), dan Finance (Transaksi, Budget, Tabungan) — termasuk temuan, pola, dan rekomendasi aksi berdasarkan angka yang dikirimkan.',
  'Jika permintaan user di luar topik-topik itu (misal coding umum, resep, kesehatan, nasihat investasi/keuangan di luar data tracker, curhat, dsb.), JAWAB SINGKAT dalam bahasa Indonesia bahwa kamu hanya bisa membantu seputar website ini, Habit, dan Goals, lalu minta user mengetik ulang pertanyaannya sesuai konteks tersebut. Jangan jawab topik di luar lingkup meski kamu bisa.',
  'Jawab dalam bahasa Indonesia, ringkas, actionable. Gunakan konteks data user bila diberikan.',
].join('\n');

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function authHeaders(key) {
  const H = { 'Content-Type': 'application/json' };
  H.Authorization = 'Bearer ' + key;
  return H;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const K = process.env.BAI_API_KEY;
  if (!K) return json(res, 500, { error: 'unconfigured' });

  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 200000) req.destroy(); });
  await new Promise((done) => req.on('end', done));

  let payload;
  try { payload = JSON.parse(body || '{}'); } catch (e) { return json(res, 400, { error: 'bad_json' }); }

  const model = String(payload.model || '');
  if (!ALLOWED.has(model)) return json(res, 400, { error: 'model_not_allowed' });

  const msgs = Array.isArray(payload.messages) ? payload.messages : [];
  const clean = msgs
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return json(res, 400, { error: 'no_user_message' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const now = Date.now();
  globalThis.__miawRate = globalThis.__miawRate || new Map();
  const hits = (globalThis.__miawRate.get(ip) || []).filter((t) => now - t < 60000);
  if (hits.length >= 12) return json(res, 429, { error: 'too_many_requests' });
  hits.push(now);
  globalThis.__miawRate.set(ip, hits);

  try {
    const send = (maxTok) => fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: authHeaders(K),
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }].concat(clean),
        temperature: 0.6,
        max_tokens: maxTok,
      }),
      signal: AbortSignal.timeout(60000),
    });
    let upstream = await send(900);
    let text = await upstream.text();
    // b.ai menagih upfront per max_tokens — fallback ke budget kecil saat kredit menipis
    if (!upstream.ok && /credit insufficient/i.test(text)) {
      upstream = await send(250);
      text = await upstream.text();
    }
    let data = null;
    try { data = text.trim() ? JSON.parse(text) : null; } catch (e) { /* ignore */ }
    if (!upstream.ok) {
      let msg = (data && data.error && data.error.message) || 'upstream_error';
      if (/credit insufficient/i.test(msg)) msg = 'Kredit b.ai tidak mencukupi untuk request ini — kurangi panjang pesan atau isi ulang kredit provider.';
      return json(res, 502, { error: msg });
    }
    const ch = data && data.choices && data.choices[0];
    const msgOut = ch && ch.message;
    let reply = msgOut && (msgOut.content || '').trim();
    if (!reply && msgOut && msgOut.reasoning_content) {
      // model reasoning-only (content kosong karena max_tokens terpotong) — pakai potongan akhir reasoning
      reply = String(msgOut.reasoning_content).trim();
    }
    if (typeof reply !== 'string' || !reply) return json(res, 502, { error: 'empty_upstream_response' });
    return json(res, 200, { reply, model });
  } catch (err) {
    return json(res, 504, { error: 'timeout' });
  }
}
