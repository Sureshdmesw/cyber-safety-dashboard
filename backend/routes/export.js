const express = require("express");
const router  = express.Router();
const XLSX    = require("xlsx");
const pool    = require("../db");

const isCompleted = (s) =>
  ["Implemented", "Verified", "Compliant", "Completed"].includes(s);

// Fetch unified checklist data (same logic as validation-results)
async function fetchItems(role, component, scope) {
  const [a5, tara, csms] = await Promise.all([
    pool.query(
      `SELECT item_id AS id, status, evidence_file, selected FROM annex5_checklist_state WHERE role=$1 AND component=$2`,
      [role, component]
    ),
    pool.query(
      `SELECT item_id AS id, status, evidence_file, selected, risk_level FROM tara_checklist_state WHERE role=$1 AND component=$2`,
      [role, component]
    ),
    pool.query(
      `SELECT item_id AS id, status, evidence_file, selected FROM csms_checklist_state WHERE role=$1 AND component=$2`,
      [role, component]
    ),
  ]);

  const build = (r, source) => ({
    clause:       r.id,
    source,
    status:       r.status || "Not Started",
    risk:         r.risk_level || (r.id.startsWith("A1-") ? "High" : "Medium"),
    evidence:     r.evidence_file ? "Yes" : "No",
    evidenceFile: r.evidence_file || "",
    selected:     r.selected || false,
    completed:    isCompleted(r.status || "Not Started"),
  });

  const all = [
    ...a5.rows.map(r => build(r, "Annex5")),
    ...tara.rows.map(r => build(r, "TARA")),
    ...csms.rows.map(r => build(r, "CSMS")),
  ];

  const selected = all.filter(i => i.selected);
  return scope === "selected" && selected.length > 0 ? selected : all;
}

// ── GET /api/export/excel ─────────────────────────────────────────────────────
router.get("/excel", async (req, res) => {
  try {
    const { role = "OEM", component = "", scope = "all" } = req.query;
    const items = await fetchItems(role, component, scope);

    const total      = items.length || 1;
    const completed  = items.filter(i => i.completed).length;
    const compliance = Math.round((completed / total) * 100);
    const riskDist   = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    items.forEach(i => { if (riskDist[i.risk] !== undefined) riskDist[i.risk]++; });

    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary
    const summaryData = [
      ["IACCD — Automotive Cyber-Safety Compliance Report"],
      [],
      ["Project",    "Cyber-Safety Dashboard"],
      ["Component",  component || "All"],
      ["Role",       role],
      ["Standard",   "UN R155 · ISO/SAE 21434 · CSMS · ISO 26262"],
      ["Scope",      scope === "selected" ? "Selected Items" : "Full Checklist"],
      ["Generated",  new Date().toLocaleString()],
      [],
      ["COMPLIANCE SUMMARY"],
      ["Metric",              "Value"],
      ["Total Items",         total],
      ["Completed",           completed],
      ["Compliance %",        `${compliance}%`],
      [],
      ["RISK DISTRIBUTION"],
      ["Risk Level", "Count"],
      ["Critical",   riskDist.Critical],
      ["High",       riskDist.High],
      ["Medium",     riskDist.Medium],
      ["Low",        riskDist.Low],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2 — Checklist
    const checklistRows = items.map(i => ({
      "Clause Ref":          i.clause,
      "Standard / Source":   i.source,
      "Status":              i.status,
      "Risk Level":          i.risk,
      "Evidence Attached":   i.evidence,
      "Evidence File":       i.evidenceFile,
      "Completed":           i.completed ? "Yes" : "No",
    }));
    const wsChecklist = XLSX.utils.json_to_sheet(checklistRows);
    wsChecklist["!cols"] = [12, 16, 16, 12, 16, 32, 10].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsChecklist, "Checklist");

    // Sheet 3 — Section Breakdown
    const secMap = {};
    items.forEach(i => {
      if (!secMap[i.source]) secMap[i.source] = { total: 0, completed: 0 };
      secMap[i.source].total++;
      if (i.completed) secMap[i.source].completed++;
    });
    const sectionRows = Object.entries(secMap).map(([sec, v]) => ({
      "Section":      sec,
      "Total Items":  v.total,
      "Completed":    v.completed,
      "Compliance %": `${Math.round((v.completed / (v.total || 1)) * 100)}%`,
    }));
    const wsSection = XLSX.utils.json_to_sheet(sectionRows);
    wsSection["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsSection, "Section Breakdown");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `UNR155_${component.replace(/\s/g, "_")}_Report_v${Date.now()}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
