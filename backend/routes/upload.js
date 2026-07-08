const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const XLSX    = require("xlsx");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only .xlsx, .xls or .csv files are accepted"), ok);
  },
});

// Expected columns (case-insensitive, flexible naming):
// threat_code | title | category | impact_score | feasibility_score | asil_level | safety_impact
// Any extra columns are preserved as-is.

function normaliseKey(k) {
  return k.toLowerCase().replace(/[\s_\-]+/g, "_");
}

function parseSheet(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw   = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!raw.length) return [];

  // Build a key-map from whatever headers the user used → our canonical names
  const ALIASES = {
    threat_code:       ["threat_code","code","threat","id","threat_id","ref"],
    title:             ["title","name","threat_name","description","threat_title"],
    category:          ["category","type","threat_category","domain"],
    impact_score:      ["impact_score","impact","severity","impact_rating"],
    feasibility_score: ["feasibility_score","feasibility","likelihood","feasibility_rating"],
    asil_level:        ["asil_level","asil","safety_level","asil_rating"],
    safety_impact:     ["safety_impact","safety","safety_critical","is_safety"],
    result:            ["result","test_result","status","pass_fail","validation_result"],
    notes:             ["notes","comments","remarks","observation"],
  };

  const firstRow = raw[0];
  const keyMap   = {};
  Object.keys(firstRow).forEach(origKey => {
    const norm = normaliseKey(origKey);
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(norm)) { keyMap[origKey] = canonical; break; }
    }
    if (!keyMap[origKey]) keyMap[origKey] = norm; // keep as-is
  });

  return raw.map(row => {
    const mapped = {};
    Object.entries(row).forEach(([k, v]) => { mapped[keyMap[k] || k] = v; });

    // Derive risk_score if not present
    const impact = Number(mapped.impact_score) || 3;
    const feasib = Number(mapped.feasibility_score) || 3;
    mapped.impact_score      = impact;
    mapped.feasibility_score = feasib;
    mapped.risk_score        = mapped.risk_score ? Number(mapped.risk_score) : impact * feasib;
    mapped.asil_level        = mapped.asil_level || "ASIL B";
    mapped.safety_impact     = mapped.safety_impact === true || String(mapped.safety_impact).toLowerCase() === "true" || mapped.safety_impact === 1;
    mapped.result            = mapped.result || "Not Tested";

    return mapped;
  }).filter(r => r.threat_code); // drop rows with no threat code
}

// POST /api/upload/checklist
router.post("/checklist", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const threats  = parseSheet(workbook);

    if (!threats.length) {
      return res.status(422).json({ error: "No valid threat rows found. Ensure the file has a 'threat_code' column." });
    }

    // Summary stats
    const total    = threats.length;
    const critical = threats.filter(t => t.risk_score >= 16).length;
    const high     = threats.filter(t => t.risk_score >= 9 && t.risk_score < 16).length;
    const passed   = threats.filter(t => String(t.result).toLowerCase() === "pass").length;
    const failed   = threats.filter(t => String(t.result).toLowerCase() === "fail").length;

    res.json({ threats, summary: { total, critical, high, passed, failed } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
