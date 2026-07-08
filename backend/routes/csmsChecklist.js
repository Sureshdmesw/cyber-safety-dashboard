const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ── CSMS Item Catalogue ───────────────────────────────────────────────────────
// Sections A–F with exact UN R155 clause refs, ISO 21434 mapping, DFMEA link, owner

const CSMS_ITEMS = [
  // ── A. Governance & Organization ─────────────────────────────────────────
  {
    id: "CSMS-01", section: "A", clauseRef: "CSMS-01",
    requirement: "Define Cybersecurity Policy & Objectives",
    description: "Establish a documented cybersecurity policy approved by top management, defining objectives, scope, and commitment to continuous improvement.",
    evidenceRequired: "Signed cybersecurity policy document, board approval minutes",
    unr155Clause: "UN R155 §7.2.2", iso21434Clause: "ISO 21434 §5.4",
    dfmeaLink: "DFMEA Item: Policy Failure Mode — No governance structure",
    owner: "CISO / Top Management",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.1.1",
  },
  {
    id: "CSMS-02", section: "A", clauseRef: "CSMS-02",
    requirement: "Assign Roles & Responsibilities (Cybersecurity Owner)",
    description: "Define and assign cybersecurity roles including a designated Cybersecurity Officer. Document RACI matrix for all CS activities.",
    evidenceRequired: "RACI matrix, appointment letters, org chart with CS roles",
    unr155Clause: "UN R155 §7.2.3", iso21434Clause: "ISO 21434 §5.4.2",
    dfmeaLink: "DFMEA Item: Role ambiguity — Unassigned security responsibilities",
    owner: "HR / CISO",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.1.2",
  },
  {
    id: "CSMS-03", section: "A", clauseRef: "CSMS-03",
    requirement: "Establish Cybersecurity Culture & Awareness",
    description: "Implement cybersecurity awareness training programme. Maintain training records and competence assessments for all relevant personnel.",
    evidenceRequired: "Training matrix, completion records, competence assessment results",
    unr155Clause: "UN R155 §7.2.4", iso21434Clause: "ISO 21434 §5.4.3",
    dfmeaLink: "DFMEA Item: Human error — Untrained personnel causing security breach",
    owner: "HR / Training Manager",
    roles: ["OEM", "Tier-1"],
    annexRef: "CSMS-3",
  },
  // ── B. Risk Management ────────────────────────────────────────────────────
  {
    id: "CSMS-04", section: "B", clauseRef: "CSMS-04",
    requirement: "Perform TARA for Vehicle / System",
    description: "Conduct Threat Analysis and Risk Assessment (TARA) per ISO/SAE 21434 §8 for each vehicle type / system in scope. Document CTSA and CRRA outputs.",
    evidenceRequired: "TARA report (CTSA + CRRA), risk register, threat catalog",
    unr155Clause: "UN R155 §7.3.1", iso21434Clause: "ISO 21434 §8.3–§8.7",
    dfmeaLink: "DFMEA Item: Risk assessment gap — Unidentified threat vectors",
    owner: "Cybersecurity Engineer",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.1",
  },
  {
    id: "CSMS-05", section: "B", clauseRef: "CSMS-05",
    requirement: "Identify & Classify Cyber Assets",
    description: "Enumerate all cyber assets (ECUs, communication interfaces, data stores, back-end servers). Classify by safety level (ASIL A–D / QM) and criticality.",
    evidenceRequired: "Asset register with safety classification, network topology diagram",
    unr155Clause: "UN R155 §7.3.2", iso21434Clause: "ISO 21434 §8.3",
    dfmeaLink: "DFMEA Item: Asset omission — Critical ECU not included in scope",
    owner: "Systems Architect",
    roles: ["OEM", "Tier-1"],
    annexRef: "R155-A5.2.1",
  },
  {
    id: "CSMS-06", section: "B", clauseRef: "CSMS-06",
    requirement: "Assess Threats, Vulnerabilities & Risks",
    description: "Evaluate identified threats using impact × feasibility scoring. Map vulnerabilities to CVE/CWE database. Assign risk levels (Critical/High/Medium/Low).",
    evidenceRequired: "Threat evaluation worksheet, CVE mapping, risk scoring matrix",
    unr155Clause: "UN R155 §7.3.3", iso21434Clause: "ISO 21434 §8.5–§8.7",
    dfmeaLink: "DFMEA Item: Severity underestimation — Incorrect risk scoring",
    owner: "Cybersecurity Engineer",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.2",
  },
  {
    id: "CSMS-07", section: "B", clauseRef: "CSMS-07",
    requirement: "Define Risk Treatment & Mitigation Strategy",
    description: "For each high/critical risk, define treatment (Avoid/Reduce/Share/Accept). Map to UN R155 Annex 5 mitigations M1–M29. Document residual risk acceptance.",
    evidenceRequired: "Risk treatment plan, mitigation mapping to Annex 5, residual risk sign-off",
    unr155Clause: "UN R155 §7.3.4", iso21434Clause: "ISO 21434 §9.3–§9.4",
    dfmeaLink: "DFMEA Item: Mitigation gap — Unmitigated high-risk threat",
    owner: "Cybersecurity Engineer / CISO",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.2",
  },
  // ── C. Secure Development ─────────────────────────────────────────────────
  {
    id: "CSMS-08", section: "C", clauseRef: "CSMS-08",
    requirement: "Define Cybersecurity Requirements",
    description: "Derive cybersecurity requirements from TARA outputs. Ensure traceability from threat → security goal → requirement → test case.",
    evidenceRequired: "Cybersecurity requirements specification, RTM (Requirements Traceability Matrix)",
    unr155Clause: "UN R155 §7.4.1", iso21434Clause: "ISO 21434 §9.4",
    dfmeaLink: "DFMEA Item: Requirements gap — Missing security requirement for identified threat",
    owner: "Systems Engineer",
    roles: ["OEM", "Tier-1"],
    annexRef: "R155-A5.2.4",
  },
  {
    id: "CSMS-09", section: "C", clauseRef: "CSMS-09",
    requirement: "Implement Secure Design (Security by Design)",
    description: "Apply security-by-design principles: least privilege, defence-in-depth, secure defaults, fail-safe. Document architectural security decisions.",
    evidenceRequired: "Security architecture document, design review records, threat model",
    unr155Clause: "UN R155 §7.4.2", iso21434Clause: "ISO 21434 §10.4",
    dfmeaLink: "DFMEA Item: Design flaw — Insecure default configuration in ECU",
    owner: "Software Architect",
    roles: ["OEM", "Tier-1"],
    annexRef: "R155-A5.2.4",
  },
  {
    id: "CSMS-10", section: "C", clauseRef: "CSMS-10",
    requirement: "Perform Verification & Validation Testing",
    description: "Execute security testing: SAST, DAST, fuzz testing, penetration testing. Verify all cybersecurity requirements are met. Document test results.",
    evidenceRequired: "SAST/DAST reports, fuzz test results, pentest report, V&V sign-off",
    unr155Clause: "UN R155 §7.4.3", iso21434Clause: "ISO 21434 §15",
    dfmeaLink: "DFMEA Item: Verification gap — Untested security requirement",
    owner: "Test Engineer / Security Tester",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.4",
  },
  {
    id: "CSMS-11", section: "C", clauseRef: "CSMS-11",
    requirement: "Manage Supplier Cybersecurity Compliance",
    description: "Assess and manage cybersecurity requirements for all Tier-1/Tier-2 suppliers. Include CS clauses in contracts. Conduct supplier audits.",
    evidenceRequired: "Supplier CS questionnaire, contract CS clauses, supplier audit records",
    unr155Clause: "UN R155 §7.4.4", iso21434Clause: "ISO 21434 §7",
    dfmeaLink: "DFMEA Item: Supply chain risk — Compromised component from supplier",
    owner: "Procurement / CISO",
    roles: ["OEM", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.5",
  },
  // ── D. Incident Response & Monitoring ────────────────────────────────────
  {
    id: "CSMS-12", section: "D", clauseRef: "CSMS-12",
    requirement: "Implement Incident Detection Mechanisms",
    description: "Deploy IDS/IDPS on vehicle networks and back-end systems. Configure SIEM for real-time alerting on security events.",
    evidenceRequired: "IDS/IDPS deployment evidence, SIEM configuration, alert rule documentation",
    unr155Clause: "UN R155 §7.5.1", iso21434Clause: "ISO 21434 §13.3",
    dfmeaLink: "DFMEA Item: Detection failure — Undetected intrusion on CAN bus",
    owner: "SOC / Security Operations",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.2.3",
  },
  {
    id: "CSMS-13", section: "D", clauseRef: "CSMS-13",
    requirement: "Define Incident Response Process",
    description: "Document and test incident response plan (IRP) covering detection, containment, eradication, recovery, and reporting to authorities.",
    evidenceRequired: "IRP document, tabletop exercise records, escalation matrix",
    unr155Clause: "UN R155 §7.5.2", iso21434Clause: "ISO 21434 §13.4",
    dfmeaLink: "DFMEA Item: Response delay — No defined escalation path for cyber incident",
    owner: "CISO / Incident Response Team",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.1.4",
  },
  {
    id: "CSMS-14", section: "D", clauseRef: "CSMS-14",
    requirement: "Enable Logging, Monitoring & Alerting",
    description: "Implement tamper-evident logging on all security-relevant ECUs and back-end systems. Define log retention policy. Enable real-time alerting.",
    evidenceRequired: "Log management policy, SIEM log samples, retention schedule",
    unr155Clause: "UN R155 §7.5.3", iso21434Clause: "ISO 21434 §13.3",
    dfmeaLink: "DFMEA Item: Forensic gap — No audit trail for post-incident analysis",
    owner: "SOC / IT Operations",
    roles: ["OEM", "Tier-1"],
    annexRef: "CSMS-6",
  },
  {
    id: "CSMS-15", section: "D", clauseRef: "CSMS-15",
    requirement: "Perform Post-Incident Analysis",
    description: "Conduct root cause analysis after each security incident. Update threat model and TARA. Feed lessons learned into CSMS improvement cycle.",
    evidenceRequired: "Post-incident report, root cause analysis, TARA update record",
    unr155Clause: "UN R155 §7.5.4", iso21434Clause: "ISO 21434 §13.5",
    dfmeaLink: "DFMEA Item: Recurrence risk — Incident root cause not addressed",
    owner: "Incident Response Team",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "CSMS-5",
  },
  // ── E. Update & Patch Management ─────────────────────────────────────────
  {
    id: "CSMS-16", section: "E", clauseRef: "CSMS-16",
    requirement: "Secure OTA / Software Update Process",
    description: "Implement secure OTA update process per UN R156. Ensure update packages are signed, integrity-checked, and rollback-capable.",
    evidenceRequired: "OTA process document, signing key management procedure, rollback test evidence",
    unr155Clause: "UN R155 §7.6.1 / UN R156", iso21434Clause: "ISO 21434 §14",
    dfmeaLink: "DFMEA Item: Update failure — Malicious firmware installed via OTA",
    owner: "OTA Manager / Software Team",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.3.2",
  },
  {
    id: "CSMS-17", section: "E", clauseRef: "CSMS-17",
    requirement: "Validate Software Integrity (Signing, Encryption)",
    description: "Enforce code signing for all ECU firmware. Implement secure boot. Verify cryptographic integrity before installation.",
    evidenceRequired: "Code signing certificate, secure boot configuration, integrity check test results",
    unr155Clause: "UN R155 §7.6.2", iso21434Clause: "ISO 21434 §14.3",
    dfmeaLink: "DFMEA Item: Integrity failure — Unsigned firmware accepted by ECU",
    owner: "Software Architect / PKI Team",
    roles: ["OEM", "Tier-1"],
    annexRef: "R155-A5.3.2",
  },
  {
    id: "CSMS-18", section: "E", clauseRef: "CSMS-18",
    requirement: "Manage Vulnerability & Patch Deployment",
    description: "Establish vulnerability disclosure policy (VDP). Define patch SLA by severity. Track CVEs affecting vehicle software components.",
    evidenceRequired: "VDP policy, CVE tracking log, patch deployment records, SLA definition",
    unr155Clause: "UN R155 §7.6.3", iso21434Clause: "ISO 21434 §13.2",
    dfmeaLink: "DFMEA Item: Patch delay — Known vulnerability unpatched beyond SLA",
    owner: "PSIRT / Vulnerability Management",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.3.3",
  },
  // ── F. Continuous Improvement & Audit ────────────────────────────────────
  {
    id: "CSMS-19", section: "F", clauseRef: "CSMS-19",
    requirement: "Conduct Internal CSMS Audits",
    description: "Perform periodic internal audits of the CSMS against UN R155 requirements. Document findings, non-conformities, and corrective actions.",
    evidenceRequired: "Audit schedule, audit reports, non-conformity log, corrective action tracker",
    unr155Clause: "UN R155 §7.7.1", iso21434Clause: "ISO 21434 §5.5",
    dfmeaLink: "DFMEA Item: Audit gap — CSMS not reviewed against updated threat landscape",
    owner: "Internal Audit / CISO",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "CSMS-8",
  },
  {
    id: "CSMS-20", section: "F", clauseRef: "CSMS-20",
    requirement: "Maintain Compliance Documentation",
    description: "Maintain version-controlled compliance documentation package for type approval. Ensure all evidence is traceable to UN R155 clauses.",
    evidenceRequired: "Document control register, version history, compliance package index",
    unr155Clause: "UN R155 §7.7.2", iso21434Clause: "ISO 21434 §5.4",
    dfmeaLink: "DFMEA Item: Documentation gap — Missing evidence for type approval",
    owner: "Compliance Manager",
    roles: ["OEM", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "CSMS-8",
  },
  {
    id: "CSMS-21", section: "F", clauseRef: "CSMS-21",
    requirement: "Ensure Continuous Risk Monitoring",
    description: "Implement ongoing monitoring of the threat landscape. Subscribe to automotive ISAC feeds. Re-assess risks when new threats are identified.",
    evidenceRequired: "Threat intelligence subscription evidence, risk re-assessment records",
    unr155Clause: "UN R155 §7.7.3", iso21434Clause: "ISO 21434 §13.2",
    dfmeaLink: "DFMEA Item: Monitoring gap — New threat not captured in risk register",
    owner: "Threat Intelligence / CISO",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "R155-A5.3.1",
  },
  {
    id: "CSMS-22", section: "F", clauseRef: "CSMS-22",
    requirement: "Implement Lessons Learned & Improvements",
    description: "Capture lessons learned from incidents, audits, and TARA updates. Feed improvements back into CSMS policy, processes, and technical controls.",
    evidenceRequired: "Lessons learned log, improvement action tracker, CSMS revision history",
    unr155Clause: "UN R155 §7.7.4", iso21434Clause: "ISO 21434 §5.5",
    dfmeaLink: "DFMEA Item: Improvement failure — Recurring incidents due to unaddressed root cause",
    owner: "CISO / Process Owner",
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
    annexRef: "CSMS-7",
  },
];

const SECTIONS = [
  { id: "A", label: "A. Governance & Organization",         unr155: "UN R155 §7.2" },
  { id: "B", label: "B. Risk Management",                   unr155: "UN R155 §7.3" },
  { id: "C", label: "C. Secure Development",                unr155: "UN R155 §7.4" },
  { id: "D", label: "D. Incident Response & Monitoring",    unr155: "UN R155 §7.5" },
  { id: "E", label: "E. Update & Patch Management",         unr155: "UN R155 §7.6" },
  { id: "F", label: "F. Continuous Improvement & Audit",    unr155: "UN R155 §7.7" },
];

// ── DB init ───────────────────────────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS csms_checklist_state (
      id            SERIAL PRIMARY KEY,
      item_id       VARCHAR(20) NOT NULL,
      role          VARCHAR(60),
      component     VARCHAR(100),
      status        VARCHAR(30) DEFAULT 'Not Started',
      selected      BOOLEAN DEFAULT false,
      owner_override VARCHAR(100),
      evidence_file VARCHAR(255),
      evidence_path TEXT,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, role, component)
    );
  `);
}
ensureTable().catch(console.error);

// ── Upload storage ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/csms");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── GET /api/csms-checklist/items ─────────────────────────────────────────────
router.get("/items", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;
    const stateRows = await pool.query(
      "SELECT item_id, status, selected, owner_override, evidence_file FROM csms_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const stateMap = {};
    stateRows.rows.forEach(r => { stateMap[r.item_id] = r; });

    const items = CSMS_ITEMS
      .filter(item => item.roles.includes(role))
      .map(item => {
        const s = stateMap[item.id] || {};
        return {
          ...item,
          status:        s.status         || "Not Started",
          selected:      s.selected       || false,
          ownerOverride: s.owner_override || null,
          evidenceFile:  s.evidence_file  || null,
        };
      });

    res.json({ sections: SECTIONS, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/csms-checklist/state ──────────────────────────────────────────
router.patch("/state", async (req, res) => {
  try {
    const { role, component, updates } = req.body;
    for (const u of updates) {
      await pool.query(`
        INSERT INTO csms_checklist_state (item_id, role, component, status, selected, owner_override, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (item_id, role, component) DO UPDATE SET
          status         = COALESCE(EXCLUDED.status,         csms_checklist_state.status),
          selected       = COALESCE(EXCLUDED.selected,       csms_checklist_state.selected),
          owner_override = COALESCE(EXCLUDED.owner_override, csms_checklist_state.owner_override),
          updated_at     = NOW()
      `, [u.itemId, role, component, u.status ?? null, u.selected ?? null, u.ownerOverride ?? null]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/csms-checklist/evidence/:itemId ─────────────────────────────────
router.post("/evidence/:itemId", upload.single("file"), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { role = "OEM", component = "" } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    await pool.query(`
      INSERT INTO csms_checklist_state (item_id, role, component, status, evidence_file, evidence_path, updated_at)
      VALUES ($1,$2,$3,'Implemented',$4,$5,NOW())
      ON CONFLICT (item_id, role, component) DO UPDATE SET
        evidence_file = EXCLUDED.evidence_file,
        evidence_path = EXCLUDED.evidence_path,
        status        = CASE
          WHEN csms_checklist_state.status IN ('Not Started', 'In Progress')
          THEN 'Implemented'
          ELSE csms_checklist_state.status
        END,
        updated_at    = NOW()
    `, [itemId, role, component, req.file.originalname, req.file.path]);
    res.json({ ok: true, fileName: req.file.originalname, status: 'Implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/csms-checklist/stats ─────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;
    const stateRows = await pool.query(
      "SELECT item_id, status FROM csms_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const stateMap = {};
    stateRows.rows.forEach(r => { stateMap[r.item_id] = r.status; });

    const applicable = CSMS_ITEMS.filter(i => i.roles.includes(role));
    const total = applicable.length;
    const counts = { "Not Started": 0, "In Progress": 0, "Implemented": 0, "Verified": 0 };
    const sectionStats = {};

    applicable.forEach(item => {
      const st = stateMap[item.id] || "Not Started";
      if (counts[st] !== undefined) counts[st]++;
      if (!sectionStats[item.section]) sectionStats[item.section] = { total: 0, done: 0 };
      sectionStats[item.section].total++;
      if (st === "Implemented" || st === "Verified") sectionStats[item.section].done++;
    });

    const done = counts["Implemented"] + counts["Verified"];
    res.json({
      total, counts,
      completionPercent: total ? Math.round((done / total) * 100) : 0,
      sectionStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/csms-checklist/audit-report ─────────────────────────────────────
// Returns full audit-ready data: items + state + traceability
router.get("/audit-report", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;
    const stateRows = await pool.query(
      "SELECT item_id, status, evidence_file, owner_override, updated_at FROM csms_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const stateMap = {};
    stateRows.rows.forEach(r => { stateMap[r.item_id] = r; });

    const report = CSMS_ITEMS
      .filter(i => i.roles.includes(role))
      .map(item => {
        const s = stateMap[item.id] || {};
        return {
          clauseRef:     item.clauseRef,
          section:       item.section,
          requirement:   item.requirement,
          unr155Clause:  item.unr155Clause,
          iso21434Clause: item.iso21434Clause,
          dfmeaLink:     item.dfmeaLink,
          owner:         s.owner_override || item.owner,
          status:        s.status || "Not Started",
          evidenceFile:  s.evidence_file || null,
          lastUpdated:   s.updated_at || null,
          annexRef:      item.annexRef,
        };
      });

    res.json({ generatedAt: new Date().toISOString(), role, component, items: report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
