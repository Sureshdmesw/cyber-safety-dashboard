import { useState, useEffect, useCallback } from "react";
import { Crosshair, Globe, FileText, Table2, Presentation, Mail, MessageSquare } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";

const BASE = "http://localhost:5000";

// ── Risk helpers (threat-based, kept for legacy threat export) ────────────────
const COST  = { Critical: 850000, High: 320000, Medium: 95000, Low: 18000 };
const LEVEL = (s) => s >= 16 ? "Critical" : s >= 9 ? "High" : s >= 4 ? "Medium" : "Low";
const RESID = (s) => s >= 16 ? Math.round(s * 0.3) : s >= 9 ? Math.round(s * 0.6) : s >= 4 ? Math.round(s * 0.8) : s;
const TREAT = (s) => s >= 16 ? "Avoid" : s >= 9 ? "Reduce" : s >= 4 ? "Share" : "Accept";
const RISK_HEX = { Critical: "DC2626", High: "F97316", Medium: "EAB308", Low: "22C55E" };

const STATUS_COLOR = {
  "Not Started": [229, 231, 235],
  "In Progress":  [254, 249, 195],
  "Implemented":  [219, 234, 254],
  "Completed":    [219, 234, 254],
  "Verified":     [220, 252, 231],
  "Compliant":    [220, 252, 231],
};

// ── Fetch unified validation results from backend ─────────────────────────────
async function fetchValidationResults(role, component, scope = "all") {
  const q = `role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}&scope=${scope}`;
  const res = await fetch(`${BASE}/api/analytics/validation-results?${q}`);
  if (!res.ok) throw new Error("Failed to fetch validation results");
  return res.json();
}

// ── PDF Export (Audit Report) ─────────────────────────────────────────────────
async function exportPDF(role, component, scope) {
  const data = await fetchValidationResults(role, component, scope);
  const doc  = new jsPDF({ orientation: "landscape" });
  const ts   = new Date().toLocaleString();
  const { items = [], compliance = 0, riskDistribution = {}, sectionBreakdown = {} } = data;

  // Header band
  doc.setFillColor(30, 42, 56);
  doc.rect(0, 0, 297, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("IACCD — Automotive Cyber-Safety Compliance Audit Report", 14, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Role: ${role}  |  Component: ${component}  |  Scope: ${scope === "selected" ? "Selected Items" : "Full Checklist"}`, 14, 19);
  doc.text(`Generated: ${ts}  |  UN R155 · ISO/SAE 21434 · CSMS · ISO 26262`, 14, 25);

  // Compliance badge
  const badgeColor = compliance >= 80 ? [21, 128, 61] : compliance >= 50 ? [146, 64, 14] : [153, 27, 27];
  doc.setFillColor(...badgeColor);
  doc.roundedRect(240, 5, 48, 20, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${compliance}%`, 264, 17, { align: "center" });
  doc.setFontSize(7);
  doc.text("COMPLIANCE", 264, 22, { align: "center" });

  // Summary table
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, 38);
  autoTable(doc, {
    startY: 41,
    head: [["Total Items", "Completed", "Compliance %", "Critical", "High", "Medium", "Low"]],
    body: [[
      items.length,
      items.filter(i => i.completed).length,
      `${compliance}%`,
      riskDistribution.Critical || 0,
      riskDistribution.High || 0,
      riskDistribution.Medium || 0,
      riskDistribution.Low || 0,
    ]],
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [30, 42, 56] },
    columnStyles: {
      2: { fillColor: compliance >= 80 ? [220, 252, 231] : compliance >= 50 ? [254, 249, 195] : [254, 226, 226], fontStyle: "bold" },
      3: { fillColor: [254, 226, 226] },
      4: { fillColor: [255, 237, 213] },
    },
  });

  // Section breakdown
  if (Object.keys(sectionBreakdown).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Section Breakdown", 14, doc.lastAutoTable.finalY + 8);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 11,
      head: [["Section / Standard", "Compliance %"]],
      body: Object.entries(sectionBreakdown).map(([sec, pct]) => [sec, `${pct}%`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 42, 56] },
      columnStyles: { 1: { halign: "center" } },
    });
  }

  // Checklist items table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Checklist Items", 14, doc.lastAutoTable.finalY + 8);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 11,
    head: [["Clause Ref", "Source", "Status", "Risk Level", "Evidence"]],
    body: items.map(i => [i.clause, i.source, i.status, i.risk, i.evidence ? "✓" : "—"]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 42, 56] },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 2) {
        d.cell.styles.fillColor = STATUS_COLOR[d.cell.raw] || [255, 255, 255];
      }
      if (d.section === "body" && d.column.index === 3) {
        const c = { Critical: [254, 226, 226], High: [255, 237, 213], Medium: [254, 249, 195], Low: [220, 252, 231] };
        d.cell.styles.fillColor = c[d.cell.raw] || [255, 255, 255];
      }
    },
  });

  // Digital signature block
  const sigY = Math.min(doc.lastAutoTable.finalY + 12, 175);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Prepared by: ___________________________", 14, sigY);
  doc.text("Approved by: ___________________________", 100, sigY);
  doc.text(`Report Version: v1.0  |  ${ts}`, 200, sigY);
  doc.text("IACCD Platform — Automotive Cyber-Safety Compliance Dashboard", 14, sigY + 5);

  const filename = `UNR155_${component.replace(/\s/g, "_")}_AuditReport_v${Date.now()}.pdf`;
  doc.save(filename);
}

// ── Excel Export ──────────────────────────────────────────────────────────────
function exportExcel(role, component, scope) {
  // Trigger backend download directly
  const q = `role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}&scope=${scope}`;
  const a = document.createElement("a");
  a.href = `${BASE}/api/export/excel?${q}`;
  a.download = "";
  a.click();
}

// ── PowerPoint Export ─────────────────────────────────────────────────────────
async function exportPPT(role, component, scope) {
  const data = await fetchValidationResults(role, component, scope);
  const { items = [], compliance = 0, riskDistribution = {}, sectionBreakdown = {} } = data;

  const pptx = new PptxGenJS();
  pptx.layout  = "LAYOUT_WIDE";
  pptx.author  = "IACCD Platform";
  pptx.subject = "Cyber-Safety Compliance Report";
  const DARK = "1E2A38";

  // ── Slide 1: Title ──────────────────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: DARK };
  s1.addText("IACCD", { x: 0.4, y: 0.3, w: 12, h: 0.4, fontSize: 11, color: "60A5FA", bold: true });
  s1.addText("Automotive Cyber-Safety\nCompliance Report", {
    x: 0.4, y: 0.8, w: 12, h: 1.6, fontSize: 32, color: "FFFFFF", bold: true,
  });
  s1.addText(`Role: ${role}  ·  Component: ${component}`, {
    x: 0.4, y: 2.6, w: 12, h: 0.4, fontSize: 14, color: "94A3B8",
  });
  s1.addText(`Scope: ${scope === "selected" ? "Selected Items" : "Full Checklist"}  ·  Generated: ${new Date().toLocaleString()}`, {
    x: 0.4, y: 3.1, w: 12, h: 0.3, fontSize: 10, color: "64748B",
  });
  s1.addText("UN R155  ·  ISO/SAE 21434  ·  CSMS  ·  ISO 26262", {
    x: 0.4, y: 6.8, w: 12, h: 0.3, fontSize: 9, color: "475569",
  });

  // ── Slide 2: Compliance Overview ────────────────────────────────────────────
  const s2 = pptx.addSlide();
  s2.addText("Compliance Overview", { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 20, bold: true, color: DARK });

  const kpis = [
    { label: "Total Items",  value: String(items.length),  color: "1E40AF" },
    { label: "Compliance %", value: `${compliance}%`,      color: compliance >= 80 ? "15803D" : compliance >= 50 ? "92400E" : "991B1B" },
    { label: "Critical",     value: String(riskDistribution.Critical || 0), color: "DC2626" },
    { label: "High",         value: String(riskDistribution.High || 0),     color: "F97316" },
    { label: "With Evidence",value: String(items.filter(i => i.evidence).length), color: "7C3AED" },
  ];
  kpis.forEach((k, i) => {
    const x = 0.3 + i * 2.6;
    s2.addShape(pptx.ShapeType.rect, { x, y: 0.9, w: 2.4, h: 1.4, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 } });
    s2.addText(k.value, { x, y: 1.0, w: 2.4, h: 0.7, fontSize: 28, bold: true, color: k.color, align: "center" });
    s2.addText(k.label, { x, y: 1.8, w: 2.4, h: 0.4, fontSize: 10, color: "64748B", align: "center" });
  });

  // Risk breakdown bars
  s2.addText("Risk Distribution", { x: 0.4, y: 2.6, w: 12, h: 0.4, fontSize: 13, bold: true, color: DARK });
  const levels = ["Critical", "High", "Medium", "Low"];
  const maxCount = Math.max(...levels.map(l => riskDistribution[l] || 0), 1);
  levels.forEach((lvl, i) => {
    const count = riskDistribution[lvl] || 0;
    const barH = Math.max((count / maxCount) * 1.8, 0.05);
    const x = 1.2 + i * 3.0;
    const y = 4.6 - barH;
    s2.addText("", { x, y, w: 2.0, h: barH, fill: { color: RISK_HEX[lvl] }, line: { color: RISK_HEX[lvl], width: 0 } });
    s2.addText(String(count), { x, y: y - 0.3, w: 2.0, h: 0.3, fontSize: 14, bold: true, color: RISK_HEX[lvl], align: "center" });
    s2.addText(lvl, { x, y: 4.65, w: 2.0, h: 0.3, fontSize: 10, color: "374151", align: "center" });
  });

  // ── Slide 3: Section Breakdown ──────────────────────────────────────────────
  const s3 = pptx.addSlide();
  s3.addText("Section Compliance Breakdown", { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 20, bold: true, color: DARK });
  const sections = Object.entries(sectionBreakdown);
  sections.forEach(([sec, pct], i) => {
    const y = 0.9 + i * 1.1;
    const barW = Math.max((pct / 100) * 10, 0.1);
    const barColor = pct >= 80 ? "22C55E" : pct >= 50 ? "EAB308" : "EF4444";
    s3.addText(sec, { x: 0.4, y, w: 2.5, h: 0.5, fontSize: 11, bold: true, color: DARK });
    s3.addText("", { x: 3.0, y: y + 0.05, w: barW, h: 0.4, fill: { color: barColor }, line: { color: barColor, width: 0 } });
    s3.addText(`${pct}%`, { x: 13.2, y, w: 0.8, h: 0.5, fontSize: 11, bold: true, color: barColor, align: "right" });
  });

  // ── Slide 4: Checklist Items ────────────────────────────────────────────────
  const s4 = pptx.addSlide();
  s4.addText("Checklist Items", { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 20, bold: true, color: DARK });
  const tableRows = [
    [
      { text: "Clause Ref", options: { bold: true, color: "FFFFFF", fill: DARK } },
      { text: "Source",     options: { bold: true, color: "FFFFFF", fill: DARK } },
      { text: "Status",     options: { bold: true, color: "FFFFFF", fill: DARK } },
      { text: "Risk",       options: { bold: true, color: "FFFFFF", fill: DARK } },
      { text: "Evidence",   options: { bold: true, color: "FFFFFF", fill: DARK } },
    ],
    ...items.slice(0, 18).map(i => [
      { text: i.clause },
      { text: i.source },
      { text: i.status },
      { text: i.risk, options: { bold: true, color: RISK_HEX[i.risk] || "374151" } },
      { text: i.evidence ? "✓" : "—", options: { color: i.evidence ? "15803D" : "9CA3AF" } },
    ]),
  ];
  s4.addTable(tableRows, {
    x: 0.3, y: 0.85, w: 12.7, h: 6.0,
    fontSize: 8,
    border: { type: "solid", color: "E2E8F0", pt: 0.5 },
    rowH: items.length > 12 ? 0.3 : 0.4,
  });
  if (items.length > 18) {
    s4.addText(`+ ${items.length - 18} more items — see Excel export for full list`, {
      x: 0.4, y: 7.0, w: 12, h: 0.25, fontSize: 8, color: "94A3B8", italic: true,
    });
  }

  // ── Slide 5: Recommendations ────────────────────────────────────────────────
  const s5 = pptx.addSlide();
  s5.background = { color: "F8FAFC" };
  s5.addText("Recommendations & Next Steps", { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 20, bold: true, color: DARK });

  const notStarted = items.filter(i => i.status === "Not Started").slice(0, 4);
  if (notStarted.length === 0) {
    s5.addText("✅ All items have been actioned — compliance posture is acceptable.", {
      x: 0.4, y: 2.0, w: 12, h: 0.5, fontSize: 14, color: "15803D", bold: true,
    });
  } else {
    notStarted.forEach((item, i) => {
      const y = 0.9 + i * 1.5;
      s5.addText("", { x: 0.4, y, w: 12.5, h: 1.3, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
      s5.addText(`⚠ ${item.clause} — ${item.source}`, { x: 0.6, y: y + 0.05, w: 12, h: 0.35, fontSize: 11, bold: true, color: "991B1B" });
      s5.addText(`Status: ${item.status}  |  Risk: ${item.risk}  |  Evidence: ${item.evidence ? "Attached" : "Missing"}`, {
        x: 0.6, y: y + 0.42, w: 12, h: 0.3, fontSize: 9, color: "374151",
      });
      s5.addText(`Action: Upload evidence and update status. Escalate to ${role} engineering team.`, {
        x: 0.6, y: y + 0.75, w: 12, h: 0.3, fontSize: 9, color: "6B7280", italic: true,
      });
    });
  }

  await pptx.writeFile({
    fileName: `UNR155_${component.replace(/\s/g, "_")}_Management_v${Date.now()}.pptx`,
  });
}

// ── Outlook Share ─────────────────────────────────────────────────────────────
async function shareOutlook(role, component, scope) {
  const data = await fetchValidationResults(role, component, scope);
  const { compliance = 0, items = [], riskDistribution = {} } = data;
  const subject = encodeURIComponent(`Cybersecurity Validation Report — ${component} [${role}]`);
  const body = encodeURIComponent(
    `Hi,\n\nPlease find below the IACCD Cyber-Safety Compliance summary for ${component} (${role} view).\n\n` +
    `Scope         : ${scope === "selected" ? "Selected Items" : "Full Checklist"}\n` +
    `Total Items   : ${items.length}\n` +
    `Compliance    : ${compliance}%\n` +
    `Critical Risk : ${riskDistribution.Critical || 0}\n` +
    `High Risk     : ${riskDistribution.High || 0}\n` +
    `With Evidence : ${items.filter(i => i.evidence).length}\n` +
    `Generated     : ${new Date().toLocaleString()}\n\n` +
    `Standards: UN R155 · UN R156 · ISO/SAE 21434 · ISO 26262\n\n` +
    `Please download the attached PDF/Excel for full details.\n\nRegards,\nIACCD Platform`
  );
  window.open(`mailto:?subject=${subject}&body=${body}`);
}

// ── Teams Share ───────────────────────────────────────────────────────────────
async function shareTeams(role, component, scope) {
  const data = await fetchValidationResults(role, component, scope);
  const { compliance = 0, items = [], riskDistribution = {} } = data;
  const msg = encodeURIComponent(
    `📊 **IACCD Compliance Report** — ${component} (${role})\n` +
    `✅ Compliance: ${compliance}% | 🔴 Critical: ${riskDistribution.Critical || 0} | Items: ${items.length}\n` +
    `Scope: ${scope === "selected" ? "Selected Items" : "Full Checklist"}\n` +
    `Standards: UN R155 · ISO/SAE 21434 · CSMS · ISO 26262\n` +
    `Generated: ${new Date().toLocaleString()}`
  );
  window.open(`https://teams.microsoft.com/l/chat/0/0?message=${msg}`, "_blank");
}

// ── ExportToolbar Component ───────────────────────────────────────────────────
export default function ExportToolbar({ threats, checked, role, component }) {
  const [hasData,     setHasData]     = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const [exporting,   setExporting]   = useState(null); // key of active export
  const [tooltip,     setTooltip]     = useState("");

  // Check if checklist has any data or selected items
  const checkData = useCallback(async () => {
    if (!role || !component) return;
    try {
      const q = `role=${encodeURIComponent(role)}&component=${encodeURIComponent(component)}&scope=all`;
      const res = await fetch(`${BASE}/api/analytics/validation-results?${q}`);
      if (!res.ok) return;
      const data = await res.json();
      setHasData((data.items || []).length > 0);
      setHasSelected((data.items || []).some(i => i.selected));
    } catch {
      // fallback: enable if threats are checked
      setHasData((threats || []).filter(t => checked?.[t.threat_code]).length > 0);
    }
  }, [role, component, threats, checked]);

  useEffect(() => { checkData(); }, [checkData]);

  const scope    = hasSelected ? "selected" : "all";
  const scopeLabel = hasSelected ? "Export selected items" : "Export full checklist";
  const disabled = !hasData;

  const run = async (key, fn) => {
    if (disabled) return;
    setExporting(key);
    try {
      await fn();
    } catch (e) {
      console.error(`Export ${key} failed:`, e);
    } finally {
      setExporting(null);
    }
  };

  const btnBase = "";
  const disabledCls = "";
  const loadingCls  = "";

  const Btn = ({ id, colorCls, Icon, label, onClick }) => {
    const isLoading = exporting === id;
    return (
      <button
        disabled={disabled || !!exporting}
        onClick={() => run(id, onClick)}
        onMouseEnter={() => setTooltip(disabled ? "No checklist data available" : scopeLabel)}
        onMouseLeave={() => setTooltip("")}
        className={`ds-btn ds-btn-sm ${colorCls} ${disabled ? "opacity-40 cursor-not-allowed" : isLoading ? "opacity-70 cursor-wait" : ""}`}
      >
        <Icon size={12} strokeWidth={1.75} />
        <span>{isLoading ? `${label}\u2026` : label}</span>
      </button>
    );
  };

  return (
    <div className="ds-action-panel mt-4">
      <div className="flex flex-wrap items-center gap-3">

        {/* Scope indicator */}
        {hasData && (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
            hasSelected
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {hasSelected
              ? <><Crosshair size={11} strokeWidth={1.75} /> Selected scope</>
              : <><Globe size={11} strokeWidth={1.75} /> Full checklist</>}
          </span>
        )}

        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Export</span>

        <Btn id="pdf"     colorCls="ds-btn-red"    Icon={FileText}     label="PDF"        onClick={() => exportPDF(role, component, scope)} />
        <Btn id="excel"   colorCls="ds-btn-green"  Icon={Table2}       label="Excel"      onClick={() => exportExcel(role, component, scope)} />
        <Btn id="ppt"     colorCls="ds-btn-amber"  Icon={Presentation} label="PowerPoint" onClick={() => exportPPT(role, component, scope)} />

        <div className="w-px h-6 bg-gray-200 mx-1" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Share</span>

        <Btn id="outlook" colorCls="ds-btn-primary" Icon={Mail}          label="Outlook" onClick={() => shareOutlook(role, component, scope)} />
        <Btn id="teams"   colorCls="ds-btn-purple"  Icon={MessageSquare} label="Teams"   onClick={() => shareTeams(role, component, scope)} />

        {/* Status / tooltip */}
        <span className="text-xs text-gray-400 italic ml-1">
          {exporting
            ? `Generating ${exporting}…`
            : tooltip
            ? tooltip
            : disabled
            ? "No checklist data — open Compliance Checklist tab first"
            : hasSelected
            ? `${scopeLabel} (selected items only)`
            : scopeLabel}
        </span>
      </div>
    </div>
  );
}
