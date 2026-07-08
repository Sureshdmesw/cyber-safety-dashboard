const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const XLSX    = require("xlsx");
const pool    = require("../db");

// ── Role visibility matrix ────────────────────────────────────────
const ROLE_COMPONENTS = {
  "OEM":                       null, // sees all
  "Tier-1":                    ["Airbag ECU","Seatbelt Pretensioner ECU","OTA Module","Body Control Module","ADAS ECU","Powertrain ECU","Brake Control Module","EV Battery Management"],
  "Authority (ARAI/TÜV/ICAT)": null, // read-only, sees all
};

// ── GET /api/clauses — component-aware clause filtering ───────────
router.get("/clauses", async (req, res) => {
  try {
    const { role = "OEM", component = "", regulation = "" } = req.query;
    let query = `SELECT * FROM clause_master WHERE 1=1`;
    const params = [];
    if (regulation) {
      params.push(regulation);
      query += ` AND regulation_type = $${params.length}`;
    }
    if (component) {
      params.push(component);
      query += ` AND (applicable_components @> ARRAY[$${params.length}] OR applicable_components @> ARRAY['ALL'])`;
    }
    query += ` ORDER BY regulation_type, clause_ref`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Clause catalogue ──────────────────────────────────────────────
const CLAUSE_MAP = {
  UNR155: [
    { clause_ref: "R155 §A5.1.1", requirement: "CSMS established and documented",                     evidence_required: "CSMS policy document, version-controlled" },
    { clause_ref: "R155 §A5.1.2", requirement: "Cybersecurity governance structure defined",           evidence_required: "Org chart with CS roles, board approval record" },
    { clause_ref: "R155 §A5.1.3", requirement: "Defined roles & responsibilities for cybersecurity",  evidence_required: "RACI matrix, job descriptions" },
    { clause_ref: "R155 §A5.1.4", requirement: "Incident response process documented and tested",     evidence_required: "IRP document, tabletop exercise records" },
    { clause_ref: "R155 §A5.1.5", requirement: "Risk assessment procedure established",               evidence_required: "Risk assessment SOP, TARA methodology doc" },
    { clause_ref: "R155 §A5.2.1", requirement: "Risk identification & analysis per vehicle type",     evidence_required: "TARA report per vehicle platform" },
    { clause_ref: "R155 §A5.2.2", requirement: "Threat evaluation with impact/feasibility scoring",   evidence_required: "Threat catalog with CVSS/HEAVENS scores" },
    { clause_ref: "R155 §A5.2.3", requirement: "Monitoring & detection mechanisms in place",          evidence_required: "IDS/IDPS deployment evidence, SIEM logs" },
    { clause_ref: "R155 §A5.2.4", requirement: "Secure development lifecycle (SDL) evidence",         evidence_required: "SDL process doc, code review records, SAST reports" },
    { clause_ref: "R155 §A5.2.5", requirement: "Supplier cybersecurity management requirements",      evidence_required: "Supplier CS questionnaire, contract clauses" },
    { clause_ref: "R155 §A5.3.1", requirement: "Post-production monitoring process active",           evidence_required: "Vulnerability monitoring SOP, CVE tracking" },
    { clause_ref: "R155 §A5.3.2", requirement: "OTA update security controls implemented",            evidence_required: "OTA signing key management, rollback procedure" },
    { clause_ref: "R155 §A5.3.3", requirement: "Vulnerability handling process documented",           evidence_required: "VDP policy, patch SLA definition" },
    { clause_ref: "R155 §A5.3.4", requirement: "Incident reporting mechanism to authority",           evidence_required: "Regulatory reporting template, contact list" },
  ],
  ISO21434: [
    { clause_ref: "21434 §8.3",  requirement: "Asset identification completed for target component", evidence_required: "Asset register with security properties" },
    { clause_ref: "21434 §8.4",  requirement: "Damage scenario definition with impact rating",       evidence_required: "Damage scenario table (Safety/Financial/Privacy)" },
    { clause_ref: "21434 §8.5",  requirement: "Threat scenario derivation from damage scenarios",    evidence_required: "Threat scenario catalog linked to assets" },
    { clause_ref: "21434 §8.6",  requirement: "Attack path analysis (attack tree / STRIDE)",         evidence_required: "Attack tree diagrams, STRIDE analysis worksheet" },
    { clause_ref: "21434 §8.7",  requirement: "Risk calculation: Impact × Attack Feasibility",       evidence_required: "Risk matrix with CVSS/HEAVENS feasibility scores" },
    { clause_ref: "21434 §9.3",  requirement: "Security objectives defined per threat scenario",     evidence_required: "Cybersecurity goals document" },
    { clause_ref: "21434 §9.4",  requirement: "Security requirements traceable to goals",            evidence_required: "Requirements traceability matrix (RTM)" },
    { clause_ref: "21434 §9.5",  requirement: "Verification strategy defined for each requirement",  evidence_required: "Verification plan, test case mapping" },
    { clause_ref: "21434 §15.1", requirement: "Penetration testing performed on target ECU",         evidence_required: "Pentest report, findings log, remediation status" },
    { clause_ref: "21434 §15.2", requirement: "Fuzz testing on communication interfaces",            evidence_required: "Fuzz test results (CAN, UDS, Ethernet)" },
    { clause_ref: "21434 §15.3", requirement: "Vulnerability scanning of software components",       evidence_required: "SCA/SAST scan reports, CVE remediation log" },
    { clause_ref: "21434 §15.4", requirement: "Risk acceptance decision documented",                 evidence_required: "Signed risk acceptance record with rationale" },
  ],
  CSMS: [
    { clause_ref: "CSMS §1", requirement: "Cybersecurity policy approved by top management",         evidence_required: "Signed policy document, board minutes" },
    { clause_ref: "CSMS §2", requirement: "Organization roles and responsibilities defined",          evidence_required: "RACI matrix, appointment letters" },
    { clause_ref: "CSMS §3", requirement: "Competence management — CS training records",             evidence_required: "Training matrix, certification records" },
    { clause_ref: "CSMS §4", requirement: "Supplier cybersecurity integration requirements",          evidence_required: "Supplier CS assessment, contractual obligations" },
    { clause_ref: "CSMS §5", requirement: "Incident response management process active",             evidence_required: "IRP, escalation matrix, drill records" },
    { clause_ref: "CSMS §6", requirement: "Monitoring and logging infrastructure deployed",          evidence_required: "SIEM configuration, log retention policy" },
    { clause_ref: "CSMS §7", requirement: "Continuous improvement process established",              evidence_required: "Lessons-learned log, improvement action tracker" },
    { clause_ref: "CSMS §8", requirement: "Audit & review mechanism with defined frequency",         evidence_required: "Audit schedule, last audit report" },
  ],
};

// Seed compliance_checklist from clause_master (component-aware)
async function seedChecklist(role, component) {
  const clauses = await pool.query(
    `SELECT * FROM clause_master
     WHERE applicable_components @> ARRAY[$1] OR applicable_components @> ARRAY['ALL']`,
    [component]
  );
  for (const c of clauses.rows) {
    await pool.query(
      `INSERT INTO compliance_checklist (role,component,standard,clause_ref,requirement,evidence_required,status)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending')
       ON CONFLICT (role,component,standard,clause_ref) DO NOTHING`,
      [role, component, c.regulation_type, c.clause_ref, c.requirement_description, c.evidence_template]
    );
  }
}

// ── GET /api/analytics/:role/:component ──────────────────────────
router.get("/:role/:component", async (req, res) => {
  try {
    const { role, component } = req.params;
    await seedChecklist(role, component);

    // Sync statuses from evidence table (latest non-superseded per clause)
    await pool.query(`
      UPDATE compliance_checklist cl
      SET status = ev.validation_status
      FROM (
        SELECT DISTINCT ON (clause_ref) clause_ref, validation_status
        FROM evidence
        WHERE role=$1 AND component=$2 AND is_superseded=false
        ORDER BY clause_ref, uploaded_at DESC
      ) ev
      WHERE cl.role=$1 AND cl.component=$2 AND cl.clause_ref = ev.clause_ref
    `, [role, component]);

    const cl = await pool.query(
      `SELECT standard, clause_ref, status FROM compliance_checklist WHERE role=$1 AND component=$2`,
      [role, component]
    );
    const rows = cl.rows;
    const total        = rows.length || 1;
    const compliant    = rows.filter(r => r.status === "Compliant").length;
    const partial      = rows.filter(r => r.status === "Partial").length;
    const gap          = rows.filter(r => r.status === "Gap").length;
    const pending      = rows.filter(r => r.status === "Pending").length;

    const pct = (std) => {
      const s = rows.filter(r => r.standard === std);
      if (!s.length) return 0;
      const comp = s.filter(r => r.status === "Compliant").length;
      const part = s.filter(r => r.status === "Partial").length;
      return Math.round(((comp + part * 0.5) / s.length) * 100);
    };

    // Evidence coverage: clauses with at least one non-superseded evidence file
    const evResult = await pool.query(
      `SELECT COUNT(DISTINCT clause_ref) AS covered
       FROM evidence WHERE role=$1 AND component=$2 AND is_superseded=false`,
      [role, component]
    );
    const covered       = parseInt(evResult.rows[0].covered, 10) || 0;
    const evidenceCoverage = Math.round((covered / total) * 100);

    // Per-standard breakdown for charts
    const standards = ["UNR155","ISO21434","CSMS"].map(std => {
      const s = rows.filter(r => r.standard === std);
      return {
        standard,
        total:     s.length,
        compliant: s.filter(r => r.status === "Compliant").length,
        partial:   s.filter(r => r.status === "Partial").length,
        gap:       s.filter(r => r.status === "Gap").length,
        score:     pct(std),
      };
    });

    const clauseData = rows.map(r => ({
      clause_ref: r.clause_ref,
      standard:   r.standard,
      status:     r.status,
      score:      r.status === "Compliant" ? 100 : r.status === "Partial" ? 60 : r.status === "Gap" ? 20 : 0,
    }));

    res.json({
      component,
      totalClauses:       total,
      compliant,
      partial,
      gap,
      pending,
      score:              Math.round(((compliant + partial * 0.5) / total) * 100),
      evidenceCoverage,
      unr155Compliance:   pct("UNR155"),
      iso21434Compliance: pct("ISO21434"),
      csmsCompliance:     pct("CSMS"),
      overallCompliance:  Math.round(((compliant + partial * 0.5) / total) * 100),
      standards,
      overall:            { compliant, partial, gap },
      clauseData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/checklist/:role/:component ─────────────────
router.get("/checklist/:role/:component", async (req, res) => {
  try {
    const { role, component } = req.params;
    await seedChecklist(role, component);

    const result = await pool.query(
      `SELECT cl.*,
              ev.file_name, ev.validation_score, ev.validation_status,
              ev.uploaded_at AS evidence_date, ev.version, ev.owner,
              ev.missing_elements, ev.is_expired
       FROM compliance_checklist cl
       LEFT JOIN LATERAL (
         SELECT * FROM evidence e
         WHERE e.clause_ref = cl.clause_ref AND e.role=$1 AND e.component=$2
           AND e.is_superseded = false
         ORDER BY e.uploaded_at DESC LIMIT 1
       ) ev ON true
       WHERE cl.role=$1 AND cl.component=$2
       ORDER BY cl.standard, cl.clause_ref`,
      [role, component]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Agency upload: DB table init ────────────────────────────────
async function ensureAgencyTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_validations (
      id            SERIAL PRIMARY KEY,
      officer_name  VARCHAR(100),
      agency        VARCHAR(100),
      role          VARCHAR(60),
      component     VARCHAR(100),
      regulation    VARCHAR(50),
      clause_ref    VARCHAR(50),
      clause_title  TEXT,
      required_evidence TEXT,
      expected_params   TEXT,
      status        VARCHAR(20) DEFAULT 'Pending',
      remarks       TEXT,
      approval_date DATE,
      is_approved   BOOLEAN DEFAULT false,
      uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
ensureAgencyTable().catch(e => console.error("Agency table init:", e.message));

// ── GET /api/analytics/template — generate clause template xlsx ──
router.get("/template", (req, res) => {
  const { regulation = "", component = "" } = req.query;
  const allClauses = {
    UNR155: [
      { ref: "R155 §A5.1.1", title: "CSMS Established",           evidence: "CSMS policy document",          params: "Version-controlled, board-approved" },
      { ref: "R155 §A5.1.2", title: "Governance Structure",        evidence: "Org chart with CS roles",         params: "Board approval record included" },
      { ref: "R155 §A5.1.3", title: "Roles & Responsibilities",    evidence: "RACI matrix, job descriptions",    params: "All CS roles mapped" },
      { ref: "R155 §A5.1.4", title: "Incident Response Process",   evidence: "IRP document, tabletop records",   params: "Tested within 12 months" },
      { ref: "R155 §A5.1.5", title: "Risk Assessment Procedure",   evidence: "Risk assessment SOP",              params: "TARA methodology documented" },
      { ref: "R155 §A5.2.1", title: "Risk Identification",         evidence: "TARA report per vehicle platform", params: "Impact & Feasibility scoring" },
      { ref: "R155 §A5.2.2", title: "Threat Evaluation",           evidence: "Threat catalog with CVSS scores",  params: "CVSS/HEAVENS scores present" },
      { ref: "R155 §A5.2.3", title: "Monitoring & Detection",      evidence: "IDS logs, SIEM evidence",          params: "Log retention >= 6 months" },
      { ref: "R155 §A5.2.4", title: "Secure Development Lifecycle",evidence: "SDL process doc, SAST reports",    params: "Code review records present" },
      { ref: "R155 §A5.2.5", title: "Supplier CS Management",      evidence: "Supplier questionnaire",           params: "Contract clauses included" },
      { ref: "R155 §A5.3.1", title: "Post-Production Monitoring",  evidence: "CVE tracking, vulnerability SOP",  params: "Active monitoring confirmed" },
      { ref: "R155 §A5.3.2", title: "OTA Update Security",         evidence: "OTA signing key management",       params: "Rollback procedure documented" },
      { ref: "R155 §A5.3.3", title: "Vulnerability Handling",      evidence: "VDP policy, patch SLA",            params: "SLA definition present" },
      { ref: "R155 §A5.3.4", title: "Incident Reporting",          evidence: "Regulatory reporting template",    params: "Authority contact list present" },
    ],
    ISO21434: [
      { ref: "21434 §8.3",  title: "Asset Identification",         evidence: "Asset register",                  params: "Security properties defined" },
      { ref: "21434 §8.4",  title: "Damage Scenario Definition",   evidence: "Damage scenario table",            params: "Safety/Financial/Privacy rated" },
      { ref: "21434 §8.5",  title: "Threat Scenario Derivation",   evidence: "Threat scenario catalog",          params: "Linked to assets" },
      { ref: "21434 §8.6",  title: "Attack Path Analysis",         evidence: "Attack tree diagrams",             params: "STRIDE analysis included" },
      { ref: "21434 §8.7",  title: "Risk Calculation",             evidence: "Risk matrix",                     params: "Impact x Feasibility scored" },
      { ref: "21434 §9.3",  title: "Security Objectives",          evidence: "Cybersecurity goals document",     params: "Per threat scenario" },
      { ref: "21434 §9.4",  title: "Security Requirements",        evidence: "Requirements traceability matrix", params: "RTM traceable to goals" },
      { ref: "21434 §9.5",  title: "Verification Strategy",        evidence: "Verification plan",               params: "Test case mapping present" },
      { ref: "21434 §15.1", title: "Penetration Testing",          evidence: "Pentest report",                  params: "Findings log, remediation status" },
      { ref: "21434 §15.2", title: "Fuzz Testing",                 evidence: "Fuzz test results",               params: "CAN, UDS, Ethernet covered" },
      { ref: "21434 §15.3", title: "Vulnerability Scanning",       evidence: "SCA/SAST scan reports",           params: "CVE remediation log present" },
      { ref: "21434 §15.4", title: "Risk Acceptance Decision",     evidence: "Signed risk acceptance record",    params: "Rationale documented" },
    ],
    CSMS: [
      { ref: "CSMS §1", title: "Cybersecurity Policy",             evidence: "Signed policy document",          params: "Board minutes included" },
      { ref: "CSMS §2", title: "Roles & Responsibilities",         evidence: "RACI matrix",                     params: "Appointment letters present" },
      { ref: "CSMS §3", title: "Competence Management",            evidence: "Training matrix",                 params: "Certification records present" },
      { ref: "CSMS §4", title: "Supplier CS Integration",          evidence: "Supplier CS assessment",          params: "Contractual obligations defined" },
      { ref: "CSMS §5", title: "Incident Response",                evidence: "IRP, escalation matrix",          params: "Drill records present" },
      { ref: "CSMS §6", title: "Monitoring & Logging",             evidence: "SIEM configuration",              params: "Log retention policy defined" },
      { ref: "CSMS §7", title: "Continuous Improvement",           evidence: "Lessons-learned log",             params: "Improvement action tracker" },
      { ref: "CSMS §8", title: "Audit & Review",                   evidence: "Audit schedule, last audit report",params: "Frequency defined" },
    ],
  };

  let rows = [];
  if (regulation && allClauses[regulation]) {
    rows = allClauses[regulation];
  } else {
    rows = [...allClauses.UNR155, ...allClauses.ISO21434, ...allClauses.CSMS];
  }

  const sheetRows = rows.map(r => ({
    "Clause Ref":          r.ref,
    "Clause Title":        r.title,
    "Required Evidence":   r.evidence,
    "Expected Parameters": r.params,
    "Component":           component || "(fill in)",
    "Status":              "Pending",
    "Remarks":             "",
    "Officer Name":        "",
    "Agency":              "",
    "Approval Date":       "",
  }));

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  ws["!cols"] = [14,28,32,36,20,12,24,18,16,14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Validation Template");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="validation-template-${regulation || "all"}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ── POST /api/analytics/agency-upload — officer validation file ──
const agencyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/agency-upload", agencyUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { role = "OEM", component = "", officer_name = "", agency = "" } = req.body;

    const wb   = XLSX.read(req.file.buffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const results = [];
    for (const row of rows) {
      const clauseRef     = String(row["Clause Ref"]     || row.clause_ref     || "").trim();
      const clauseTitle   = String(row["Clause Title"]   || row.clause_title   || "").trim();
      const reqEvidence   = String(row["Required Evidence"] || row.required_evidence || "").trim();
      const expectedParams= String(row["Expected Parameters"] || row.expected_params || "").trim();
      const statusRaw     = String(row["Status"]         || row.status         || "").trim();
      const remarks       = String(row["Remarks"]        || row.remarks        || "").trim();
      const approvalDate  = String(row["Approval Date"]  || row.approval_date  || "").trim() || null;
      const officerName   = String(row["Officer Name"]   || row.officer_name   || officer_name).trim();
      const agencyName    = String(row["Agency"]         || row.agency         || agency).trim();

      if (!clauseRef) continue;

      // Determine regulation from clause ref
      const regulation = clauseRef.startsWith("R155") ? "UNR155"
                       : clauseRef.startsWith("21434") ? "ISO21434"
                       : clauseRef.startsWith("CSMS")  ? "CSMS" : "";

      // Validation logic
      const allFilled = clauseRef && reqEvidence && expectedParams;
      let status;
      if (statusRaw && ["Compliant","Partial","Gap"].includes(statusRaw)) {
        status = statusRaw;
      } else if (!allFilled) {
        status = "Gap";
      } else if (remarks.toLowerCase().includes("partial") || remarks.toLowerCase().includes("incomplete")) {
        status = "Partial";
      } else {
        status = "Compliant";
      }

      const r = await pool.query(
        `INSERT INTO agency_validations
           (officer_name,agency,role,component,regulation,clause_ref,clause_title,
            required_evidence,expected_params,status,remarks,approval_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT DO NOTHING RETURNING *`,
        [officerName, agencyName, role, component, regulation, clauseRef, clauseTitle,
         reqEvidence, expectedParams, status, remarks,
         approvalDate || null]
      );

      // Sync compliance_checklist
      await pool.query(
        `UPDATE compliance_checklist SET status=$1
         WHERE role=$2 AND component=$3 AND clause_ref=$4`,
        [status, role, component, clauseRef]
      );

      results.push({ clauseRef, status, regulation });
    }

    const compliant = results.filter(r => r.status === "Compliant").length;
    const partial   = results.filter(r => r.status === "Partial").length;
    const gap       = results.filter(r => r.status === "Gap").length;
    const total     = results.length || 1;
    const score     = Math.round(((compliant + partial * 0.5) / total) * 100);

    res.json({ processed: results.length, compliant, partial, gap, score, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/analytics/agency-approve — authority approves ──────
router.post("/agency-approve", async (req, res) => {
  try {
    const { role, component, regulation, officer_name, agency } = req.body;
    if (role !== "Authority (ARAI/TÜV/ICAT)")
      return res.status(403).json({ error: "Only Authority role can approve" });
    await pool.query(
      `UPDATE agency_validations SET is_approved=true, approval_date=CURRENT_DATE
       WHERE component=$1 AND ($2='' OR regulation=$2)`,
      [component, regulation || ""]
    );
    res.json({ success: true, message: `Approved by ${officer_name} (${agency})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/agency-status/:component ──────────────────
router.get("/agency-status/:component", async (req, res) => {
  try {
    const { component } = req.params;
    const { regulation = "" } = req.query;
    let q = `SELECT * FROM agency_validations WHERE component=$1`;
    const params = [component];
    if (regulation) { params.push(regulation); q += ` AND regulation=$${params.length}`; }
    q += ` ORDER BY uploaded_at DESC`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manual upload (CSV/XLSX) ──────────────────────────────────────
const manualUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/manual-upload", manualUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { role = "OEM", component = "" } = req.body;

    const wb   = XLSX.read(req.file.buffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const results = [];
    for (const row of rows) {
      const clauseRef = String(row.clause_ref || row["Clause Ref"] || row.clause || "").trim();
      const score     = parseInt(row.validation_score || row.score || row.Score || 50, 10);
      const riskLevel = score >= 80 ? "Low" : score >= 50 ? "Medium" : "High";
      const status    = score >= 80 ? "Compliant" : score >= 50 ? "Partial" : "Gap";
      if (!clauseRef) continue;

      const r = await pool.query(
        `INSERT INTO manual_uploads (role,component,clause_ref,validation_score,risk_level,status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [role, component, clauseRef, score, riskLevel, status]
      );
      // Also update checklist
      await pool.query(
        `UPDATE compliance_checklist SET status=$1 WHERE role=$2 AND component=$3 AND clause_ref=$4`,
        [status, role, component, clauseRef]
      );
      results.push(r.rows[0]);
    }
    res.json({ inserted: results.length, rows: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/manual-uploads/:role/:component ───────────
router.get("/manual-uploads/:role/:component", async (req, res) => {
  try {
    const { role, component } = req.params;
    const result = await pool.query(
      `SELECT * FROM manual_uploads WHERE role=$1 AND component=$2 ORDER BY uploaded_at DESC`,
      [role, component]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/analytics/validate-selected ────────────────────────────────────
router.post("/validate-selected", async (req, res) => {
  try {
    const { selectedClauseIds = [], component = "", role = "OEM" } = req.body;
    if (!selectedClauseIds.length) return res.status(400).json({ error: "No clause IDs provided" });

    const isCompleted = (s) => s === "Implemented" || s === "Verified" || s === "Compliant" || s === "Completed";

    // Fetch statuses across all 3 checklist tables
    const [annex5, tara, csms] = await Promise.all([
      pool.query(`SELECT item_id AS id, status, evidence_file FROM annex5_checklist_state WHERE role=$1 AND component=$2`, [role, component]),
      pool.query(`SELECT item_id AS id, status, evidence_file FROM tara_checklist_state WHERE role=$1 AND component=$2`, [role, component]),
      pool.query(`SELECT item_id AS id, status, evidence_file FROM csms_checklist_state WHERE role=$1 AND component=$2`, [role, component]),
    ]);

    // Build map: id → { status, evidenceFile }
    const stateMap = {};
    [...annex5.rows, ...tara.rows, ...csms.rows].forEach(r => {
      stateMap[r.id] = { status: r.status, evidenceFile: r.evidence_file };
    });

    // Auto-promote: if evidence exists but status is still Not Started/In Progress → Implemented
    const promotions = [];
    for (const id of selectedClauseIds) {
      const entry = stateMap[id];
      if (entry && entry.evidenceFile && !isCompleted(entry.status)) {
        entry.status = "Implemented";
        promotions.push(id);
      }
      // If no DB entry at all and no evidence → treat as Not Started
      if (!entry) stateMap[id] = { status: "Not Started", evidenceFile: null };
    }

    // Persist promotions back to each table
    for (const id of promotions) {
      const table = id.startsWith("CTSA") || id.startsWith("CRRA") ? "tara_checklist_state"
                  : id.startsWith("CSMS") ? "csms_checklist_state"
                  : "annex5_checklist_state";
      const promotedStatus = table === "tara_checklist_state" ? "Completed" : "Implemented";
      await pool.query(
        `UPDATE ${table} SET status=$1, updated_at=NOW() WHERE item_id=$2 AND role=$3 AND component=$4`,
        [promotedStatus, id, role, component]
      );
      stateMap[id].status = promotedStatus;
    }

    // Selected scope compliance
    const selectedTotal      = selectedClauseIds.length;
    const selectedCompleted  = selectedClauseIds.filter(id => isCompleted(stateMap[id]?.status || "Not Started")).length;
    const selectedCompliance = Math.round((selectedCompleted / selectedTotal) * 100);

    // Overall compliance (all persisted items)
    const allStatuses       = Object.values(stateMap).map(v => v.status);
    const overallTotal      = allStatuses.length || 1;
    const overallCompleted  = allStatuses.filter(isCompleted).length;
    const overallCompliance = Math.round((overallCompleted / overallTotal) * 100);

    const difference = selectedCompliance - overallCompliance;

    // Section-level breakdown
    const sectionOf = (id) => {
      if (id.startsWith("CTSA")) return "TARA-CTSA";
      if (id.startsWith("CRRA")) return "TARA-CRRA";
      if (id.startsWith("CSMS")) return "CSMS";
      return "Annex5";
    };

    const sectionMap = {};
    selectedClauseIds.forEach(id => {
      const sec = sectionOf(id);
      if (!sectionMap[sec]) sectionMap[sec] = { total: 0, completed: 0 };
      sectionMap[sec].total++;
      if (isCompleted(stateMap[id]?.status || "Not Started")) sectionMap[sec].completed++;
    });

    const sectionBreakdown = {};
    Object.entries(sectionMap).forEach(([sec, { total, completed }]) => {
      sectionBreakdown[sec] = Math.round((completed / total) * 100);
    });

    // Persist submission record
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_submissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(60), component VARCHAR(100),
        clause_ids TEXT[], submitted_at TIMESTAMP DEFAULT NOW(),
        selected_compliance INT, overall_compliance INT, difference INT
      )
    `);
    await pool.query(
      `INSERT INTO validation_submissions (role, component, clause_ids, selected_compliance, overall_compliance, difference)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [role, component, selectedClauseIds, selectedCompliance, overallCompliance, difference]
    );

    // Return per-item detail so frontend can sync status display
    const itemDetails = selectedClauseIds.map(id => ({
      id,
      status:       stateMap[id]?.status || "Not Started",
      evidenceFile: stateMap[id]?.evidenceFile || null,
      completed:    isCompleted(stateMap[id]?.status || "Not Started"),
    }));

    res.json({
      selectedCompliance, overallCompliance, difference,
      sectionBreakdown, selectedTotal, selectedCompleted,
      promotedCount: promotions.length,
      itemDetails,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/kpi-details ──────────────────────────────────────────────
router.get("/kpi-details", async (req, res) => {
  try {
    const { type, role = "OEM", component = "" } = req.query;

    const isCompleted = (s) =>
      ["Implemented", "Verified", "Compliant", "Completed"].includes(s);

    // Helper: fetch all items + state from a checklist table
    const fetchState = async (table, idCol = "item_id") => {
      const r = await pool.query(
        `SELECT ${idCol} AS id, status, evidence_file FROM ${table} WHERE role=$1 AND component=$2`,
        [role, component]
      );
      return r.rows;
    };

    if (type === "crash_integrity") {
      // Crash-signal integrity = Annex5 items in 4.3.2 (comm channels) + 4.3.1 (back-end)
      const rows = await fetchState("annex5_checklist_state");
      const commItems = rows.filter(r =>
        r.id.startsWith("A1-05") || r.id.startsWith("A1-06") ||
        r.id.startsWith("A1-07") || r.id.startsWith("A1-08") || r.id.startsWith("A1-09")
      );
      const total     = commItems.length || 1;
      const secured   = commItems.filter(r => isCompleted(r.status)).length;
      const pct       = Math.round((secured / total) * 100);
      const sections  = { "4.3.2 Communication": commItems };
      return res.json({
        kpi: "crash_integrity",
        value: `${pct}%`,
        calculation: `${secured} of ${total} communication-channel threats secured`,
        formula: "(securedCrashSignals / totalCrashSignals) × 100",
        items: commItems.map(r => ({ clause: r.id, status: r.status, evidenceFile: r.evidence_file || null })),
        sectionBreakdown: Object.fromEntries(
          Object.entries(sections).map(([s, its]) => [
            s, Math.round((its.filter(i => isCompleted(i.status)).length / (its.length || 1)) * 100)
          ])
        ),
        statusCounts: {
          "Not Started":  commItems.filter(r => r.status === "Not Started").length,
          "In Progress":  commItems.filter(r => r.status === "In Progress").length,
          "Implemented":  commItems.filter(r => r.status === "Implemented").length,
          "Verified":     commItems.filter(r => r.status === "Verified").length,
        },
      });
    }

    if (type === "active_threats") {
      const [a5, tara, csms] = await Promise.all([
        fetchState("annex5_checklist_state"),
        fetchState("tara_checklist_state"),
        fetchState("csms_checklist_state"),
      ]);
      const all = [...a5, ...tara, ...csms];
      const active = all.filter(r => r.status === "In Progress" || r.status === "Not Started");
      const sectionOf = (id) => {
        if (id.startsWith("CTSA") || id.startsWith("CRRA")) return "TARA";
        if (id.startsWith("CSMS")) return "CSMS";
        const cat = id.replace("A1-", "");
        const n = parseInt(cat, 10);
        if (n <= 4)  return "4.3.1 Back-End";
        if (n <= 9)  return "4.3.2 Communication";
        if (n <= 13) return "4.3.3 Updates";
        if (n <= 15) return "4.3.4 Human Actions";
        if (n <= 19) return "4.3.5 External";
        if (n <= 22) return "4.3.6 Data/Code";
        return "4.3.7 Vulnerabilities";
      };
      const secMap = {};
      active.forEach(r => {
        const s = sectionOf(r.id);
        secMap[s] = (secMap[s] || 0) + 1;
      });
      return res.json({
        kpi: "active_threats",
        value: active.length,
        calculation: `${active.filter(r=>r.status==="In Progress").length} In Progress + ${active.filter(r=>r.status==="Not Started").length} Not Started`,
        formula: "count(status == 'In Progress' OR 'Not Started')",
        items: active.map(r => ({ clause: r.id, status: r.status, evidenceFile: r.evidence_file || null })),
        sectionBreakdown: secMap,
        statusCounts: {
          "Not Started": active.filter(r => r.status === "Not Started").length,
          "In Progress": active.filter(r => r.status === "In Progress").length,
        },
      });
    }

    if (type === "critical_threats") {
      // High-risk Annex5 items (categories 4.3.2, 4.3.6, 4.3.7) not yet Verified
      const rows = await fetchState("annex5_checklist_state");
      const HIGH_RISK_IDS = ["A1-05","A1-06","A1-07","A1-08","A1-09","A1-20","A1-22","A1-23","A1-24","A1-25","A1-26"];
      const critical = rows.filter(r =>
        HIGH_RISK_IDS.includes(r.id) && r.status !== "Verified"
      );
      const sectionOf = (id) => {
        const n = parseInt(id.replace("A1-",""), 10);
        if (n >= 5  && n <= 9)  return "4.3.2 Communication Channels";
        if (n >= 20 && n <= 22) return "4.3.6 Vehicle Data / Code";
        return "4.3.7 Vulnerabilities";
      };
      const secMap = {};
      critical.forEach(r => {
        const s = sectionOf(r.id);
        secMap[s] = (secMap[s] || 0) + 1;
      });
      return res.json({
        kpi: "critical_threats",
        value: critical.length,
        calculation: `${critical.length} high-risk unverified threats across Annex 5`,
        formula: "count(riskLevel == 'High' AND status != 'Verified')",
        items: critical.map(r => ({ clause: r.id, status: r.status, evidenceFile: r.evidence_file || null })),
        sectionBreakdown: secMap,
        statusCounts: {
          "Not Started":  critical.filter(r => r.status === "Not Started").length,
          "In Progress":  critical.filter(r => r.status === "In Progress").length,
          "Implemented":  critical.filter(r => r.status === "Implemented").length,
        },
      });
    }

    if (type === "asil_level") {
      const ASIL_MAP = {
        "Airbag ECU":               { asil: "ASIL D", goal: "Prevent unintended airbag deployment" },
        "Seatbelt Pretensioner ECU":{ asil: "ASIL D", goal: "Prevent unintended pretensioner activation" },
        "Brake Control Module":     { asil: "ASIL D", goal: "Ensure braking system integrity" },
        "ADAS ECU":                 { asil: "ASIL C", goal: "Safe autonomous driving decisions" },
        "Powertrain ECU":           { asil: "ASIL C", goal: "Prevent unintended acceleration" },
        "EV Battery Management":    { asil: "ASIL C", goal: "Prevent thermal runaway" },
        "Chassis Control ECU":      { asil: "ASIL B", goal: "Maintain vehicle stability" },
        "Central Gateway ECU":      { asil: "ASIL B", goal: "Secure inter-ECU communication" },
        "OTA Module":               { asil: "ASIL B", goal: "Ensure update integrity" },
        "Telematics Control Unit":  { asil: "ASIL A", goal: "Secure remote connectivity" },
        "Body Control Module":      { asil: "ASIL A", goal: "Prevent unintended body actuation" },
        "Infotainment Head Unit":   { asil: "QM",     goal: "No direct safety impact" },
      };
      const ORDER = ["ASIL D","ASIL C","ASIL B","ASIL A","QM"];
      const allEntries = Object.entries(ASIL_MAP).map(([comp, v]) => ({ component: comp, ...v }));
      const current    = ASIL_MAP[component] || { asil: "QM", goal: "No direct safety impact" };
      const sectionBreakdown = {};
      ORDER.forEach(lvl => {
        sectionBreakdown[lvl] = allEntries.filter(e => e.asil === lvl).length;
      });
      return res.json({
        kpi: "asil_level",
        value: current.asil,
        calculation: `${component} is classified as ${current.asil} — ${current.goal}`,
        formula: "highestASILFromComponents()",
        items: allEntries.map(e => ({ clause: e.component, status: e.asil, evidenceFile: e.goal })),
        sectionBreakdown,
        statusCounts: Object.fromEntries(ORDER.map(lvl => [lvl, allEntries.filter(e => e.asil === lvl).length])),
      });
    }

    res.status(400).json({ error: "Unknown KPI type" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/validation-results ────────────────────────────────────
router.get("/validation-results", async (req, res) => {
  try {
    const { role = "OEM", component = "", scope = "all" } = req.query;
    const isCompleted = (s) =>
      ["Implemented", "Verified", "Compliant", "Completed"].includes(s);

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

    const buildItem = (r, source) => ({
      id:           r.id,
      clause:       r.id,
      source,
      status:       r.status || "Not Started",
      risk:         r.risk_level || (r.id.startsWith("A1-") ? "High" : "Medium"),
      evidence:     !!r.evidence_file,
      evidenceFile: r.evidence_file || null,
      selected:     r.selected || false,
      completed:    isCompleted(r.status || "Not Started"),
    });

    const allItems = [
      ...a5.rows.map(r => buildItem(r, "Annex5")),
      ...tara.rows.map(r => buildItem(r, "TARA")),
      ...csms.rows.map(r => buildItem(r, "CSMS")),
    ];

    const selectedItems = allItems.filter(i => i.selected);
    const items = scope === "selected" && selectedItems.length > 0 ? selectedItems : allItems;

    const total      = items.length || 1;
    const completed  = items.filter(i => i.completed).length;
    const compliance = Math.round((completed / total) * 100);

    const riskDist = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    items.forEach(i => { if (riskDist[i.risk] !== undefined) riskDist[i.risk]++; });

    const sectionBreakdown = {};
    items.forEach(i => {
      const sec = i.source;
      if (!sectionBreakdown[sec]) sectionBreakdown[sec] = { total: 0, completed: 0 };
      sectionBreakdown[sec].total++;
      if (i.completed) sectionBreakdown[sec].completed++;
    });
    const sectionPct = {};
    Object.entries(sectionBreakdown).forEach(([s, v]) => {
      sectionPct[s] = Math.round((v.completed / (v.total || 1)) * 100);
    });

    res.json({
      component, role,
      scope: scope === "selected" && selectedItems.length > 0 ? "selected" : "all",
      compliance, total, completed,
      riskDistribution: riskDist,
      sectionBreakdown: sectionPct,
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, CLAUSE_MAP, seedChecklist };
