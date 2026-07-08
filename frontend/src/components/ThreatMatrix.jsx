import { useEffect, useState } from "react";

function ThreatMatrix({ data, componentId }) {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If simulator passed threatMatrix data directly, use it
    if (data) { setThreats(data); setLoading(false); return; }

    const url = componentId
      ? `http://localhost:5000/api/component/${componentId}/threats`
      : `http://localhost:5000/api/threats/annex5`;

    fetch(url)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(d => { setThreats(d); setLoading(false); })
      .catch(() => { setError("Could not load threats"); setLoading(false); });
  }, [data, componentId]);

  if (loading) return <div className="bg-gray-800 p-4 rounded-xl mt-6"><p>Loading threats...</p></div>;
  if (error)   return <div className="bg-red-800 p-4 rounded-xl mt-6"><p>{error}</p></div>;

  // Simulator data has different shape (code/title/safetyImpact/result/residualRisk)
  const isSimulator = data != null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        {isSimulator ? "Threat Validation Matrix" : `Master Threat Matrix (Annex 5 – A1)${componentId ? " — Filtered by Component" : ""}`}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
              <th className="text-left py-2 px-2">Code</th>
              <th className="text-left py-2 px-2">Title</th>
              <th className="text-left py-2 px-2">Category</th>
              <th className="text-left py-2 px-2">Safety Impact</th>
              {isSimulator && <th className="text-left py-2 px-2">Result</th>}
              {isSimulator && <th className="text-left py-2 px-2">Residual Risk</th>}
            </tr>
          </thead>
          <tbody>
            {threats.map((t, i) => (
              <tr key={t.id ?? i} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-2 px-2 font-mono">{t.threat_code ?? t.code}</td>
                <td className="py-2 px-2">{t.title}</td>
                <td className="py-2 px-2 text-gray-400">{t.category ?? "—"}</td>
                <td className="py-2 px-2">
                  {(t.safety_impact ?? t.safetyImpact)
                    ? <span className="text-red-400 font-semibold">Yes</span>
                    : <span className="text-green-400">No</span>}
                </td>
                {isSimulator && (
                  <td className="py-2 px-2">
                    <span className={`text-xs font-semibold ${t.result === "Pass" ? "text-green-400" : t.result === "Fail" ? "text-red-400" : "text-gray-400"}`}>
                      {t.result}
                    </span>
                  </td>
                )}
                {isSimulator && (
                  <td className="py-2 px-2">
                    <span className={`text-xs font-bold ${t.color === "red" ? "text-red-400" : t.color === "orange" ? "text-orange-400" : t.color === "yellow" ? "text-yellow-400" : "text-green-400"}`}>
                      {t.residualRisk}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ThreatMatrix;
