const express = require("express");
const router = express.Router();
const pool = require("../db");

// ===============================
// GET All Legacy Threats
// ===============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM threats ORDER BY id ASC"
    );

    res.status(200).json(result.rows);

  } catch (err) {
    console.error("Threats fetch error:", err);
    res.status(500).json({ error: "Failed to fetch threats" });
  }
});

// ===============================
// GET Annex 5 Threats (A1)
// ===============================
router.get("/annex5", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM annex5_threats ORDER BY threat_code ASC"
    );

    res.status(200).json(result.rows);

  } catch (err) {
    console.error("Annex 5 fetch error:", err);
    res.status(500).json({ error: "Failed to fetch Annex 5 threats" });
  }
});

module.exports = router;