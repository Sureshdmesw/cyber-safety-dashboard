import { useEffect, useState } from "react";

function MitigationTable() {
  const [mitigations, setMitigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/mitigations")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch mitigations");
        }
        return res.json();
      })
      .then((data) => {
        setMitigations(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Mitigation Coverage (B1–B8)
      </h3>

      {loading && (
        <p className="text-gray-400 text-sm">Loading mitigations...</p>
      )}

      {error && (
        <p className="text-red-400 text-sm">Error: {error}</p>
      )}

      {!loading && !error && mitigations.length === 0 && (
        <p className="text-yellow-400 text-sm">
          No mitigation data available.
        </p>
      )}

      {!loading && !error && mitigations.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="py-2">Mitigation</th>
              <th className="py-2">Status</th>
              <th className="py-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            {mitigations.map((m, i) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="py-2">{m.code}</td>
                <td className="py-2">{m.status}</td>
                <td className="py-2">{m.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MitigationTable;