const express = require("express");
const router  = express.Router();
const XLSX    = require("xlsx");

// ── Helpers ───────────────────────────────────────────────────────────────────
function hdr(ws, cols) {
  // Bold header row style hint (xlsx-style not available, use comment as marker)
  XLSX.utils.sheet_add_aoa(ws, [cols], { origin: "A1" });
}

function addValidation() { /* xlsx CE doesn't support data validation — dropdowns noted in header */ }

function makeSheet(headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Column widths
  ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
  return ws;
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function sheetOverview(component, role) {
  return makeSheet(
    ["Field", "Value"],
    [
      ["Project Name",  "TARA / CSMS Evidence Package"],
      ["Component",     component || "<Enter Component>"],
      ["Standard",      "ISO/SAE 21434 | UN R155"],
      ["Prepared By",   "<Enter Name>"],
      ["Role",          role || "OEM"],
      ["Date",          new Date().toISOString().slice(0, 10)],
      ["Version",       "v1.0"],
      ["Status",        "Draft"],
    ]
  );
}

function sheetCTSA01Scope() {
  return makeSheet(
    ["Asset ID","Asset Name","Description","Interface","Adversary Type","TTP Scope","Evidence Reference"],
    [
      ["AST-001","Airbag ECU","Safety-critical restraint controller","CAN Bus","External Attacker","CAN Spoofing, Replay","TARA-CTSA-01-EV"],
      ["AST-002","OTA Module","Firmware update handler","Ethernet/Wi-Fi","Remote Attacker","OTA Manipulation","TARA-CTSA-01-EV"],
    ]
  );
}

function sheetCTSA02TTPSelection() {
  return makeSheet(
    ["TTP ID","TTP Name","Source (MITRE/HEAVENS/EVITA)","Attack Vector","Applicable (Yes/No)","Evidence Reference"],
    [
      ["T-CAN-SPOOF","CAN Message Spoofing","HEAVENS","CAN Bus","Yes","TARA-CTSA-02-EV"],
      ["T-MITM","Man-in-the-Middle","MITRE ATT&CK","Ethernet","Yes","TARA-CTSA-02-EV"],
      ["T-REPLAY","Replay Attack","HEAVENS","CAN Bus","Yes","TARA-CTSA-02-EV"],
      ["T-DOS-CAN","CAN Denial of Service","EVITA","CAN Bus","Yes","TARA-CTSA-02-EV"],
      ["T-OTA-MANIP","OTA Firmware Manipulation","MITRE ATT&CK","OTA Channel","Yes","TARA-CTSA-02-EV"],
      ["T-JTAG","JTAG/Debug Interface Exposure","HEAVENS","Physical","Yes","TARA-CTSA-02-EV"],
      ["T-USB-INJECT","USB Code Injection","MITRE ATT&CK","USB","Yes","TARA-CTSA-02-EV"],
      ["T-WEAK-CRYPTO","Weak Encryption","EVITA","All","Yes","TARA-CTSA-02-EV"],
    ]
  );
}

function sheetCTSA03Filtering() {
  return makeSheet(
    ["TTP ID","TTP Name","Applicable (Yes/No)","Elimination Reason","Approved By","Evidence Reference"],
    [
      ["T-CAN-SPOOF","CAN Message Spoofing","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-MITM","Man-in-the-Middle","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-REPLAY","Replay Attack","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-DOS-CAN","CAN Denial of Service","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-OTA-MANIP","OTA Firmware Manipulation","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-JTAG","JTAG/Debug Interface Exposure","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
      ["T-USB-INJECT","USB Code Injection","No","No USB port on target ECU","<Approver>","TARA-CTSA-03-EV"],
      ["T-WEAK-CRYPTO","Weak Encryption","Yes","N/A — retained","<Approver>","TARA-CTSA-03-EV"],
    ]
  );
}

function sheetCTSA04RiskScoring() {
  // Risk Score = Impact * Likelihood (formula in col F)
  const headers = ["TTP ID","TTP Name","Impact (1-5)","Likelihood (1-5)","Exploitability","Risk Score (=C*D)","Risk Level (Low/Med/High/Critical)","Evidence Reference"];
  const data = [
    ["T-CAN-SPOOF","CAN Message Spoofing",5,4,3,null,"Critical","TARA-CTSA-04-EV"],
    ["T-MITM","Man-in-the-Middle",4,3,4,null,"High","TARA-CTSA-04-EV"],
    ["T-REPLAY","Replay Attack",3,3,2,null,"Medium","TARA-CTSA-04-EV"],
    ["T-DOS-CAN","CAN Denial of Service",5,5,2,null,"Critical","TARA-CTSA-04-EV"],
    ["T-OTA-MANIP","OTA Firmware Manipulation",5,3,5,null,"High","TARA-CTSA-04-EV"],
    ["T-JTAG","JTAG/Debug Interface Exposure",4,3,3,null,"High","TARA-CTSA-04-EV"],
    ["T-WEAK-CRYPTO","Weak Encryption",4,4,3,null,"High","TARA-CTSA-04-EV"],
  ];
  const ws = makeSheet(headers, data);
  // Add formula for Risk Score column (F) — rows 2 onwards
  data.forEach((_, i) => {
    const row = i + 2;
    ws[`F${row}`] = { t: "n", f: `C${row}*D${row}` };
  });
  return ws;
}

function sheetCTSA05ThreatMatrix() {
  return makeSheet(
    ["Asset","TTP","Risk Score","Risk Level (Low/Med/High/Critical)","Countermeasures","Annex 5 Ref","Remarks","Evidence Reference"],
    [
      ["Airbag ECU","T-CAN-SPOOF",20,"Critical","M10, M11","4.3.2(a)","Immediate mitigation required","TARA-CTSA-05-EV"],
      ["Airbag ECU","T-DOS-CAN",25,"Critical","M13, M15","4.3.2(d)","Rate limiting deployed","TARA-CTSA-05-EV"],
      ["OTA Module","T-OTA-MANIP",15,"High","M16, M11","4.3.3(a)","Signed OTA enforced","TARA-CTSA-05-EV"],
      ["Central Gateway ECU","T-MITM",12,"High","M10, M5","4.3.2(b)","TLS 1.3 required","TARA-CTSA-05-EV"],
      ["ADAS ECU","T-WEAK-CRYPTO",16,"Critical","M11, M5","4.3.7(a)","HSM key storage required","TARA-CTSA-05-EV"],
    ]
  );
}

function sheetCRRA01HighRiskTTPs() {
  return makeSheet(
    ["TTP ID","TTP Name","Risk Score","Risk Level","Selection Justification","Evidence Reference"],
    [
      ["T-CAN-SPOOF","CAN Message Spoofing",20,"Critical","Risk score ≥16 — mandatory mitigation","CRRA-01-EV"],
      ["T-DOS-CAN","CAN Denial of Service",25,"Critical","Risk score ≥16 — mandatory mitigation","CRRA-01-EV"],
      ["T-OTA-MANIP","OTA Firmware Manipulation",15,"High","Risk score ≥9 — mitigation required","CRRA-01-EV"],
      ["T-WEAK-CRYPTO","Weak Encryption",16,"Critical","Risk score ≥16 — mandatory mitigation","CRRA-01-EV"],
    ]
  );
}

function sheetCRRA02CMMapping() {
  return makeSheet(
    ["TTP ID","TTP Name","Countermeasure ID","Countermeasure Name","Annex 5 Ref","Implementation Status","Evidence Reference"],
    [
      ["T-CAN-SPOOF","CAN Message Spoofing","M10","Message Authentication (HMAC)","4.3.2(a)","Implemented","CRRA-02-EV"],
      ["T-CAN-SPOOF","CAN Message Spoofing","M11","Secure Key Storage (HSM)","4.3.2(a)","Implemented","CRRA-02-EV"],
      ["T-DOS-CAN","CAN Denial of Service","M13","DoS Detection & Rate Limiting","4.3.2(d)","In Progress","CRRA-02-EV"],
      ["T-OTA-MANIP","OTA Firmware Manipulation","M16","Secure OTA Update","4.3.3(a)","Implemented","CRRA-02-EV"],
      ["T-WEAK-CRYPTO","Weak Encryption","M11","Secure Key Storage (HSM)","4.3.7(a)","Implemented","CRRA-02-EV"],
    ]
  );
}

function sheetCRRA03CMScoring() {
  return makeSheet(
    ["CM ID","CM Name","Utility Score (1-5)","Cost Score (1-5)","Merit Score (=Utility/Cost)","Recommended","Evidence Reference"],
    [
      ["M10","Message Authentication (HMAC)",5,2,null,"Yes","CRRA-03-EV"],
      ["M11","Secure Key Storage (HSM)",5,3,null,"Yes","CRRA-03-EV"],
      ["M13","DoS Detection & Rate Limiting",4,2,null,"Yes","CRRA-03-EV"],
      ["M16","Secure OTA Update",5,3,null,"Yes","CRRA-03-EV"],
      ["M23","Secure Development Lifecycle",5,4,null,"Yes","CRRA-03-EV"],
    ]
  );
}

function sheetCRRA04OptimalSet() {
  return makeSheet(
    ["CM ID","CM Name","Target TTP(s)","Priority","Implementation Owner","Target Date","Evidence Reference"],
    [
      ["M10","Message Authentication (HMAC)","T-CAN-SPOOF, T-REPLAY","P1","ECU Software Team","<Date>","CRRA-04-EV"],
      ["M11","Secure Key Storage (HSM)","T-CAN-SPOOF, T-WEAK-CRYPTO, T-OTA-MANIP","P1","PKI / HSM Team","<Date>","CRRA-04-EV"],
      ["M13","DoS Detection & Rate Limiting","T-DOS-CAN","P1","Network Security Team","<Date>","CRRA-04-EV"],
      ["M16","Secure OTA Update","T-OTA-MANIP","P1","OTA Manager","<Date>","CRRA-04-EV"],
      ["M23","Secure Development Lifecycle","All","P2","CISO / SDL Lead","<Date>","CRRA-04-EV"],
    ]
  );
}

function sheetCRRA05Recommendations() {
  return makeSheet(
    ["Req ID","Asset","TTP","Countermeasure","Annex 5 Ref","ISO 21434 Clause","Residual Risk","Evidence Reference","Status"],
    [
      ["REC-001","Airbag ECU","T-CAN-SPOOF","M10 — HMAC Authentication","4.3.2(a)","ISO 21434 §9.4","Low","CRRA-05-EV","Open"],
      ["REC-002","Airbag ECU","T-DOS-CAN","M13 — Rate Limiting","4.3.2(d)","ISO 21434 §9.4","Medium","CRRA-05-EV","In Progress"],
      ["REC-003","OTA Module","T-OTA-MANIP","M16 — Secure OTA","4.3.3(a)","ISO 21434 §14","Low","CRRA-05-EV","Closed"],
      ["REC-004","All ECUs","T-WEAK-CRYPTO","M11 — HSM Key Storage","4.3.7(a)","ISO 21434 §9.4","Low","CRRA-05-EV","Open"],
    ]
  );
}

function sheetCSMS() {
  return makeSheet(
    ["Clause Ref","Section","Requirement","UN R155 Clause","ISO 21434 Clause","DFMEA Link","Owner","Status (Not Started/In Progress/Implemented/Verified)","Evidence File","Last Updated"],
    [
      ["CSMS-01","A. Governance","Define Cybersecurity Policy & Objectives","UN R155 §7.2.2","ISO 21434 §5.4","Policy Failure Mode — No governance structure","CISO / Top Management","Not Started","",""],
      ["CSMS-02","A. Governance","Assign Roles & Responsibilities","UN R155 §7.2.3","ISO 21434 §5.4.2","Role ambiguity — Unassigned responsibilities","HR / CISO","Not Started","",""],
      ["CSMS-03","A. Governance","Establish Cybersecurity Culture & Awareness","UN R155 §7.2.4","ISO 21434 §5.4.3","Human error — Untrained personnel","HR / Training Manager","Not Started","",""],
      ["CSMS-04","B. Risk Mgmt","Perform TARA for Vehicle / System","UN R155 §7.3.1","ISO 21434 §8.3–§8.7","Risk assessment gap — Unidentified threats","Cybersecurity Engineer","Not Started","",""],
      ["CSMS-05","B. Risk Mgmt","Identify & Classify Cyber Assets","UN R155 §7.3.2","ISO 21434 §8.3","Asset omission — Critical ECU not in scope","Systems Architect","Not Started","",""],
      ["CSMS-06","B. Risk Mgmt","Assess Threats, Vulnerabilities & Risks","UN R155 §7.3.3","ISO 21434 §8.5–§8.7","Severity underestimation","Cybersecurity Engineer","Not Started","",""],
      ["CSMS-07","B. Risk Mgmt","Define Risk Treatment & Mitigation Strategy","UN R155 §7.3.4","ISO 21434 §9.3–§9.4","Mitigation gap — Unmitigated high-risk threat","Cybersecurity Engineer / CISO","Not Started","",""],
      ["CSMS-08","C. Secure Dev","Define Cybersecurity Requirements","UN R155 §7.4.1","ISO 21434 §9.4","Requirements gap","Systems Engineer","Not Started","",""],
      ["CSMS-09","C. Secure Dev","Implement Secure Design","UN R155 §7.4.2","ISO 21434 §10.4","Design flaw — Insecure default config","Software Architect","Not Started","",""],
      ["CSMS-10","C. Secure Dev","Perform Verification & Validation Testing","UN R155 §7.4.3","ISO 21434 §15","Verification gap — Untested requirement","Test Engineer","Not Started","",""],
      ["CSMS-11","C. Secure Dev","Manage Supplier Cybersecurity Compliance","UN R155 §7.4.4","ISO 21434 §7","Supply chain risk","Procurement / CISO","Not Started","",""],
      ["CSMS-12","D. Incident","Implement Incident Detection Mechanisms","UN R155 §7.5.1","ISO 21434 §13.3","Detection failure — Undetected intrusion","SOC / Security Ops","Not Started","",""],
      ["CSMS-13","D. Incident","Define Incident Response Process","UN R155 §7.5.2","ISO 21434 §13.4","Response delay — No escalation path","CISO / IRT","Not Started","",""],
      ["CSMS-14","D. Incident","Enable Logging, Monitoring & Alerting","UN R155 §7.5.3","ISO 21434 §13.3","Forensic gap — No audit trail","SOC / IT Ops","Not Started","",""],
      ["CSMS-15","D. Incident","Perform Post-Incident Analysis","UN R155 §7.5.4","ISO 21434 §13.5","Recurrence risk — Root cause not addressed","IRT","Not Started","",""],
      ["CSMS-16","E. Updates","Secure OTA / Software Update Process","UN R155 §7.6.1","ISO 21434 §14","Update failure — Malicious firmware via OTA","OTA Manager","Not Started","",""],
      ["CSMS-17","E. Updates","Validate Software Integrity","UN R155 §7.6.2","ISO 21434 §14.3","Integrity failure — Unsigned firmware accepted","Software Architect","Not Started","",""],
      ["CSMS-18","E. Updates","Manage Vulnerability & Patch Deployment","UN R155 §7.6.3","ISO 21434 §13.2","Patch delay — Known CVE unpatched","PSIRT","Not Started","",""],
      ["CSMS-19","F. Audit","Conduct Internal CSMS Audits","UN R155 §7.7.1","ISO 21434 §5.5","Audit gap — CSMS not reviewed","Internal Audit / CISO","Not Started","",""],
      ["CSMS-20","F. Audit","Maintain Compliance Documentation","UN R155 §7.7.2","ISO 21434 §5.4","Documentation gap — Missing evidence","Compliance Manager","Not Started","",""],
      ["CSMS-21","F. Audit","Ensure Continuous Risk Monitoring","UN R155 §7.7.3","ISO 21434 §13.2","Monitoring gap — New threat not captured","Threat Intelligence","Not Started","",""],
      ["CSMS-22","F. Audit","Implement Lessons Learned & Improvements","UN R155 §7.7.4","ISO 21434 §5.5","Improvement failure — Recurring incidents","CISO / Process Owner","Not Started","",""],
    ]
  );
}

// ── GET /api/templates/tara-ctsa?role=&component= ─────────────────────────────
router.get("/tara-ctsa", (req, res) => {
  try {
    const { role = "OEM", component = "" } = req.query;

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, sheetOverview(component, role),       "CTSA_Overview");
    XLSX.utils.book_append_sheet(wb, sheetCTSA01Scope(),                   "CTSA_01_Scope");
    XLSX.utils.book_append_sheet(wb, sheetCTSA02TTPSelection(),            "CTSA_02_TTP_Selection");
    XLSX.utils.book_append_sheet(wb, sheetCTSA03Filtering(),               "CTSA_03_TTP_Filtering");
    XLSX.utils.book_append_sheet(wb, sheetCTSA04RiskScoring(),             "CTSA_04_Risk_Scoring");
    XLSX.utils.book_append_sheet(wb, sheetCTSA05ThreatMatrix(),            "CTSA_05_Threat_Matrix");
    XLSX.utils.book_append_sheet(wb, sheetCRRA01HighRiskTTPs(),            "CRRA_01_HighRisk_TTPs");
    XLSX.utils.book_append_sheet(wb, sheetCRRA02CMMapping(),               "CRRA_02_CM_Mapping");
    XLSX.utils.book_append_sheet(wb, sheetCRRA03CMScoring(),               "CRRA_03_CM_Scoring");
    XLSX.utils.book_append_sheet(wb, sheetCRRA04OptimalSet(),              "CRRA_04_Optimal_Set");
    XLSX.utils.book_append_sheet(wb, sheetCRRA05Recommendations(),         "CRRA_05_Recommendations");
    XLSX.utils.book_append_sheet(wb, sheetCSMS(),                          "CSMS_Checklist");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const comp = component ? `_${component.replace(/\s+/g, "_")}` : "";
    const filename = `TARA_CTSA_CRRA_CSMS_Template${comp}_v1.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
