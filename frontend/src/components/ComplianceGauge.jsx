import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

const ComplianceGauge = ({ value = 0, title = "Compliance", color }) => {
  const resolvedColor = color || (value < 50 ? "#ef4444" : value < 80 ? "#f59e0b" : "#10b981");
  const data = [{ name: title, value }];

  return (
    <div style={{
      background: "rgba(13,31,60,0.7)",
      border: "1px solid rgba(56,139,253,0.15)",
      borderRadius: 12,
      padding: "20px 16px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${resolvedColor}10 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{title}</p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <RadialBarChart
          width={140} height={140} cx="50%" cy="50%"
          innerRadius="68%" outerRadius="100%" barSize={12}
          data={data} startAngle={90} endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: "rgba(255,255,255,0.04)" }}
            clockWise dataKey="value" fill={resolvedColor}
            style={{ filter: `drop-shadow(0 0 6px ${resolvedColor}88)` }}
          />
        </RadialBarChart>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: resolvedColor, letterSpacing: "-1px", marginTop: -4,
        textShadow: `0 0 16px ${resolvedColor}88` }}>{value}%</p>
    </div>
  );
};

export default ComplianceGauge;
