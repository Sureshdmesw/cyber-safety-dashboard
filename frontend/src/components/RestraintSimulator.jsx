import { useState } from "react";
import ThreatMatrix from "./ThreatMatrix";
import ThreatCoverageChart from "./ThreatCoverageChart";
import MitigationRadar from "./MitigationRadar";
import CompliancePie from "./CompliancePie";
import CyberAsilHeatmap from "./CyberAsilHeatmap";
import GeoRegulatoryMap from "./GeoRegulatoryMap";
import MultiOemRadar from "./MultiOemRadar";

function RestraintSimulator() {
  const [impact, setImpact] = useState(5);
  const [feasibility, setFeasibility] = useState(4);
  const [secureBoot, setSecureBoot] = useState(true);
  const [canAuth, setCanAuth] = useState(true);
  const [hsm, setHsm] = useState(true);

  const [riskScore, setRiskScore] = useState(null);
  const [crashIntegrity, setCrashIntegrity] = useState(null);
  const [message, setMessage] = useState("");

  const [advancedData, setAdvancedData] = useState(null);
  const [stakeholder, setStakeholder] = useState("OEM");

  // ===========================
  // BASIC VALIDATION
  // ===========================
  const saveValidation = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impact: Number(impact),
          feasibility: Number(feasibility),
          secureBoot,
          canAuth,
          hsm,
        }),
      });

      const data = await res.json();
      setRiskScore(data.riskScore);
      setCrashIntegrity(data.crashSignalIntegrity);
      setMessage(data.message);

    } catch (err) {
      console.error("Simulator error:", err);
      setMessage("Error saving validation");
    }
  };

  // ===========================
  // ADVANCED VALIDATION
  // ===========================
  const runAdvancedValidation = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/simulator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stakeholderId: 1,
          componentId: 1,
          region: "EU",
        }),
      });

      const data = await res.json();
      setAdvancedData(data);
      setMessage("Advanced Validation Completed");

    } catch (err) {
      console.error("Advanced validation error:", err);
      setMessage("Error running advanced validation");
    }
  };

  // ===========================
  // RADAR DATA (Tier1 View)
  // ===========================
  const radarData = advancedData
    ? [
        { subject: "Threat Coverage", value: advancedData.coveragePercent },
        { subject: "Mitigation", value: advancedData.mitigationPercent },
        { subject: "Backend", value: advancedData.backendPercent },
        { subject: "Development", value: 75 },
        { subject: "Data Protection", value: 65 },
      ]
    : null;

  // ===========================
  // SAMPLE MULTI-OEM DATA (OEM View)
  // ===========================
  const multiOemData = [
    { subject: "Threat Coverage", oemA: 75, oemB: 60, oemC: 85 },
    { subject: "Mitigation", oemA: 70, oemB: 55, oemC: 80 },
    { subject: "Backend", oemA: 80, oemB: 65, oemC: 90 },
    { subject: "Development", oemA: 72, oemB: 50, oemC: 88 },
  ];

  return (
    <div className="rounded-xl shadow-lg border border-white/10 overflow-hidden mt-12">
      <div className="card-header-muted">
        <p className="card-header-title">Restraint ECU Cyber Validation Intelligence Dashboard</p>
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
      </div>
      <div className="card-body bg-gray-900 text-white p-6">

      {/* ================= BASIC SIMULATOR ================= */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label>Impact (1–5)</label>
          <input
            type="range"
            min="1"
            max="5"
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label>Feasibility (1–5)</label>
          <input
            type="range"
            min="1"
            max="5"
            value={feasibility}
            onChange={(e) => setFeasibility(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label>
          <input
            type="checkbox"
            checked={secureBoot}
            onChange={() => setSecureBoot(!secureBoot)}
          /> Secure Boot (M23)
        </label>

        <label>
          <input
            type="checkbox"
            checked={canAuth}
            onChange={() => setCanAuth(!canAuth)}
          /> CAN Authentication (M10)
        </label>

        <label>
          <input
            type="checkbox"
            checked={hsm}
            onChange={() => setHsm(!hsm)}
          /> HSM Protection (M11)
        </label>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={saveValidation}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Run Basic Validation
        </button>

        <button
          onClick={runAdvancedValidation}
          className="bg-purple-600 px-4 py-2 rounded"
        >
          Run Full Annex 5 Validation
        </button>
      </div>

      {/* ================= BASIC RESULTS ================= */}
      {riskScore !== null && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <p>Risk Score: <strong>{riskScore}</strong></p>
          <p>Crash-Signal Integrity: <strong>{crashIntegrity}%</strong></p>
        </div>
      )}

      {/* ================= ADVANCED DASHBOARD ================= */}
      {advancedData && (
        <div className="mt-10 border-t border-gray-700 pt-6">

          {/* Stakeholder Switch */}
          <div className="mb-6">
            <label className="mr-4 font-semibold">Stakeholder View:</label>
            <select
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              className="bg-gray-700 p-2 rounded"
            >
              <option value="OEM">OEM</option>
              <option value="Tier1">Tier 1</option>
              <option value="TestAgency">Test Agency</option>
            </select>
          </div>

          {/* KPI SUMMARY */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 p-4 rounded">
              <p>Overall Compliance</p>
              <p className="text-2xl font-bold">
                {advancedData.overallCompliance.toFixed(2)}%
              </p>
            </div>

            <div className="bg-gray-800 p-4 rounded">
              <p>Total Risk Index</p>
              <p className="text-2xl font-bold">
                {advancedData.riskIndex}
              </p>
            </div>

            <div className="bg-gray-800 p-4 rounded">
              <p>Threat Coverage</p>
              <p className="text-2xl font-bold">
                {advancedData.coveragePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* ================= OEM VIEW ================= */}
          {stakeholder === "OEM" && (
            <>
              <CompliancePie compliance={advancedData} />
              <ThreatCoverageChart coverage={advancedData.threatCoverage} />
              <MultiOemRadar data={multiOemData} />
              <GeoRegulatoryMap
                region="EU"
                compliance={advancedData.overallCompliance}
              />
            </>
          )}

          {/* ================= TIER 1 VIEW ================= */}
          {stakeholder === "Tier1" && (
            <>
              <MitigationRadar radarData={radarData} />
              <ThreatMatrix data={advancedData.threatMatrix} />
              <CyberAsilHeatmap threats={advancedData.threatMatrix} />
            </>
          )}

          {/* ================= TEST AGENCY VIEW ================= */}
          {stakeholder === "TestAgency" && (
            <>
              <ThreatMatrix data={advancedData.threatMatrix} />
              <ThreatCoverageChart coverage={advancedData.threatCoverage} />
              <CyberAsilHeatmap threats={advancedData.threatMatrix} />
            </>
          )}
        </div>
      )}

      {message && (
        <p className="mt-6 text-green-400">{message}</p>
      )}
      </div>
    </div>
  );
}

export default RestraintSimulator;