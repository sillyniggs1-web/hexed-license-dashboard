import { api, setSecret } from './client';
export async function login(secret: string) {
  setSecret(secret);
  try { await api('/api/v1/admin/verify', { method: 'POST' }); } catch (e) { setSecret(''); throw e; }
}
export const logout = () => setSecret('');
