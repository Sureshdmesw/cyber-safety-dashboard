import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList,
  PieChart, Pie, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import { useAnalytics } from "../hooks/useAnalytics";
import { useFilterContext } from "../context/FilterContext";

const COST   = { Critical: 850000, High: 320000, Medium: 95000, Low: 18000 };
const COLORS = { Critical: "#dc2626", High: "#f97316", Medium: "#eab308", Low: "#22c55e" };
const LEVEL  = (s) => s >= 16 ? "Critical" : s >= 9 ? "High" : s >= 4 ? "Medium" : "Low";
const RESID  = (s) => s >= 16 ? Math.round(s * 0.3) : s >= 9 ? Math.round(s * 0.6) : s >= 4 ? Math.round(s * 0.8) : s;

const CHART_TABS = [
  { id: "bar",       label: "Bar" },
  { id: "pie",       label: "Pie" },
  { id: "histogram", label: "Histogram" },
  { id: "radar",     label: "Radar" },
];

const MODE_TABS = [
  { id: "threat",     label: "Threat Analytics" },
  { id: "compliance", label: "Compliance Analytics" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" && p.name?.includes("Cost") ? `$${(p.value/1000).toFixed(0)}K` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Threat Chart Views ────────────────────────────────────────────
function BarView({ active }) {
  const data = active.map(t => ({
    name: t.threat_code,
    "Risk Score":    t.risk_score,
    "Residual Risk": RESID(t.risk_score),
    fill: COLORS[LEVEL(t.risk_score)],
  }));
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Risk Score vs Residual Risk</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            <Bar dataKey="Risk Score" radius={[4,4,0,0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="Risk Score" position="top" style={{ fontSize: 10, fill: "#374151" }} />
            </Bar>
            <Bar dataKey="Residual Risk" fill="#93c5fd" radius={[4,4,0,0]}>
              <LabelList dataKey="Residual Risk" position="top" style={{ fontSize: 10, fill: "#374151" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Estimated Cost Impact (USD)</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={active.map(t => ({ name: t.threat_code, "Cost ($K)": COST[LEVEL(t.risk_score)] / 1000, fill: COLORS[LEVEL(t.risk_score)] }))} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="K" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Cost ($K)" radius={[4,4,0,0]}>
              {active.map((t, i) => <Cell key={i} fill={COLORS[LEVEL(t.risk_score)]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>;
};

function PieView({ active }) {
  const byLevel = useMemo(() => {
    const acc = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    active.forEach(t => acc[LEVEL(t.risk_score)]++);
    return Object.entries(acc).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: COLORS[name] }));
  }, [active]);
  const byCategory = useMemo(() => {
    const acc = {};
    active.forEach(t => { acc[t.category] = (acc[t.category] || 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [active]);
  const CAT_COLORS = ["#3b82f6","#8b5cf6","#06b6d4","#f59e0b","#10b981","#ef4444","#ec4899"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Risk Level Distribution</p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart><Pie data={byLevel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={renderLabel}>{byLevel.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip /><Legend /></PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Threat Category Breakdown</p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart><Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={110} labelLine={false} label={renderLabel}>{byCategory.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistogramView({ active }) {
  const bins = [
    { range: "1–5  (Low)",       min: 1,  max: 5  },
    { range: "6–10 (Low-Med)",   min: 6,  max: 10 },
    { range: "11–15 (High)",     min: 11, max: 15 },
    { range: "16–20 (Critical)", min: 16, max: 20 },
    { range: "21–25 (Critical)", min: 21, max: 25 },
  ];
  const histData = bins.map(b => ({
    range: b.range,
    count: active.filter(t => t.risk_score >= b.min && t.risk_score <= b.max).length,
    fill: b.min >= 16 ? COLORS.Critical : b.min >= 11 ? COLORS.High : b.min >= 6 ? COLORS.Medium : COLORS.Low,
  }));
  const scatterData = active.map(t => ({ x: t.impact_score, y: t.feasibility_score, z: t.risk_score * 8, name: t.threat_code, level: LEVEL(t.risk_score) }));
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Risk Score Frequency Distribution</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={histData} barCategoryGap="2%" margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Threat Count" radius={[4,4,0,0]}>
              {histData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: "bold", fill: "#374151" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Impact × Feasibility Bubble Map</p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="x" name="Impact" domain={[0, 6]} tick={{ fontSize: 11 }} label={{ value: "Impact Score", position: "insideBottom", offset: -5, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Feasibility" domain={[0, 6]} tick={{ fontSize: 11 }} label={{ value: "Feasibility", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-700"><p className="font-semibold">{d.name}</p><p>Impact: {d.x} | Feasibility: {d.y}</p><p>Risk: <span style={{ color: COLORS[d.level] }}>{d.z/8}</span></p></div>;
            }} />
            <ReferenceLine x={3} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="4 4" />
            {["Critical","High","Medium","Low"].map(lvl => (
              <Scatter key={lvl} name={lvl} data={scatterData.filter(d => d.level === lvl)} fill={COLORS[lvl]} fillOpacity={0.75} />
            ))}
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RadarView({ active }) {
  const byCategory = useMemo(() => {
    const acc = {};
    active.forEach(t => {
      if (!acc[t.category]) acc[t.category] = { risk: 0, residual: 0, count: 0 };
      acc[t.category].risk     += t.risk_score;
      acc[t.category].residual += RESID(t.risk_score);
      acc[t.category].count++;
    });
    return Object.entries(acc).map(([cat, v]) => ({ category: cat, "Avg Risk": Math.round(v.risk/v.count), "Avg Residual": Math.round(v.residual/v.count), "Threat Count": v.count }));
  }, [active]);
  const total = active.length || 1;
  const critical = active.filter(t => LEVEL(t.risk_score) === "Critical").length;
  const perfData = [
    { subject: "Mitigation Coverage", value: Math.round((active.filter(t => RESID(t.risk_score) < t.risk_score).length / total) * 100) },
    { subject: "Safety Impact %",     value: Math.round((active.filter(t => t.safety_impact).length / total) * 100) },
    { subject: "Low Risk %",          value: Math.round((active.filter(t => LEVEL(t.risk_score) === "Low").length / total) * 100) },
    { subject: "Non-Critical %",      value: Math.round(((total - critical) / total) * 100) },
    { subject: "Residual Control",    value: Math.max(0, 100 - Math.round((active.reduce((s, t) => s + RESID(t.risk_score), 0) / total) * 4)) },
    { subject: "ASIL Compliance",     value: Math.round((active.filter(t => t.asil_level && t.asil_level !== "ASIL D").length / total) * 100) },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Risk by Threat Category</p>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={byCategory}>
            <PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 25]} tick={{ fontSize: 9 }} />
            <Radar name="Avg Risk" dataKey="Avg Risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} />
            <Radar name="Avg Residual" dataKey="Avg Residual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Legend /><Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Compliance Performance Dimensions</p>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={perfData}>
            <PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar name="Score %" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
            <Legend /><Tooltip formatter={(v) => [`${v}%`]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Compliance Analytics Mode ─────────────────────────────────────
function ComplianceBar({ analyticsData }) {
  if (!analyticsData?.standards) return <p className="text-sm text-gray-400 text-center py-8">No compliance data available</p>;
  const data = analyticsData.standards.map(s => ({
    name: s.standard,
    Compliant: s.compliant,
    Partial:   s.partial,
    Gap:       s.gap,
    Score:     s.score,
  }));
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Compliance Score by Standard</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Score" name="Score %" radius={[4,4,0,0]}>
              {data.map((d, i) => <Cell key={i} fill={d.Score >= 70 ? "#22c55e" : d.Score >= 40 ? "#eab308" : "#ef4444"} />)}
              <LabelList dataKey="Score" position="top" formatter={v => `${v}%`} style={{ fontSize: 11, fill: "#374151" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Clause Status Breakdown by Standard</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Compliant" stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
            <Bar dataKey="Partial"   stackId="a" fill="#eab308" />
            <Bar dataKey="Gap"       stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompliancePie({ analyticsData }) {
  if (!analyticsData?.overall) return null;
  const { compliant, partial, gap } = analyticsData.overall;
  const pieData = [
    { name: "Compliant", value: compliant, fill: "#22c55e" },
    { name: "Partial",   value: partial,   fill: "#eab308" },
    { name: "Gap",       value: gap,        fill: "#ef4444" },
  ].filter(d => d.value > 0);
  return (
    <div className="flex justify-center">
      <div style={{ width: 360 }}>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Overall Compliance Distribution</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={renderLabel}>
              {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComplianceRadar({ analyticsData }) {
  if (!analyticsData?.standards) return null;
  const data = analyticsData.standards.map(s => ({ subject: s.standard, Score: s.score }));
  return (
    <div className="flex justify-center">
      <div style={{ width: 400 }}>
        <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Compliance Radar by Standard</p>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar name="Score %" dataKey="Score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
            <Legend /><Tooltip formatter={v => [`${v}%`]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Manual Uploads Table ──────────────────────────────────────────
function ManualUploadsTable({ analyticsData }) {
  const uploads = analyticsData?.manualUploads || [];
  if (!uploads.length) return <p className="text-sm text-gray-400 text-center py-6">No manual uploads recorded</p>;
  return (
    <div className="overflow-x-auto mt-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">Manual Upload Log</p>
      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-gray-600 uppercase">
          <tr>
            <th className="py-2 px-3 text-left">Standard</th>
            <th className="py-2 px-3 text-left">Clause</th>
            <th className="py-2 px-3 text-center">Score</th>
            <th className="py-2 px-3 text-left">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((u, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-mono text-blue-700">{u.standard}</td>
              <td className="py-2 px-3 text-gray-700">{u.clause_ref}</td>
              <td className="py-2 px-3 text-center">{u.score ?? "—"}%</td>
              <td className="py-2 px-3 text-gray-400">{u.uploaded_at ? new Date(u.uploaded_at).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ValidationCharts({ threats, checked, role, component }) {
  const { analyticsVersion } = useFilterContext();
  const [mode,      setMode]      = useState("threat");
  const [chartTab,  setChartTab]  = useState("bar");

  const { data: analyticsData, loading } = useAnalytics(role, component, analyticsVersion);

  const active = useMemo(
    () => threats.filter(t => checked[t.threat_code]),
    [threats, checked]
  );

  return (
    <div className="rounded-xl shadow border border-white/10 overflow-hidden mt-8">
      {/* Muted subsection header */}
      <div className="card-header-muted">
        <div>
          <p className="card-header-title">Validation Analytics</p>
          <p className="card-header-sub">
            {mode === "threat"
              ? `Threat charts — ${active.length} threat${active.length !== 1 ? "s" : ""} selected`
              : `Compliance analytics — ${role} · ${component}`}
            {loading && " · Syncing…"}
          </p>
        </div>
        <div className="flex gap-1 bg-white/10 p-0.5 rounded-lg">
          {MODE_TABS.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                mode === m.id ? "bg-blue-600 text-white" : "text-white/50 hover:text-white/80"
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body p-5">
        {/* Chart tab switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {CHART_TABS.map(tab => (
            <button key={tab.id} onClick={() => setChartTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartTab === tab.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Threat Mode ── */}
        {mode === "threat" && (
          active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BarChart3 size={32} className="mb-3 text-gray-300" strokeWidth={1.25} />
              <p className="text-sm font-medium">No threats selected</p>
              <p className="text-xs mt-1">Check threats in the Compliance Checklist to see charts</p>
            </div>
          ) : (
            <>
              {chartTab === "bar"       && <BarView       active={active} />}
              {chartTab === "pie"       && <PieView       active={active} />}
              {chartTab === "histogram" && <HistogramView active={active} />}
              {chartTab === "radar"     && <RadarView     active={active} />}
            </>
          )
        )}

        {/* ── Compliance Mode ── */}
        {mode === "compliance" && (
          <>
            {chartTab === "bar"   && <ComplianceBar    analyticsData={analyticsData} />}
            {chartTab === "pie"   && <CompliancePie    analyticsData={analyticsData} />}
            {chartTab === "radar" && <ComplianceRadar  analyticsData={analyticsData} />}
            {chartTab === "histogram" && <ComplianceBar analyticsData={analyticsData} />}
            <ManualUploadsTable analyticsData={analyticsData} />
          </>
        )}
      </div>
    </div>
  );
}
