import { PieChart, Pie, Cell, Tooltip } from "recharts";

function CompliancePie({ compliance }) {
  if (!compliance) return null;

  const data = [
    { name: "Coverage", value: compliance.coveragePercent },
    { name: "Mitigation", value: compliance.mitigationPercent },
    { name: "Backend", value: compliance.backendPercent }
  ];

  const COLORS = ["#22c55e", "#3b82f6", "#f97316"];

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Distribution</h3>

      <PieChart width={400} height={300}>
        <Pie data={data} dataKey="value" outerRadius={100}>
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
}

export default CompliancePie;