const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ── Static CTSA + CRRA checklist items ───────────────────────────────────────

const TARA_ITEMS = [
  // A. CTSA — Cyber Threat Susceptibility Assessment
  {
    id: "CTSA-01", section: "CTSA", reqId: "CTSA-01",
    requirement: "Establish Assessment Scope",
    description: "Define assets in scope, TTP range, adversary types, and system boundaries per ISO/SAE 21434 §8.3",
    evidenceRequired: "Scope definition document, asset register, adversary profile",
    riskWeight: 5,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  {
    id: "CTSA-02", section: "CTSA", reqId: "CTSA-02",
    requirement: "Identify Candidate TTPs",
    description: "Select applicable TTPs from threat catalog (MITRE, HEAVENS, EVITA) based on component attack surface",
    evidenceRequired: "TTP catalog selection worksheet, attack surface analysis",
    riskWeight: 4,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  {
    id: "CTSA-03", section: "CTSA", reqId: "CTSA-03",
    requirement: "Eliminate Implausible TTPs",
    description: "Review architecture and preconditions to filter out TTPs not applicable to the target component",
    evidenceRequired: "TTP elimination rationale, architecture review record",
    riskWeight: 3,
    components: ["ALL"],
    roles: ["OEM", "Tier-1"],
  },
  {
    id: "CTSA-04", section: "CTSA", reqId: "CTSA-04",
    requirement: "Apply TTP Risk Scoring Model",
    description: "Score each TTP on Impact (1–5), Likelihood (1–5), and Sophistication. Compute composite risk score",
    evidenceRequired: "Risk scoring worksheet with CVSS/HEAVENS scores per TTP",
    riskWeight: 5,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  {
    id: "CTSA-05", section: "CTSA", reqId: "CTSA-05",
    requirement: "Construct Threat Matrix",
    description: "Build ranked TTP vs Asset mapping matrix showing risk levels per asset-threat pair",
    evidenceRequired: "Threat matrix document (TTP × Asset × Risk Score)",
    riskWeight: 4,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  // B. CRRA — Cyber Risk Remediation Analysis
  {
    id: "CRRA-01", section: "CRRA", reqId: "CRRA-01",
    requirement: "Select High-Risk TTPs for Mitigation",
    description: "Identify TTPs with risk score ≥ threshold (Critical/High) requiring active countermeasures",
    evidenceRequired: "High-risk TTP selection list with justification",
    riskWeight: 5,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  {
    id: "CRRA-02", section: "CRRA", reqId: "CRRA-02",
    requirement: "Identify Plausible Countermeasures",
    description: "Map each high-risk TTP to candidate countermeasures (CM). Reference UN R155 Annex 5 mitigations M1–M29",
    evidenceRequired: "TTP–CM mapping table referencing Annex 5 mitigation codes",
    riskWeight: 4,
    components: ["ALL"],
    roles: ["OEM", "Tier-1"],
  },
  {
    id: "CRRA-03", section: "CRRA", reqId: "CRRA-03",
    requirement: "Assess Countermeasure Merit",
    description: "Score each CM on Utility (risk reduction effectiveness) and Cost (implementation effort). Compute merit score",
    evidenceRequired: "CM merit scoring worksheet (Utility × Cost matrix)",
    riskWeight: 3,
    components: ["ALL"],
    roles: ["OEM", "Tier-1"],
  },
  {
    id: "CRRA-04", section: "CRRA", reqId: "CRRA-04",
    requirement: "Identify Optimal CM Solution Set",
    description: "Select the optimal set of countermeasures balancing risk reduction and implementation cost",
    evidenceRequired: "Optimal CM solution set document with selection rationale",
    riskWeight: 4,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
  {
    id: "CRRA-05", section: "CRRA", reqId: "CRRA-05",
    requirement: "Prepare Mitigation Recommendations",
    description: "Document traceable mitigation recommendations linking TTP → Asset → CM → Evidence. ISO/SAE 21434 §9.4 compliant",
    evidenceRequired: "Mitigation recommendation report with full traceability matrix",
    riskWeight: 5,
    components: ["ALL"],
    roles: ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"],
  },
];

// Threat matrix data — TTP × Asset × Risk (component-aware)
const THREAT_MATRIX = [
  { ttp: "T-CAN-SPOOF",  ttpName: "CAN Message Spoofing",        category: "Communication", impact: 5, likelihood: 4, sophistication: 3,
    assets: ["Airbag ECU","Seatbelt Pretensioner ECU","ADAS ECU","Brake Control Module","Powertrain ECU","Chassis Control ECU","Body Control Module"],
    countermeasures: ["M10","M11"], annexRef: "4.3.2(a)" },
  { ttp: "T-MITM",       ttpName: "Man-in-the-Middle",           category: "Communication", impact: 4, likelihood: 3, sophistication: 4,
    assets: ["Central Gateway ECU","Telematics Control Unit","ADAS ECU","Infotainment Head Unit"],
    countermeasures: ["M10","M5"], annexRef: "4.3.2(b)" },
  { ttp: "T-REPLAY",     ttpName: "Replay Attack",               category: "Communication", impact: 3, likelihood: 3, sophistication: 2,
    assets: ["Airbag ECU","Seatbelt Pretensioner ECU","ADAS ECU","Brake Control Module"],
    countermeasures: ["M10"], annexRef: "4.3.2(c)" },
  { ttp: "T-DOS-CAN",    ttpName: "CAN Denial of Service",       category: "Availability",  impact: 5, likelihood: 5, sophistication: 2,
    assets: ["Airbag ECU","Central Gateway ECU","ADAS ECU","Powertrain ECU","Brake Control Module","Chassis Control ECU","Body Control Module"],
    countermeasures: ["M13","M15"], annexRef: "4.3.2(d)" },
  { ttp: "T-OTA-MANIP",  ttpName: "OTA Firmware Manipulation",   category: "Update",        impact: 5, likelihood: 3, sophistication: 5,
    assets: ["OTA Module","Central Gateway ECU","EV Battery Management"],
    countermeasures: ["M16","M11"], annexRef: "4.3.3(a)" },
  { ttp: "T-KEY-COMP",   ttpName: "Cryptographic Key Compromise", category: "Cryptography", impact: 4, likelihood: 2, sophistication: 5,
    assets: ["OTA Module","EV Battery Management","Telematics Control Unit"],
    countermeasures: ["M11"], annexRef: "4.3.3(c)" },
  { ttp: "T-WEAK-CRYPTO",ttpName: "Weak Encryption",             category: "Cryptography",  impact: 4, likelihood: 4, sophistication: 3,
    assets: ["Airbag ECU","ADAS ECU","Powertrain ECU","Brake Control Module","Chassis Control ECU","OTA Module","EV Battery Management","Telematics Control Unit","Infotainment Head Unit"],
    countermeasures: ["M11","M5"], annexRef: "4.3.7(a)" },
  { ttp: "T-REMOTE-ACC", ttpName: "Remote Telematics Access",    category: "External",      impact: 4, likelihood: 3, sophistication: 4,
    assets: ["Telematics Control Unit","Central Gateway ECU","ADAS ECU","Infotainment Head Unit"],
    countermeasures: ["M9","M1","M18"], annexRef: "4.3.5(a)" },
  { ttp: "T-OBD-MISUSE", ttpName: "OBD Port Misuse",             category: "External",      impact: 3, likelihood: 4, sophistication: 2,
    assets: ["Central Gateway ECU","Body Control Module","Infotainment Head Unit"],
    countermeasures: ["M7","M9"], annexRef: "4.3.5(c)" },
  { ttp: "T-USB-INJECT", ttpName: "USB Code Injection",          category: "External",      impact: 4, likelihood: 2, sophistication: 3,
    assets: ["Central Gateway ECU","Telematics Control Unit","Infotainment Head Unit"],
    countermeasures: ["M23","M7"], annexRef: "4.3.5(d)" },
  { ttp: "T-ECU-CONFIG", ttpName: "Unauthorized ECU Config Change", category: "Data",       impact: 5, likelihood: 3, sophistication: 3,
    assets: ["Airbag ECU","Seatbelt Pretensioner ECU","ADAS ECU","Powertrain ECU","Brake Control Module","Chassis Control ECU","Body Control Module","EV Battery Management"],
    countermeasures: ["M9","M24"], annexRef: "4.3.6(a)" },
  { ttp: "T-LOG-DEL",    ttpName: "Log Deletion / Tampering",    category: "Data",          impact: 2, likelihood: 3, sophistication: 2,
    assets: ["Central Gateway ECU","Telematics Control Unit","Infotainment Head Unit"],
    countermeasures: ["M4","M19"], annexRef: "4.3.6(b)" },
  { ttp: "T-JTAG",       ttpName: "Debug/JTAG Interface Exposure", category: "Development", impact: 4, likelihood: 3, sophistication: 3,
    assets: ["Airbag ECU","Seatbelt Pretensioner ECU","ADAS ECU","Powertrain ECU","Brake Control Module","Chassis Control ECU","EV Battery Management","Body Control Module"],
    countermeasures: ["M23"], annexRef: "4.3.7(c)" },
  { ttp: "T-NET-SEG",    ttpName: "Network Segmentation Bypass", category: "Development",   impact: 4, likelihood: 3, sophistication: 4,
    assets: ["Central Gateway ECU","ADAS ECU","Telematics Control Unit","Infotainment Head Unit","OTA Module"],
    countermeasures: ["M1","M29"], annexRef: "4.3.7(d)" },
];

// ── DB init ───────────────────────────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tara_checklist_state (
      id            SERIAL PRIMARY KEY,
      item_id       VARCHAR(20) NOT NULL,
      role          VARCHAR(60),
      component     VARCHAR(100),
      status        VARCHAR(30) DEFAULT 'Not Started',
      selected      BOOLEAN DEFAULT false,
      risk_level    VARCHAR(20) DEFAULT 'Medium',
      evidence_file VARCHAR(255),
      evidence_path TEXT,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, role, component)
    );
  `);
}
ensureTable().catch(console.error);

// ── Upload storage ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/tara");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── GET /api/tara-checklist/items ─────────────────────────────────────────────
router.get("/items", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;

    const stateRows = await pool.query(
      "SELECT item_id, status, selected, risk_level, evidence_file FROM tara_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const stateMap = {};
    stateRows.rows.forEach(r => { stateMap[r.item_id] = r; });

    const items = TARA_ITEMS
      .filter(item => item.roles.includes(role))
      .map(item => {
        const s = stateMap[item.id] || {};
        return {
          ...item,
          status:       s.status     || "Not Started",
          selected:     s.selected   || false,
          riskLevel:    s.risk_level || "Medium",
          evidenceFile: s.evidence_file || null,
        };
      });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tara-checklist/threat-matrix ─────────────────────────────────────
router.get("/threat-matrix", async (req, res) => {
  try {
    const { component = "" } = req.query;
    const matrix = THREAT_MATRIX
      .filter(t => !component || t.assets.includes(component))
      .map(t => {
        const riskScore = t.impact * t.likelihood;
        const riskLevel = riskScore >= 16 ? "Critical" : riskScore >= 9 ? "High" : riskScore >= 4 ? "Medium" : "Low";
        return { ...t, riskScore, riskLevel };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tara-checklist/state ──────────────────────────────────────────
router.patch("/state", async (req, res) => {
  try {
    const { role, component, updates } = req.body;
    for (const u of updates) {
      await pool.query(`
        INSERT INTO tara_checklist_state (item_id, role, component, status, selected, risk_level, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (item_id, role, component) DO UPDATE SET
          status     = COALESCE(EXCLUDED.status,     tara_checklist_state.status),
          selected   = COALESCE(EXCLUDED.selected,   tara_checklist_state.selected),
          risk_level = COALESCE(EXCLUDED.risk_level, tara_checklist_state.risk_level),
          updated_at = NOW()
      `, [u.itemId, role, component, u.status ?? null, u.selected ?? null, u.riskLevel ?? null]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tara-checklist/evidence/:itemId ─────────────────────────────────
router.post("/evidence/:itemId", upload.single("file"), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { role = "OEM", component = "" } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    await pool.query(`
      INSERT INTO tara_checklist_state (item_id, role, component, status, evidence_file, evidence_path, updated_at)
      VALUES ($1,$2,$3,'Completed',$4,$5,NOW())
      ON CONFLICT (item_id, role, component) DO UPDATE SET
        evidence_file = EXCLUDED.evidence_file,
        evidence_path = EXCLUDED.evidence_path,
        status        = CASE
          WHEN tara_checklist_state.status IN ('Not Started', 'In Progress')
          THEN 'Completed'
          ELSE tara_checklist_state.status
        END,
        updated_at    = NOW()
    `, [itemId, role, component, req.file.originalname, req.file.path]);
    res.json({ ok: true, fileName: req.file.originalname, status: 'Completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tara-checklist/stats ─────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;
    const stateRows = await pool.query(
      "SELECT status FROM tara_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const total = TARA_ITEMS.filter(i => i.roles.includes(role)).length;
    const counts = { "Not Started": 0, "In Progress": 0, "Completed": 0, "Verified": 0 };
    stateRows.rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const done = counts["Completed"] + counts["Verified"];
    res.json({ total, counts, completionPercent: total ? Math.round((done / total) * 100) : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
