import { api } from './client';
export interface Log { id: string; time: number | null; action: string; key: string; customer: string; product: string; device: string; result: string; ip: string; nickname: string; server: string; endpoint: string; }
const ts = (v: any) => { if (v == null || v === '') return null; const n = Number(v); if (!isNaN(n)) return n < 1e12 ? n * 1000 : n; const d = Date.parse(v); return isNaN(d) ? null : d; };
export async function listLogs(f: { search?: string; action?: string; limit: number }) {
  const d: any = await api('/api/v1/admin/logs', { query: { search: f.search || '', action: f.action || '', limit: String(f.limit) } });
  const raw: any[] = Array.isArray(d) ? d : d?.logs || d?.data || d?.results || [];
  return raw.map((l, i): Log => ({
    id: String(l.id ?? i), time: ts(l.created_at ?? l.time ?? l.timestamp), action: String(l.action || ''), key: l.license_key || '', customer: l.customer_name || '', product: l.product || '', device: l.device_id || '',
    result: String(l.result ?? (l.success === 0 || l.success === false ? 'failure' : l.success != null ? 'success' : '')), ip: l.ip || l.ip_hash || '', nickname: l.nickname || '', server: l.server || '', endpoint: l.endpoint || '',
  }));
}
