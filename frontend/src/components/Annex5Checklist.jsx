import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useFilterContext } from "../context/FilterContext";
import { useEvidence } from "../hooks/useAnalytics";

const BASE = "http://localhost:5000";

const STATUS_OPTIONS = ["Not Started", "In Progress", "Implemented", "Verified"];

const STATUS_STYLE = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-300",
  "In Progress":  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Implemented":  "bg-blue-100 text-blue-700 border-blue-300",
  "Verified":     "bg-green-100 text-green-700 border-green-300",
};

const STATUS_DOT = {
  "Not Started": "bg-gray-400",
  "In Progress":  "bg-yellow-400",
  "Implemented":  "bg-blue-500",
  "Verified":     "bg-green-500",
};

// ── Compliance progress bar ───────────────────────────────────────────────────
function ComplianceBar({ items }) {
  const counts = useMemo(() => {
    const c = { "Not Started": 0, "In Progress": 0, "Implemented": 0, "Verified": 0 };
    items.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [items]);

  const total = items.length || 1;
  const implemented = counts["Implemented"] + counts["Verified"];
  const pct = Math.round((implemented / total) * 100);
  const color = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="flex items-center gap-5 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div className="text-center min-w-[56px]">
        <p className={`text-2xl font-bold ${color}`}>{pct}%</p>
        <p className="text-xs text-gray-400">Compliance</p>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(counts).map(([s, n]) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${STATUS_DOT[s]}`} />
            {n} {s}
          </span>
        ))}
      </div>
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${(counts["Verified"] / total) * 100}%` }} />
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${(counts["Implemented"] / total) * 100}%` }} />
          <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(counts["In Progress"] / total) * 100}%` }} />
        </div>
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap">{total} items</div>
    </div>
  );
}

// ── Mitigation pill with expandable description ───────────────────────────────
function MitigationPill({ m }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
      >
        {m.code}
        <span className="text-indigo-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-72 bg-white border border-indigo-200 rounded-lg shadow-lg p-3 text-xs text-gray-700">
          <p className="font-semibold text-indigo-700 mb-1">[{m.code}] {m.title}</p>
          <p className="text-gray-600 leading-relaxed">{m.desc}</p>
          <span className="mt-1 inline-block text-xs text-gray-400">Table {m.group}</span>
        </div>
      )}
    </span>
  );
}

// ── Evidence upload cell ──────────────────────────────────────────────────────
function EvidenceCell({ itemId, role, component, currentFile, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", role);
    fd.append("component", component);
    try {
      const res = await fetch(`${BASE}/api/annex5-checklist/evidence/${itemId}`, { method: "POST", body: fd });
      if (res.ok) onUploaded?.();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {currentFile ? (
        <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 truncate max-w-[120px]" title={currentFile}>
          📎 {currentFile}
        </span>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        {uploading ? "…" : currentFile ? "Replace" : "Upload"}
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Single checklist row ──────────────────────────────────────────────────────
function ChecklistRow({ item, role, component, onSelect, onStatus, onUploaded }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
      {/* Checkbox */}
      <td className="py-2.5 px-3 text-center w-10">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={() => onSelect(item.id, !item.selected)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
        />
      </td>
      {/* Clause Ref */}
      <td className="py-2.5 px-3 w-28">
        <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded whitespace-nowrap">
          {item.clauseRef}
        </span>
      </td>
      {/* Threat */}
      <td className="py-2.5 px-3 text-sm text-gray-800 max-w-[220px]">{item.threat}</td>
      {/* Attack Example */}
      <td className="py-2.5 px-3 text-xs text-gray-500 max-w-[200px] italic">{item.attackExample}</td>
      {/* Mitigations */}
      <td className="py-2.5 px-3 w-40">
        <div className="relative flex flex-wrap gap-1">
          {item.mitigationDetails.map(m => <MitigationPill key={m.code} m={m} />)}
        </div>
      </td>
      {/* Evidence */}
      <td className="py-2.5 px-3 w-44">
        <EvidenceCell
          itemId={item.id}
          role={role}
          component={component}
          currentFile={item.evidenceFile}
          onUploaded={onUploaded}
        />
      </td>
      {/* Status */}
      <td className="py-2.5 px-3 w-36">
        <select
          value={item.status}
          onChange={e => onStatus(item.id, e.target.value)}
          className={`text-xs border rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 ${STATUS_STYLE[item.status]}`}
        >
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </td>
    </tr>
  );
}

// ── Category section (collapsible) ───────────────────────────────────────────
function CategorySection({ category, items, role, component, onSelect, onStatus, onUploaded, allSelected, onSelectAll }) {
  const [open, setOpen] = useState(true);
  const implemented = items.filter(i => i.status === "Implemented" || i.status === "Verified").length;
  const pct = items.length ? Math.round((implemented / items.length) * 100) : 0;

  return (
    <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{category.label}</span>
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
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => onSelectAll(items.map(i => i.id), e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3 text-left w-28">Clause Ref</th>
                <th className="py-2 px-3 text-left">Threat Description</th>
                <th className="py-2 px-3 text-left">Attack Example</th>
                <th className="py-2 px-3 text-left w-40">Applicable Mitigation</th>
                <th className="py-2 px-3 text-left w-44">Evidence Required</th>
                <th className="py-2 px-3 text-left w-36">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  role={role}
                  component={component}
                  onSelect={onSelect}
                  onStatus={onStatus}
                  onUploaded={onUploaded}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(items) {
  const header = ["Clause Ref", "Threat", "Attack Example", "Mitigations", "Evidence", "Status"];
  const rows = items.map(i => [
    i.clauseRef, `"${i.threat}"`, `"${i.attackExample}"`,
    i.mitigations.join("; "), i.evidenceFile || "", i.status,
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "UN_R155_Annex5_Checklist.csv"; a.click();
}

// ── Main Annex5 Checklist ─────────────────────────────────────────────────────
export default function Annex5Checklist({ role, component }) {
  const { refreshAnalytics } = useFilterContext();
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterCat, setFilterCat]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [traceView, setTraceView]   = useState(false);
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    if (!role || !component) return;
    setLoading(true);
    fetch(`${BASE}/api/annex5-checklist/items?role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}`)
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || []);
        setItems(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role, component]);

  useEffect(() => { load(); }, [load]);

  // Debounced persist to backend
  const persist = useCallback((updates) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`${BASE}/api/annex5-checklist/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, component, updates }),
      }).catch(() => {});
    }, 600);
  }, [role, component]);

  const handleStatus = useCallback((itemId, status) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
    persist([{ itemId, status }]);
  }, [persist]);

  const handleSelect = useCallback((itemId, selected) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, selected } : i));
    persist([{ itemId, selected }]);
  }, [persist]);

  const handleSelectAll = useCallback((ids, selected) => {
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, selected } : i));
    persist(ids.map(itemId => ({ itemId, selected })));
  }, [persist]);

  const filtered = useMemo(() => items.filter(i =>
    (!filterCat    || i.category === filterCat) &&
    (!filterStatus || i.status   === filterStatus)
  ), [items, filterCat, filterStatus]);

  const selectedItems = filtered.filter(i => i.selected);

  const groupedByCategory = useMemo(() =>
    categories.map(cat => ({
      category: cat,
      items: filtered.filter(i => i.category === cat.id),
    })).filter(g => g.items.length > 0),
  [categories, filtered]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            UN R155 — Annex 5 Threats &amp; Mitigations Checklist
            {component && (
              <span className="ml-2 text-xs font-normal text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {component}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Tables A1 · B1–B8 · C1–C3 — Audit-Ready CSMS Workflow</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter */}
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          {/* Traceability toggle */}
          <button
            onClick={() => setTraceView(v => !v)}
            className={`text-xs px-3 py-1.5 rounded border font-semibold transition-colors ${traceView ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600"}`}
          >
            🔗 Traceability
          </button>
          {/* Export CSV */}
          <button
            onClick={() => exportCSV(selectedItems.length ? selectedItems : filtered)}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 font-semibold transition-colors"
          >
            ⬇ Export CSV
          </button>
          {loading && <span className="text-xs text-gray-400 italic animate-pulse">Syncing…</span>}
        </div>
      </div>

      {/* Compliance bar */}
      {filtered.length > 0 && <ComplianceBar items={filtered} />}

      {/* Selection info */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <span className="font-semibold">{selectedItems.length} items selected</span>
          <button onClick={() => exportCSV(selectedItems)} className="underline hover:no-underline">Export selected as CSV</button>
          <button
            onClick={() => { handleSelectAll(selectedItems.map(i => i.id), false); }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >✕ Clear</button>
        </div>
      )}

      {/* Traceability view */}
      {traceView && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 uppercase tracking-wide">
            Clause Traceability — Threat ↔ Mitigation ↔ Evidence
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 text-gray-500 uppercase">
                <tr>
                  <th className="py-2 px-3 text-left">Clause</th>
                  <th className="py-2 px-3 text-left">Threat</th>
                  <th className="py-2 px-3 text-left">Mitigations</th>
                  <th className="py-2 px-3 text-left">Evidence</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-blue-700">{item.clauseRef}</td>
                    <td className="py-2 px-3 text-gray-700 max-w-[200px]">{item.threat}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.mitigationDetails.map(m => (
                          <span key={m.code} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold">
                            {m.code} — {m.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-500">{item.evidenceFile || <span className="text-red-400">Missing</span>}</td>
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
      )}

      {/* Grouped checklist */}
      {!traceView && (
        <>
          {filtered.length === 0 && !loading ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">No items match the current filters</p>
            </div>
          ) : (
            groupedByCategory.map(({ category, items: catItems }) => (
              <CategorySection
                key={category.id}
                category={category}
                items={catItems}
                role={role}
                component={component}
                onSelect={handleSelect}
                onStatus={handleStatus}
                onUploaded={load}
                allSelected={catItems.length > 0 && catItems.every(i => i.selected)}
                onSelectAll={handleSelectAll}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
