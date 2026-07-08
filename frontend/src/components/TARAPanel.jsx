import { useEffect, useState } from "react";

const RISK_COLORS = { Critical: "bg-red-600", High: "bg-orange-500", Medium: "bg-yellow-500", Low: "bg-green-600" };
const TREATMENT = (score) => score >= 16 ? "Avoid" : score >= 9 ? "Reduce" : score >= 4 ? "Share" : "Accept";
const RESIDUAL = (score) => {
  if (score >= 16) return Math.round(score * 0.3);
  if (score >= 9)  return Math.round(score * 0.6);
  if (score >= 4)  return Math.round(score * 0.8);
  return score;
};

// Threats applicable per component (matches db.js seed)
const COMPONENT_THREATS = {
  "Airbag ECU":               ["4.1","6.2","6.3","11.1","20.1","24.1","25.1","26.1","28.2"],
  "Seatbelt Pretensioner ECU":["4.1","6.3","11.1","11.3","20.1","24.1","25.1","28.2"],
  "OTA Module":               ["12.1","12.3","12.4","13.1","16.1","26.1","29.2"],
  "Central Gateway ECU":      ["6.2","11.1","16.1","18.1","18.3","21.1","24.1","29.2"],
  "Telematics Control Unit":  ["6.2","12.1","16.1","18.1","21.1","26.1","29.2"],
  "Body Control Module":      ["4.1","11.1","18.3","20.1","24.1","25.1","28.2"],
  "ADAS ECU":                 ["4.1","6.2","6.3","11.1","20.1","24.1","25.1","26.1","28.2","29.2"],
  "Powertrain ECU":           ["4.1","11.1","11.3","20.1","24.1","25.1","26.1","28.2"],
  "Brake Control Module":     ["4.1","6.3","11.1","20.1","24.1","25.1","26.1","28.2"],
  "EV Battery Management":    ["12.1","12.4","20.1","25.1","26.1","28.2","29.2"],
  "Chassis Control ECU":      ["4.1","11.1","20.1","24.1","25.1","26.1","28.2"],
  "Infotainment Head Unit":   ["6.2","12.1","16.1","18.1","18.3","21.1","26.1","29.2"],
};

function TARAPanel({ component }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/compliance/tara-summary")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-white/30 text-sm">Loading TARA data...</div>;
  if (!data) return null;

  const applicableCodes = component ? COMPONENT_THREATS[component] : null;
  const threats = applicableCodes
    ? data.threatRisks.filter(t => applicableCodes.includes(t.threat_code))
    : data.threatRisks;

  return (
    <div className="sub-card rounded-xl border border-white/10 overflow-hidden mt-6" style={{ "--sc-accent":"#3b82f6", borderTop:"3px solid #3b82f6" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div>
          <p className="text-[11px] font-semibold text-white/70 tracking-wide">TARA Risk Engine — ISO/SAE 21434</p>
          <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">
            Risk = Impact × Feasibility · Residual Risk{component && ` · ${component}`}
          </p>
        </div>
        <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 opacity-60" />
      </div>
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-white/30 uppercase text-xs">
              <th className="text-left py-2 px-3">Threat</th>
              <th className="text-left py-2 px-3">Category</th>
              <th className="text-center py-2 px-3">Impact</th>
              <th className="text-center py-2 px-3">Feasibility</th>
              <th className="text-center py-2 px-3">Risk Score</th>
              <th className="text-center py-2 px-3">Residual</th>
              <th className="text-center py-2 px-3">ASIL</th>
              <th className="text-center py-2 px-3">Treatment</th>
            </tr>
          </thead>
          <tbody>
            {threats.map((t, i) => {
              const level = t.risk_score >= 16 ? "Critical" : t.risk_score >= 9 ? "High" : t.risk_score >= 4 ? "Medium" : "Low";
              return (
                <tr key={i} className="border-b border-white/8 hover:bg-white/5">
                  <td className="py-2 px-3 font-medium text-white/70">{t.threat_code} – {t.title}</td>
                  <td className="py-2 px-3 text-white/40">{t.category}</td>
                  <td className="py-2 px-3 text-center text-white/55">{t.impact_score}</td>
                  <td className="py-2 px-3 text-center text-white/55">{t.feasibility_score}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${RISK_COLORS[level]}`}>{t.risk_score}</span>
                  </td>
                  <td className="py-2 px-3 text-center text-white/45">{RESIDUAL(t.risk_score)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-xs font-bold ${
                      t.asil_level === "ASIL D" ? "text-red-400" :
                      t.asil_level === "ASIL C" ? "text-orange-400" : "text-yellow-400"
                    }`}>{t.asil_level}</span>
                  </td>
                  <td className="py-2 px-3 text-center text-xs text-white/40">{TREATMENT(t.risk_score)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TARAPanel;
