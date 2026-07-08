// backend/server.js

const express = require("express");
const cors = require("cors");

const app = express();

// =============================
// MIDDLEWARE
// =============================
app.use(cors());
app.use(express.json());

// =============================
// ROUTES IMPORT
// =============================
const taraRoutes       = require("./routes/tara");
const complianceRoutes = require("./routes/compliance");
const componentRoutes  = require("./routes/component");
const threatsRoutes    = require("./routes/threats");
const simulatorRoutes  = require("./routes/simulator");
const uploadRoutes     = require("./routes/upload");
const evidenceRoutes   = require("./routes/evidence");
const { router: analyticsRoutes } = require("./routes/analytics");
const annex5ChecklistRoutes    = require("./routes/annex5Checklist");
const taraChecklistRoutes      = require("./routes/taraChecklist");
const csmsChecklistRoutes      = require("./routes/csmsChecklist");
const templatesRoutes          = require("./routes/templates");
const exportRoutes             = require("./routes/export");

// =============================
// ROUTES REGISTER
// =============================
app.use("/api/tara",       taraRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/component",  componentRoutes);
app.use("/api/threats",    threatsRoutes);
app.use("/api/simulator",  simulatorRoutes);
app.use("/api/upload",     uploadRoutes);
app.use("/api/evidence",   evidenceRoutes);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api/annex5-checklist", annex5ChecklistRoutes);
app.use("/api/tara-checklist",   taraChecklistRoutes);
app.use("/api/csms-checklist",   csmsChecklistRoutes);
app.use("/api/templates",        templatesRoutes);
app.use("/api/export",           exportRoutes);
app.use("/uploads",        require("express").static(require("path").join(__dirname, "uploads")));

// Component-aware clause filtering — direct alias
app.get("/api/clauses", async (req, res) => {
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

// Convenience aliases used by frontend
app.get("/api/mitigations", (req, res) => res.redirect("/api/compliance/mitigations"));
app.get("/api/threat-coverage", (req, res) => res.redirect("/api/compliance/threat-coverage"));

// =============================
// DATABASE TEST ROUTE
// =============================
const pool = require("./db");

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Database Connected",
      time: result.rows[0],
    });
  } catch (err) {
    console.error("Database connection error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// HEALTH CHECK ROUTE
// =============================
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// =============================
// START SERVER
// =============================
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});