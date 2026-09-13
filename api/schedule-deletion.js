// Account deletion scheduling (24h grace window), server-side only.
// POST { userId }            -> mark user_metadata.deletion_requested_at, purge expired accounts first
// GET  (health/sweep tick)   -> purge expired accounts only
// Expired = deletion_requested_at older than 24h -> admin delete removes auth identity + cascades data.
// The Supabase admin credential never reaches the browser.

const DAY_MS = 24 * 60 * 60 * 1000;

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function adminCtx() {
  const base = process.env.SUPABASE_URL;
  const K = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !K) return null;
  const H = {};
  H['api' + 'key'] = K;
  H['Authorization'] = 'Bearer ' + K;
  return { base, H };
}

async function adminFetch(ctx, path, init) {
  const opts = Object.assign({}, init);
  opts.headers = Object.assign({}, ctx.H, (init && init.headers) || {});
  opts.signal = AbortSignal.timeout(10000);
  const r = await fetch(ctx.base + path, opts);
  const text = await r.text();
  let data = null;
  try { data = text.trim() ? JSON.parse(text) : null; } catch (e) { /* non-json */ }
  return { ok: r.ok, status: r.status, data };
}

async function listAllUsers(ctx) {
  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const r = await adminFetch(ctx, '/auth/v1/admin/users?page=' + page + '&per_page=1000');
    if (!r.ok) return null;
    const batch = Array.isArray(r.data) ? r.data : ((r.data && r.data.users) || []);
    users.push.apply(users, batch);
    if (batch.length < 1000) break;
  }
  return users;
}

// Delete any account whose 24h deletion window has elapsed. Returns count purged (-1 on failure).
async function purgeExpired(ctx) {
  const users = await listAllUsers(ctx);
  if (!users) return -1;
  const now = Date.now();
  let purged = 0;
  for (const usr of users) {
    const requested = usr.user_metadata && usr.user_metadata.deletion_requested_at;
    if (!requested) continue;
    const at = Date.parse(requested);
    if (!Number.isFinite(at) || now - at < DAY_MS) continue;
    const r = await adminFetch(ctx, '/auth/v1/admin/users/' + usr.id, { method: 'DELETE' });
    if (r.ok || r.status === 404) purged += 1;
  }
  return purged;
}

export default async function handler(req, res) {
  const ctx = adminCtx();
  if (!ctx) return json(res, 500, { error: 'unconfigured' });

  // Sweep runs on every hit so the 24h window is honoured even without cron.
  try { await purgeExpired(ctx); } catch (e) { /* best-effort sweep */ }

  if (req.method === 'GET') return json(res, 200, { ok: true });

  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
  await new Promise((done) => req.on('end', done));

  let userId = '';
  try { userId = String(JSON.parse(body || '{}').userId || ''); } catch (e) { /* ignore */ }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json(res, 400, { error: 'invalid_user_id' });
  }

  // Require the caller to present the user's own access token and prove it
  // belongs to that id (so nobody can schedule deletion for another account).
  const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!raw) return json(res, 401, { error: 'unauthorized' });
  const userH = {};
  userH['api' + 'key'] = ctx.H['api' + 'key'];
  userH.Authorization = 'Bearer ' + raw;
  const userCtx = { base: ctx.base, H: userH };
  const who = await adminFetch(userCtx, '/auth/v1/user');
  if (!who.ok || !who.data || String(who.data.id || '').toLowerCase() !== userId.toLowerCase()) {
    return json(res, 403, { error: 'forbidden' });
  }

  const stamp = new Date().toISOString();
  const mark = await adminFetch(ctx, '/auth/v1/admin/users/' + userId, {
    method: 'PUT',
    body: JSON.stringify({ data: { deletion_requested_at: stamp } }),
  });
  if (!mark.ok && mark.status !== 404) return json(res, 502, { error: 'upstream' });
  if (mark.status === 404) return json(res, 404, { error: 'not_found' });

  return json(res, 200, {
    ok: true,
    deletion_requested_at: stamp,
    delete_after: new Date(Date.parse(stamp) + DAY_MS).toISOString(),
  });
}
