import { useState, useMemo, useRef, useCallback, useEffect } from "react";

const BASE = "http://localhost:5000";
const STATUS_OPTIONS = ["Not Started", "In Progress", "Implemented", "Verified"];
const STATUS_STYLE = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-300",
  "In Progress":  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Implemented":  "bg-blue-100 text-blue-700 border-blue-300",
  "Verified":     "bg-green-100 text-green-700 border-green-300",
};

function ProgressBar({ items }) {
  const counts = useMemo(() => {
    const c = { "Not Started": 0, "In Progress": 0, "Implemented": 0, "Verified": 0 };
    items.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [items]);
  const total = items.length || 1;
  const done  = counts["Implemented"] + counts["Verified"];
  const pct   = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-5 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 flex-wrap">
      <div className="text-center min-w-[56px]">
        <p className={`text-2xl font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{pct}%</p>
        <p className="text-xs text-gray-400">CSMS Score</p>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(counts).map(([s, n]) => (
          <span key={s} className="flex items-center gap-1 text-gray-600">
            <span className={`w-2 h-2 rounded-full inline-block ${s==="Verified"?"bg-green-500":s==="Implemented"?"bg-blue-500":s==="In Progress"?"bg-yellow-400":"bg-gray-400"}`}/>
            {n} {s}
          </span>
        ))}
      </div>
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
        <div className="h-full flex">
          <div className="bg-green-500 h-full transition-all" style={{width:`${(counts["Verified"]/total)*100}%`}}/>
          <div className="bg-blue-500 h-full transition-all"  style={{width:`${(counts["Implemented"]/total)*100}%`}}/>
          <div className="bg-yellow-400 h-full transition-all" style={{width:`${(counts["In Progress"]/total)*100}%`}}/>
        </div>
      </div>
      <span className="text-xs text-gray-400">{total} items</span>
    </div>
  );
}

function EvidenceCell({ itemId, role, component, currentFile, onUploaded }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("role", role); fd.append("component", component);
    try { await fetch(`${BASE}/api/csms-checklist/evidence/${itemId}`, { method: "POST", body: fd }); onUploaded?.(); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-1.5">
      {currentFile
        ? <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 truncate max-w-[110px]" title={currentFile}>📎 {currentFile}</span>
        : <span className="text-xs text-gray-400">—</span>}
      <button onClick={() => ref.current?.click()} disabled={busy}
        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
        {busy ? "…" : currentFile ? "Replace" : "Upload"}
      </button>
      <input ref={ref} type="file" className="hidden" onChange={e => handle(e.target.files[0])}/>
    </div>
  );
}

function Row({ item, role, component, onSelect, onStatus, onUploaded }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      <td className="py-2.5 px-3 text-center w-10">
        <input type="checkbox" checked={item.selected} onChange={() => onSelect(item.id, !item.selected)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"/>
      </td>
      <td className="py-2.5 px-3 w-24">
        <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{item.clauseRef}</span>
      </td>
      <td className="py-2.5 px-3 max-w-[200px]">
        <p className="text-sm font-medium text-gray-800">{item.requirement}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{item.unr155Clause}</span>
          <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">{item.iso21434Clause}</span>
        </div>
      </td>
      <td className="py-2.5 px-3 w-44">
        <EvidenceCell itemId={item.id} role={role} component={component} currentFile={item.evidenceFile} onUploaded={onUploaded}/>
        <p className="text-xs text-gray-400 mt-1 leading-tight">{item.evidenceRequired}</p>
      </td>
      <td className="py-2.5 px-3 w-36">
        <select value={item.status} onChange={e => onStatus(item.id, e.target.value)}
          className={`text-xs border rounded px-2 py-1 font-semibold focus:outline-none w-full ${STATUS_STYLE[item.status]}`}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td className="py-2.5 px-3 w-36 text-xs text-gray-500">{item.owner}</td>
    </tr>
  );
}

function Section({ section, items, role, component, onSelect, onStatus, onUploaded, onSelectAll }) {
  const [open, setOpen] = useState(true);
  const done = items.filter(i => i.status === "Implemented" || i.status === "Verified").length;
  const pct  = items.length ? Math.round((done / items.length) * 100) : 0;
  const allSel = items.length > 0 && items.every(i => i.selected);
  return (
    <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{section.label}</span>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">{section.unr155}</span>
          <span className="text-xs text-gray-400">{items.length} items</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct>=80?"bg-green-100 text-green-700":pct>=50?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-600"}`}>{pct}%</span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-500 uppercase text-xs">
                <th className="py-2 px-3 text-center w-10">
                  <input type="checkbox" checked={allSel} onChange={e => onSelectAll(items.map(i=>i.id), e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"/>
                </th>
                <th className="py-2 px-3 text-left w-24">Clause Ref</th>
                <th className="py-2 px-3 text-left">Requirement</th>
                <th className="py-2 px-3 text-left w-44">Evidence</th>
                <th className="py-2 px-3 text-left w-36">Status</th>
                <th className="py-2 px-3 text-left w-36">Owner</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <Row key={item.id} item={item} role={role} component={component}
                  onSelect={onSelect} onStatus={onStatus} onUploaded={onUploaded}/>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TraceView({ items }) {
  return (
    <div className="border border-teal-200 rounded-xl overflow-hidden">
      <div className="bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-700 uppercase tracking-wide">
        Traceability — CSMS ↔ UN R155 ↔ ISO 21434 ↔ DFMEA ↔ Evidence
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-gray-500 uppercase">
            <tr>
              <th className="py-2 px-3 text-left">Clause</th>
              <th className="py-2 px-3 text-left">Requirement</th>
              <th className="py-2 px-3 text-left">UN R155</th>
              <th className="py-2 px-3 text-left">ISO 21434</th>
              <th className="py-2 px-3 text-left">DFMEA Link</th>
              <th className="py-2 px-3 text-left">Evidence</th>
              <th className="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-blue-700">{item.clauseRef}</td>
                <td className="py-2 px-3 text-gray-800 max-w-[160px]">{item.requirement}</td>
                <td className="py-2 px-3 text-indigo-600">{item.unr155Clause}</td>
                <td className="py-2 px-3 text-purple-600">{item.iso21434Clause}</td>
                <td className="py-2 px-3 text-gray-500 max-w-[160px] italic">{item.dfmeaLink}</td>
                <td className="py-2 px-3">{item.evidenceFile ? <span className="text-green-700">📎 {item.evidenceFile}</span> : <span className="text-red-400">Missing</span>}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportCSV(items) {
  const header = ["Clause Ref","Section","Requirement","UN R155","ISO 21434","Owner","Evidence","Status"];
  const rows = items.map(i => [i.clauseRef, i.section, `"${i.requirement}"`, i.unr155Clause, i.iso21434Clause, `"${i.owner}"`, i.evidenceFile||"", i.status]);
  const blob = new Blob([[header,...rows].map(r=>r.join(",")).join("\n")], {type:"text/csv"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "CSMS_Checklist.csv"; a.click();
}

export default function CsmsChecklist({ role, component }) {
  const [sections, setSections] = useState([]);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [view, setView]         = useState("checklist");
  const [filterSec, setFilterSec] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    if (!role) return;
    setLoading(true);
    fetch(`${BASE}/api/csms-checklist/items?role=${encodeURIComponent(role)}&component=${encodeURIComponent(component||"")}`)
      .then(r => r.json())
      .then(d => { setSections(d.sections||[]); setItems(d.items||[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role, component]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback((updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`${BASE}/api/csms-checklist/state`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ role, component: component||"", updates }),
      }).catch(()=>{});
    }, 600);
  }, [role, component]);

  const handleSelect  = useCallback((id, selected)  => { setItems(p=>p.map(i=>i.id===id?{...i,selected}:i)); persist([{itemId:id,selected}]); }, [persist]);
  const handleStatus  = useCallback((id, status)    => { setItems(p=>p.map(i=>i.id===id?{...i,status}:i));   persist([{itemId:id,status}]);   }, [persist]);
  const handleSelectAll = useCallback((ids, selected) => { setItems(p=>p.map(i=>ids.includes(i.id)?{...i,selected}:i)); persist(ids.map(itemId=>({itemId,selected}))); }, [persist]);

  const filtered = useMemo(() => items.filter(i =>
    (!filterSec    || i.section === filterSec) &&
    (!filterStatus || i.status  === filterStatus)
  ), [items, filterSec, filterStatus]);

  const selected = filtered.filter(i => i.selected);

  const grouped = useMemo(() =>
    sections.map(s => ({ section: s, items: filtered.filter(i => i.section === s.id) })).filter(g => g.items.length),
  [sections, filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            CSMS — UN R155 Compliance Checklist
            {component && <span className="ml-2 text-xs font-normal text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">{component}</span>}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">UN R155 §7.2–§7.7 · ISO/SAE 21434 · DFMEA Integrated · Audit-Ready</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[["checklist","☑ Checklist"],["trace","🔗 Traceability"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${view===v?"bg-white text-teal-700 shadow border border-gray-200":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
            ))}
          </div>
          <select value={filterSec} onChange={e=>setFilterSec(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => exportCSV(selected.length ? selected : filtered)}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 font-semibold transition-colors">
            ⬇ Export CSV
          </button>
          {loading && <span className="text-xs text-gray-400 italic animate-pulse">Syncing…</span>}
        </div>
      </div>

      {filtered.length > 0 && view === "checklist" && <ProgressBar items={filtered}/>}

      {selected.length > 0 && view === "checklist" && (
        <div className="flex items-center gap-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700">
          <span className="font-semibold">{selected.length} selected</span>
          <button onClick={() => exportCSV(selected)} className="underline">Export selected</button>
          <button onClick={() => handleSelectAll(selected.map(i=>i.id), false)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {view === "trace" && <TraceView items={filtered}/>}
      {view === "checklist" && (
        filtered.length === 0 && !loading
          ? <div className="py-12 text-center text-gray-400"><p className="text-3xl mb-2">📋</p><p className="text-sm">No items match filters</p></div>
          : grouped.map(({ section, items: si }) => (
              <Section key={section.id} section={section} items={si} role={role} component={component||""}
                onSelect={handleSelect} onStatus={handleStatus} onUploaded={load} onSelectAll={handleSelectAll}/>
            ))
      )}
    </div>
  );
}
