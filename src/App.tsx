import { useEffect, useState } from 'react';
import { login, logout } from './api/auth';
import { hasSecret, setUnauthorizedHandler } from './api/client';
import { Toasts } from './ui';
import { Overview, Licenses, Logs } from './pages';

function Login({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return <div className="login"><form className="card lc" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(''); try { await login(s.trim()); setS(''); onDone(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); } }}>
    <div className="logo big">H</div><h1>HEXED License Console</h1><p className="muted">Enter your admin secret to continue. It is kept for this browser session only.</p>
    <input type="password" autoComplete="off" placeholder="Admin secret" value={s} onChange={e => setS(e.target.value)} autoFocus />
    {err && <div className="error" role="alert">{err}</div>}<button className="btn primary" disabled={!s.trim() || busy}>{busy ? 'Verifying…' : 'Sign in'}</button></form></div>;
}
const NAV: [string, string, string][] = [['overview', 'Overview', '▦'], ['licenses', 'Licenses', '⚿'], ['logs', 'Activity logs', '≡']];
export default function App() {
  const [authed, setAuthed] = useState(hasSecret()); const [page, setPage] = useState('overview'); const [menu, setMenu] = useState(false); const [note, setNote] = useState('');
  useEffect(() => setUnauthorizedHandler(() => { logout(); setAuthed(false); setNote('Unauthorized — your admin session may have expired.'); }), []);
  if (!authed) return <Toasts>{note && <div className="error top">{note}</div>}<Login onDone={() => { setNote(''); setAuthed(true); }} /></Toasts>;
  const nav = NAV.map(([k, l, i]) => <button key={k} className={'nav' + (page === k ? ' on' : '')} onClick={() => { setPage(k); setMenu(false); }}><span aria-hidden>{i}</span>{l}</button>);
  return <Toasts><div className="shell">
    <header className="top"><div className="brand"><div className="logo">H</div>HEXED</div><button className="icon" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? '✕' : '☰'}</button></header>
    <aside className={'side' + (menu ? ' open' : '')}><div className="brand desk"><div className="logo">H</div>HEXED<small>Licensing</small></div>{nav}<div className="grow" />
      <button className="nav" onClick={() => { logout(); setAuthed(false); }}><span aria-hidden>⏻</span>Sign out</button></aside>
    <main key={page} className="main">{page === 'overview' ? <Overview /> : page === 'licenses' ? <Licenses /> : <Logs />}</main></div></Toasts>;
}
