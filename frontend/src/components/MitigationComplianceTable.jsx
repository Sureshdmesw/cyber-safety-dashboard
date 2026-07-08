import { useEffect, useState } from "react";

const STATUS_STYLE = {
  "Implemented": "bg-green-100 text-green-700",
  "Partial":     "bg-yellow-100 text-yellow-700",
  "Not Implemented": "bg-red-100 text-red-700",
};

function MitigationComplianceTable({ component = "" }) {
  const [mitigations, setMitigations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/compliance/mitigations")
      .then(r => r.json())
      .then(d => { setMitigations(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-white rounded-xl p-6 shadow-card text-gray-400 text-sm">Loading mitigations...</div>;

  const implemented = mitigations.filter(m => m.status === "Implemented").length;
  const coverage = mitigations.length ? Math.round((implemented / mitigations.length) * 100) : 0;

  return (
    <div className="sub-card rounded-xl shadow-card border border-white/10 overflow-hidden mt-8" style={{ "--sc-accent":"#f59e0b", borderTop:"3px solid #f59e0b" }}>
      <div className="card-header-muted">
        <div>
          <p className="card-header-title">Mitigation Compliance — Annex 5 B1–B8 / C1–C3</p>
          {component && <p className="card-header-sub">Filtered: {component}</p>}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/20 text-green-300">{coverage}% Implemented</span>
      </div>
      <div className="card-body p-4">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
              <th className="text-left py-2 px-3">Code</th>
              <th className="text-left py-2 px-3">Mitigation</th>
              <th className="text-center py-2 px-3">Group</th>
              <th className="text-center py-2 px-3">Threats Covered</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Evidence Ref</th>
              <th className="text-center py-2 px-3">Gap</th>
            </tr>
          </thead>
          <tbody>
            {mitigations.map((m, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono font-semibold text-blue-700">{m.code}</td>
                <td className="py-2 px-3 text-gray-800">{m.title}</td>
                <td className="py-2 px-3 text-center text-gray-500">{m.grp === "B" ? "B (Vehicle)" : "C (Backend)"}</td>
                <td className="py-2 px-3 text-center text-gray-600">{m.threat_count}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[m.status] || "bg-gray-100 text-gray-600"}`}>
                    {m.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-500 font-mono text-xs">{m.evidence_ref || "—"}</td>
                <td className="py-2 px-3 text-center">
                  {m.status !== "Implemented"
                    ? <span className="text-red-500 font-bold text-xs">⚠ Gap</span>
                    : <span className="text-green-500 text-xs">✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default MitigationComplianceTable;
