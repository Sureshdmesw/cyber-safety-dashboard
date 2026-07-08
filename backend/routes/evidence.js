const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const pool     = require("../db");

// ── Upload directory ──────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "../uploads/evidence");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|docx|doc|xlsx|xls|png|jpg|jpeg|zip)$/i.test(file.originalname);
    cb(ok ? null : new Error("Unsupported file type"), ok);
  },
});

// ── Clause master (keyword map) ───────────────────────────────────
const CLAUSE_MASTER = {
  "R155 §A5.1.1": { keywords: ["csms","policy","version control","approval","governance"],          evidenceType: "Policy"       },
  "R155 §A5.1.2": { keywords: ["governance","org chart","roles","board","cybersecurity"],            evidenceType: "Policy"       },
  "R155 §A5.1.3": { keywords: ["raci","roles","responsibilities","job description"],                 evidenceType: "Procedure"    },
  "R155 §A5.1.4": { keywords: ["incident response","irp","tabletop","escalation"],                  evidenceType: "IRP Record"   },
  "R155 §A5.1.5": { keywords: ["risk assessment","tara","methodology","sop"],                        evidenceType: "Risk Assessment"},
  "R155 §A5.2.1": { keywords: ["tara","threat","risk","vehicle","platform","analysis"],              evidenceType: "TARA Document"},
  "R155 §A5.2.2": { keywords: ["threat","cvss","heavens","feasibility","impact","scoring"],          evidenceType: "TARA Document"},
  "R155 §A5.2.3": { keywords: ["ids","idps","siem","monitoring","detection","log"],                  evidenceType: "Report"       },
  "R155 §A5.2.4": { keywords: ["sdl","secure development","code review","sast","lifecycle"],         evidenceType: "Procedure"    },
  "R155 §A5.2.5": { keywords: ["supplier","questionnaire","contract","third party","vendor"],        evidenceType: "Audit Record" },
  "R155 §A5.3.1": { keywords: ["monitoring","cve","vulnerability","post-production","tracking"],     evidenceType: "Report"       },
  "R155 §A5.3.2": { keywords: ["ota","signing","rollback","update","integrity"],                     evidenceType: "Procedure"    },
  "R155 §A5.3.3": { keywords: ["vdp","patch","vulnerability","handling","sla"],                      evidenceType: "Policy"       },
  "R155 §A5.3.4": { keywords: ["reporting","authority","regulatory","incident","contact"],           evidenceType: "IRP Record"   },
  "21434 §8.3":   { keywords: ["asset","register","security","property","identification"],           evidenceType: "TARA Document"},
  "21434 §8.4":   { keywords: ["damage","scenario","impact","safety","financial","privacy"],         evidenceType: "TARA Document"},
  "21434 §8.5":   { keywords: ["threat","scenario","catalog","asset","derivation"],                  evidenceType: "TARA Document"},
  "21434 §8.6":   { keywords: ["attack","tree","stride","path","analysis"],                          evidenceType: "TARA Document"},
  "21434 §8.7":   { keywords: ["risk","matrix","cvss","heavens","feasibility","calculation"],        evidenceType: "Risk Assessment"},
  "21434 §9.3":   { keywords: ["security","objective","goal","cybersecurity","threat"],              evidenceType: "Policy"       },
  "21434 §9.4":   { keywords: ["requirement","traceability","rtm","traceable","goal"],               evidenceType: "Report"       },
  "21434 §9.5":   { keywords: ["verification","plan","test","strategy","requirement"],               evidenceType: "Report"       },
  "21434 §15.1":  { keywords: ["pentest","penetration","finding","remediation","report"],            evidenceType: "Report"       },
  "21434 §15.2":  { keywords: ["fuzz","fuzzing","can","uds","ethernet","interface"],                 evidenceType: "Report"       },
  "21434 §15.3":  { keywords: ["sca","sast","scan","cve","vulnerability","software"],                evidenceType: "Report"       },
  "21434 §15.4":  { keywords: ["risk acceptance","signed","rationale","decision","record"],          evidenceType: "Audit Record" },
  "CSMS §1":      { keywords: ["policy","top management","signed","board","cybersecurity"],          evidenceType: "Policy"       },
  "CSMS §2":      { keywords: ["raci","roles","responsibilities","appointment","organization"],       evidenceType: "Policy"       },
  "CSMS §3":      { keywords: ["training","competence","certification","matrix","records"],          evidenceType: "Audit Record" },
  "CSMS §4":      { keywords: ["supplier","assessment","contractual","obligation","vendor"],         evidenceType: "Audit Record" },
  "CSMS §5":      { keywords: ["incident","response","escalation","drill","irp"],                   evidenceType: "IRP Record"   },
  "CSMS §6":      { keywords: ["siem","logging","monitoring","log retention","infrastructure"],      evidenceType: "Report"       },
  "CSMS §7":      { keywords: ["improvement","lessons learned","action","tracker","continuous"],     evidenceType: "Procedure"    },
  "CSMS §8":      { keywords: ["audit","review","schedule","frequency","report"],                   evidenceType: "Audit Record" },
};

// ── DB table init ─────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS evidence (
      id                SERIAL PRIMARY KEY,
      regulation_type   VARCHAR(50),
      clause_ref        VARCHAR(50),
      title             TEXT,
      evidence_type     VARCHAR(50),
      version           VARCHAR(20) DEFAULT '1.0',
      owner             VARCHAR(100),
      department        VARCHAR(100),
      role              VARCHAR(60),
      component         VARCHAR(100),
      file_name         VARCHAR(255),
      file_path         TEXT,
      validation_status VARCHAR(20) DEFAULT 'Pending',
      validation_score  INT DEFAULT 0,
      missing_elements  TEXT[],
      is_superseded     BOOLEAN DEFAULT false,
      validity_months   INT DEFAULT 12,
      uploaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified_by       VARCHAR(100),
      modified_at       TIMESTAMP,
      override_reason   TEXT
    );

    CREATE TABLE IF NOT EXISTS evidence_audit_log (
      id          SERIAL PRIMARY KEY,
      evidence_id INT REFERENCES evidence(id) ON DELETE CASCADE,
      action      VARCHAR(50),
      old_status  VARCHAR(20),
      new_status  VARCHAR(20),
      changed_by  VARCHAR(100),
      reason      TEXT,
      changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
ensureTables().catch(e => console.error("Evidence table init:", e.message));

// ── Validation engine ─────────────────────────────────────────────
function validateEvidence(filename, clauseRef, title = "", evidenceType = "") {
  const master = CLAUSE_MASTER[clauseRef];
  if (!master) return { score: 50, status: "Partial", missing: [] };

  const text = `${filename} ${title} ${evidenceType}`.toLowerCase();
  const required = master.keywords;
  const found    = required.filter(kw => text.includes(kw.toLowerCase()));
  const missing  = required.filter(kw => !text.includes(kw.toLowerCase()));

  const pct    = found.length / required.length;
  const score  = Math.round(pct * 100);
  const status = score >= 80 ? "Compliant" : score >= 50 ? "Partial" : "Gap";

  return { score, status, missing };
}

// ── POST /api/evidence/upload ─────────────────────────────────────
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const {
      regulation_type, clause_ref, title, evidence_type,
      version = "1.0", owner, department, role, component,
      validity_months = 12,
    } = req.body;

    if (!clause_ref || !role || !component)
      return res.status(400).json({ error: "clause_ref, role, component required" });

    const { score, status, missing } = validateEvidence(
      req.file.originalname, clause_ref, title, evidence_type
    );

    // Mark previous versions as superseded
    await pool.query(
      `UPDATE evidence SET is_superseded=true WHERE clause_ref=$1 AND role=$2 AND component=$3 AND is_superseded=false`,
      [clause_ref, role, component]
    );

    const result = await pool.query(
      `INSERT INTO evidence
         (regulation_type,clause_ref,title,evidence_type,version,owner,department,
          role,component,file_name,file_path,validation_status,validation_score,
          missing_elements,validity_months)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        regulation_type, clause_ref, title, evidence_type, version,
        owner, department, role, component,
        req.file.originalname, req.file.path,
        status, score, missing, parseInt(validity_months),
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO evidence_audit_log (evidence_id,action,new_status,changed_by)
       VALUES ($1,'UPLOAD',$2,$3)`,
      [result.rows[0].id, status, owner || role]
    );

    // Sync compliance_checklist status if row exists
    await pool.query(
      `UPDATE compliance_checklist SET status=$1
       WHERE role=$2 AND component=$3 AND clause_ref=$4`,
      [status, role, component, clause_ref]
    );

    res.json({
      evidence:         result.rows[0],
      validationScore:  score,
      validationStatus: status,
      missingElements:  missing,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/evidence/validate/:id — re-validate existing ────────
router.post("/validate/:id", async (req, res) => {
  try {
    const ev = await pool.query(`SELECT * FROM evidence WHERE id=$1`, [req.params.id]);
    if (!ev.rows.length) return res.status(404).json({ error: "Not found" });
    const e = ev.rows[0];
    const { score, status, missing } = validateEvidence(
      e.file_name, e.clause_ref, e.title, e.evidence_type
    );
    await pool.query(
      `UPDATE evidence SET validation_status=$1,validation_score=$2,missing_elements=$3 WHERE id=$4`,
      [status, score, missing, e.id]
    );
    await pool.query(
      `INSERT INTO evidence_audit_log (evidence_id,action,old_status,new_status,changed_by)
       VALUES ($1,'REVALIDATE',$2,$3,'system')`,
      [e.id, e.validation_status, status]
    );
    res.json({ id: e.id, validationScore: score, validationStatus: status, missingElements: missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/evidence/override/:id — auditor manual override ────
router.patch("/override/:id", async (req, res) => {
  try {
    const { new_status, changed_by, reason } = req.body;
    const allowed = ["Compliant", "Partial", "Gap"];
    if (!allowed.includes(new_status))
      return res.status(400).json({ error: "Invalid status" });

    const ev = await pool.query(`SELECT * FROM evidence WHERE id=$1`, [req.params.id]);
    if (!ev.rows.length) return res.status(404).json({ error: "Not found" });

    await pool.query(
      `UPDATE evidence SET validation_status=$1,modified_by=$2,modified_at=NOW(),override_reason=$3 WHERE id=$4`,
      [new_status, changed_by, reason, req.params.id]
    );
    await pool.query(
      `INSERT INTO evidence_audit_log (evidence_id,action,old_status,new_status,changed_by,reason)
       VALUES ($1,'OVERRIDE',$2,$3,$4,$5)`,
      [req.params.id, ev.rows[0].validation_status, new_status, changed_by, reason]
    );
    res.json({ success: true, new_status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/evidence/:role/:component ────────────────────────────
router.get("/:role/:component", async (req, res) => {
  try {
    const { role, component } = req.params;
    const result = await pool.query(
      `SELECT e.*,
         CASE WHEN e.uploaded_at < NOW() - (e.validity_months || ' months')::interval
              THEN true ELSE false END AS is_expired
       FROM evidence e
       WHERE e.role=$1 AND e.component=$2
       ORDER BY e.uploaded_at DESC`,
      [role, component]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/evidence/clause/:clauseRef ───────────────────────────
router.get("/clause/:clauseRef", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM evidence WHERE clause_ref=$1 ORDER BY uploaded_at DESC`,
      [decodeURIComponent(req.params.clauseRef)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/evidence/file/:id ────────────────────────────────────
router.get("/file/:id", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM evidence WHERE id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const e = result.rows[0];
    if (!fs.existsSync(e.file_path))
      return res.status(404).json({ error: "File not found on disk" });
    res.download(e.file_path, e.file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/evidence/audit/:id ───────────────────────────────────
router.get("/audit/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM evidence_audit_log WHERE evidence_id=$1 ORDER BY changed_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/evidence/clauses/master ─────────────────────────────
router.get("/clauses/master", (_req, res) => {
  const clauses = Object.entries(CLAUSE_MASTER).map(([ref, v]) => ({
    clause_ref:    ref,
    regulation:    ref.startsWith("R155") ? "UNR155" : ref.startsWith("21434") ? "ISO21434" : "CSMS",
    keywords:      v.keywords,
    evidence_type: v.evidenceType,
  }));
  res.json(clauses);
});

// ── DELETE /api/evidence/:id (admin only) ─────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM evidence WHERE id=$1 RETURNING file_path`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const fp = result.rows[0].file_path;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
