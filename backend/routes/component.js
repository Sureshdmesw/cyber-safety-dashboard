const express = require("express");
const router  = express.Router();
const pool    = require("../db");

// Canonical component list (deduped master)
const COMPONENT_MASTER = [
  "Airbag ECU", "Seatbelt Pretensioner ECU", "OTA Module",
  "Central Gateway ECU", "Telematics Control Unit", "Body Control Module",
  "ADAS ECU", "Powertrain ECU", "Brake Control Module",
  "EV Battery Management", "Chassis Control ECU", "Infotainment Head Unit",
];

// Role visibility: which components each role can access
const ROLE_VISIBILITY = {
  "OEM":                       null, // all
  "Tier-1":                    ["Airbag ECU","Seatbelt Pretensioner ECU","OTA Module","Body Control Module","ADAS ECU","Powertrain ECU","Brake Control Module","EV Battery Management"],
  "Authority (ARAI/TÜV/ICAT)": null, // all, read-only
};

// GET /api/component  — list all components as { id, name, type, safety_level }
router.get("/", async (req, res) => {
  try {
    const { role } = req.query;
    const allowed  = role ? (ROLE_VISIBILITY[role] || null) : null;
    const result   = await pool.query(
      "SELECT id, component_name AS name, component_type AS type, safety_level FROM components ORDER BY id"
    );
    // Deduplicate by name and filter to master list + role visibility
    const seen = new Set();
    const rows = result.rows.filter(c => {
      if (!COMPONENT_MASTER.includes(c.name)) return false;
      if (seen.has(c.name)) return false;
      if (allowed && !allowed.includes(c.name)) return false;
      seen.add(c.name);
      return true;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/component/:id/threats
router.get("/:id/threats", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*
      FROM component_threat_applicability cta
      JOIN annex5_threats t ON cta.threat_id = t.id
      WHERE cta.component_id = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
