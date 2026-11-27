# Worker patch: session tokens + activity log (NOT applied; I don't have your Worker source)

## 1. D1 migration
```sql
ALTER TABLE licenses ADD COLUMN current_session_token TEXT;
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, license_key TEXT NOT NULL, device_id TEXT, nickname TEXT,
  server TEXT, ip TEXT, product TEXT, endpoint TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_activity_license ON activity_log(license_key, created_at DESC);
```
Run: `npx wrangler d1 execute <DB_NAME> --remote --command "..."` (one statement at a time) or `--file`.

## 2. Helpers
```js
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const ctx = (body, req) => ({ token: clip(body.session_token, 64), nickname: clip(body.nickname, 32),
  server: clip(body.server, 64), ip: req.headers.get('CF-Connecting-IP') || '' });

async function logActivity(env, lic, c, endpoint) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO activity_log (license_key,device_id,nickname,server,ip,product,endpoint,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(lic.license_key, lic.device_id, c.nickname, c.server, c.ip, lic.product, endpoint, Date.now()),
    env.DB.prepare('DELETE FROM activity_log WHERE license_key=? AND id NOT IN (SELECT id FROM activity_log WHERE license_key=? ORDER BY id DESC LIMIT 50)')
      .bind(lic.license_key, lic.license_key)]);
}
async function rotate(env, key) {
  const t = crypto.randomUUID();
  await env.DB.prepare('UPDATE licenses SET current_session_token=? WHERE license_key=?').bind(t, key).run();
  return t;
}
```
Store ip as given (raw) only if you accept that; otherwise hash it with your existing SHA-256 helper first.

## 3. Handlers (after existing validation passes: license exists, not revoked/expired, device matches)
- **/activate:** `session_token = await rotate(env, key)`; add it to the response; `logActivity(..., 'activate')`.
- **/check and /heartbeat:**
```js
const c = ctx(body, request);
if (!lic.current_session_token || c.token === '') {      // legacy client or first check: adopt a session
  return json({ status: 'ACTIVE', session_token: await rotate(env, key), ... });
}
if (c.token !== lic.current_session_token) {            // stale session: another activation took over
  return json({ status: 'SESSION_REVOKED' }, 200);     // log it too, as 'check:session_revoked'
}
// token matches: normal ACTIVE response, return the same session_token
```
## 4. Admin endpoint for the dashboard's Force logout
`POST /api/v1/admin/license/force-logout` `{license_key}` runs `UPDATE licenses SET current_session_token=NULL WHERE license_key=?` (404 if no row), behind the existing admin auth, plus add it to your routing and CORS methods.
Keep `/admin/logs` returning `nickname, server, ip, endpoint` (UNION or read from `activity_log`) filtered by the `search` param on `license_key`.
