import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TARAPanel from "./TARAPanel";
import MitigationComplianceTable from "./MitigationComplianceTable";
import R156OTAPanel from "./R156OTAPanel";

const COMPLIANCE_METRICS = [
  { label: "UN R155 Status",         value: "Compliant",   score: 87, color: "text-green-600",  bg: "bg-green-50 border-green-200",   accent: "#16a34a" },
  { label: "ISO 21434 Coverage",      value: "In Progress", score: 71, color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",   accent: "#d97706" },
  { label: "Audit Readiness Score",   value: "Ready",       score: 92, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",     accent: "#2563eb" },
  { label: "Certification Readiness", value: "On Track",    score: 78, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", accent: "#7c3aed" },
];

const CERT_DATA = [
  { cert: "UN R155 CSMS Certificate",    issuer: "TÜV SÜD",       issued: "2024-01-15", expiry: "2027-01-14", status: "Valid" },
  { cert: "UN R156 SUMS Certificate",    issuer: "ICAT",           issued: "2024-03-01", expiry: "2027-02-28", status: "Valid" },
  { cert: "ISO/SAE 21434 Assessment",    issuer: "ARAI",           issued: "2023-11-01", expiry: "2026-10-31", status: "Valid" },
  { cert: "ISO 26262 Functional Safety", issuer: "TÜV Rheinland",  issued: "2023-06-01", expiry: "2026-05-31", status: "Valid" },
];

function downloadCSV(filename, headers, rows) {
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function AuthorityView() {
  const [taraData, setTaraData]         = useState(null);
  const [mitigations, setMitigations]   = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/compliance/tara-summary")
      .then(r => r.json()).then(setTaraData).catch(() => {});
    fetch("http://localhost:5000/api/compliance/mitigations")
      .then(r => r.json()).then(setMitigations).catch(() => {});
  }, []);

  // ── PDF Export ────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const ts  = new Date().toLocaleString();

    doc.setFontSize(16);
    doc.text("Automotive Cyber-Safety Compliance Report", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated: ${ts}  |  UN R155 • UN R156 • ISO/SAE 21434 • ISO 26262`, 14, 23);

    // Section 1 — Certificates
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("1. Type Approval Certificate Registry", 14, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Certificate", "Issuing Authority", "Issue Date", "Expiry", "Days Remaining", "Status"]],
      body: CERT_DATA.map(c => {
        const days = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
        return [c.cert, c.issuer, c.issued, c.expiry, `${days}d`, c.status];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    // Section 2 — TARA
    if (taraData?.threatRisks?.length) {
      doc.text("2. TARA Risk Assessment", 14, doc.lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [["Threat Code", "Title", "Category", "Impact", "Feasibility", "Risk Score", "ASIL", "Treatment"]],
        body: taraData.threatRisks.map(t => {
          const score = t.risk_score;
          const treatment = score >= 16 ? "Avoid" : score >= 9 ? "Reduce" : score >= 4 ? "Share" : "Accept";
          return [t.threat_code, t.title, t.category, t.impact_score, t.feasibility_score, score, t.asil_level, treatment];
        }),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 58, 138] },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            const v = Number(data.cell.raw);
            data.cell.styles.fillColor = v >= 16 ? [220,38,38] : v >= 9 ? [234,88,12] : v >= 4 ? [202,138,4] : [22,163,74];
            data.cell.styles.textColor = [255,255,255];
          }
        },
      });
    }

    // Section 3 — Mitigations
    if (mitigations.length) {
      doc.text("3. Mitigation Compliance", 14, doc.lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [["Code", "Mitigation", "Group", "Threats Covered", "Status", "Evidence Ref"]],
        body: mitigations.map(m => [m.code, m.title, m.grp === "B" ? "B (Vehicle)" : "C (Backend)", m.threat_count, m.status, m.evidence_ref || "—"]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 58, 138] },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const v = data.cell.raw;
            data.cell.styles.fillColor = v === "Implemented" ? [220,252,231] : v === "Partial" ? [254,249,195] : [254,226,226];
            data.cell.styles.textColor = v === "Implemented" ? [21,128,61] : v === "Partial" ? [133,77,14] : [185,28,28];
          }
        },
      });
    }

    doc.save(`cyber-safety-compliance-report-${Date.now()}.pdf`);
  };

  // ── CSV Export ────────────────────────────────────────────────
  const exportCSV = () => {
    // Certificates
    downloadCSV("certificates.csv",
      ["Certificate", "Issuing Authority", "Issue Date", "Expiry", "Days Remaining", "Status"],
      CERT_DATA.map(c => {
        const days = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
        return [c.cert, c.issuer, c.issued, c.expiry, `${days}d`, c.status];
      })
    );

    // TARA
    if (taraData?.threatRisks?.length) {
      setTimeout(() => {
        downloadCSV("tara-assessment.csv",
          ["Threat Code", "Title", "Category", "Impact", "Feasibility", "Risk Score", "ASIL", "Treatment"],
          taraData.threatRisks.map(t => {
            const score = t.risk_score;
            const treatment = score >= 16 ? "Avoid" : score >= 9 ? "Reduce" : score >= 4 ? "Share" : "Accept";
            return [t.threat_code, t.title, t.category, t.impact_score, t.feasibility_score, score, t.asil_level, treatment];
          })
        );
      }, 300);
    }

    // Mitigations
    if (mitigations.length) {
      setTimeout(() => {
        downloadCSV("mitigations.csv",
          ["Code", "Mitigation", "Group", "Threats Covered", "Status", "Evidence Ref"],
          mitigations.map(m => [m.code, m.title, m.grp === "B" ? "B (Vehicle)" : "C (Backend)", m.threat_count, m.status, m.evidence_ref || ""])
        );
      }, 600);
    }
  };

  return (
    <div>
      {/* Authority Compliance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {COMPLIANCE_METRICS.map((m, i) => (
          <div key={i} className={`sub-card rounded-xl border p-4 ${m.bg}`} style={{ "--sc-accent": m.accent, borderTop: `3px solid ${m.accent}` }}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{m.label}</p>
            <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${m.score}%`, backgroundColor: "currentColor" }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{m.score}% coverage</p>
          </div>
        ))}
      </div>

      {/* Export Toolbar */}
      <div className="flex justify-end gap-3 mt-6 mb-2">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow transition"
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow transition"
        >
          ⬇ Export PDF
        </button>
      </div>

      {/* Certificate Validity Tracker */}
      <div className="sub-card rounded-xl shadow-card border border-white/10 overflow-hidden mt-2" style={{ "--sc-accent":"#0d9488", borderTop:"3px solid #0d9488" }}>
        <div className="card-header-muted">
          <p className="card-header-title">Type Approval Certificate Registry</p>
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        </div>
        <div className="card-body p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
              <th className="text-left py-2 px-3">Certificate</th>
              <th className="text-left py-2 px-3">Issuing Authority</th>
              <th className="text-center py-2 px-3">Issue Date</th>
              <th className="text-center py-2 px-3">Expiry</th>
              <th className="text-center py-2 px-3">Days Remaining</th>
              <th className="text-center py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {CERT_DATA.map((c, i) => {
              const days = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
              return (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-800">{c.cert}</td>
                  <td className="py-2 px-3 text-gray-600">{c.issuer}</td>
                  <td className="py-2 px-3 text-center text-gray-500">{c.issued}</td>
                  <td className="py-2 px-3 text-center text-gray-500">{c.expiry}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-semibold ${days < 180 ? "text-orange-500" : "text-green-600"}`}>{days}d</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">{c.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <TARAPanel />
      <MitigationComplianceTable />
      <R156OTAPanel />
    </div>
  );
}

export default AuthorityView;
