const express = require("express");
const router = express.Router();
const pool = require("../db");
const { calculateRisk } = require("../utils/riskEngine");
const { generateRecommendations } = require("../utils/aiRecommendationEngine");

// =====================================================
// 1️⃣ BASIC RESTRAINT SIMULATOR (UNCHANGED)
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { impact, feasibility, secureBoot, canAuth, hsm } = req.body;

    if (
      impact === undefined ||
      feasibility === undefined ||
      secureBoot === undefined ||
      canAuth === undefined ||
      hsm === undefined
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { score: riskScore } = calculateRisk(impact, feasibility);

    const mitigationIndex =
      (secureBoot ? 1 : 0) +
      (canAuth ? 1 : 0) +
      (hsm ? 1 : 0);

    const crashSignalIntegrity = Math.round((mitigationIndex / 3) * 100);

    await pool.query(
      `INSERT INTO restraint_validation_logs
       (impact, feasibility, risk_score, secure_boot, can_auth, hsm, crash_signal_integrity)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [impact, feasibility, riskScore, secureBoot, canAuth, hsm, crashSignalIntegrity]
    );

    res.json({
      riskScore,
      crashSignalIntegrity,
      message: "Validation log stored successfully"
    });

  } catch (err) {
    console.error("Simulator Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// =====================================================
// 2️⃣ ADVANCED RUN VALIDATION (ANNEX 5 + AI ENGINE)
// =====================================================
router.post("/run", async (req, res) => {
  try {
    const { stakeholderId, componentId, region } = req.body;

    if (!stakeholderId || !componentId) {
      return res.status(400).json({ error: "Missing stakeholder/component" });
    }

    // 🔹 Load Threat Master (Table A1)
    const threats = await pool.query(
      `SELECT * FROM threat_master`
    );

    // 🔹 Load Test Results
    const testResults = await pool.query(
      `SELECT * FROM test_results WHERE component_id = $1`,
      [componentId]
    );

    let tested = 0;
    let passed = 0;
    let failed = 0;
    let notTested = 0;
    let totalRisk = 0;

    // ===============================
    // Build Threat Matrix
    // ===============================
    const threatMatrix = threats.rows.map(threat => {
      const test = testResults.rows.find(
        t => t.threat_id === threat.id
      );

      const baseRisk = threat.impact_score * threat.feasibility_score;
      let residualRisk = baseRisk;
      let result = "Not Tested";

      if (test) {
        tested++;
        result = test.result;

        if (test.result === "Pass") {
          passed++;
          residualRisk = baseRisk - 5; // mitigation strength
        } else if (test.result === "Fail") {
          failed++;
        }
      } else {
        notTested++;
      }

      if (residualRisk < 0) residualRisk = 0;

      totalRisk += residualRisk;

      return {
        code: threat.threat_code,
        title: threat.title,
        safetyImpact: threat.safety_impact,
        tested: !!test,
        result,
        riskScore: baseRisk,
        residualRisk,
        color:
          residualRisk < 6
            ? "green"
            : residualRisk < 12
            ? "yellow"
            : residualRisk < 18
            ? "orange"
            : "red"
      };
    });

    // ===============================
    // Coverage Calculations
    // ===============================
    const coveragePercent =
      threats.rows.length > 0
        ? (tested / threats.rows.length) * 100
        : 0;

    const mitigationPercent = 70; // Placeholder (until mitigation logic wired)
    const backendPercent = 80;    // Placeholder

    const overallCompliance =
      (coveragePercent + mitigationPercent + backendPercent) / 3;

    // ===============================
    // 🤖 AI Mitigation Recommendation Engine
    // ===============================
    const recommendations = generateRecommendations(threatMatrix);

    // ===============================
    // Final Response
    // ===============================
    res.json({
      threatMatrix,
      threatCoverage: {
        tested,
        passed,
        failed,
        notTested
      },
      coveragePercent,
      mitigationPercent,
      backendPercent,
      overallCompliance,
      riskIndex: totalRisk,
      recommendations
    });

  } catch (err) {
    console.error("Advanced Validation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;