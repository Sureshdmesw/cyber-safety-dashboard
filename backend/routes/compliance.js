const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/compliance/annex5-status
router.get("/annex5-status", async (req, res) => {
  try {
    const total  = parseInt((await pool.query("SELECT COUNT(*) FROM annex5_threats")).rows[0].count, 10);
    const mapped = parseInt((await pool.query("SELECT COUNT(DISTINCT threat_id) FROM annex5_threat_mitigation_mapping")).rows[0].count, 10);
    res.json({ totalThreats: total, mappedThreats: mapped, compliancePercent: total === 0 ? 0 : Number(((mapped / total) * 100).toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/mitigations
router.get("/mitigations", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.mitigation_code AS code, m.title, m.mitigation_group AS grp,
             m.implementation_status AS status, m.evidence_ref,
             COUNT(tmm.threat_id) AS threat_count
      FROM annex5_mitigations m
      LEFT JOIN annex5_threat_mitigation_mapping tmm ON m.id = tmm.mitigation_id
      GROUP BY m.id ORDER BY m.mitigation_code
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/threat-coverage
router.get("/threat-coverage", async (req, res) => {
  try {
    const total  = parseInt((await pool.query("SELECT COUNT(*) FROM annex5_threats")).rows[0].count, 10);
    const mapped = parseInt((await pool.query("SELECT COUNT(DISTINCT threat_id) FROM annex5_threat_mitigation_mapping")).rows[0].count, 10);
    res.json({ total, mapped, unmapped: total - mapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/r156-status
router.get("/r156-status", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM r156_ota_status ORDER BY id");
    const rows   = result.rows;
    const total  = rows.length;
    const fullyCompliant = rows.filter(r =>
      r.sums_cert_valid && r.rollback_capable && r.integrity_check && r.power_check && r.user_notified
    ).length;
    res.json({ components: rows, otaReadiness: total === 0 ? 0 : Number(((fullyCompliant / total) * 100).toFixed(2)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/tara-summary
router.get("/tara-summary", async (req, res) => {
  try {
    const dist = await pool.query(`
      SELECT risk_level, COUNT(*) AS count, AVG(risk_score)::numeric(5,2) AS avg_score
      FROM tara_assessment GROUP BY risk_level
    `);
    const threats = await pool.query(`
      SELECT threat_code, title, category, impact_score, feasibility_score,
             asil_level, (impact_score * feasibility_score) AS risk_score
      FROM threat_master ORDER BY (impact_score * feasibility_score) DESC
    `);
    res.json({ riskDistribution: dist.rows, threatRisks: threats.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/:componentId  (backward compat — drives gauge values)
router.get("/:componentId", async (req, res) => {
  try {
    const total    = parseInt((await pool.query("SELECT COUNT(*) FROM annex5_threats")).rows[0].count, 10);
    const mapped   = parseInt((await pool.query("SELECT COUNT(DISTINCT threat_id) FROM annex5_threat_mitigation_mapping")).rows[0].count, 10);
    const totalMit = parseInt((await pool.query("SELECT COUNT(*) FROM annex5_mitigations")).rows[0].count, 10);
    const implMit  = parseInt((await pool.query("SELECT COUNT(*) FROM annex5_mitigations WHERE implementation_status='Implemented'")).rows[0].count, 10);
    res.json({
      compliancePercent:  total    === 0 ? 0 : Number(((mapped  / total)    * 100).toFixed(2)),
      mitigationPercent:  totalMit === 0 ? 0 : Number(((implMit / totalMit) * 100).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
