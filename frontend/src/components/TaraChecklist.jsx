import { useState, useMemo, useRef, useCallback, useEffect } from "react";

const BASE = "http://localhost:5000";

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "Verified"];
const RISK_OPTIONS   = ["Low", "Medium", "High", "Critical"];

const STATUS_STYLE = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-300",
  "In Progress":  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Completed":    "bg-blue-100 text-blue-700 border-blue-300",
  "Verified":     "bg-green-100 text-green-700 border-green-300",
};
const RISK_STYLE = {
  Low:      "bg-green-100 text-green-700 border-green-300",
  Medium:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  High:     "bg-orange-100 text-orange-700 border-orange-300",
  Critical: "bg-red-100 text-red-700 border-red-300",
};
const RISK_DOT = {
  Low: "bg-green-500", Medium: "bg-yellow-400", High: "bg-orange-500", Critical: "bg-red-600",
};

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ items }) {
  const counts = useMemo(() => {
    const c = { "Not Started": 0, "In Progress": 0, "Completed": 0, "Verified": 0 };
    items.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [items]);
  const total = items.length || 1;
  const done  = counts["Completed"] + counts["Verified"];
  const pct   = Math.round((done / total) * 100);
  const color = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";

  // Aggregate risk score
  const riskCounts = useMemo(() => {
    const r = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    items.forEach(i => { if (r[i.riskLevel] !== undefined) r[i.riskLevel]++; });
    return r;
  }, [items]);

  return (
    <div className="flex items-center gap-5 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 flex-wrap">
      <div className="text-center min-w-[56px]">
        <p className={`text-2xl font-bold ${color}`}>{pct}%</p>
        <p className="text-xs text-gray-400">Complete</p>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(counts).map(([s, n]) => (
          <span key={s} className="flex items-center gap-1 text-gray-600">
            <span className={`w-2 h-2 rounded-full inline-block ${
              s === "Verified" ? "bg-green-500" : s === "Completed" ? "bg-blue-500" :
              s === "In Progress" ? "bg-yellow-400" : "bg-gray-400"
            }`} />
            {n} {s}
          </span>
        ))}
      </div>
      <div className="w-px h-6 bg-gray-200 hidden md:block" />
      <div className="flex gap-2 text-xs flex-wrap">
        {Object.entries(riskCounts).filter(([,n]) => n > 0).map(([r, n]) => (
          <span key={r} className={`flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${RISK_STYLE[r]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[r]}`} />
            {n} {r}
          </span>
        ))}
      </div>
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
        <div className="h-full flex">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${(counts["Verified"] / total) * 100}%` }} />
          <div className="bg-blue-500 h-full transition-all"  style={{ width: `${(counts["Completed"] / total) * 100}%` }} />
          <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(counts["In Progress"] / total) * 100}%` }} />
        </div>
      </div>
      <span className="text-xs text-gray-400">{total} items</span>
    </div>
  );
}

// ── Evidence upload cell ──────────────────────────────────────────────────────
function EvidenceCell({ itemId, role, component, currentFile, onUploaded }) {
  const inputRef   = useRef();
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", role);
    fd.append("component", component);
    try {
      await fetch(`${BASE}/api/tara-checklist/evidence/${itemId}`, { method: "POST", body: fd });
      onUploaded?.();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-1.5">
      {currentFile
        ? <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 truncate max-w-[110px]" title={currentFile}>📎 {currentFile}</span>
        : <span className="text-xs text-gray-400">—</span>
      }
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        {busy ? "…" : currentFile ? "Replace" : "Upload"}
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Checklist row ─────────────────────────────────────────────────────────────
function ChecklistRow({ item, role, component, onSelect, onStatus, onRisk, onUploaded }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
      <td className="py-2.5 px-3 text-center w-10">
        <input type="checkbox" checked={item.selected}
          onChange={() => onSelect(item.id, !item.selected)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
      </td>
      <td className="py-2.5 px-3 w-24">
        <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded whitespace-nowrap">
          {item.reqId}
        </span>
      </td>
      <td className="py-2.5 px-3 max-w-[200px]">
        <p className="text-sm font-medium text-gray-800">{item.requirement}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
      </td>
      <td className="py-2.5 px-3 w-44">
        <EvidenceCell itemId={item.id} role={role} component={component}
          currentFile={item.evidenceFile} onUploaded={onUploaded} />
        <p className="text-xs text-gray-400 mt-1 leading-tight">{item.evidenceRequired}</p>
      </td>
      <td className="py-2.5 px-3 w-36">
        <select value={item.status} onChange={e => onStatus(item.id, e.target.value)}
          className={`text-xs border rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 w-full ${STATUS_STYLE[item.status]}`}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td className="py-2.5 px-3 w-28">
        <select value={item.riskLevel} onChange={e => onRisk(item.id, e.target.value)}
          className={`text-xs border rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 w-full ${RISK_STYLE[item.riskLevel]}`}>
          {RISK_OPTIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </td>
    </tr>
  );
}

// ── Section block (CTSA / CRRA) ───────────────────────────────────────────────
function Section({ title, subtitle, items, role, component, onSelect, onStatus, onRisk, onUploaded, onSelectAll }) {
  const [open, setOpen] = useState(true);
  const done = items.filter(i => i.status === "Completed" || i.status === "Verified").length;
  const pct  = items.length ? Math.round((done / items.length) * 100) : 0;
  const allSel = items.length > 0 && items.every(i => i.selected);

  return (
    <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className="text-xs text-gray-400">{subtitle}</span>
          <span className="text-xs text-gray-400">{items.length} items</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
            {pct}%
          </span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲ Collapse" : "▼ Expand"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-500 uppercase text-xs">
                <th className="py-2 px-3 text-center w-10">
                  <input type="checkbox" checked={allSel}
                    onChange={e => onSelectAll(items.map(i => i.id), e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                </th>
                <th className="py-2 px-3 text-left w-24">Req. ID</th>
                <th className="py-2 px-3 text-left">Requirement Description</th>
                <th className="py-2 px-3 text-left w-44">Evidence Required</th>
                <th className="py-2 px-3 text-left w-36">Status</th>
                <th className="py-2 px-3 text-left w-28">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ChecklistRow key={item.id} item={item} role={role} component={component}
                  onSelect={onSelect} onStatus={onStatus} onRisk={onRisk} onUploaded={onUploaded} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Threat Matrix view ────────────────────────────────────────────────────────
function ThreatMatrixView({ component }) {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = component ? `?component=${encodeURIComponent(component)}` : "";
    fetch(`${BASE}/api/tara-checklist/threat-matrix${q}`)
      .then(r => r.json())
      .then(d => { setMatrix(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [component]);

  if (loading) return <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading threat matrix…</div>;

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden">
      <div className="bg-purple-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
          Threat Matrix — TTP × Asset × Risk Score
        </span>
        <span className="text-xs text-purple-500">{matrix.length} TTPs{component ? ` · ${component}` : ""}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-gray-500 uppercase">
            <tr>
              <th className="py-2 px-3 text-left">TTP ID</th>
              <th className="py-2 px-3 text-left">Threat / TTP Name</th>
              <th className="py-2 px-3 text-left">Category</th>
              <th className="py-2 px-3 text-center">Impact</th>
              <th className="py-2 px-3 text-center">Likelihood</th>
              <th className="py-2 px-3 text-center">Risk Score</th>
              <th className="py-2 px-3 text-center">Risk Level</th>
              <th className="py-2 px-3 text-left">Countermeasures</th>
              <th className="py-2 px-3 text-left">Annex 5 Ref</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((t, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-purple-700">{t.ttp}</td>
                <td className="py-2 px-3 font-medium text-gray-800">{t.ttpName}</td>
                <td className="py-2 px-3 text-gray-500">{t.category}</td>
                <td className="py-2 px-3 text-center text-gray-700">{t.impact}</td>
                <td className="py-2 px-3 text-center text-gray-700">{t.likelihood}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded font-bold text-white text-xs ${
                    t.riskScore >= 16 ? "bg-red-600" : t.riskScore >= 9 ? "bg-orange-500" :
                    t.riskScore >= 4  ? "bg-yellow-500" : "bg-green-600"
                  }`}>{t.riskScore}</span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${RISK_STYLE[t.riskLevel]}`}>
                    {t.riskLevel}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {t.countermeasures.map(cm => (
                      <span key={cm} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">{cm}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3 font-mono text-blue-600">{t.annexRef}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Traceability view ─────────────────────────────────────────────────────────
function TraceabilityView({ items }) {
  return (
    <div className="border border-indigo-200 rounded-xl overflow-hidden">
      <div className="bg-indigo-50 px-4 py-2.5">
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          Traceability — Asset ↔ TTP ↔ Countermeasure ↔ Evidence
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-gray-500 uppercase">
            <tr>
              <th className="py-2 px-3 text-left">Req. ID</th>
              <th className="py-2 px-3 text-left">Requirement</th>
              <th className="py-2 px-3 text-left">Section</th>
              <th className="py-2 px-3 text-left">Evidence</th>
              <th className="py-2 px-3 text-center">Risk</th>
              <th className="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-blue-700">{item.reqId}</td>
                <td className="py-2 px-3 text-gray-800 max-w-[220px]">{item.requirement}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                    item.section === "CTSA" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                  }`}>{item.section}</span>
                </td>
                <td className="py-2 px-3 text-gray-500">
                  {item.evidenceFile
                    ? <span className="text-green-700">📎 {item.evidenceFile}</span>
                    : <span className="text-red-400">Missing</span>}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${RISK_STYLE[item.riskLevel]}`}>
                    {item.riskLevel}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(items) {
  const header = ["Req ID", "Section", "Requirement", "Evidence Required", "Evidence File", "Status", "Risk Level"];
  const rows = items.map(i => [
    i.reqId, i.section, `"${i.requirement}"`, `"${i.evidenceRequired}"`,
    i.evidenceFile || "", i.status, i.riskLevel,
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "TARA_CTSA_CRRA_Checklist.csv";
  a.click();
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaraChecklist({ role, component }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [view,        setView]        = useState("checklist"); // checklist | matrix | trace
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk,   setFilterRisk]   = useState("");
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    if (!role) return;
    setLoading(true);
    fetch(`${BASE}/api/tara-checklist/items?role=${encodeURIComponent(role)}&component=${encodeURIComponent(component || "")}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role, component]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback((updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`${BASE}/api/tara-checklist/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, component: component || "", updates }),
      }).catch(() => {});
    }, 600);
  }, [role, component]);

  const handleSelect = useCallback((id, selected) => {
    setItems(p => p.map(i => i.id === id ? { ...i, selected } : i));
    persist([{ itemId: id, selected }]);
  }, [persist]);

  const handleSelectAll = useCallback((ids, selected) => {
    setItems(p => p.map(i => ids.includes(i.id) ? { ...i, selected } : i));
    persist(ids.map(itemId => ({ itemId, selected })));
  }, [persist]);

  const handleStatus = useCallback((id, status) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status } : i));
    persist([{ itemId: id, status }]);
  }, [persist]);

  const handleRisk = useCallback((id, riskLevel) => {
    setItems(p => p.map(i => i.id === id ? { ...i, riskLevel } : i));
    persist([{ itemId: id, riskLevel }]);
  }, [persist]);

  const filtered = useMemo(() => items.filter(i =>
    (!filterStatus || i.status    === filterStatus) &&
    (!filterRisk   || i.riskLevel === filterRisk)
  ), [items, filterStatus, filterRisk]);

  const ctsa = filtered.filter(i => i.section === "CTSA");
  const crra = filtered.filter(i => i.section === "CRRA");
  const selected = filtered.filter(i => i.selected);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            TARA — CTSA &amp; CRRA Checklist
            {component && (
              <span className="ml-2 text-xs font-normal text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                {component}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">ISO/SAE 21434 §8–§9 · UN R155 CSMS Compatible · Audit-Ready</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[["checklist","☑ Checklist"],["matrix","⚡ Threat Matrix"],["trace","🔗 Traceability"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  view === v ? "bg-white text-purple-700 shadow border border-gray-200" : "text-gray-500 hover:text-gray-700"
                }`}>{label}</button>
            ))}
          </div>
          {/* Filters */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">All Risk Levels</option>
            {RISK_OPTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          {/* Export */}
          <button onClick={() => exportCSV(selected.length ? selected : filtered)}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 font-semibold transition-colors">
            ⬇ Export CSV
          </button>
          <a
            href={`http://localhost:5000/api/templates/tara-ctsa?role=${encodeURIComponent(role)}&component=${encodeURIComponent(component||"")}`}
            download
            className="text-xs px-3 py-1.5 rounded border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold transition-colors">
            📥 Download CTSA Template
          </a>
          {loading && <span className="text-xs text-gray-400 italic animate-pulse">Syncing…</span>}
        </div>
      </div>

      {/* Progress bar */}
      {filtered.length > 0 && view === "checklist" && <ProgressBar items={filtered} />}

      {/* Selection banner */}
      {selected.length > 0 && view === "checklist" && (
        <div className="flex items-center gap-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
          <span className="font-semibold">{selected.length} items selected</span>
          <button onClick={() => exportCSV(selected)} className="underline hover:no-underline">Export selected</button>
          <button onClick={() => handleSelectAll(selected.map(i => i.id), false)} className="ml-auto text-gray-400 hover:text-gray-600">✕ Clear</button>
        </div>
      )}

      {/* Views */}
      {view === "matrix" && <ThreatMatrixView component={component} />}
      {view === "trace"  && <TraceabilityView items={filtered} />}
      {view === "checklist" && (
        <>
          {filtered.length === 0 && !loading ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No items match the current filters</p>
            </div>
          ) : (
            <>
              {ctsa.length > 0 && (
                <Section title="A. CTSA" subtitle="Cyber Threat Susceptibility Assessment"
                  items={ctsa} role={role} component={component || ""}
                  onSelect={handleSelect} onStatus={handleStatus} onRisk={handleRisk}
                  onUploaded={load} onSelectAll={handleSelectAll} />
              )}
              {crra.length > 0 && (
                <Section title="B. CRRA" subtitle="Cyber Risk Remediation Analysis"
                  items={crra} role={role} component={component || ""}
                  onSelect={handleSelect} onStatus={handleStatus} onRisk={handleRisk}
                  onUploaded={load} onSelectAll={handleSelectAll} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
