const BASE = ((import.meta as any).env.VITE_WORKER_API_URL || 'https://hexed-license-api.jaysonapoya7.workers.dev').replace(/\/$/, '');
let secret = sessionStorage.getItem('hx_session') || '';
let onUnauthorized: () => void = () => {};
export const setSecret = (s: string) => { secret = s; s ? sessionStorage.setItem('hx_session', s) : sessionStorage.removeItem('hx_session'); };
export const hasSecret = () => !!secret;
export const setUnauthorizedHandler = (f: () => void) => { onUnauthorized = f; };
export class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
const MSG: Record<number, string> = {
  400: 'Invalid request. Check the fields and try again.',
  401: 'Unauthorized — your admin session may have expired.',
  403: 'Forbidden — this origin or secret is not allowed. If you deployed on a new domain, update ALLOWED_ORIGIN on the Worker.',
  404: 'Not found — the license or endpoint does not exist.',
  429: 'Too many requests — please wait before trying again.',
  500: 'The server hit an error. Try again shortly.',
};
export async function api<T = any>(path: string, o: { method?: string; body?: any; query?: Record<string, string> } = {}): Promise<T> {
  const url = new URL(BASE + path);
  Object.entries(o.query || {}).forEach(([k, v]) => v && url.searchParams.set(k, v));
  let res: Response;
  try {
    res = await fetch(url.toString(), { method: o.method || 'GET', headers: { Authorization: `Bearer ${secret}`, ...(o.body ? { 'Content-Type': 'application/json' } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  } catch { throw new ApiError('Cannot reach the license server. The Worker may be unavailable, or the request was blocked by CORS.', 0); }
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && !path.endsWith('/admin/verify')) onUnauthorized();
    throw new ApiError(MSG[res.status] || (res.status >= 500 ? MSG[500] : 'Request failed.'), res.status);
  }
  return data as T;
}
