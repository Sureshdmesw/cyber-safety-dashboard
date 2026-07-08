import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, Globe, TrendingUp, FileText, Table2, Presentation, Mail, MessageSquare, Paperclip, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";

const BASE = "http://localhost:5000";

// Endpoint config per checklist type
const ENDPOINTS = {
  annex5: { items: "/api/annex5-checklist/items", evidence: "/api/annex5-checklist/evidence", state: "/api/annex5-checklist/state" },
  tara:   { items: "/api/tara-checklist/items",   evidence: "/api/tara-checklist/evidence",   state: "/api/tara-checklist/state"   },
  csms:   { items: "/api/csms-checklist/items",   evidence: "/api/csms-checklist/evidence",   state: "/api/csms-checklist/state"   },
};

const SOURCE_LABEL = { annex5: "Annex 5", tara: "TARA", csms: "CSMS" };

const STATUS_STYLE = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-300",
  "In Progress":  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Implemented":  "bg-blue-100 text-blue-700 border-blue-300",
  "Completed":    "bg-blue-100 text-blue-700 border-blue-300",
  "Verified":     "bg-green-100 text-green-700 border-green-300",
  "Compliant":    "bg-green-100 text-green-700 border-green-300",
};

function isCompleted(s) {
  return ["Implemented", "Verified", "Compliant", "Completed"].includes(s);
}

// ── Inline evidence upload cell ───────────────────────────────────────────────
function EvidenceUploadCell({ itemId, source, role, component, currentFile, onUploaded }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const [localFile, setLocalFile] = useState(currentFile);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", role);
    fd.append("component", component);
    try {
      const res = await fetch(`${BASE}${ENDPOINTS[source].evidence}/${itemId}`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setLocalFile(file.name);
        onUploaded(itemId, file.name, data.status);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {localFile ? (
        <span
          className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 truncate max-w-[140px]"
          title={localFile}
        >
          <Paperclip size={10} strokeWidth={1.75} />
          {localFile}
        </span>
      ) : (
        <span className="text-xs text-gray-400 italic">No evidence</span>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {busy ? "…" : localFile ? "Replace" : "Upload"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
const METRIC_ICONS = {
  shield:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg>,
  globe:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  delta:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="5" y1="5" x2="5" y2="19"/><line x1="10" y1="9" x2="10" y2="19"/><line x1="15" y1="3" x2="15" y2="19"/><line x1="20" y1="7" x2="20" y2="19"/></svg>,
};

function MetricCard({ iconKey, label, value, color, suffix = "%" }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm min-w-[120px]">
      <span className={`mb-2 ${color}`}>{METRIC_ICONS[iconKey]}</span>
      <p className={`text-3xl font-bold ${color}`}>{value}{suffix}</p>
      <p className="text-xs text-gray-500 mt-1 text-center">{label}</p>
    </div>
  );
}

// ── Section progress bar ──────────────────────────────────────────────────────
function SectionBar({ section, pct }) {
  const barColor  = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
  const textColor = pct >= 80 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-600";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 shrink-0">{section}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SelectedValidationPanel({ role, component }) {
  // Unified state: id → { id, label, source, selected, status, evidenceFile }
  const [checklistState, setChecklistState] = useState({});
  const [loadingItems, setLoadingItems]     = useState(false);
  const [result, setResult]                 = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [locked, setLocked]                 = useState(false);
  const [error, setError]                   = useState("");

  // Load all items from all 3 backends and build unified state
  const loadAll = useCallback(async () => {
    if (!role || !component) return;
    setLoadingItems(true);
    const q = `role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}`;
    try {
      const [a5res, tarares, csmsres] = await Promise.all([
        fetch(`${BASE}/api/annex5-checklist/items?${q}`).then(r => r.json()),
        fetch(`${BASE}/api/tara-checklist/items?${q}`).then(r => r.json()),
        fetch(`${BASE}/api/csms-checklist/items?${q}`).then(r => r.json()),
      ]);

      const merged = {};

      (a5res.items || []).forEach(i => {
        merged[i.id] = {
          id: i.id,
          label: i.clauseRef || i.id,
          description: i.threat || i.requirement || "",
          source: "annex5",
          selected: i.selected || false,
          status: i.status || "Not Started",
          evidenceFile: i.evidenceFile || null,
        };
      });
      (tarares.items || []).forEach(i => {
        merged[i.id] = {
          id: i.id,
          label: i.reqId || i.id,
          description: i.requirement || "",
          source: "tara",
          selected: i.selected || false,
          status: i.status || "Not Started",
          evidenceFile: i.evidenceFile || null,
        };
      });
      (csmsres.items || []).forEach(i => {
        merged[i.id] = {
          id: i.id,
          label: i.clauseRef || i.id,
          description: i.requirement || "",
          source: "csms",
          selected: i.selected || false,
          status: i.status || "Not Started",
          evidenceFile: i.evidenceFile || null,
        };
      });

      setChecklistState(merged);
    } finally {
      setLoadingItems(false);
    }
  }, [role, component]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Sync a single item's selection to its backend
  const persistSelection = useCallback(async (id, selected) => {
    const item = checklistState[id];
    if (!item) return;
    await fetch(`${BASE}${ENDPOINTS[item.source].state}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, component, updates: [{ itemId: id, selected }] }),
    }).catch(() => {});
  }, [checklistState, role, component]);

  const handleToggle = (id) => {
    setChecklistState(prev => {
      const updated = { ...prev, [id]: { ...prev[id], selected: !prev[id].selected } };
      persistSelection(id, !prev[id].selected);
      return updated;
    });
  };

  const handleSelectAll = (select) => {
    const updates = {};
    const persists = [];
    Object.values(checklistState).forEach(item => {
      updates[item.id] = { ...item, selected: select };
      persists.push({ itemId: item.id, selected: select });
    });
    setChecklistState(updates);
    // Group by source and persist
    ["annex5", "tara", "csms"].forEach(src => {
      const srcUpdates = persists.filter(u => checklistState[u.itemId]?.source === src);
      if (!srcUpdates.length) return;
      fetch(`${BASE}${ENDPOINTS[src].state}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, component, updates: srcUpdates }),
      }).catch(() => {});
    });
  };

  // Called by EvidenceUploadCell after successful upload
  const handleEvidenceUploaded = (id, fileName, newStatus) => {
    setChecklistState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        evidenceFile: fileName,
        // Auto-promote status if backend returned a promoted status
        status: newStatus || (isCompleted(prev[id].status) ? prev[id].status : "Implemented"),
      },
    }));
  };

  const selectedItems = Object.values(checklistState).filter(i => i.selected);
  const selectedIds   = selectedItems.map(i => i.id);

  const handleSubmit = async () => {
    setError("");
    if (selectedIds.length === 0) {
      setError("No items selected. Check at least one item in the table below.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/analytics/validate-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedClauseIds: selectedIds, component, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Validation failed"); return; }

      // Sync promoted statuses back into local state
      if (data.itemDetails) {
        setChecklistState(prev => {
          const next = { ...prev };
          data.itemDetails.forEach(d => {
            if (next[d.id]) next[d.id] = { ...next[d.id], status: d.status, evidenceFile: d.evidenceFile || next[d.id].evidenceFile };
          });
          return next;
        });
      }

      setResult(data);
      setLocked(true);
    } catch {
      setError("Network error — could not reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  const diff        = result?.difference ?? 0;
  const diffColor   = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-600";
  const diffPrefix  = diff > 0 ? "+" : "";

  // ── Export helpers (post-validation) ────────────────────────────────────────
  const [exportingResult, setExportingResult] = useState(null);

  const buildExportItems = () =>
    Object.values(checklistState).filter(i => i.selected).map(i => ({
      clause:      i.label,
      source:      SOURCE_LABEL[i.source],
      description: i.description,
      status:      i.status,
      risk:        "Medium",
      evidence:    i.evidenceFile ? "Yes" : "No",
      evidenceFile: i.evidenceFile || "",
      completed:   isCompleted(i.status),
    }));

  const runExport = async (key, fn) => {
    setExportingResult(key);
    try { await fn(); } catch (e) { console.error(e); } finally { setExportingResult(null); }
  };

  const exportResultPDF = () => {
    const items = buildExportItems();
    const doc   = new jsPDF({ orientation: "landscape" });
    const ts    = new Date().toLocaleString();
    doc.setFillColor(30, 42, 56);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("IACCD — Selected Validation Audit Report", 14, 11);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Role: ${role}  |  Component: ${component}  |  Generated: ${ts}`, 14, 18);
    doc.text(`Selected Compliance: ${result.selectedCompliance}%  |  Overall: ${result.overallCompliance}%  |  Difference: ${diffPrefix}${diff}%`, 14, 24);
    autoTable(doc, {
      startY: 32,
      head: [["Clause Ref", "Source", "Description", "Status", "Evidence"]],
      body: items.map(i => [i.clause, i.source, i.description.slice(0, 60), i.status, i.evidence]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [30, 42, 56] },
    });
    doc.save(`UNR155_${component.replace(/\s/g, "_")}_SelectedValidation_v${Date.now()}.pdf`);
  };

  const exportResultExcel = () => {
    const items = buildExportItems();
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ["IACCD — Selected Validation Report"],
      [],
      ["Component",           component],
      ["Role",                role],
      ["Generated",           new Date().toLocaleString()],
      [],
      ["Selected Compliance", `${result.selectedCompliance}%`],
      ["Overall Compliance",  `${result.overallCompliance}%`],
      ["Difference",          `${diffPrefix}${diff}%`],
      ["Items Selected",      result.selectedTotal],
      ["Items Completed",     result.selectedCompleted],
      ["Auto-Promoted",       result.promotedCount],
    ]);
    wsSummary["!cols"] = [{ wch: 24 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    const wsItems = XLSX.utils.json_to_sheet(items.map(i => ({
      "Clause Ref":        i.clause,
      "Source":            i.source,
      "Description":       i.description,
      "Status":            i.status,
      "Risk Level":        i.risk,
      "Evidence Attached": i.evidence,
      "Evidence File":     i.evidenceFile,
    })));
    wsItems["!cols"] = [10, 10, 40, 16, 12, 16, 30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsItems, "Selected Items");
    XLSX.writeFile(wb, `UNR155_${component.replace(/\s/g, "_")}_SelectedValidation_v${Date.now()}.xlsx`);
  };

  const exportResultPPT = async () => {
    const items = buildExportItems();
    const pptx  = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    const DARK  = "1E2A38";
    const s1 = pptx.addSlide();
    s1.background = { color: DARK };
    s1.addText("IACCD — Selected Validation Report", { x: 0.4, y: 1.0, w: 12, h: 1.2, fontSize: 28, color: "FFFFFF", bold: true });
    s1.addText(`${component}  ·  ${role}  ·  ${new Date().toLocaleString()}`, { x: 0.4, y: 2.4, w: 12, h: 0.4, fontSize: 12, color: "94A3B8" });
    const s2 = pptx.addSlide();
    s2.addText("Validation Results", { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 20, bold: true, color: DARK });
    [
      { label: "Selected Compliance", value: `${result.selectedCompliance}%`, color: result.selectedCompliance >= 80 ? "15803D" : "991B1B" },
      { label: "Overall Compliance",  value: `${result.overallCompliance}%`,  color: "1E40AF" },
      { label: "Difference",          value: `${diffPrefix}${diff}%`,         color: diff >= 0 ? "15803D" : "991B1B" },
      { label: "Items Selected",      value: String(result.selectedTotal),    color: "374151" },
      { label: "Auto-Promoted",       value: String(result.promotedCount),    color: "7C3AED" },
    ].forEach((k, i) => {
      const x = 0.3 + i * 2.6;
      s2.addShape(pptx.ShapeType.rect, { x, y: 0.9, w: 2.4, h: 1.4, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 } });
      s2.addText(k.value, { x, y: 1.0, w: 2.4, h: 0.7, fontSize: 26, bold: true, color: k.color, align: "center" });
      s2.addText(k.label, { x, y: 1.8, w: 2.4, h: 0.4, fontSize: 10, color: "64748B", align: "center" });
    });
    await pptx.writeFile({ fileName: `UNR155_${component.replace(/\s/g, "_")}_SelectedValidation_v${Date.now()}.pptx` });
  };

  const shareResultOutlook = () => {
    const subject = encodeURIComponent(`Validation Report — ${component} [${role}]`);
    const body = encodeURIComponent(
      `Hi,\n\nValidation results for ${component} (${role}):\n\n` +
      `Selected Compliance : ${result.selectedCompliance}%\n` +
      `Overall Compliance  : ${result.overallCompliance}%\n` +
      `Difference          : ${diffPrefix}${diff}%\n` +
      `Items Selected      : ${result.selectedTotal}\n` +
      `Items Completed     : ${result.selectedCompleted}\n` +
      `Auto-Promoted       : ${result.promotedCount}\n` +
      `Generated           : ${new Date().toLocaleString()}\n\n` +
      `Standards: UN R155 · ISO/SAE 21434 · CSMS\n\nRegards,\nIACCD Platform`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareResultTeams = () => {
    const msg = encodeURIComponent(
      `📊 **Validation Report** — ${component} (${role})\n` +
      `✅ Selected: ${result.selectedCompliance}% | 🌐 Overall: ${result.overallCompliance}% | Δ ${diffPrefix}${diff}%\n` +
      `Items: ${result.selectedTotal} selected, ${result.selectedCompleted} completed\n` +
      `Generated: ${new Date().toLocaleString()}`
    );
    window.open(`https://teams.microsoft.com/l/chat/0/0?message=${msg}`, "_blank");
  };

  // Group items by source for the table
  const grouped = ["annex5", "tara", "csms"].map(src => ({
    src,
    items: Object.values(checklistState).filter(i => i.source === src),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Header + submit */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Selected Checklist Validation</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {selectedIds.length > 0
              ? `${selectedIds.length} item${selectedIds.length !== 1 ? "s" : ""} selected · select items below and upload evidence before submitting`
              : "Select checklist items below, upload evidence, then submit for validation"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!locked && (
            <>
              <button
                onClick={() => handleSelectAll(true)}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || locked || selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Validating…" : locked ? "Submitted & Locked" : "Submit Selected for Validation"}
          </button>
        </div>
      </div>

      {/* Guard: no selection */}
      {selectedIds.length === 0 && !loadingItems && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Please select at least one checklist item before uploading evidence or submitting for validation.
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {locked && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Validation submitted and locked. Reload the page to start a new validation session.
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <MetricCard
              iconKey="shield" label="Selected Compliance" value={result.selectedCompliance}
              color={result.selectedCompliance >= 80 ? "text-green-600" : result.selectedCompliance >= 50 ? "text-yellow-600" : "text-red-600"}
            />
            <MetricCard
              iconKey="globe" label="Overall Compliance" value={result.overallCompliance}
              color={result.overallCompliance >= 80 ? "text-green-600" : result.overallCompliance >= 50 ? "text-yellow-600" : "text-red-600"}
            />
            <MetricCard
              iconKey="delta" label="Difference" value={`${diffPrefix}${diff}`}
              color={diffColor} suffix="%"
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            {result.selectedCompleted} of {result.selectedTotal} selected items completed
            {result.promotedCount > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                · {result.promotedCount} auto-promoted via evidence
              </span>
            )}
          </p>

          {Object.keys(result.sectionBreakdown).length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Section Breakdown (Selected Scope)</p>
              {Object.entries(result.sectionBreakdown).map(([sec, pct]) => (
                <SectionBar key={sec} section={sec} pct={pct} />
              ))}
            </div>
          )}

          {/* Export / Share toolbar */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Export</span>
              {[
                { key: "pdf",   Icon: FileText,     label: "PDF",        color: "bg-red-600 hover:bg-red-700",       fn: exportResultPDF },
                { key: "excel", Icon: Table2,       label: "Excel",      color: "bg-green-600 hover:bg-green-700",   fn: exportResultExcel },
                { key: "ppt",   Icon: Presentation, label: "PowerPoint", color: "bg-orange-500 hover:bg-orange-600", fn: exportResultPPT },
              ].map(({ key, Icon, label, color, fn }) => (
                <button
                  key={key}
                  onClick={() => runExport(key, fn)}
                  disabled={!!exportingResult}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-sm transition-all ${color} disabled:opacity-50 disabled:cursor-wait hover:shadow-md`}
                >
                  <Icon size={12} strokeWidth={1.75} />
                  <span>{exportingResult === key ? `${label}…` : label}</span>
                </button>
              ))}
              <div className="w-px h-5 bg-gray-300 mx-0.5" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Share</span>
              {[
                { key: "outlook", Icon: Mail,          label: "Outlook", color: "bg-blue-600 hover:bg-blue-700",    fn: shareResultOutlook },
                { key: "teams",   Icon: MessageSquare, label: "Teams",   color: "bg-purple-600 hover:bg-purple-700", fn: shareResultTeams },
              ].map(({ key, Icon, label, color, fn }) => (
                <button
                  key={key}
                  onClick={() => runExport(key, fn)}
                  disabled={!!exportingResult}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-sm transition-all ${color} disabled:opacity-50 disabled:cursor-wait hover:shadow-md`}
                >
                  <Icon size={12} strokeWidth={1.75} />
                  <span>{exportingResult === key ? `${label}…` : label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unified checklist table with inline evidence upload */}
      {loadingItems ? (
        <p className="text-xs text-gray-400 animate-pulse py-4 text-center">Loading checklist items…</p>
      ) : (
        grouped.map(({ src, items }) => {
          const selCount = items.filter(i => i.selected).length;
          const allSel   = items.length > 0 && items.every(i => i.selected);
          return (
            <div key={src} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{SOURCE_LABEL[src]}</span>
                  <span className="text-xs text-gray-400">{items.length} items</span>
                  {selCount > 0 && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {selCount} selected
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSel}
                    onChange={e => {
                      const ids = items.map(i => i.id);
                      const updates = {};
                      ids.forEach(id => { updates[id] = { ...checklistState[id], selected: e.target.checked }; });
                      setChecklistState(prev => ({ ...prev, ...updates }));
                      fetch(`${BASE}${ENDPOINTS[src].state}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role, component, updates: ids.map(itemId => ({ itemId, selected: e.target.checked })) }),
                      }).catch(() => {});
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  Select all
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-gray-500 uppercase">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">✓</th>
                      <th className="py-2 px-3 text-left w-28">Clause / ID</th>
                      <th className="py-2 px-3 text-left">Description</th>
                      <th className="py-2 px-3 text-left w-52">
                        Evidence
                        {selCount === 0 && (
                          <span className="ml-1 text-amber-500 normal-case font-normal">(select item first)</span>
                        )}
                      </th>
                      <th className="py-2 px-3 text-center w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr
                        key={item.id}
                        className={`border-t border-gray-100 transition-colors ${item.selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggle(item.id)}
                            disabled={locked}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer disabled:opacity-50"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {item.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 max-w-[240px]">{item.description}</td>
                        <td className="py-2.5 px-3">
                          {item.selected ? (
                            <EvidenceUploadCell
                              itemId={item.id}
                              source={item.source}
                              role={role}
                              component={component}
                              currentFile={item.evidenceFile}
                              onUploaded={handleEvidenceUploaded}
                            />
                          ) : (
                            <span className="text-gray-300 italic">— select to enable upload</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded border font-semibold ${STATUS_STYLE[item.status] || STATUS_STYLE["Not Started"]}`}>
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
        })
      )}
    </div>
  );
}
