// Keyholder: who holds which key, and when contractors may enter, for landlords with a handful of units.
import { useState } from "react";
import { downloadIcs } from "./lib/ics";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { Section, Stat, Stats } from "./ui/kit";

const T = "keyholder";
type Unit = { id: string; name: string; address: string };
type Key = { id: string; unit: string; label: string; copies: number };
type Loan = { id: string; key: string; who: string; phone: string; out: string; due: string; back?: string; note: string };
type Access = { id: string; unit: string; who: string; trade: string; start: string; end: string; tenantTold: boolean };

const d = (offsetH: number) => { const x = new Date(Date.now() + offsetH * 3600000); x.setMinutes(0, 0, 0); return x.toISOString().slice(0, 16); };
const SU: Unit[] = [{ id: "u1", name: "Flat 1A", address: "12 Rue de Marseille" }, { id: "u2", name: "Flat 2B", address: "12 Rue de Marseille" }, { id: "u3", name: "Studio", address: "5 Avenue Habib Thameur" }];
const SK: Key[] = [{ id: "k1", unit: "u1", label: "Front door", copies: 3 }, { id: "k2", unit: "u1", label: "Mailbox", copies: 2 }, { id: "k3", unit: "u2", label: "Front door", copies: 2 }, { id: "k4", unit: "u3", label: "Front door", copies: 2 }, { id: "k5", unit: "u3", label: "Building gate fob", copies: 1 }];
const SL: Loan[] = [
  { id: "l1", key: "k3", who: "Karim (plumber)", phone: "22000111", out: d(-50), due: d(-2), note: "Boiler service" },
  { id: "l2", key: "k1", who: "Cleaning team", phone: "", out: d(-3), due: d(20), note: "End of tenancy clean" },
];
const SA: Access[] = [{ id: "a1", unit: "u3", who: "Mehdi", trade: "Electrician", start: d(26), end: d(29), tenantTold: false }];
const when = (s: string) => new Date(s).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Keyholder() {
  const [units, setUnits] = useStored<Unit[]>(T, "units", SU);
  const [keys, setKeys] = useStored<Key[]>(T, "keys", SK);
  const [loans, setLoans] = useStored<Loan[]>(T, "loans", SL);
  const [access, setAccess] = useStored<Access[]>(T, "access", SA);
  const [lend, setLend] = useState({ key: "", who: "", phone: "", due: d(24), note: "" });
  const [acc, setAcc] = useState({ unit: "", who: "", trade: "", start: d(24), end: d(27) });
  const [nu, setNu] = useState({ name: "", address: "" });

  const out = loans.filter(l => !l.back);
  const overdue = out.filter(l => new Date(l.due) < new Date());
  const keyName = (id: string) => { const k = keys.find(x => x.id === id); const u = units.find(x => x.id === k?.unit); return k ? `${u?.name ?? ""} · ${k.label}` : "Deleted key"; };
  const available = (k: Key) => k.copies - out.filter(l => l.key === k.id).length;
  const upcoming = access.filter(a => new Date(a.end) > new Date()).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="stack">
      <Section title="Keys right now">
        <Stats><Stat value={units.length} label="Units" /><Stat value={keys.reduce((a, k) => a + k.copies, 0)} label="Key copies" /><Stat value={out.length} label="Lent out" /><Stat value={overdue.length} label="Overdue" tone={overdue.length ? "bad" : "good"} /><Stat value={upcoming.length} label="Access visits booked" /></Stats>
      </Section>

      {overdue.length > 0 && (
        <Section title="Overdue keys">
          {overdue.map(l => (
            <div key={l.id} className="kh-row" style={{ borderLeft: "4px solid var(--bad)", paddingLeft: 10 }}>
              <div style={{ flex: 1 }}><strong>{keyName(l.key)}</strong> with {l.who}<p className="note">Due back {when(l.due)}</p></div>
              {l.phone && <a className="btn small" href={waLink(`Hi ${l.who.split(" ")[0]}, a quick reminder to return the ${keyName(l.key)} key. It was due ${when(l.due)}. Thank you!`, l.phone)} target="_blank" rel="noreferrer">Remind on WhatsApp</a>}
              <button className="btn primary small" onClick={() => setLoans(loans.map(x => x.id === l.id ? { ...x, back: new Date().toISOString() } : x))}>Returned</button>
            </div>
          ))}
        </Section>
      )}

      <div className="grid2">
        <Section title="Lend a key">
          <form className="stack" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); if (!lend.key || !lend.who.trim()) return; setLoans([{ id: uid(), ...lend, who: lend.who.trim(), out: new Date().toISOString() }, ...loans]); setLend({ ...lend, who: "", phone: "", note: "" }); }}>
            <label className="field"><span>Key</span><select id="kh-key" className="input" value={lend.key} onChange={e => setLend({ ...lend, key: e.target.value })}><option value="">Choose a key</option>{keys.map(k => <option key={k.id} value={k.id} disabled={available(k) <= 0}>{keyName(k.id)} ({available(k)} free)</option>)}</select></label>
            <div className="row"><label className="field"><span>Given to</span><input id="kh-who" className="input" value={lend.who} onChange={e => setLend({ ...lend, who: e.target.value })} /></label><label className="field"><span>WhatsApp</span><input id="kh-ph" className="input" value={lend.phone} onChange={e => setLend({ ...lend, phone: e.target.value })} placeholder="21622000111" /></label></div>
            <div className="row" style={{ alignItems: "flex-end" }}><label className="field"><span>Back by</span><input id="kh-due" type="datetime-local" className="input" value={lend.due} onChange={e => setLend({ ...lend, due: e.target.value })} /></label><label className="field"><span>Reason</span><input id="kh-note" className="input" value={lend.note} onChange={e => setLend({ ...lend, note: e.target.value })} /></label></div>
            <button className="btn primary" type="submit" style={{ alignSelf: "flex-start" }}>Record loan</button>
          </form>
        </Section>
        <Section title="Book contractor access">
          <form className="stack" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); if (!acc.unit || !acc.who.trim()) return; setAccess([...access, { id: uid(), ...acc, who: acc.who.trim(), tenantTold: false }]); setAcc({ ...acc, who: "", trade: "" }); }}>
            <label className="field"><span>Unit</span><select id="kh-au" className="input" value={acc.unit} onChange={e => setAcc({ ...acc, unit: e.target.value })}><option value="">Choose a unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
            <div className="row"><label className="field"><span>Contractor</span><input id="kh-aw" className="input" value={acc.who} onChange={e => setAcc({ ...acc, who: e.target.value })} /></label><label className="field"><span>Trade</span><input id="kh-at" className="input" value={acc.trade} onChange={e => setAcc({ ...acc, trade: e.target.value })} /></label></div>
            <div className="row" style={{ alignItems: "flex-end" }}><label className="field"><span>From</span><input id="kh-as" type="datetime-local" className="input" value={acc.start} onChange={e => setAcc({ ...acc, start: e.target.value })} /></label><label className="field"><span>Until</span><input id="kh-ae" type="datetime-local" className="input" value={acc.end} onChange={e => setAcc({ ...acc, end: e.target.value })} /></label></div>
            <button className="btn primary" type="submit" style={{ alignSelf: "flex-start" }}>Book access</button>
          </form>
        </Section>
      </div>

      <Section title="Access visits" aside={upcoming.length > 0 && <button className="btn small" onClick={() => downloadIcs("access-visits.ics", upcoming.map(a => ({ title: `${a.trade || "Contractor"}: ${a.who} at ${units.find(u => u.id === a.unit)?.name}`, start: new Date(a.start), end: new Date(a.end), alarmMinutes: 60 })), "Keyholder access")}>Add to calendar</button>}>
        {upcoming.length === 0 ? <p className="empty-note">No visits booked.</p> : upcoming.map(a => {
          const u = units.find(x => x.id === a.unit);
          return (
            <div key={a.id} className="kh-row">
              <div style={{ flex: 1 }}><strong>{a.who}</strong> {a.trade && <span className="pill">{a.trade}</span>} at {u?.name}<p className="note">{when(a.start)} to {when(a.end)}</p></div>
              <label className="check note"><input type="checkbox" checked={a.tenantTold} onChange={e => setAccess(access.map(x => x.id === a.id ? { ...x, tenantTold: e.target.checked } : x))} />Tenant told</label>
              {!a.tenantTold && <a className="btn small" href={waLink(`Hello, ${a.who}${a.trade ? ` (${a.trade.toLowerCase()})` : ""} will visit ${u?.name}, ${u?.address}, from ${when(a.start)} to ${when(a.end)}. Please let me know if this time does not work.`)} target="_blank" rel="noreferrer">Message tenant</a>}
              <button className="btn ghost small danger" onClick={() => setAccess(access.filter(x => x.id !== a.id))}>Cancel</button>
            </div>
          );
        })}
      </Section>

      <Section title="Key register">
        {units.map(u => (
          <div key={u.id} style={{ marginBottom: 16 }}>
            <p><strong>{u.name}</strong> <span className="note">{u.address}</span></p>
            <div className="table-wrap"><table className="t"><tbody>
              {keys.filter(k => k.unit === u.id).map(k => (
                <tr key={k.id}>
                  <td><input className="input" aria-label="Key label" value={k.label} onChange={e => setKeys(keys.map(x => x.id === k.id ? { ...x, label: e.target.value } : x))} /></td>
                  <td style={{ width: 120 }}><input className="input num" type="number" min={0} aria-label="Copies" value={k.copies} onChange={e => setKeys(keys.map(x => x.id === k.id ? { ...x, copies: Math.max(0, +e.target.value || 0) } : x))} /></td>
                  <td>{out.filter(l => l.key === k.id).map(l => <span key={l.id} className={"pill " + (new Date(l.due) < new Date() ? "bad" : "warn")} style={{ marginRight: 4 }}>{l.who}</span>)}{available(k) > 0 && <span className="pill good">{available(k)} in the box</span>}</td>
                  <td className="r">{out.filter(l => l.key === k.id).map(l => <button key={l.id} className="btn ghost small" onClick={() => setLoans(loans.map(x => x.id === l.id ? { ...x, back: new Date().toISOString() } : x))}>{l.who.split(" ")[0]} returned it</button>)}<button className="btn ghost small danger" onClick={() => setKeys(keys.filter(x => x.id !== k.id))}>Delete</button></td>
                </tr>
              ))}
            </tbody></table></div>
            <button className="btn ghost small" onClick={() => setKeys([...keys, { id: uid(), unit: u.id, label: "New key", copies: 1 }])}>Add a key to {u.name}</button>
          </div>
        ))}
        <form className="row" style={{ alignItems: "flex-end" }} onSubmit={e => { e.preventDefault(); if (!nu.name.trim()) return; setUnits([...units, { id: uid(), ...nu }]); setNu({ name: "", address: "" }); }}>
          <label className="field"><span>New unit</span><input id="kh-un" className="input" value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} /></label>
          <label className="field" style={{ flexGrow: 2 }}><span>Address</span><input id="kh-ua" className="input" value={nu.address} onChange={e => setNu({ ...nu, address: e.target.value })} /></label>
          <button className="btn small" type="submit">Add unit</button>
        </form>
      </Section>

      <Section title="History">
        <div className="table-wrap"><table className="t"><thead><tr><th>Key</th><th>Who</th><th>Out</th><th>Back</th><th>Reason</th></tr></thead>
          <tbody>{loans.slice(0, 40).map(l => <tr key={l.id}><td>{keyName(l.key)}</td><td>{l.who}</td><td>{when(l.out)}</td><td>{l.back ? when(l.back) : <span className="pill warn">Still out</span>}</td><td>{l.note}</td></tr>)}</tbody></table></div>
      </Section>
      <style>{`.kh-row{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}`}</style>
    </div>
  );
}
