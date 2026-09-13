// Resolves a username to the account email for password login.
// Runs server-side only: the Supabase service key never reaches the browser.
// GET /api/lookup-user?u=<username> -> 200 {email} | 404 {error:'not_found'} | 400

const RATE = new Map();

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const username = String(url.searchParams.get('u') || '').trim().toLowerCase();

  if (!/^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/.test(username)) {
    return json(res, 400, { error: 'invalid_username' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const now = Date.now();
  const hits = (RATE.get(ip) || []).filter((t) => now - t < 60000);
  if (hits.length >= 20) return json(res, 429, { error: 'too_many_requests' });
  hits.push(now);
  RATE.set(ip, hits);

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return json(res, 500, { error: 'unconfigured' });

  try {
    for (let page = 1; page <= 10; page += 1) {
      const r = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=1000`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return json(res, 502, { error: 'upstream' });
      const users = await r.json().catch(() => []);
      if (!Array.isArray(users) || users.length === 0) break;
      const hit = users.find((usr) =>
        String((usr.user_metadata && usr.user_metadata.username) || '').toLowerCase() === username);
      if (hit && hit.email) return json(res, 200, { email: hit.email });
      if (users.length < 1000) break;
    }
    return json(res, 404, { error: 'not_found' });
  } catch (err) {
    return json(res, 502, { error: 'lookup_failed' });
  }
}
