import { useState, useMemo, useRef, useEffect } from "react";
import { useChecklist, useEvidence } from "../hooks/useAnalytics";
import { useFilterContext } from "../context/FilterContext";
import Annex5Checklist         from "./Annex5Checklist";
import TaraChecklist           from "./TaraChecklist";
import CsmsChecklist           from "./CsmsChecklist";
import SelectedValidationPanel from "./SelectedValidationPanel";
import {
  Target, Paperclip, ClipboardList, Info,
  ShieldCheck, FileText, BarChart2, Upload,
} from "lucide-react";

const BASE = "http://localhost:5000";

// ── Status badge ──────────────────────────────────────────────────
const STATUS_CFG = {
  Compliant: { cls: "bg-green-500/15 text-green-400 border-green-500/20",  dot: "bg-green-400"  },
  Partial:   { cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",  dot: "bg-amber-400"  },
  Gap:       { cls: "bg-red-500/15 text-red-400 border-red-500/20",        dot: "bg-red-400"    },
};
function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG["Gap"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ── Score ring ────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 70 ? "#4ade80" : score >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 flex-shrink-0"
      style={{ borderColor: color }}>
      <span className="text-sm font-bold leading-none" style={{ color }}>{score}%</span>
      <span className="text-[9px] text-white/30 mt-0.5">Score</span>
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────
function SummaryBar({ rows }) {
  const counts = useMemo(() => ({
    Compliant: rows.filter(r => r.status === "Compliant").length,
    Partial:   rows.filter(r => r.status === "Partial").length,
    Gap:       rows.filter(r => r.status === "Gap").length,
  }), [rows]);
  const total = rows.length || 1;
  const score = Math.round(((counts.Compliant + counts.Partial * 0.5) / total) * 100);

  return (
    <div className="flex items-center gap-5 p-4 bg-black/20 rounded-xl border border-white/10 mb-4">
      <ScoreRing score={score} />
      <div className="flex gap-4 text-xs flex-wrap">
        {[["bg-green-400","Compliant",counts.Compliant],
          ["bg-amber-400","Partial",counts.Partial],
          ["bg-red-400","Gap",counts.Gap]].map(([dot,label,n]) => (
          <span key={label} className="flex items-center gap-1.5 text-white/50">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <strong className="text-white/80">{n}</strong> {label}
          </span>
        ))}
      </div>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div className="bg-green-400 h-full transition-all" style={{ width: `${(counts.Compliant/total)*100}%` }} />
          <div className="bg-amber-400 h-full transition-all" style={{ width: `${(counts.Partial/total)*100}%` }} />
          <div className="bg-red-400 h-full transition-all"   style={{ width: `${(counts.Gap/total)*100}%` }} />
        </div>
      </div>
      <span className="text-xs text-white/30 whitespace-nowrap">{total} items</span>
    </div>
  );
}

// ── Checklist table ───────────────────────────────────────────────
function ChecklistTable({ rows, onOverride }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
            <th className="text-left py-2.5 px-4 font-medium">Clause Ref</th>
            <th className="text-left py-2.5 px-4 font-medium">Requirement</th>
            <th className="text-left py-2.5 px-4 font-medium">Evidence</th>
            <th className="text-center py-2.5 px-4 font-medium">Status</th>
            {onOverride && <th className="text-center py-2.5 px-4 font-medium">Override</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
              <td className="py-2.5 px-4">
                <span className="font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                  {row.clause_ref || row.clause}
                </span>
              </td>
              <td className="py-2.5 px-4 text-white/70">{row.requirement}</td>
              <td className="py-2.5 px-4 text-white/40">{row.evidence_file || row.evidence || "—"}</td>
              <td className="py-2.5 px-4 text-center"><StatusBadge status={row.status} /></td>
              {onOverride && (
                <td className="py-2.5 px-4 text-center">
                  <select
                    className="text-xs border border-white/10 rounded px-1.5 py-0.5 bg-white/5 text-white/70 focus:outline-none"
                    value={row.status}
                    onChange={e => onOverride(row.clause_ref || row.clause, e.target.value)}
                  >
                    <option>Compliant</option>
                    <option>Partial</option>
                    <option>Gap</option>
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Evidence upload panel ─────────────────────────────────────────
function EvidenceUploadTab({ role, component, regulation, onUploaded }) {
  const [clauses,      setClauses]      = useState([]);
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [clause,       setClause]       = useState("");
  const [file,         setFile]         = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [status,       setStatus]       = useState(null);
  const [msg,          setMsg]          = useState("");
  const inputRef = useRef();
  const { evidence } = useEvidence(role, component, 0);

  useEffect(() => {
    if (!component) return;
    const params = new URLSearchParams({ role, component });
    if (regulation) params.set("regulation", regulation);
    fetch(`${BASE}/api/clauses?${params}`)
      .then(r => r.json())
      .then(d => { setClauses(Array.isArray(d) ? d : []); setClause(""); })
      .catch(() => {});
  }, [role, component, regulation]);

  useEffect(() => {
    if (!role || !component) return;
    const q = `role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}`;
    Promise.all([
      fetch(`${BASE}/api/annex5-checklist/items?${q}`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${BASE}/api/tara-checklist/items?${q}`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch(`${BASE}/api/csms-checklist/items?${q}`).then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([a5, tara, csms]) => {
      const refs = [
        ...(a5.items   || []).filter(i => i.selected).map(i => i.clauseRef || i.id),
        ...(tara.items || []).filter(i => i.selected).map(i => i.reqId     || i.id),
        ...(csms.items || []).filter(i => i.selected).map(i => i.clauseRef || i.id),
      ];
      setSelectedRefs(refs);
      if (refs.length === 1) setClause(refs[0]);
    });
  }, [role, component]);

  const filteredClauses  = selectedRefs.length > 0
    ? clauses.filter(c => selectedRefs.includes(c.clause_ref))
    : clauses;
  const selectedClause = clauses.find(c => c.clause_ref === clause);

  const handleSubmit = async () => {
    if (!clause || !file) { setMsg("Select a clause and attach a file."); return; }
    setStatus("uploading"); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("clause_ref", clause);
    fd.append("regulation_type", selectedClause?.regulation_type || "");
    fd.append("role", role);
    fd.append("component", component);
    try {
      const res  = await fetch(`${BASE}/api/evidence/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        setStatus("ok");
        setMsg(`Uploaded — ${json.validationStatus || "Processed"} (score: ${json.validationScore}%)`);
        setFile(null); setClause("");
        onUploaded?.();
      } else {
        setStatus("err"); setMsg(json.error || "Upload failed");
      }
    } catch { setStatus("err"); setMsg("Network error"); }
  };

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <div className="bg-black/20 border border-white/10 rounded-xl p-5">
        <p className="text-sm font-medium text-white/90 mb-4 tracking-wide">Upload Evidence Document</p>

        {selectedRefs.length === 0 && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            <Info size={13} className="flex-shrink-0" />
            Select checklist items in UN R155, TARA, or CSMS tabs before uploading.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Clause Reference
              {selectedRefs.length > 0 && (
                <span className="ml-1 text-blue-400">({selectedRefs.length} selected)</span>
              )}
            </label>
            <select
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-xs bg-white/5 text-white/70 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              value={clause}
              onChange={e => setClause(e.target.value)}
            >
              <option value="">— Select clause —</option>
              {filteredClauses.map(c => (
                <option key={c.clause_ref} value={c.clause_ref}>
                  [{c.regulation_type}] {c.clause_ref} — {c.clause_title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Component</label>
            <input className="w-full border border-white/10 rounded-lg px-3 py-2 text-xs bg-white/5 text-white/40" value={component} readOnly />
          </div>
        </div>

        {selectedClause && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 space-y-1">
            <p className="font-semibold text-blue-200">{component} — {selectedClause.clause_ref}</p>
            <p className="text-blue-300/70">{selectedClause.evidence_template}</p>
            <p>Expected: <strong className="text-blue-200">{selectedClause.expected_document_type}</strong></p>
          </div>
        )}

        <div
          className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragging ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-xs text-blue-400 font-medium">
              <Paperclip size={13} />
              {file.name} <span className="text-white/30 font-normal">({(file.size/1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <>
              <p className="text-xl mb-2 opacity-40">📂</p>
              <p className="text-xs text-white/50">Drag & drop or click to browse</p>
              <p className="text-xs text-white/25 mt-1">PDF, DOCX, XLSX, TXT</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={status === "uploading" || !clause}
            className="ds-btn ds-btn-primary ds-btn-sm"
          >
            {status === "uploading" ? "Uploading…" : "Upload Evidence"}
          </button>
          {msg && (
            <span className={`text-xs font-medium ${status === "ok" ? "text-green-400" : "text-red-400"}`}>{msg}</span>
          )}
        </div>
      </div>

      {/* Evidence history */}
      {evidence.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Uploaded Evidence — {component}</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                <th className="text-left py-2.5 px-4 font-medium">Clause</th>
                <th className="text-left py-2.5 px-4 font-medium">File</th>
                <th className="text-center py-2.5 px-4 font-medium">Validation</th>
                <th className="text-center py-2.5 px-4 font-medium">Score</th>
                <th className="text-left py-2.5 px-4 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {evidence.filter(e => !e.is_superseded).map((ev, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                  <td className="py-2.5 px-4"><span className="font-mono text-blue-400">{ev.clause_ref}</span></td>
                  <td className="py-2.5 px-4 text-white/70">{ev.file_name}</td>
                  <td className="py-2.5 px-4 text-center"><StatusBadge status={ev.validation_status} /></td>
                  <td className="py-2.5 px-4 text-center text-white/60">{ev.validation_score ?? "—"}%</td>
                  <td className="py-2.5 px-4 text-white/30">{ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────
const REG_TABS = [
  { id: "r155",  label: "UN R155",         Icon: ShieldCheck, std: "UNR155"   },
  { id: "tara",  label: "TARA – ISO/SAE 21434", Icon: BarChart2,   std: "ISO21434" },
  { id: "csms",  label: "CSMS",             Icon: FileText,    std: "CSMS"     },
];
const ACTION_TABS = [
  { id: "validate", label: "Validate", Icon: Target  },
  { id: "upload",   label: "Upload Evidence", Icon: Upload  },
];

const ROLE_COLOR = {
  "OEM":                       "bg-blue-600/80 text-white",
  "Tier-1":                    "bg-amber-500/80 text-white",
  "Authority (ARAI/TÜV/ICAT)": "bg-emerald-600/80 text-white",
};

// ── Main component ────────────────────────────────────────────────
export default function ComplianceChecklist({ role, component, defaultTab }) {
  const { analyticsVersion, refreshAnalytics, selectedRegulation } = useFilterContext();
  const [regTab, setRegTab] = useState(defaultTab || "r155");
  useEffect(() => { if (defaultTab) setRegTab(defaultTab); }, [defaultTab]);
  const { rows, loading }   = useChecklist(role, component, analyticsVersion);

  const filtered = useMemo(() => {
    const tab = REG_TABS.find(t => t.id === regTab);
    if (!tab?.std) return [];
    return rows.filter(r => r.standard === tab.std);
  }, [rows, regTab]);

  const handleOverride = async (clauseRef, newStatus) => {
    try {
      await fetch(`${BASE}/api/evidence/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_ref: clauseRef, role, component, status: newStatus }),
      });
      refreshAnalytics();
    } catch { /* silent */ }
  };

  // Live compliance score for header
  const headerScore = useMemo(() => {
    const src = filtered.length > 0 ? filtered : rows;
    if (!src.length) return null;
    const total = src.length;
    const comp  = src.filter(r => r.status === "Compliant").length;
    const part  = src.filter(r => r.status === "Partial").length;
    return Math.round(((comp + part * 0.5) / total) * 100);
  }, [filtered, rows]);

  const scoreColor = headerScore == null ? "#94a3b8"
    : headerScore >= 70 ? "#4ade80"
    : headerScore >= 40 ? "#fbbf24"
    : "#f87171";

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">

      {/* ── Gradient header strip ── */}
      <div className="checklist-shell-header px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-blue-400" strokeWidth={2} />
              <h2 className="text-sm font-medium text-white/90 tracking-wide">
                Cybersecurity Compliance Checklist
              </h2>
              {loading && (
                <span className="text-[10px] text-white/30 italic animate-pulse ml-1">Syncing…</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[role] || "bg-blue-600/80 text-white"}`}>
                {role}
              </span>
              {component && (
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                  {component}
                </span>
              )}
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">
                UN R155 · ISO 21434 · CSMS
              </span>
            </div>
          </div>

          {/* Live score */}
          {headerScore != null && (
            <div className="text-right">
              <p className="text-3xl font-semibold tracking-tight" style={{ color: scoreColor }}>
                {headerScore}%
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">Compliance</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 flex-wrap">
        {/* Segmented control — regulation selector */}
        <div className="inline-flex items-center bg-white/10 rounded-full p-1 gap-0.5">
          {REG_TABS.map(tab => {
            const active = regTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRegTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                <tab.Icon size={12} strokeWidth={active ? 2.5 : 1.75} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action tabs + item count */}
        <div className="flex items-center gap-1">
          {ACTION_TABS.map(tab => {
            const active = regTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRegTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-blue-600/80 text-white shadow"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <tab.Icon size={12} strokeWidth={active ? 2.5 : 1.75} />
                {tab.label}
              </button>
            );
          })}
          {filtered.length > 0 && (
            <span className="ml-2 text-[10px] text-white/25 whitespace-nowrap">
              {filtered.length} items
            </span>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="p-5">
        {regTab === "upload" ? (
          <EvidenceUploadTab
            role={role}
            component={component}
            regulation={selectedRegulation || ""}
            onUploaded={refreshAnalytics}
          />
        ) : regTab === "r155" ? (
          <Annex5Checklist role={role} component={component} />
        ) : regTab === "tara" ? (
          <TaraChecklist role={role} component={component} />
        ) : regTab === "csms" ? (
          <CsmsChecklist role={role} component={component} />
        ) : regTab === "validate" ? (
          <SelectedValidationPanel role={role} component={component} />
        ) : (
          <>
            {filtered.length > 0 && <SummaryBar rows={filtered} />}
            {filtered.length === 0 && !loading ? (
              <div className="py-16 text-center text-white/30">
                <ClipboardList size={32} className="mx-auto mb-3 text-white/15" strokeWidth={1.25} />
                <p className="text-xs font-medium">No checklist data — upload evidence to populate</p>
              </div>
            ) : (
              <ChecklistTable
                rows={filtered}
                onOverride={role === "Authority (ARAI/TÜV/ICAT)" ? handleOverride : null}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
