import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend
} from "recharts";

function MultiOemRadar({ data }) {
  if (!data) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Multi-OEM Cyber Readiness Comparison
      </h3>

      <RadarChart outerRadius={100} width={500} height={350} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" stroke="#fff" />
        <PolarRadiusAxis stroke="#fff" />
        <Radar name="OEM A" dataKey="oemA" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
        <Radar name="OEM B" dataKey="oemB" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
        <Radar name="OEM C" dataKey="oemC" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
        <Legend />
      </RadarChart>
    </div>
  );
}

export default MultiOemRadar;