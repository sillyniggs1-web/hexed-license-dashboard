import { useEffect, useState } from 'react';
import { login, logout } from './api/auth';
import { hasSecret, setUnauthorizedHandler } from './api/client';
import { Toasts } from './ui';
import { Overview, Licenses, Logs } from './pages';

function Login({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return <div className="login"><form className="card lc" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(''); try { await login(s.trim()); setS(''); onDone(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }}>
    <img className="logo big" src="/logo.png" alt="HEXED" /><h1>HEXED License Console</h1><p className="muted">Enter your admin secret to continue. It is kept for this browser session only.</p>
    <input type="password" autoComplete="off" placeholder="Admin secret" value={s} onChange={e => setS(e.target.value)} autoFocus />
    {err && <div className="error" role="alert">{err}</div>}<button className="btn primary" disabled={!s.trim() || busy}>{busy ? 'Verifying…' : 'Sign in'}</button></form></div>;
}
const NAV: [string, string, string][] = [['overview', 'Overview', '▦'], ['licenses', 'Licenses', '⚿'], ['logs', 'Logs', '≡']];
export default function App() {
  const [authed, setAuthed] = useState(hasSecret()); const [page, setPage] = useState('overview'); const [note, setNote] = useState('');
  useEffect(() => setUnauthorizedHandler(() => { logout(); setAuthed(false); setNote('Unauthorized — your admin session may have expired.'); }), []);
  if (!authed) return <Toasts>{note && <div className="error note">{note}</div>}<Login onDone={() => { setNote(''); setAuthed(true); }} /></Toasts>;
  const out = () => { logout(); setAuthed(false); };
  const nav = (cls: string) => NAV.map(([k, l, i]) => <button key={k} className={cls + (page === k ? ' on' : '')} aria-current={page === k ? 'page' : undefined} onClick={() => setPage(k)}><span aria-hidden>{i}</span><em>{l}</em></button>);
  return <Toasts><div className="shell">
    <header className="top"><div className="brand"><img className="logo" src="/logo.png" alt="" />HEXED</div><button className="icon" aria-label="Sign out" onClick={out}>⏻</button></header>
    <aside className="side"><div className="brand desk"><img className="logo" src="/logo.png" alt="" /><span>HEXED<small>Licensing</small></span></div>{nav('nav')}<div className="grow" />
      <button className="nav" onClick={out}><span aria-hidden>⏻</span><em>Sign out</em></button></aside>
    <main key={page} className="main">{page === 'overview' ? <Overview /> : page === 'licenses' ? <Licenses /> : <Logs />}</main>
    <nav className="tabbar" aria-label="Primary">{nav('tab')}</nav></div></Toasts>;
}
