import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const OEMS = [
  { name: "Mercedes-Benz", region: "Europe",        country: "Germany",      segment: "Premium",    scores: { csms: 92, tara: 90, ota: 88, backend: 91, safetyCyber: 89, restraint: 90 } },
  { name: "BMW",           region: "Europe",        country: "Germany",      segment: "Premium",    scores: { csms: 90, tara: 92, ota: 85, backend: 88, safetyCyber: 90, restraint: 91 } },
  { name: "Audi",          region: "Europe",        country: "Germany",      segment: "Premium",    scores: { csms: 89, tara: 87, ota: 84, backend: 86, safetyCyber: 88, restraint: 87 } },
  { name: "Volkswagen",    region: "Europe",        country: "Germany",      segment: "Mass",       scores: { csms: 88, tara: 85, ota: 80, backend: 84, safetyCyber: 87, restraint: 86 } },
  { name: "Porsche",       region: "Europe",        country: "Germany",      segment: "Premium",    scores: { csms: 91, tara: 89, ota: 86, backend: 90, safetyCyber: 88, restraint: 89 } },
  { name: "Renault",       region: "Europe",        country: "France",       segment: "Mass",       scores: { csms: 84, tara: 82, ota: 79, backend: 81, safetyCyber: 83, restraint: 82 } },
  { name: "Stellantis",    region: "Europe",        country: "France",       segment: "Mass",       scores: { csms: 83, tara: 80, ota: 77, backend: 80, safetyCyber: 82, restraint: 81 } },
  { name: "Volvo Cars",    region: "Europe",        country: "Sweden",       segment: "Premium",    scores: { csms: 90, tara: 88, ota: 86, backend: 89, safetyCyber: 91, restraint: 92 } },
  { name: "Scania",        region: "Europe",        country: "Sweden",       segment: "Commercial", scores: { csms: 82, tara: 80, ota: 74, backend: 78, safetyCyber: 80, restraint: 79 } },
  { name: "Fiat",          region: "Europe",        country: "Italy",        segment: "Mass",       scores: { csms: 78, tara: 76, ota: 72, backend: 75, safetyCyber: 77, restraint: 76 } },
  { name: "Ferrari",       region: "Europe",        country: "Italy",        segment: "Premium",    scores: { csms: 87, tara: 85, ota: 83, backend: 86, safetyCyber: 84, restraint: 85 } },
  { name: "Jaguar Land Rover", region: "Europe",   country: "UK",           segment: "Premium",    parent: "Tata Motors",
    scores: { csms: 86, tara: 84, ota: 83, backend: 85, safetyCyber: 84, restraint: 86 } },
  { name: "Tesla",         region: "North America", country: "USA",          segment: "Premium",    scores: { csms: 95, tara: 90, ota: 98, backend: 95, safetyCyber: 85, restraint: 88 } },
  { name: "Ford",          region: "North America", country: "USA",          segment: "Mass",       scores: { csms: 87, tara: 84, ota: 81, backend: 85, safetyCyber: 83, restraint: 86 } },
  { name: "GM",            region: "North America", country: "USA",          segment: "Mass",       scores: { csms: 86, tara: 83, ota: 80, backend: 84, safetyCyber: 82, restraint: 85 } },
  { name: "Toyota",        region: "East Asia",     country: "Japan",        segment: "Mass",       scores: { csms: 92, tara: 88, ota: 82, backend: 90, safetyCyber: 89, restraint: 93 } },
  { name: "Honda",         region: "East Asia",     country: "Japan",        segment: "Mass",       scores: { csms: 88, tara: 85, ota: 79, backend: 86, safetyCyber: 87, restraint: 89 } },
  { name: "Nissan",        region: "East Asia",     country: "Japan",        segment: "Mass",       scores: { csms: 84, tara: 81, ota: 77, backend: 82, safetyCyber: 83, restraint: 85 } },
  { name: "Hyundai",       region: "East Asia",     country: "South Korea",  segment: "Mass",       scores: { csms: 85, tara: 83, ota: 80, backend: 84, safetyCyber: 82, restraint: 83 } },
  { name: "Kia",           region: "East Asia",     country: "South Korea",  segment: "Mass",       scores: { csms: 83, tara: 81, ota: 78, backend: 82, safetyCyber: 80, restraint: 81 } },
  { name: "BYD",           region: "East Asia",     country: "China",        segment: "Mass",       scores: { csms: 79, tara: 76, ota: 82, backend: 78, safetyCyber: 75, restraint: 74 } },
  { name: "Geely",         region: "East Asia",     country: "China",        segment: "Mass",       scores: { csms: 77, tara: 74, ota: 79, backend: 76, safetyCyber: 73, restraint: 72 } },
  { name: "Tata Motors",   region: "South Asia",    country: "India",        segment: "Mass",       owns: ["Jaguar Land Rover"],
    scores: { csms: 80, tara: 78, ota: 75, backend: 82, safetyCyber: 77, restraint: 74 } },
  { name: "Mahindra",      region: "South Asia",    country: "India",        segment: "Mass",       scores: { csms: 72, tara: 70, ota: 68, backend: 71, safetyCyber: 69, restraint: 67 } },
  { name: "VinFast",       region: "ASEAN",         country: "Vietnam",      segment: "Mass",       scores: { csms: 68, tara: 65, ota: 70, backend: 67, safetyCyber: 64, restraint: 63 } },
  { name: "Toyota Australia", region: "Oceania",   country: "Australia",    segment: "Mass",       scores: { csms: 85, tara: 82, ota: 78, backend: 83, safetyCyber: 84, restraint: 86 } },
];

const TIER1_DATA = {
  "Autoliv":     { csms: 91, tara: 88, ota: 78, backend: 82, safetyCyber: 94, restraint: 97 },
  "ZF Lifetec":  { csms: 87, tara: 85, ota: 80, backend: 83, safetyCyber: 90, restraint: 92 },
  "Bosch":       { csms: 93, tara: 91, ota: 89, backend: 92, safetyCyber: 88, restraint: 89 },
  "Joyson (JSS)":{ csms: 78, tara: 74, ota: 68, backend: 71, safetyCyber: 80, restraint: 83 },
  "Continental": { csms: 89, tara: 86, ota: 84, backend: 87, safetyCyber: 85, restraint: 88 },
};

const METRICS_KEYS = [
  { key: "csms",        label: "CSMS (R155)",       accent: "#e74c3c" },  // red
  { key: "tara",        label: "TARA Depth",         accent: "#3498db" },  // blue
  { key: "ota",         label: "OTA Security",       accent: "#2ecc71" },  // green
  { key: "backend",     label: "Backend Hardening",  accent: "#9b59b6" },  // purple
  { key: "safetyCyber", label: "Safety-Cyber",       accent: "#f39c12" },  // orange
  { key: "restraint",   label: "Restraint ECU",      accent: "#1abc9c" },  // teal
];

const COLORS = ["#f97316","#ec4899","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"];

const REGION_CONFIG = {
  "Europe":        { color: "#3b82f6" },
  "North America": { color: "#ef4444" },
  "East Asia":     { color: "#10b981" },
  "South Asia":    { color: "#f59e0b" },
  "ASEAN":         { color: "#8b5cf6" },
  "Oceania":       { color: "#06b6d4" },
  "MEA":           { color: "#f97316" },
  "LATAM":         { color: "#64748b" },
};

const FILTER_OPTIONS = [
  { value: "all",          label: "All Regions" },
  { value: "Europe",       label: "Europe" },
  { value: "North America",label: "North America" },
  { value: "East Asia",    label: "East Asia" },
  { value: "South Asia",   label: "South Asia" },
  { value: "ASEAN",        label: "ASEAN" },
  { value: "Oceania",      label: "Oceania" },
  { value: "premium",      label: "Premium Segment" },
];

const VIEW_MODES = [
  { value: "europe",         label: "Europe Leaders" },
  { value: "global_compare", label: "Global Comparison" },
  { value: "asia_pacific",   label: "Asia-Pacific" },
];

const SOUTH_ASIA_INSIGHTS = [
  { text: "JLR (Europe) — Higher OTA & backend maturity, owned by Tata Motors" },
  { text: "Tata Motors — Growing CSMS adoption, strong backend hardening" },
  { text: "Mahindra — Emerging cybersecurity stack, improving TARA depth" },
];

function maturityIndex(scores) {
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function filterOems(filter) {
  if (filter === "premium") return OEMS.filter(o => o.segment === "Premium");
  if (filter === "all")     return OEMS;
  return OEMS.filter(o => o.region === filter);
}

function viewModeOems(view) {
  if (view === "europe")         return OEMS.filter(o => o.region === "Europe");
  if (view === "global_compare") return OEMS;
  if (view === "asia_pacific")   return OEMS.filter(o => ["East Asia","South Asia","ASEAN","Oceania"].includes(o.region));
  return OEMS;
}

// Dark glass tooltip for radar chart
function DarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 backdrop-blur-md">
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// Score pill
function ScorePill({ score }) {
  const cls = score >= 85
    ? "bg-green-100 text-green-700 border-green-300"
    : score >= 70
    ? "bg-amber-100 text-amber-700 border-amber-300"
    : "bg-red-100 text-red-700 border-red-300";
  const label = score >= 85 ? "Compliant" : score >= 70 ? "Partial" : "Non-Compliant";
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {score} / 100 · {label}
    </span>
  );
}

// OEM palette — no pink/purple
const LABEL_COLORS   = ["#00A3FF","#00D1D1","#00C853","#FF9F1C","#FF3B3B","#00A3FF"];
const SCORE_VAL_COLS = ["#f97316","#ec4899","#8b5cf6","#06b6d4","#10b981","#f59e0b"];
const VERTEX_COLORS  = ["#C0C0C0","#A8A9AD","#8E8E93","#6D6D6D","#B0B3B8","#C0C0C0"];
// rings: innermost→outer, index 1 (lvl=80) = amber
const RING_COLORS    = ["#0f172a","#0c1a3a","#0a2050","#FF9F1C","#1e3a8a"];
const RING_LBL_COLS  = ["#475569","#475569","#475569","#FF9F1C","#64748b"];

// ── Maturity Spider ────────────────────────────────────────────────────────
function MaturitySpider({ scores, index }) {
  const keys   = METRICS_KEYS;
  const N      = keys.length;
  const cx = 190, cy = 190, R = 148;
  const levels = [20, 40, 60, 80, 100];

  const angleOf  = i => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt       = (val, i) => { const r = (val / 100) * R; return [cx + r * Math.cos(angleOf(i)), cy + r * Math.sin(angleOf(i))]; };
  const axisEnd  = i => [cx + R * Math.cos(angleOf(i)), cy + R * Math.sin(angleOf(i))];
  // labels pushed uniformly to R+62
  const labelPos = i => [cx + (R + 62) * Math.cos(angleOf(i)), cy + (R + 62) * Math.sin(angleOf(i))];
  const ringLbl  = lvl => { const r = (lvl / 100) * R; return [cx + r * Math.cos(angleOf(0)) + 8, cy + r * Math.sin(angleOf(0)) - 7]; };

  const dataPoints = keys.map((m, i) => pt(scores[m.key], i));
  const polyPts    = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  const statusColor   = index >= 85 ? "#00C853" : index >= 70 ? "#FF9F1C" : "#FF3B3B";
  const statusLabel   = index >= 85 ? "Compliant" : index >= 70 ? "Partial" : "Non-Compliant";
  const scoreNumColor = index >= 85 ? "#00C853" : index >= 70 ? "#FF9F1C" : "#FF3B3B";
  const sweepR = R + 6;

  return (
    <svg width={420} height={420} viewBox="0 0 380 380" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f97316" stopOpacity="0.95"/>
          <stop offset="50%"  stopColor="#ec4899" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.95"/>
        </linearGradient>
        <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="sweepGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* web rings */}
      {levels.map((lvl, ri) => (
        <polygon key={lvl}
          points={keys.map((_, i) => { const [x,y] = pt(lvl,i); return `${x},${y}`; }).join(" ")}
          fill="none"
          stroke={RING_COLORS[ri]}
          strokeWidth={lvl === 100 ? 2 : 1.4}
          strokeOpacity={1}
          strokeDasharray={lvl === 20 || lvl === 60 ? "4 3" : "none"}
        />
      ))}

      {/* ring level labels */}
      {levels.map((lvl, ri) => {
        const [lx, ly] = ringLbl(lvl);
        return <text key={lvl} x={lx} y={ly} fontSize="8" fontWeight="600"
          fill={RING_LBL_COLS[ri]} textAnchor="start" dominantBaseline="middle">{lvl}</text>;
      })}

      {/* axis spokes */}
      {keys.map((_, i) => {
        const [x, y] = axisEnd(i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="#1e3a5f" strokeWidth="1.2" strokeOpacity="1"/>;
      })}

      {/* vertex dots — unique color per spoke; amber on lvl=80 ring */}
      {levels.map((lvl, ri) =>
        keys.map((_, i) => {
          const [x, y] = pt(lvl, i);
          const vColor = lvl === 80 ? "#FF9F1C" : VERTEX_COLORS[i];
          const r = lvl === 100 ? 4 : lvl === 80 ? 3.5 : 2.5;
          return <circle key={`v${ri}-${i}`} cx={x} cy={y} r={r}
            fill={vColor} stroke="#020617" strokeWidth="0.8"/>;
        })
      )}

      {/* sweep — rotating line + trail */}
      <g filter="url(#sweepGlow)">
        <line x1={cx} y1={cy} x2={cx} y2={cy - sweepR}
          stroke="#00D1D1" strokeWidth="1.5" strokeOpacity="0.85">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
            dur="5s" repeatCount="indefinite"/>
        </line>
        <line x1={cx} y1={cy} x2={cx} y2={cy - sweepR}
          stroke="#00A3FF" strokeWidth="8" strokeOpacity="0.10">
          <animateTransform attributeName="transform" type="rotate"
            from={`-20 ${cx} ${cy}`} to={`340 ${cx} ${cy}`}
            dur="5s" repeatCount="indefinite"/>
        </line>
      </g>

      {/* data polygon */}
      <polygon points={polyPts} fill="none"
        stroke="url(#polyGrad)" strokeWidth="2.5" strokeLinejoin="round"/>

      {/* data nodes — unique color per node */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6}
          fill={["#f97316","#ec4899","#8b5cf6","#06b6d4","#10b981","#f59e0b"][i]}
          stroke="none"
          filter="url(#nodeGlow)"/>
      ))}

      {/* value labels — fixed offset along spoke direction, uniform style */}
      {dataPoints.map(([x, y], i) => {
        const cos = Math.cos(angleOf(i));
        const sin = Math.sin(angleOf(i));
        const lx  = x + cos * 22;
        const ly  = y + sin * 22;
        return (
          <text key={`sv${i}`} x={lx} y={ly}
            fontSize="12" fontWeight="800"
            fill={SCORE_VAL_COLS[i]}
            stroke="#ffffff" strokeWidth="3" paintOrder="stroke"
            textAnchor="middle" dominantBaseline="middle">
            {scores[keys[i].key]}
          </text>
        );
      })}

      {/* center score */}
      <circle cx={cx} cy={cy} r={44} fill="#050e1a" stroke={statusColor} strokeWidth="1.5" strokeOpacity="0.7"/>
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="34" fontWeight="800" fill={scoreNumColor}>{index}</text>
      <text x={cx} y={cy + 8}  textAnchor="middle" fontSize="11" fontWeight="500" fill="#94a3b8">{index} / 100</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="10" fontWeight="700" fill={statusColor}>✔ {statusLabel}</text>

      {/* axis labels — each spoke color, uniform radial distance */}
      {keys.map((m, i) => {
        const [x, y] = labelPos(i);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fontWeight="700" fill={LABEL_COLORS[i]}>
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function OemBenchmarkPanel({ role = "OEM" }) {
  const isTier1 = role === "Tier-1";

  const tier1Entities = Object.keys(TIER1_DATA);
  const [tier1Selected, setTier1Selected] = useState(tier1Entities[0]);
  const [tier1Compare,  setTier1Compare]  = useState(false);

  const [filter,      setFilter]      = useState("Europe");
  const [viewMode,    setViewMode]    = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected,    setSelected]    = useState(OEMS[0].name);

  const activeOems   = viewMode ? viewModeOems(viewMode) : filterOems(filter);
  const selectedOem  = activeOems.find(o => o.name === selected) || activeOems[0];
  const safeSelected = selectedOem?.name ?? activeOems[0]?.name;
  const showSouthAsiaInsights = filter === "South Asia" || viewMode === "asia_pacific";

  // ── Tier-1 path ───────────────────────────────────────────────
  if (isTier1) {
    const t1metrics  = TIER1_DATA[tier1Selected];
    const t1score    = Math.round(Object.values(t1metrics).reduce((a, b) => a + b, 0) / 6);
    const t1allRadar = METRICS_KEYS.map(m => {
      const row = { subject: m.label };
      tier1Entities.forEach(e => { row[e] = TIER1_DATA[e][m.key]; });
      return row;
    });

    return (
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl overflow-hidden h-full flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-slate-200 uppercase tracking-widest mb-1">Tier-1 Supplier</p>
            <p className="text-sm font-bold text-white tracking-wide">Cyber-Safety Benchmark</p>
            <p className="text-xs text-slate-200 mt-0.5">Autoliv · ZF · Bosch · Joyson · Continental</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTier1Compare(v => !v)}
              className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all duration-200 ${
                tier1Compare
                  ? "bg-blue-600/80 text-white border-blue-500/50"
                  : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              {tier1Compare ? "Single" : "Compare All"}
            </button>
            {!tier1Compare && (
              <select
                value={tier1Selected}
                onChange={e => setTier1Selected(e.target.value)}
                className="border border-white/10 bg-white/5 px-2 py-1 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                {tier1Entities.map(e => <option key={e}>{e}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          {!tier1Compare && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {METRICS_KEYS.map(m => (
                  <div key={m.key} className="sub-card bg-black/20 border border-white/10 rounded-lg p-2.5 text-center" style={{ "--sc-accent": m.accent, borderTop:`3px solid ${m.accent}` }}>
                    <p className="text-[11px] text-slate-100 mb-1 leading-tight font-semibold">{m.label}</p>
                    <p className={`text-lg font-bold ${t1metrics[m.key] >= 85 ? "text-green-300" : t1metrics[m.key] >= 70 ? "text-amber-300" : "text-red-400"}`}>
                      {t1metrics[m.key]}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 500, marginTop: 60, flex: 1 }}>
            <ResponsiveContainer width="100%" height={500}>
              {tier1Compare ? (
                <RadarChart data={t1allRadar} outerRadius="72%" margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
                  <PolarGrid stroke="rgba(14,116,144,0.55)" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#67e8f9", fontSize: 13, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill: "#38bdf8", fontSize: 10 }} />
                  {tier1Entities.map((e, i) => (
                    <Radar key={e} name={e} dataKey={e} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.14} dot={{ r: 4 }} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12, color: "#67e8f9", fontWeight: 600, paddingTop: 12 }} />
                  <Tooltip content={<DarkTooltip />} />
                </RadarChart>
              ) : (
                <RadarChart data={METRICS_KEYS.map(m => ({ subject: m.label, value: t1metrics[m.key] }))} outerRadius="72%" margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
                  <PolarGrid stroke="rgba(14,116,144,0.55)" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#67e8f9", fontSize: 13, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill: "#38bdf8", fontSize: 10 }} />
                  <Radar name={tier1Selected} dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.22}
                    dot={{ r: 6, fill: "#38bdf8", strokeWidth: 2, stroke: "#020617" }} />
                  <Tooltip content={<DarkTooltip />} />
                </RadarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ── OEM path ──────────────────────────────────────────────────
  const allRadar = METRICS_KEYS.map(m => {
    const row = { subject: m.label };
    activeOems.forEach(o => { row[o.name] = o.scores[m.key]; });
    return row;
  });
  const singleRadar = selectedOem
    ? METRICS_KEYS.map(m => ({ subject: m.label, value: selectedOem.scores[m.key] }))
    : [];
  const score = selectedOem ? maturityIndex(selectedOem.scores) : 0;

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: REGION_CONFIG[selectedOem?.region]?.color || "#f59e0b" }}>Global OEM</p>
          <p className="text-lg font-extrabold tracking-wide leading-tight" style={{ color: REGION_CONFIG[selectedOem?.region]?.color || "#0a1628" }}>Cyber-Safety Benchmark</p>
          <p className="text-xs font-semibold mt-1" style={{ color: "#475569" }}>UN R155 / ISO 21434 · Regional Maturity</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCompareMode(v => !v)}
            className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all duration-200 ${
              compareMode
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-700 shadow-sm"
                : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-700 hover:from-cyan-500 hover:to-blue-500"
            }`}
          >
            {compareMode ? "Single" : "Compare All"}
          </button>
          <select
            value={viewMode ?? filter}
            onChange={e => {
              const v = e.target.value;
              const isView = VIEW_MODES.some(m => m.value === v);
              if (isView) { setViewMode(v); setFilter("all"); }
              else        { setFilter(v);  setViewMode(null); }
              setSelected(OEMS[0].name);
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 border border-amber-400"
            style={{ background: "#f59e0b", color: "#1c1917" }}
          >
            <optgroup label="Region / Segment">
              {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
            <optgroup label="View Mode">
              {VIEW_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          </select>
          {!compareMode && activeOems.length > 0 && (
            <select
              value={safeSelected}
              onChange={e => setSelected(e.target.value)}
              className="border border-white/10 bg-white/5 px-2 py-1 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              {activeOems.map(o => <option key={o.name}>{o.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">

        {/* Single view */}
        {!compareMode && selectedOem && (
          <>
            {/* tags row */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { label: selectedOem.region,  color: REGION_CONFIG[selectedOem.region]?.color ?? "#3b82f6" },
                { label: selectedOem.segment, color: selectedOem.segment === "Premium" ? "#f59e0b" : "#64748b" },
                { label: selectedOem.country, color: selectedOem.country === "Australia" ? "#06b6d4" : selectedOem.country === "Germany" ? "#10b981" : "#94a3b8" },
                ...(selectedOem.parent ? [{ label: `Parent: ${selectedOem.parent}`, color: "#f97316" }] : []),
                ...(selectedOem.owns ?? []).map(s => ({ label: `Sub: ${s}`, color: "#8b5cf6" })),
              ].filter(t => t.label).map((tag, i) => (
                <span key={i} className="text-[13px] px-3 py-1 rounded font-semibold border-l-2"
                  style={{ borderColor: tag.color, backgroundColor: `${tag.color}20`, color: tag.color }}>
                  {tag.label}
                </span>
              ))}
            </div>

            {/* ── maturity section: 1.3fr chart | 0.7fr panel ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.7fr",
              alignItems: "center",
              gap: 32,
              padding: "24px 0",
            }}>
              {/* LEFT — radar chart, centered in its column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", marginBottom: 8, color: "#1e3a8a", alignSelf: "flex-start", paddingLeft: 8, fontWeight: 900 }}>
                  ⬡ Maturity Spider
                </p>
                <MaturitySpider scores={selectedOem.scores} index={score} />
              </div>

              {/* RIGHT — score summary, vertically centered */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginTop: "-140px" }}>
                {/* score card */}
                <div style={{
                  textAlign: "center",
                  padding: "14px 16px",
                  background: "#050e1a",
                  border: `1px solid ${score >= 85 ? "#00C853" : score >= 70 ? "#FF9F1C" : "#FF3B3B"}`,
                  borderRadius: 10,
                  maxWidth: 160,
                  margin: "0 auto",
                }}>
                  <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1,
                    color: score >= 85 ? "#00C853" : score >= 70 ? "#FF9F1C" : "#FF3B3B" }}>
                    {score}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginTop: 4 }}>
                    {score} / 100
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, marginTop: 5,
                    color: score >= 85 ? "#00C853" : score >= 70 ? "#FF9F1C" : "#FF3B3B" }}>
                    {score >= 85 ? "✔ Compliant" : score >= 70 ? "⚠ Partial" : "✖ Non-Compliant"}
                  </p>
                </div>

                {/* metric breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {METRICS_KEYS.map(m => (
                    <div key={m.key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 12px", background: "#050e1a",
                      borderRadius: 8, borderLeft: `3px solid ${m.accent}`, border: `1px solid ${m.accent}40`
                    }}>
                      <span style={{ fontSize: 11, color: m.accent, fontWeight: 500 }}>{m.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: selectedOem.scores[m.key] >= 85 ? "#00C853"
                             : selectedOem.scores[m.key] >= 70 ? "#FF9F1C" : "#FF3B3B" }}>
                        {selectedOem.scores[m.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Radar chart — compare mode only */}
        {compareMode && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 500,
            marginTop: -50,
            flex: 1,
          }}>
            <ResponsiveContainer width="100%" height={500}>
              <RadarChart data={allRadar} outerRadius="75%" margin={{ top: 40, right: 80, bottom: 40, left: 80 }}>
                <PolarGrid 
                  stroke="rgba(0, 32, 96, 1.0)" 
                  strokeDasharray="4 4" 
                  strokeWidth={3}
                  radialLines={true}
                />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                {activeOems.slice(0, 6).map((o, i) => (
                  <Radar key={o.name} name={o.name} dataKey={o.name}
                    stroke={COLORS[i % COLORS.length]} fill="none" 
                    strokeWidth={2.5} dot={{ r: 6, fill: COLORS[i % COLORS.length], strokeWidth: 2, stroke: "#ffffff" }} 
                    animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
                ))}
                <Legend wrapperStyle={{ fontSize: 12, color: "#64748b", fontWeight: 600, paddingTop: 16 }} />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* South Asia insight */}
        {showSouthAsiaInsights && (
          <div className="mt-4 border-l-4 border-slate-700 bg-slate-800 rounded-r-lg p-4 shadow-xl">
            <p className="text-sm font-bold text-slate-100 mb-3">South Asia — Comparative Insight</p>
            <ul className="space-y-2">
              {SOUTH_ASIA_INSIGHTS.map((ins, i) => (
                <li key={i} className="text-sm text-white flex gap-2 leading-relaxed">
                  <span className="text-slate-400 mt-1 text-lg">•</span>
                  <span className="font-medium">{ins.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(34,211,238,0.2)" }}>
          <p style={{ fontSize: 13, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 8 }}>Regional Grouping</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(
              activeOems.reduce((acc, oem) => {
                if (!acc[oem.region]) acc[oem.region] = [];
                acc[oem.region].push(oem.name);
                return acc;
              }, {})
            ).map(([region, names]) => (
              <div key={region} className="rounded-lg p-3"
                style={{ 
                  background: "#050e1a", 
                  border: `1px solid ${REGION_CONFIG[region]?.color || "#1e3a8a"}`
                }}>
                <p style={{ 
                  fontSize: 14, 
                  fontWeight: 800, 
                  marginBottom: 4, 
                  color: REGION_CONFIG[region]?.color || "#fff" 
                }}>
                  {region}
                </p>
                <p style={{ fontSize: 13, color: "#ffffff", lineHeight: 1.6, fontWeight: 500 }}>{names.join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#374151", marginTop: 12, fontWeight: 500 }}>
          * Illustrative benchmark — UN R155 &amp; ISO/SAE 21434 aligned.
        </p>
      </div>
    </div>
  );
}
