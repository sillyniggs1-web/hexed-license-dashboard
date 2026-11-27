import { useCallback, useEffect, useRef, useState } from 'react';
import { listLicenses, createLicense, revokeLicense, reactivateLicense, resetDevice, extendLicense, deleteLicense, forceLogout, License, Stats } from './api/licenses';
import { listLogs, Log } from './api/logs';
import { Badge, Confirm, Modal, copyText, fmt, useToast } from './ui';

const STATUSES = ['ACTIVE', 'UNBOUND', 'EXPIRED', 'REVOKED'];
const DAYS = [1, 7, 30, 90, 180, 365];
const errMsg = (e: any) => e?.message || 'Something went wrong.';

function useLicenses(f: { search?: string; status?: string; product?: string }) {
  const [d, setD] = useState<{ items: License[]; stats: Stats } | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setD(await listLicenses(f)); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); } }, [f.search, f.status, f.product]);
  useEffect(() => { const t = setTimeout(load, f.search ? 300 : 0); return () => clearTimeout(t); }, [load]);
  return { d, loading, error, load };
}
const Err = ({ m, retry }: { m: string; retry: () => void }) => <div className="state err"><b>Couldn’t load data</b><span>{m}</span><button className="btn" onClick={retry}>Try again</button></div>;

export function Overview() {
  const { d, loading, error, load } = useLicenses({});
  const cards: [string, keyof Stats][] = [['Total licenses', 'total'], ['Active', 'active'], ['Unbound', 'unbound'], ['Expired', 'expired'], ['Revoked', 'revoked'], ['Bound devices', 'devices']];
  return <><div className="ph"><h1>Overview</h1><button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
    {error ? <Err m={error} retry={load} /> : <div className="stats">{cards.map(([l, k]) => <div className="card stat" key={k}><span className="muted">{l}</span>{loading && !d ? <div className="skel" /> : <strong>{d?.stats[k]}</strong>}</div>)}</div>}
    {d && !error && <div className="card"><h3>Newest licenses</h3>{d.items.length ? d.items.slice(0, 5).map(l => <div className="mini" key={l.key}><code>{l.key}</code><span>{l.customer}</span><Badge s={l.status} /></div>) : <p className="muted">No licenses yet. Create one from the Licenses page.</p>}</div>}</>;
}

export function Licenses() {
  const toast = useToast();
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [product, setProduct] = useState('');
  const { d, loading, error, load } = useLicenses({ search, status, product });
  const products = useRef(new Set<string>()); d?.items.forEach(i => i.product && products.current.add(i.product));
  const [sel, setSel] = useState<License | null>(null); const [create, setCreate] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: string; l: License } | null>(null); const [extend, setExtend] = useState<License | null>(null);
  const [created, setCreated] = useState<any>(null);
  const items = (d?.items || []).filter(i => (!status || i.status === status) && (!product || i.product === product) && (!search || [i.key, i.customer, i.product, i.device].join(' ').toLowerCase().includes(search.toLowerCase())));
  const act = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast(ok); setConfirm(null); setExtend(null); setSel(null); await load(); } catch (e) { toast(errMsg(e), 'err'); } };
  const actions = (l: License) => <div className="acts">
    {l.status === 'REVOKED' ? <button className="btn" onClick={() => setConfirm({ kind: 'reactivate', l })}>Reactivate</button> : <button className="btn" onClick={() => setConfirm({ kind: 'revoke', l })}>Revoke</button>}
    <button className="btn" disabled={!l.device} onClick={() => setConfirm({ kind: 'reset', l })}>Reset device</button>
    <button className="btn" onClick={() => setExtend(l)}>Extend</button>
    <button className="btn" onClick={() => setConfirm({ kind: 'logout', l })}>Force logout</button>
    <button className="btn danger" onClick={() => setConfirm({ kind: 'delete', l })}>Delete</button></div>;
  return <><div className="ph"><h1>Licenses</h1><div className="row"><button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button><button className="btn primary" onClick={() => setCreate(true)}>New license</button></div></div>
    <div className="filters"><input placeholder="Search key, customer, product, device" value={search} onChange={e => setSearch(e.target.value)} />
      <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      <select value={product} onChange={e => setProduct(e.target.value)}><option value="">All products</option>{[...products.current].map(p => <option key={p}>{p}</option>)}</select></div>
    {error ? <Err m={error} retry={load} /> : loading && !d ? <div className="card">{[1, 2, 3, 4].map(i => <div className="skel row-s" key={i} />)}</div> :
      !items.length ? <div className="state"><b>No licenses found</b><span>{d?.items.length ? 'Adjust the search or filters.' : 'Create your first license to get started.'}</span></div> :
        <div className="card tw"><table><thead><tr>{['License key', 'Customer', 'Product', 'Status', 'Device ID', 'Created', 'Activated', 'Expires', 'Last check', 'Activations', ''].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
          {items.map(l => <tr key={l.key} onClick={() => setSel(l)}>
            <td data-l="License key"><code>{l.key}</code></td><td data-l="Customer">{l.customer}</td><td data-l="Product">{l.product}</td><td data-l="Status"><Badge s={l.status} /></td>
            <td data-l="Device ID"><code className="trunc">{l.device || '—'}</code></td><td data-l="Created">{fmt(l.created)}</td><td data-l="Activated">{fmt(l.activated)}</td><td data-l="Expires">{fmt(l.expires)}</td><td data-l="Last check">{fmt(l.lastCheck)}</td><td data-l="Activations">{l.count}</td>
            <td><button className="icon" aria-label="Actions" onClick={e => { e.stopPropagation(); setSel(l); }}>⋯</button></td></tr>)}</tbody></table></div>}
    {create && <CreateModal onClose={() => setCreate(false)} onDone={r => { setCreate(false); setCreated(r); load(); }} />}
    {created && <Modal title="License created" onClose={() => setCreated(null)}><div className="body"><div className="keybox">{created.key}</div>
      <p className="muted">Customer: <b>{created.customer}</b><br />Product: <b>{created.product}</b><br />Expires: <b>{created.expires}</b></p></div>
      <div className="mf"><button className="btn ghost" onClick={() => setCreated(null)}>Done</button><button className="btn primary" onClick={() => copyText(created.key, toast)}>Copy key</button></div></Modal>}
    {sel && !confirm && !extend && <Modal title="License details" wide onClose={() => setSel(null)}><div className="body"><div className="keybox sm">{sel.key}<button className="btn" onClick={() => copyText(sel.key, toast)}>Copy</button></div>
      <dl>{([['Customer', sel.customer], ['Product', sel.product], ['Status', <Badge s={sel.status} />], ['Device ID', sel.device || '—'], ['Created', fmt(sel.created)], ['Activated', fmt(sel.activated)], ['Expires', fmt(sel.expires)], ['Last check', fmt(sel.lastCheck)], ['Activations', sel.count]] as [string, any][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><Activity lk={sel.key} /></div><div className="mf">{actions(sel)}</div></Modal>}
    {confirm && <Confirm danger={confirm.kind !== 'reactivate'} typeToConfirm={confirm.kind === 'delete' ? confirm.l.key : undefined}
      title={{ revoke: 'Revoke license', reactivate: 'Reactivate license', reset: 'Reset device', delete: 'Delete license permanently', logout: 'Force logout' }[confirm.kind]!}
      label={{ revoke: 'Revoke', reactivate: 'Reactivate', reset: 'Reset device', delete: 'Delete forever', logout: 'Force logout' }[confirm.kind]!}
      body={{ revoke: <>Revoking <b>{confirm.l.key}</b> means {confirm.l.customer} immediately loses access.</>, reactivate: <>Restore access for {confirm.l.customer} with <b>{confirm.l.key}</b>.</>, logout: <>Clears the current session token on <b>{confirm.l.key}</b>. Whichever device checks in next starts a fresh session. Nobody is banned and the device binding stays.</>, reset: <>This removes the current device binding on <b>{confirm.l.key}</b> so it can be activated on another device.</>, delete: <>This permanently deletes <b>{confirm.l.key}</b> and cannot be undone. {confirm.l.customer} loses access.</> }[confirm.kind]}
      onClose={() => setConfirm(null)}
      onConfirm={() => act(() => ({ revoke: revokeLicense, reactivate: reactivateLicense, reset: resetDevice, delete: deleteLicense, logout: forceLogout } as any)[confirm.kind](confirm.l.key), { revoke: 'License revoked', reactivate: 'License reactivated', reset: 'Device reset', delete: 'License deleted', logout: 'Session cleared' }[confirm.kind]!)} />}
    {extend && <ExtendModal l={extend} onClose={() => setExtend(null)} onConfirm={n => act(() => extendLicense(extend.key, n), `Extended by ${n} days`)} />}</>;
}

function DurationPicker({ val, setVal, custom, setCustom }: any) {
  return <><select value={val} onChange={e => setVal(e.target.value)}>{DAYS.map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}<option value="custom">Custom</option></select>
    {val === 'custom' && <input type="number" min={1} placeholder="Number of days" value={custom} onChange={e => setCustom(e.target.value)} />}</>;
}
function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (r: any) => void }) {
  const toast = useToast(); const [name, setName] = useState(''); const [product, setProduct] = useState('HEXED Fog Editor'); const [val, setVal] = useState('30'); const [custom, setCustom] = useState(''); const [busy, setBusy] = useState(false);
  const days = val === 'custom' ? parseInt(custom) : parseInt(val); const valid = name.trim() && product.trim() && days > 0;
  return <Modal title="New license" onClose={onClose}><div className="body form">
    <label>Customer nickname<input value={name} onChange={e => setName(e.target.value)} placeholder="TestUser" autoFocus /></label>
    <label>Product<input value={product} onChange={e => setProduct(e.target.value)} /></label>
    <label>Duration<DurationPicker val={val} setVal={setVal} custom={custom} setCustom={setCustom} /></label></div>
    <div className="mf"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!valid || busy} onClick={async () => {
      setBusy(true);
      try { const r: any = await createLicense({ customer_name: name.trim(), product: product.trim(), duration_days: days }); const L = r?.license || r?.data || r || {};
        const exp = L.expires_at ?? r?.expires_at; onDone({ key: L.license_key || r?.license_key || r?.key || '(see list)', customer: name.trim(), product: product.trim(), expires: exp ? fmt(exp < 1e12 ? exp * 1000 : Date.parse(exp) || exp) : `${days} days after activation or creation` });
      } catch (e) { toast(errMsg(e), 'err'); setBusy(false); } }}>{busy ? 'Creating…' : 'Create license'}</button></div></Modal>;
}
function ExtendModal({ l, onClose, onConfirm }: { l: License; onClose: () => void; onConfirm: (n: number) => Promise<void> }) {
  const [val, setVal] = useState('30'); const [custom, setCustom] = useState(''); const [busy, setBusy] = useState(false); const days = val === 'custom' ? parseInt(custom) : parseInt(val);
  return <Modal title="Extend license" onClose={onClose}><div className="body form"><p className="muted"><code>{l.key}</code><br />Currently expires {fmt(l.expires)}</p><label>Add time<DurationPicker val={val} setVal={setVal} custom={custom} setCustom={setCustom} /></label></div>
    <div className="mf"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!(days > 0) || busy} onClick={async () => { setBusy(true); try { await onConfirm(days); } finally { setBusy(false); } }}>{busy ? 'Extending…' : 'Extend'}</button></div></Modal>;
}

export function Logs() {
  const [search, setSearch] = useState(''); const [action, setAction] = useState(''); const [limit, setLimit] = useState(100);
  const [logs, setLogs] = useState<Log[] | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setLogs(await listLogs({ search, action, limit })); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); } }, [search, action, limit]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load]);
  const actionsSeen = useRef(new Set<string>()); logs?.forEach(l => l.action && actionsSeen.current.add(l.action));
  const shown = (logs || []).filter(l => (!action || l.action === action) && (!search || Object.values(l).join(' ').toLowerCase().includes(search.toLowerCase())));
  const ok = (r: string) => /success|ok|valid|true|1/i.test(r) && !/fail|error|invalid|denied|revoked|blocked/i.test(r);
  return <><div className="ph"><h1>Activity logs</h1><button className="btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
    <div className="filters"><input placeholder="Search logs" value={search} onChange={e => setSearch(e.target.value)} /><select value={action} onChange={e => setAction(e.target.value)}><option value="">All actions</option>{[...actionsSeen.current].map(a => <option key={a}>{a}</option>)}</select></div>
    {error ? <Err m={error} retry={load} /> : loading && !logs ? <div className="card">{[1, 2, 3, 4].map(i => <div className="skel row-s" key={i} />)}</div> : !shown.length ? <div className="state"><b>No log entries</b><span>Activity will appear here as customers and admins use licenses.</span></div> :
      <><div className="card tw"><table><thead><tr>{['Time', 'Action', 'License', 'Customer', 'Product', 'Device', 'Result', 'IP hash'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
        {shown.map(l => <tr key={l.id}><td data-l="Time">{fmt(l.time)}</td><td data-l="Action"><span className="tag">{l.action}</span></td><td data-l="License"><code>{l.key || '—'}</code></td><td data-l="Customer">{l.customer || '—'}</td><td data-l="Product">{l.product || '—'}</td>
          <td data-l="Device"><code className="trunc">{l.device || '—'}</code></td><td data-l="Result">{l.result ? <span className={'res ' + (ok(l.result) ? 'good' : 'bad')}>{ok(l.result) ? '✓' : '✕'} {l.result}</span> : '—'}</td><td data-l="IP hash"><code className="trunc">{l.ip || '—'}</code></td></tr>)}</tbody></table></div>
        {logs!.length >= limit && <div className="center"><button className="btn" onClick={() => setLimit(limit + 100)}>Load more</button></div>}</>}</>;
}

function Activity({ lk }: { lk: string }) {
  const [rows, setRows] = useState<Log[] | null>(null); const [err, setErr] = useState('');
  useEffect(() => { listLogs({ search: lk, limit: 50 }).then(r => setRows(r.filter(x => x.key === lk).sort((a, b) => (b.time || 0) - (a.time || 0)))).catch(e => setErr(errMsg(e))); }, [lk]);
  const day = (rows || []).filter(r => r.time && r.time > Date.now() - 864e5);
  const nick = new Set(day.map(r => r.nickname).filter(Boolean)).size, ips = new Set(day.map(r => r.ip).filter(Boolean)).size;
  return <div className="act"><h3>Recent activity</h3>
    {nick > 1 || ips > 1 ? <div className="risk" role="alert">⚠ SHARING RISK — {nick} nicknames · {ips} IPs in the last 24h. Review only; nothing is blocked automatically.</div> : rows && <p className="muted">No sharing signals in the last 24h.</p>}
    {err ? <p className="error">{err}</p> : !rows ? <div className="skel row-s" /> : !rows.length ? <p className="muted">No activity recorded for this license yet.</p> :
      <div className="tw"><table><thead><tr>{['Time', 'Endpoint', 'Nickname', 'Server', 'IP', 'Result'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} onClick={undefined}><td data-l="Time">{fmt(r.time)}</td><td data-l="Endpoint"><span className="tag">{r.endpoint || r.action}</span></td><td data-l="Nickname">{r.nickname || '—'}</td><td data-l="Server">{r.server || '—'}</td><td data-l="IP"><code className="trunc">{r.ip || '—'}</code></td><td data-l="Result">{r.result || '—'}</td></tr>)}</tbody></table></div>}</div>;
}
