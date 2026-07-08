import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

function MitigationRadar({ radarData }) {
  if (!radarData) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Mitigation Readiness Radar
      </h3>

      <RadarChart outerRadius={100} width={400} height={300} data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" stroke="#fff" />
        <PolarRadiusAxis stroke="#fff" />
        <Radar name="Readiness" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
      </RadarChart>
    </div>
  );
}

export default MitigationRadar;