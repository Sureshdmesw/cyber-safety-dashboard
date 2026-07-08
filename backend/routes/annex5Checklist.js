const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ── Static Annex 5 Data (Tables A1, B1–B8, C1–C3) ────────────────────────────

const CATEGORIES = [
  { id: "4.3.1", label: "4.3.1 — Back-End Servers" },
  { id: "4.3.2", label: "4.3.2 — Communication Channels" },
  { id: "4.3.3", label: "4.3.3 — Update Procedures" },
  { id: "4.3.4", label: "4.3.4 — Unintended Human Actions" },
  { id: "4.3.5", label: "4.3.5 — External Connectivity" },
  { id: "4.3.6", label: "4.3.6 — Vehicle Data / Code" },
  { id: "4.3.7", label: "4.3.7 — Potential Vulnerabilities" },
  { id: "PHYS",  label: "Physical Manipulation" },
];

// Table A1 threats with category, attack examples, mitigations, and component applicability
const ANNEX5_ITEMS = [
  // ── 4.3.1 Back-End Servers ──────────────────────────────────────────────────
  {
    id: "A1-01", category: "4.3.1", clauseRef: "4.3.1(a)",
    threat: "Unauthorized access to back-end servers",
    attackExample: "Exploitation of weak credentials or unpatched server vulnerabilities",
    mitigations: ["M1", "M2", "M18"],
    components: ["OTA Module", "Telematics Control Unit", "Central Gateway ECU", "Infotainment Head Unit"],
  },
  {
    id: "A1-02", category: "4.3.1", clauseRef: "4.3.1(b)",
    threat: "Unauthorized access to vehicle data held by back-end servers",
    attackExample: "SQL injection or API abuse to exfiltrate vehicle telemetry",
    mitigations: ["M2", "M5", "M18"],
    components: ["OTA Module", "Telematics Control Unit", "Infotainment Head Unit"],
  },
  {
    id: "A1-03", category: "4.3.1", clauseRef: "4.3.1(c)",
    threat: "Denial of service attack on back-end servers",
    attackExample: "Volumetric DDoS targeting OTA or telematics endpoints",
    mitigations: ["M13", "M1"],
    components: ["OTA Module", "Telematics Control Unit"],
  },
  {
    id: "A1-04", category: "4.3.1", clauseRef: "4.3.1(d)",
    threat: "Insider threat — misuse of privileged access",
    attackExample: "Rogue employee exfiltrating signing keys or vehicle configs",
    mitigations: ["M3", "M4", "M18", "M19"],
    components: ["OTA Module", "Telematics Control Unit", "Central Gateway ECU"],
  },
  // ── 4.3.2 Communication Channels ───────────────────────────────────────────
  {
    id: "A1-05", category: "4.3.2", clauseRef: "4.3.2(a)",
    threat: "Spoofing of messages or data from vehicle to back-end or vice versa",
    attackExample: "CAN message spoofing, fake OTA server responses",
    mitigations: ["M10", "M11"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "Central Gateway ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "Body Control Module"],
  },
  {
    id: "A1-06", category: "4.3.2", clauseRef: "4.3.2(b)",
    threat: "Man-in-the-middle attack on vehicle communication",
    attackExample: "TLS downgrade or rogue Wi-Fi AP intercepting V2X traffic",
    mitigations: ["M10", "M11", "M5"],
    components: ["Central Gateway ECU", "Telematics Control Unit", "ADAS ECU", "Infotainment Head Unit"],
  },
  {
    id: "A1-07", category: "4.3.2", clauseRef: "4.3.2(c)",
    threat: "Replay attack on vehicle communication",
    attackExample: "Replaying captured CAN frames to trigger airbag deployment",
    mitigations: ["M10"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Brake Control Module"],
  },
  {
    id: "A1-08", category: "4.3.2", clauseRef: "4.3.2(d)",
    threat: "Denial of service on communication channels",
    attackExample: "CAN bus flooding causing ECU communication failure",
    mitigations: ["M13", "M15"],
    components: ["Airbag ECU", "Central Gateway ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "Body Control Module"],
  },
  {
    id: "A1-09", category: "4.3.2", clauseRef: "4.3.2(e)",
    threat: "Malicious internal messages (CAN/LIN/Ethernet)",
    attackExample: "Injecting malicious UDS diagnostic messages via compromised ECU",
    mitigations: ["M15", "M7"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "Central Gateway ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "Body Control Module"],
  },
  // ── 4.3.3 Update Procedures ─────────────────────────────────────────────────
  {
    id: "A1-10", category: "4.3.3", clauseRef: "4.3.3(a)",
    threat: "Manipulation of software updates",
    attackExample: "Injecting malicious firmware into OTA update package",
    mitigations: ["M16", "M11"],
    components: ["OTA Module", "Central Gateway ECU", "Telematics Control Unit", "EV Battery Management"],
  },
  {
    id: "A1-11", category: "4.3.3", clauseRef: "4.3.3(b)",
    threat: "Denial of legitimate software updates",
    attackExample: "Blocking OTA server connectivity to prevent security patches",
    mitigations: ["M16", "M13"],
    components: ["OTA Module", "Telematics Control Unit"],
  },
  {
    id: "A1-12", category: "4.3.3", clauseRef: "4.3.3(c)",
    threat: "Compromise of update cryptographic keys",
    attackExample: "Extraction of code-signing private key from HSM",
    mitigations: ["M11", "M16"],
    components: ["OTA Module", "EV Battery Management"],
  },
  {
    id: "A1-13", category: "4.3.3", clauseRef: "4.3.3(d)",
    threat: "Manipulation of firmware prior to update installation",
    attackExample: "Tampering with firmware image in transit or at rest",
    mitigations: ["M16", "M24"],
    components: ["OTA Module", "Central Gateway ECU", "EV Battery Management"],
  },
  // ── 4.3.4 Unintended Human Actions ─────────────────────────────────────────
  {
    id: "A1-14", category: "4.3.4", clauseRef: "4.3.4(a)",
    threat: "Unintended enabling of threat vectors by vehicle users",
    attackExample: "User disabling firewall or installing unauthorized apps on IHU",
    mitigations: ["M23", "M7"],
    components: ["Infotainment Head Unit", "OTA Module"],
  },
  {
    id: "A1-15", category: "4.3.4", clauseRef: "4.3.4(b)",
    threat: "Unintended enabling of threat vectors by vehicle operators/mechanics",
    attackExample: "Mechanic leaving OBD dongle connected enabling persistent access",
    mitigations: ["M23", "M7", "M9"],
    components: ["Central Gateway ECU", "Infotainment Head Unit", "Body Control Module"],
  },
  // ── 4.3.5 External Connectivity ─────────────────────────────────────────────
  {
    id: "A1-16", category: "4.3.5", clauseRef: "4.3.5(a)",
    threat: "Attacks via remote access features (telematics, V2X)",
    attackExample: "Remote exploitation of telematics unit to gain vehicle network access",
    mitigations: ["M9", "M1", "M18"],
    components: ["Telematics Control Unit", "Central Gateway ECU", "ADAS ECU", "Infotainment Head Unit"],
  },
  {
    id: "A1-17", category: "4.3.5", clauseRef: "4.3.5(b)",
    threat: "Attacks via short-range wireless (Bluetooth, Wi-Fi, NFC)",
    attackExample: "Bluetooth pairing exploit to inject commands into IHU",
    mitigations: ["M9", "M7"],
    components: ["Infotainment Head Unit", "Telematics Control Unit"],
  },
  {
    id: "A1-18", category: "4.3.5", clauseRef: "4.3.5(c)",
    threat: "Attacks via OBD port",
    attackExample: "Plugging malicious OBD device to reprogram ECU parameters",
    mitigations: ["M7", "M9"],
    components: ["Central Gateway ECU", "Body Control Module", "Infotainment Head Unit"],
  },
  {
    id: "A1-19", category: "4.3.5", clauseRef: "4.3.5(d)",
    threat: "Attacks via USB / media interfaces",
    attackExample: "USB rubber-ducky injecting malicious scripts via IHU USB port",
    mitigations: ["M23", "M7"],
    components: ["Central Gateway ECU", "Telematics Control Unit", "Infotainment Head Unit"],
  },
  // ── 4.3.6 Vehicle Data / Code ────────────────────────────────────────────────
  {
    id: "A1-20", category: "4.3.6", clauseRef: "4.3.6(a)",
    threat: "Unauthorized access to / manipulation of vehicle data",
    attackExample: "Modifying ECU calibration data to alter vehicle behaviour",
    mitigations: ["M9", "M24"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "Body Control Module", "EV Battery Management"],
  },
  {
    id: "A1-21", category: "4.3.6", clauseRef: "4.3.6(b)",
    threat: "Deletion or manipulation of system logs",
    attackExample: "Attacker erasing forensic logs after compromise",
    mitigations: ["M4", "M19"],
    components: ["Central Gateway ECU", "Telematics Control Unit", "Infotainment Head Unit"],
  },
  {
    id: "A1-22", category: "4.3.6", clauseRef: "4.3.6(c)",
    threat: "Introduction of malicious software or code",
    attackExample: "Flashing unsigned firmware to override safety-critical ECU logic",
    mitigations: ["M16", "M23", "M24"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "OTA Module", "EV Battery Management"],
  },
  // ── 4.3.7 Potential Vulnerabilities ─────────────────────────────────────────
  {
    id: "A1-23", category: "4.3.7", clauseRef: "4.3.7(a)",
    threat: "Exploitation of weak cryptography or key management",
    attackExample: "Brute-forcing short symmetric keys used in CAN authentication",
    mitigations: ["M11", "M5"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "OTA Module", "EV Battery Management", "Telematics Control Unit", "Infotainment Head Unit"],
  },
  {
    id: "A1-24", category: "4.3.7", clauseRef: "4.3.7(b)",
    threat: "Exploitation of software vulnerabilities (buffer overflow, injection)",
    attackExample: "Stack overflow in UDS handler enabling arbitrary code execution",
    mitigations: ["M23", "M24"],
    components: ["ALL"],
  },
  {
    id: "A1-25", category: "4.3.7", clauseRef: "4.3.7(c)",
    threat: "Exploitation of debug / development interfaces left active",
    attackExample: "JTAG/UART left enabled in production firmware enabling memory dump",
    mitigations: ["M23"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "Body Control Module", "EV Battery Management"],
  },
  {
    id: "A1-26", category: "4.3.7", clauseRef: "4.3.7(d)",
    threat: "Network segmentation bypass",
    attackExample: "Pivoting from IHU to safety-critical CAN bus via gateway misconfiguration",
    mitigations: ["M1", "M29"],
    components: ["Central Gateway ECU", "ADAS ECU", "Telematics Control Unit", "Infotainment Head Unit", "OTA Module"],
  },
  // ── Physical Manipulation ────────────────────────────────────────────────────
  {
    id: "A1-27", category: "PHYS", clauseRef: "PHYS(a)",
    threat: "Physical manipulation of hardware (ECU tampering)",
    attackExample: "Replacing ECU with rogue unit or probing PCB test points",
    mitigations: ["M23", "M11"],
    components: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU", "Powertrain ECU", "Brake Control Module", "Chassis Control ECU", "EV Battery Management"],
  },
  {
    id: "A1-28", category: "PHYS", clauseRef: "PHYS(b)",
    threat: "Physical access to vehicle network (CAN tap)",
    attackExample: "Attaching hardware sniffer to OBD or exposed CAN wiring",
    mitigations: ["M10", "M7"],
    components: ["Central Gateway ECU", "Airbag ECU", "ADAS ECU", "Brake Control Module"],
  },
];

// Tables B + C — Mitigation catalogue (M1–M29)
const MITIGATIONS = {
  M1:  { code: "M1",  group: "C", title: "Back-End Access Control",         desc: "Implement strong authentication and authorisation for all back-end server access. Use MFA, least-privilege principles, and API gateway controls." },
  M2:  { code: "M2",  group: "C", title: "Secure Cloud / Server Storage",   desc: "Encrypt data at rest and in transit. Apply storage-level access controls and regular key rotation for server-side data." },
  M3:  { code: "M3",  group: "C", title: "Insider Threat Prevention",       desc: "Implement privileged access management (PAM), background checks, and separation of duties for personnel with access to vehicle systems." },
  M4:  { code: "M4",  group: "C", title: "Logging Enforcement",             desc: "Enforce tamper-evident, centralised logging of all security-relevant events. Retain logs per regulatory requirements." },
  M5:  { code: "M5",  group: "C", title: "Data Confidentiality",            desc: "Apply TLS 1.2+ for all external communications. Encrypt sensitive vehicle data fields. Enforce certificate pinning where applicable." },
  M7:  { code: "M7",  group: "B", title: "Access Control",                  desc: "Implement role-based access control (RBAC) on all ECU interfaces. Restrict diagnostic sessions to authorised tools and roles." },
  M9:  { code: "M9",  group: "B", title: "Privilege Protection",            desc: "Enforce least-privilege execution for all ECU software components. Prevent privilege escalation via secure boot and runtime integrity checks." },
  M10: { code: "M10", group: "B", title: "Message Authentication (HMAC/MAC)", desc: "Apply AUTOSAR SecOC or equivalent MAC-based message authentication on all safety-critical CAN/LIN/Ethernet frames." },
  M11: { code: "M11", group: "B", title: "Secure Key Storage (HSM)",        desc: "Store all cryptographic keys in a Hardware Security Module (HSM) or equivalent secure element. Prevent key extraction via side-channel attacks." },
  M13: { code: "M13", group: "B", title: "DoS Detection & Rate Limiting",   desc: "Deploy intrusion detection with rate-limiting on CAN bus and network interfaces. Alert on anomalous message frequency patterns." },
  M15: { code: "M15", group: "B", title: "Malicious Message Detection",     desc: "Implement IDS/IDPS rules to detect malformed, out-of-range, or unexpected diagnostic messages on vehicle networks." },
  M16: { code: "M16", group: "B", title: "Secure OTA Update",               desc: "Sign all firmware images with a hardware-backed private key. Verify signature before installation. Support rollback to last known-good version." },
  M18: { code: "M18", group: "C", title: "Role-Based Access Control (RBAC)", desc: "Define and enforce user roles for all back-end and vehicle interfaces. Audit role assignments quarterly." },
  M19: { code: "M19", group: "C", title: "Audit Trail",                     desc: "Maintain an immutable audit trail of all privileged operations, configuration changes, and access events." },
  M23: { code: "M23", group: "B", title: "Secure Development Lifecycle (SDL)", desc: "Apply SDL practices: threat modelling, SAST/DAST, code review, penetration testing, and vulnerability management throughout development." },
  M24: { code: "M24", group: "B", title: "Data Integrity Protection",       desc: "Apply cryptographic integrity checks (hash/MAC) to all safety-critical data stored in ECU memory and transmitted over vehicle networks." },
  M29: { code: "M29", group: "B", title: "Network Segmentation",            desc: "Enforce strict firewall rules and VLAN/domain separation between safety-critical and non-safety networks at the central gateway." },
};

// ── DB init for checklist state ───────────────────────────────────────────────
async function ensureChecklistTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS annex5_checklist_state (
      id            SERIAL PRIMARY KEY,
      item_id       VARCHAR(20) NOT NULL,
      role          VARCHAR(60),
      component     VARCHAR(100),
      status        VARCHAR(30) DEFAULT 'Not Started',
      selected      BOOLEAN DEFAULT false,
      evidence_file VARCHAR(255),
      evidence_path TEXT,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, role, component)
    );
  `);
}
ensureChecklistTable().catch(console.error);

// ── Upload storage ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/annex5");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── GET /api/annex5-checklist/items ──────────────────────────────────────────
// Returns full item list with persisted state merged in
router.get("/items", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;

    // Load persisted state for this role+component
    const stateRows = await pool.query(
      "SELECT item_id, status, selected, evidence_file FROM annex5_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const stateMap = {};
    stateRows.rows.forEach(r => { stateMap[r.item_id] = r; });

    // Filter items by component applicability
    const items = ANNEX5_ITEMS
      .filter(item =>
        !component ||
        item.components.includes("ALL") ||
        item.components.includes(component)
      )
      .map(item => {
        const s = stateMap[item.id] || {};
        return {
          ...item,
          mitigationDetails: item.mitigations.map(code => MITIGATIONS[code]).filter(Boolean),
          status:        s.status    || "Not Started",
          selected:      s.selected  || false,
          evidenceFile:  s.evidence_file || null,
        };
      });

    res.json({ categories: CATEGORIES, items, mitigations: MITIGATIONS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/annex5-checklist/state ────────────────────────────────────────
// Upsert status / selected for one or many items
router.patch("/state", async (req, res) => {
  try {
    const { role, component, updates } = req.body;
    // updates: [{ itemId, status?, selected? }]
    for (const u of updates) {
      await pool.query(`
        INSERT INTO annex5_checklist_state (item_id, role, component, status, selected, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (item_id, role, component) DO UPDATE SET
          status     = COALESCE(EXCLUDED.status,   annex5_checklist_state.status),
          selected   = COALESCE(EXCLUDED.selected, annex5_checklist_state.selected),
          updated_at = NOW()
      `, [u.itemId, role, component, u.status ?? null, u.selected ?? null]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/annex5-checklist/evidence/:itemId ──────────────────────────────
router.post("/evidence/:itemId", upload.single("file"), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { role = "OEM", component = "" } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    await pool.query(`
      INSERT INTO annex5_checklist_state (item_id, role, component, status, evidence_file, evidence_path, updated_at)
      VALUES ($1, $2, $3, 'Implemented', $4, $5, NOW())
      ON CONFLICT (item_id, role, component) DO UPDATE SET
        evidence_file = EXCLUDED.evidence_file,
        evidence_path = EXCLUDED.evidence_path,
        status        = CASE
          WHEN annex5_checklist_state.status IN ('Not Started', 'In Progress')
          THEN 'Implemented'
          ELSE annex5_checklist_state.status
        END,
        updated_at    = NOW()
    `, [itemId, role, component, req.file.originalname, req.file.path]);

    res.json({ ok: true, fileName: req.file.originalname, status: 'Implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/annex5-checklist/stats ─────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;
    const stateRows = await pool.query(
      "SELECT status FROM annex5_checklist_state WHERE role=$1 AND component=$2",
      [role, component]
    );
    const total = ANNEX5_ITEMS.filter(i =>
      !component || i.components.includes("ALL") || i.components.includes(component)
    ).length;
    const counts = { "Not Started": 0, "In Progress": 0, "Implemented": 0, "Verified": 0 };
    stateRows.rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const implemented = counts["Implemented"] + counts["Verified"];
    res.json({ total, counts, compliancePercent: total ? Math.round((implemented / total) * 100) : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
