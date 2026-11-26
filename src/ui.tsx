import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
type Push = (m: string, k?: 'ok' | 'err') => void;
const T = createContext<Push>(() => {});
export const useToast = () => useContext(T);
export function Toasts({ children }: { children: ReactNode }) {
  const [l, s] = useState<{ id: number; m: string; k: string }[]>([]);
  const push = useCallback<Push>((m, k = 'ok') => { const id = Math.random(); s(x => [...x, { id, m, k }]); setTimeout(() => s(x => x.filter(i => i.id !== id)), 4500); }, []);
  return <T.Provider value={push}>{children}<div className="toasts" role="status">{l.map(t => <div key={t.id} className={'toast ' + t.k}>{t.k === 'err' ? '✕ ' : '✓ '}{t.m}</div>)}</div></T.Provider>;
}
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="overlay" onMouseDown={onClose}><div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal onMouseDown={e => e.stopPropagation()}>
    <div className="mh"><h3>{title}</h3><button className="icon" onClick={onClose} aria-label="Close">✕</button></div>{children}</div></div>;
}
const ICON: Record<string, string> = { ACTIVE: '●', UNBOUND: '◌', EXPIRED: '◷', REVOKED: '⊘' };
export const Badge = ({ s }: { s: string }) => <span className={'badge ' + s.toLowerCase()}><i aria-hidden>{ICON[s] || '•'}</i>{s}</span>;
export const fmt = (t: number | null) => t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export async function copyText(t: string, toast: Push) { try { await navigator.clipboard.writeText(t); toast('Copied to clipboard'); } catch { toast('Copy failed — select and copy manually', 'err'); } }
export function Confirm({ title, body, label, danger, typeToConfirm, onConfirm, onClose }: { title: string; body: ReactNode; label: string; danger?: boolean; typeToConfirm?: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false); const [typed, setTyped] = useState('');
  const ok = !typeToConfirm || typed === typeToConfirm;
  return <Modal title={title} onClose={onClose}><div className="body"><p>{body}</p>
    {typeToConfirm && <><p className="muted">Type <code>{typeToConfirm}</code> to confirm.</p><input value={typed} onChange={e => setTyped(e.target.value)} autoFocus /></>}</div>
    <div className="mf"><button className="btn ghost" onClick={onClose}>Cancel</button>
      <button className={'btn ' + (danger ? 'danger' : 'primary')} disabled={busy || !ok} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{busy ? 'Working…' : label}</button></div></Modal>;
}
