import { api } from './client';
export type Status = 'ACTIVE' | 'UNBOUND' | 'EXPIRED' | 'REVOKED';
export interface License { key: string; customer: string; product: string; status: Status; device: string; created: number | null; activated: number | null; expires: number | null; lastCheck: number | null; count: number; }
export interface Stats { total: number; active: number; unbound: number; expired: number; revoked: number; devices: number; }
const ts = (v: any): number | null => { if (v == null || v === '') return null; const n = Number(v); if (!isNaN(n)) return n < 1e12 ? n * 1000 : n; const d = Date.parse(v); return isNaN(d) ? null : d; };
const pick = (o: any, ...k: string[]) => { for (const x of k) if (o[x] != null) return o[x]; return null; };
export function normalize(l: any): License {
  const expires = ts(pick(l, 'expires_at', 'expiry', 'expires'));
  const device = pick(l, 'device_id', 'device') || '';
  const raw = String(l.status || '').toUpperCase();
  let status: Status;
  if (raw === 'REVOKED' || l.revoked) status = 'REVOKED';
  else if (raw === 'EXPIRED' || (expires && expires < Date.now())) status = 'EXPIRED';
  else if (!device) status = 'UNBOUND';
  else status = 'ACTIVE';
  return { key: pick(l, 'license_key', 'key') || '', customer: pick(l, 'customer_name', 'customer') || '', product: l.product || '', status, device, created: ts(pick(l, 'created_at', 'created')), activated: ts(pick(l, 'activated_at', 'activated')), expires, lastCheck: ts(pick(l, 'last_check_at', 'last_check', 'last_seen_at')), count: Number(pick(l, 'activation_count', 'activations') || 0) };
}
export async function listLicenses(f: { search?: string; status?: string; product?: string } = {}) {
  const d: any = await api('/api/v1/admin/licenses', { query: { search: f.search || '', status: f.status || '', product: f.product || '' } });
  const raw: any[] = Array.isArray(d) ? d : d?.licenses || d?.data || d?.results || [];
  const items = raw.map(normalize);
  const s = d?.stats || d?.summary || {};
  const c = (st: Status) => items.filter(i => i.status === st).length;
  const stats: Stats = {
    total: s.total ?? s.total_licenses ?? items.length, active: s.active ?? c('ACTIVE'), unbound: s.unbound ?? c('UNBOUND'),
    expired: s.expired ?? c('EXPIRED'), revoked: s.revoked ?? c('REVOKED'),
    devices: s.bound_devices ?? s.devices ?? s.bound ?? items.filter(i => i.device).length,
  };
  return { items, stats, hasServerStats: !!d?.stats || !!d?.summary };
}
const post = (p: string, body: any) => api(`/api/v1/admin/license/${p}`, { method: 'POST', body });
export const createLicense = (b: { customer_name: string; product: string; duration_days: number }) => post('create', b);
export const revokeLicense = (license_key: string) => post('revoke', { license_key });
export const reactivateLicense = (license_key: string) => post('reactivate', { license_key });
export const resetDevice = (license_key: string) => post('reset-device', { license_key });
export const extendLicense = (license_key: string, days: number) => post('extend', { license_key, days });
export const deleteLicense = (license_key: string) => post('delete', { license_key });
