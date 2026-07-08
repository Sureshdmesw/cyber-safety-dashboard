import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

// ── Threat master (mirrors App.jsx FALLBACK_TARA) ─────────────────────────────
const ALL_THREATS = [
  { code:"4.1",  title:"CAN Bus Spoofing",          cat:"Communication", risk:20, asil:"ASIL D" },
  { code:"6.2",  title:"Man-in-the-Middle",          cat:"Communication", risk:12, asil:"ASIL C" },
  { code:"6.3",  title:"Session Hijacking",          cat:"Communication", risk:12, asil:"ASIL C" },
  { code:"11.1", title:"ECU Firmware Tampering",     cat:"Software",      risk:15, asil:"ASIL D" },
  { code:"11.3", title:"Bootloader Bypass",          cat:"Software",      risk:10, asil:"ASIL D" },
  { code:"12.1", title:"Compromised OTA Update",     cat:"Update",        risk:15, asil:"ASIL D" },
  { code:"12.3", title:"OTA Rollback Attack",        cat:"Update",        risk:12, asil:"ASIL C" },
  { code:"12.4", title:"OTA Package Forgery",        cat:"Update",        risk:10, asil:"ASIL D" },
  { code:"13.1", title:"Update Server Compromise",   cat:"Backend",       risk:15, asil:"ASIL D" },
  { code:"16.1", title:"Replay Attack",              cat:"Communication", risk:16, asil:"ASIL C" },
  { code:"18.1", title:"Telematics Data Exfil",      cat:"Privacy",       risk:12, asil:"ASIL B" },
  { code:"18.3", title:"Remote Diagnostic Abuse",    cat:"Privacy",       risk:9,  asil:"ASIL B" },
  { code:"20.1", title:"Sensor Data Manipulation",   cat:"Sensor",        risk:15, asil:"ASIL D" },
  { code:"21.1", title:"GPS Spoofing",               cat:"Sensor",        risk:16, asil:"ASIL C" },
  { code:"24.1", title:"CAN Denial of Service",      cat:"Communication", risk:25, asil:"ASIL D" },
  { code:"25.1", title:"Airbag Signal Spoofing",     cat:"Safety",        risk:20, asil:"ASIL D" },
  { code:"26.1", title:"Weak Encryption",            cat:"Cryptography",  risk:16, asil:"ASIL C" },
  { code:"28.2", title:"Physical ECU Tampering",     cat:"Physical",      risk:8,  asil:"ASIL B" },
  { code:"29.2", title:"Backend Server Compromise",  cat:"Backend",       risk:15, asil:"ASIL D" },
];

const COMPONENT_THREATS = {
  "Airbag ECU":              ["4.1","6.2","6.3","11.1","20.1","24.1","25.1","26.1","28.2"],
  "Seatbelt Pretensioner ECU":["4.1","6.3","11.1","11.3","20.1","24.1","25.1","28.2"],
  "OTA Module":              ["12.1","12.3","12.4","13.1","16.1","26.1","29.2"],
  "Central Gateway ECU":     ["6.2","11.1","16.1","18.1","18.3","21.1","24.1","29.2"],
  "Telematics Control Unit": ["6.2","12.1","16.1","18.1","21.1","26.1","29.2"],
  "Body Control Module":     ["4.1","11.1","18.3","20.1","24.1","25.1","28.2"],
  "ADAS ECU":                ["4.1","6.2","6.3","11.1","20.1","24.1","25.1","26.1","28.2","29.2"],
  "Powertrain ECU":          ["4.1","11.1","11.3","20.1","24.1","25.1","26.1","28.2"],
  "Brake Control Module":    ["4.1","6.3","11.1","20.1","24.1","25.1","26.1","28.2"],
  "EV Battery Management":   ["12.1","12.4","20.1","25.1","26.1","28.2","29.2"],
  "Chassis Control ECU":     ["4.1","11.1","20.1","24.1","25.1","26.1","28.2"],
  "Infotainment Head Unit":  ["6.2","12.1","16.1","18.1","18.3","21.1","26.1","29.2"],
};

// Deterministic mitigation status per threat (simulates real coverage data)
const MITIGATION_STATUS = {
  "4.1":"Mitigated","6.2":"Partial","6.3":"Mitigated","11.1":"Mitigated",
  "11.3":"Partial","12.1":"Mitigated","12.3":"Partial","12.4":"Mitigated",
  "13.1":"Partial","16.1":"Mitigated","18.1":"Partial","18.3":"Not Mitigated",
  "20.1":"Mitigated","21.1":"Partial","24.1":"Mitigated","25.1":"Mitigated",
  "26.1":"Partial","28.2":"Not Mitigated","29.2":"Mitigated",
};

// Role-specific coverage thresholds (OEM = full scope, Tier-1 = component, Authority = audit)
const ROLE_SCOPE = {
  "OEM": { label:"Full System Scope", minRisk: 0 },
  "Tier-1": { label:"Component Scope", minRisk: 0 },
  "Authority (ARAI/TÜV/ICAT)": { label:"Audit Scope (Critical Only)", minRisk: 12 },
};

const CAT_COLORS = {
  Communication:"#3b82f6", Software:"#8b5cf6", Update:"#06b6d4",
  Backend:"#f59e0b", Privacy:"#ec4899", Sensor:"#10b981",
  Safety:"#ef4444", Cryptography:"#6366f1", Physical:"#84cc16",
};

const STATUS_CFG = {
  Mitigated:     { color:"#22c55e", bg:"#f0fdf4", border:"#bbf7d0", Icon: CheckCircle2 },
  Partial:       { color:"#f59e0b", bg:"#fffbeb", border:"#fde68a", Icon: MinusCircle  },
  "Not Mitigated":{ color:"#ef4444", bg:"#fef2f2", border:"#fecaca", Icon: XCircle      },
};

// ── Radial Arc Gauge (pure SVG) ───────────────────────────────────────────────
function ArcGauge({ pct, color }) {
  const R = 54, cx = 70, cy = 70;
  const startAngle = -210, sweep = 240;
  const toRad = d => (d * Math.PI) / 180;
  const arc = (angle) => ({
    x: cx + R * Math.cos(toRad(angle)),
    y: cy + R * Math.sin(toRad(angle)),
  });
  const endAngle = startAngle + sweep * (pct / 100);
  const s = arc(startAngle), e = arc(endAngle), bg = arc(startAngle + sweep);
  const largeArc = sweep * (pct / 100) > 180 ? 1 : 0;
  const bgLarge  = sweep > 180 ? 1 : 0;

  return (
    <svg width={140} height={110} viewBox="0 0 140 110">
      <defs>
        <linearGradient id={`arcGrad-${color.replace("#","")}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <path
        d={`M${s.x},${s.y} A${R},${R} 0 ${bgLarge},1 ${bg.x},${bg.y}`}
        fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round"
      />
      {/* Fill */}
      {pct > 0 && (
        <path
          d={`M${s.x},${s.y} A${R},${R} 0 ${largeArc},1 ${e.x},${e.y}`}
          fill="none"
          stroke={`url(#arcGrad-${color.replace("#","")})`}
          strokeWidth="10" strokeLinecap="round"
          filter="url(#arcGlow)"
        />
      )}
      {/* Center text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>{pct}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="600">%</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="7.5" fill="#6b7280">COVERAGE</text>
    </svg>
  );
}

// ── Donut tooltip ─────────────────────────────────────────────────────────────
function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const cfg = STATUS_CFG[name] || {};
  return (
    <div style={{ background:"#fff", border:`1.5px solid ${cfg.color||"#e5e7eb"}`, borderRadius:8, padding:"6px 12px", fontSize:12, boxShadow:"0 4px 16px rgba(0,0,0,0.10)" }}>
      <span style={{ fontWeight:700, color: cfg.color }}>{name}</span>
      <span style={{ color:"#6b7280", marginLeft:8 }}>{value} threats</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ThreatCoverageChart({ role = "OEM", component = "", regulation = "" }) {
  const scope = ROLE_SCOPE[role] || ROLE_SCOPE["OEM"];

  const threats = useMemo(() => {
    const codes = component ? COMPONENT_THREATS[component] : null;
    let list = codes
      ? ALL_THREATS.filter(t => codes.includes(t.code))
      : ALL_THREATS;
    if (scope.minRisk > 0) list = list.filter(t => t.risk >= scope.minRisk);
    if (regulation === "ISO21434") list = list.filter(t => t.risk >= 9);
    if (regulation === "CSMS")     list = list.filter(t => t.risk >= 16);
    return list.map(t => ({ ...t, status: MITIGATION_STATUS[t.code] || "Not Mitigated" }));
  }, [component, regulation, scope.minRisk]);

  const mitigated    = threats.filter(t => t.status === "Mitigated").length;
  const partial      = threats.filter(t => t.status === "Partial").length;
  const notMitigated = threats.filter(t => t.status === "Not Mitigated").length;
  const total        = threats.length || 1;
  const pct          = Math.round(((mitigated + partial * 0.5) / total) * 100);
  const criticalGap  = threats.filter(t => t.status !== "Mitigated" && t.risk >= 16).length;

  const donutData = [
    { name:"Mitigated",      value: mitigated    },
    { name:"Partial",        value: partial      },
    { name:"Not Mitigated",  value: notMitigated },
  ].filter(d => d.value > 0);

  // Category breakdown
  const catMap = {};
  threats.forEach(t => {
    if (!catMap[t.cat]) catMap[t.cat] = { total:0, mitigated:0 };
    catMap[t.cat].total++;
    if (t.status === "Mitigated") catMap[t.cat].mitigated++;
    else if (t.status === "Partial") catMap[t.cat].mitigated += 0.5;
  });
  const categories = Object.entries(catMap)
    .map(([cat, v]) => ({ cat, pct: Math.round((v.mitigated / v.total) * 100), total: v.total }))
    .sort((a, b) => b.pct - a.pct);

  const gaugeColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const statusLabel = pct >= 80 ? "Well Covered" : pct >= 50 ? "Partially Covered" : "Coverage Risk";

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* ── Top summary strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Threats",    value: total,        color:"#3b82f6", Icon: ShieldAlert  },
          { label:"Mitigated",        value: mitigated,    color:"#22c55e", Icon: ShieldCheck  },
          { label:"Partial Coverage", value: partial,      color:"#f59e0b", Icon: MinusCircle  },
          { label:"Critical Gaps",    value: criticalGap,  color: criticalGap > 0 ? "#ef4444" : "#22c55e", Icon: AlertTriangle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="sub-card" style={{
            "--sc-accent": color,
            background:"#fff", border:`1.5px solid ${color}22`,
            borderTop:`3px solid ${color}`, borderRadius:10,
            padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)"
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
            </div>
            <p style={{ fontSize:26, fontWeight:800, color, lineHeight:1, margin:0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Main visual row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr", gap:20, alignItems:"start" }}>

        {/* Arc Gauge */}
        <div className="sub-card" style={{ "--sc-accent":gaugeColor, background:"#fff", border:"1.5px solid #e5e7eb", borderTop:`3px solid ${gaugeColor}`, borderRadius:12, padding:"16px 12px", textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <ArcGauge pct={pct} color={gaugeColor} />
          <p style={{ fontSize:11, fontWeight:700, color: gaugeColor, marginTop:4 }}>{statusLabel}</p>
          <p style={{ fontSize:9, color:"#9ca3af", marginTop:2 }}>{scope.label}</p>
          <div style={{ marginTop:10, padding:"6px 10px", background: pct >= 80 ? "#f0fdf4" : pct >= 50 ? "#fffbeb" : "#fef2f2", borderRadius:6 }}>
            <p style={{ fontSize:9, color:"#6b7280", margin:0 }}>
              <span style={{ fontWeight:700, color: gaugeColor }}>{role}</span> · {component || "All Components"}
            </p>
          </div>
        </div>

        {/* Donut chart */}
        <div className="sub-card" style={{ "--sc-accent":"#6366f1", background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #6366f1", borderRadius:12, padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Mitigation Status</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_CFG[entry.name]?.color || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip content={<DonutTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px", marginTop:8 }}>
            {donutData.map(({ name, value }) => {
              const cfg = STATUS_CFG[name];
              return (
                <div key={name} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:cfg.color, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:"#6b7280" }}>{name}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="sub-card" style={{ "--sc-accent":"#0ea5e9", background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #0ea5e9", borderRadius:12, padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Coverage by Category</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {categories.map(({ cat, pct: cp, total: ct }) => (
              <div key={cat}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:"#374151", fontWeight:600 }}>{cat}</span>
                  <span style={{ fontSize:10, color:"#9ca3af" }}>{cp}% · {ct} threats</span>
                </div>
                <div style={{ height:7, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", width:`${cp}%`,
                    background: CAT_COLORS[cat] || "#3b82f6",
                    borderRadius:4,
                    transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                    boxShadow:`0 0 6px ${CAT_COLORS[cat] || "#3b82f6"}66`
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Per-threat coverage grid ── */}
      <div className="sub-card" style={{ "--sc-accent":"#7c3aed", marginTop:20, background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #7c3aed", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>
            Threat-Level Coverage Detail
          </p>
          <span style={{ fontSize:10, color:"#9ca3af" }}>
            {component || "All Components"} · {regulation || "All Regulations"}
          </span>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#f9fafb" }}>
                {["Code","Threat","Category","ASIL","Risk Score","Status","Coverage Bar"].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign: h === "Coverage Bar" ? "left" : "left",
                    fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase",
                    letterSpacing:"0.07em", borderBottom:"1px solid #e5e7eb", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threats.map((t, i) => {
                const cfg = STATUS_CFG[t.status];
                const barPct = t.status === "Mitigated" ? 100 : t.status === "Partial" ? 55 : 15;
                const Icon = cfg.Icon;
                return (
                  <tr key={t.code} style={{ borderBottom:"1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding:"8px 12px", fontFamily:"monospace", fontWeight:700, color:"#2563eb", fontSize:11 }}>{t.code}</td>
                    <td style={{ padding:"8px 12px", color:"#111827", fontWeight:500, maxWidth:180, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ background:`${CAT_COLORS[t.cat] || "#3b82f6"}18`, color: CAT_COLORS[t.cat] || "#3b82f6",
                        border:`1px solid ${CAT_COLORS[t.cat] || "#3b82f6"}44`,
                        borderRadius:4, padding:"2px 7px", fontSize:10, fontWeight:600 }}>{t.cat}</span>
                    </td>
                    <td style={{ padding:"8px 12px", fontSize:11, fontWeight:700,
                      color: t.asil === "ASIL D" ? "#dc2626" : t.asil === "ASIL C" ? "#d97706" : "#16a34a" }}>{t.asil}</td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                        width:32, height:20, borderRadius:4, fontSize:11, fontWeight:800,
                        background: t.risk >= 16 ? "#fef2f2" : t.risk >= 9 ? "#fffbeb" : "#f0fdf4",
                        color: t.risk >= 16 ? "#dc2626" : t.risk >= 9 ? "#d97706" : "#16a34a" }}>{t.risk}</span>
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                        background: cfg.bg, border:`1px solid ${cfg.border}`,
                        color: cfg.color, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
                        <Icon size={10} />
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding:"8px 12px", minWidth:100 }}>
                      <div style={{ height:6, background:"#f3f4f6", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${barPct}%`, background: cfg.color,
                          borderRadius:3, transition:"width 0.5s ease",
                          boxShadow:`0 0 5px ${cfg.color}55` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
