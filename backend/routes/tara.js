// backend/routes/tara.js

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { calculateRisk, calculateResidualRisk } = require("../utils/riskEngine");

/**
 * =====================================================
 * POST /api/tara/assess
 * Performs TARA Risk Calculation
 * Risk = Impact × Feasibility
 * =====================================================
 */
router.post("/assess", async (req, res) => {
  try {
    const { component_id, threat_id, impact, feasibility, effectiveness } = req.body;

    if (!component_id || !threat_id || impact == null || feasibility == null) {
      return res.status(400).json({
        error: "component_id, threat_id, impact and feasibility are required"
      });
    }

    // 🔹 Calculate Risk
    const { level, score } = calculateRisk(impact, feasibility);

    // 🔹 Optional Residual Risk (if mitigation effectiveness provided)
    let residualRisk = null;
    if (effectiveness) {
      residualRisk = calculateResidualRisk(score, effectiveness);
    }

    // 🔹 Insert into DB
    const result = await pool.query(
      `INSERT INTO tara_assessment
       (component_id, threat_id, impact_rating, feasibility_rating, risk_score, risk_level, residual_risk)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        component_id,
        threat_id,
        impact,
        feasibility,
        score,
        level,
        residualRisk
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("TARA Assess Error:", err);
    res.status(500).json({ error: "Server error during TARA assessment" });
  }
});


/**
 * =====================================================
 * GET /api/tara
 * Fetch all TARA assessments (for Heatmap / Dashboard)
 * =====================================================
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ta.id,
        ta.component_id,
        ta.threat_id,
        ta.impact_rating,
        ta.feasibility_rating,
        ta.risk_score,
        ta.risk_level,
        ta.residual_risk
      FROM tara_assessment ta
      ORDER BY ta.risk_score DESC
    `);

    res.status(200).json(result.rows);

  } catch (err) {
    console.error("Fetch TARA Error:", err);
    res.status(500).json({ error: "Server error fetching TARA data" });
  }
});

module.exports = router;