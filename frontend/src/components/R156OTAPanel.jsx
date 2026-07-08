import { useEffect, useState, useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  ShieldCheck, RefreshCw, Lock, Zap, Bell,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";

// ── Fallback data — mirrors DB schema exactly ─────────────────────────────────
const FALLBACK = [
  { component:"Airbag ECU",             rxswin:"RX-ACU-001", sums_cert_valid:true,  cert_expiry:"2026-03-01", rollback_capable:true,  integrity_check:true,  power_check:true,  user_notified:true  },
  { component:"OTA Module",             rxswin:"RX-OTA-002", sums_cert_valid:true,  cert_expiry:"2025-11-15", rollback_capable:true,  integrity_check:true,  power_check:true,  user_notified:false },
  { component:"Central Gateway ECU",    rxswin:"RX-CGW-003", sums_cert_valid:true,  cert_expiry:"2026-06-30", rollback_capable:false, integrity_check:true,  power_check:true,  user_notified:true  },
  { component:"Telematics Control Unit",rxswin:"RX-TCU-004", sums_cert_valid:false, cert_expiry:"2024-12-01", rollback_capable:true,  integrity_check:false, power_check:true,  user_notified:true  },
  { component:"ADAS ECU",               rxswin:"RX-ADS-005", sums_cert_valid:true,  cert_expiry:"2026-09-20", rollback_capable:true,  integrity_check:true,  power_check:false, user_notified:true  },
  { component:"Infotainment Head Unit", rxswin:"RX-IHU-006", sums_cert_valid:true,  cert_expiry:"2025-08-10", rollback_capable:true,  integrity_check:true,  power_check:true,  user_notified:true  },
  { component:"Powertrain ECU",         rxswin:"RX-PTN-007", sums_cert_valid:true,  cert_expiry:"2026-12-31", rollback_capable:false, integrity_check:true,  power_check:true,  user_notified:false },
  { component:"EV Battery Management",  rxswin:"RX-EVM-008", sums_cert_valid:true,  cert_expiry:"2027-01-15", rollback_capable:true,  integrity_check:true,  power_check:true,  user_notified:true  },
];

// Role-specific requirement sets
const ROLE_CFG = {
  "OEM": {
    label: "Full System OTA Scope",
    checks: ["sums_cert_valid","rollback_capable","integrity_check","power_check","user_notified"],
    minChecks: 5,
  },
  "Tier-1": {
    label: "Component OTA Scope",
    checks: ["sums_cert_valid","integrity_check","rollback_capable"],
    minChecks: 3,
  },
  "Authority (ARAI/TÜV/ICAT)": {
    label: "Type Approval Audit Scope",
    checks: ["sums_cert_valid","rollback_capable","integrity_check","power_check","user_notified"],
    minChecks: 5,
  },
};

// Regulation-specific notes
const REG_NOTE = {
  "UNR155":   "UN R155 CSMS gate — OTA integrity & SUMS mandatory",
  "ISO21434": "ISO/SAE 21434 §10 — update security requirements apply",
  "CSMS":     "CSMS Annex 5 — software update traceability required",
  "":         "All regulations in scope",
};

const CHECK_META = {
  sums_cert_valid:  { label:"SUMS Cert",   Icon: ShieldCheck, desc:"Software Update Management System certificate valid", accentColor:"#6366f1" },
  rollback_capable: { label:"Rollback",    Icon: RefreshCw,   desc:"Rollback to previous version supported",              accentColor:"#0ea5e9" },
  integrity_check:  { label:"Integrity",   Icon: Lock,        desc:"Cryptographic integrity verification enabled",         accentColor:"#14b8a6" },
  power_check:      { label:"Power Safe",  Icon: Zap,         desc:"Power-loss safe update mechanism in place",           accentColor:"#f59e0b" },
  user_notified:    { label:"User Notify", Icon: Bell,        desc:"End-user notification on update delivered",           accentColor:"#ec4899" },
};

// ── Arc Gauge (pure SVG) ──────────────────────────────────────────────────────
function ArcGauge({ pct, color }) {
  const R = 52, cx = 68, cy = 72;
  const toRad = d => (d * Math.PI) / 180;
  const sweep = 240, start = -210;
  const pt = a => ({ x: cx + R * Math.cos(toRad(a)), y: cy + R * Math.sin(toRad(a)) });
  const s = pt(start), bg = pt(start + sweep);
  const end = pt(start + sweep * (pct / 100));
  const lg = sweep * (pct / 100) > 180 ? 1 : 0;
  const id = `otaGrad${color.replace("#","")}`;
  return (
    <svg width={136} height={108} viewBox="0 0 136 108">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6"/>
          <stop offset="100%" stopColor={color}/>
        </linearGradient>
        <filter id="otaGlow">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d={`M${s.x},${s.y} A${R},${R} 0 1,1 ${bg.x},${bg.y}`}
        fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round"/>
      {pct > 0 && (
        <path d={`M${s.x},${s.y} A${R},${R} 0 ${lg},1 ${end.x},${end.y}`}
          fill="none" stroke={`url(#${id})`} strokeWidth="10"
          strokeLinecap="round" filter="url(#otaGlow)"/>
      )}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="21" fontWeight="800" fill={color}>{pct}</text>
      <text x={cx} y={cx + 8} textAnchor="middle" fontSize="8.5" fill="#9ca3af" fontWeight="600">% READY</text>
      <text x={cx} y={cx + 20} textAnchor="middle" fontSize="7" fill="#6b7280">UN R156</text>
    </svg>
  );
}

// ── Radar tooltip ─────────────────────────────────────────────────────────────
const LABEL_BY_SUBJECT = Object.fromEntries(
  Object.values(CHECK_META).map(m => [m.label, m])
);
function RadarTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { subject, value } = payload[0].payload;
  const meta = LABEL_BY_SUBJECT[subject];
  return (
    <div style={{ background:"#1e293b", border:"1.5px solid #334155", borderRadius:8,
      padding:"7px 12px", fontSize:11, boxShadow:"0 4px 16px rgba(0,0,0,0.22)",
      maxWidth:200 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
        {meta && <meta.Icon size={11} color={meta.accentColor}/>}
        <span style={{ fontWeight:700, color: meta?.accentColor ?? "#f1f5f9" }}>{subject}</span>
        <span style={{ color:"#94a3b8", marginLeft:"auto", fontWeight:700 }}>{value}%</span>
      </div>
      {meta && <p style={{ margin:0, color:"#cbd5e1", fontSize:10, lineHeight:1.4 }}>{meta.desc}</p>}
    </div>
  );
}

// ── Cert Ready Modal ─────────────────────────────────────────────────────────
function CertReadyModal({ scored, readinessPct, gaugeColor, role, component, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:14,
        boxShadow:"0 20px 60px rgba(0,0,0,0.18)", width:"min(560px,95vw)", maxHeight:"80vh",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f3f4f6",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderTop:`4px solid ${gaugeColor}` }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#111827" }}>Cert Readiness Summary</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#6b7280" }}>
              {role} · {component || "All ECUs"} · Overall: <strong style={{ color: gaugeColor }}>{readinessPct}%</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:16, color:"#6b7280",
            display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {/* summary pills */}
        <div style={{ padding:"12px 20px", display:"flex", gap:10, borderBottom:"1px solid #f3f4f6" }}>
          {[
            { label:"Total",      val: scored.length,                              color:"#3b82f6" },
            { label:"Compliant",  val: scored.filter(c=>c.compliant).length,       color:"#0d9488" },
            { label:"Gaps",       val: scored.filter(c=>!c.compliant).length,      color:"#ef4444" },
            { label:"Cert Expired",val: scored.filter(c=>c.expired).length,        color:"#f59e0b" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ flex:1, background:`${color}10`, border:`1.5px solid ${color}30`,
              borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <p style={{ margin:0, fontSize:20, fontWeight:800, color }}>{val}</p>
              <p style={{ margin:0, fontSize:10, color:"#6b7280", fontWeight:600 }}>{label}</p>
            </div>
          ))}
        </div>
        {/* per-component rows */}
        <div style={{ overflowY:"auto", padding:"12px 20px", display:"flex", flexDirection:"column", gap:8 }}>
          {scored.map((c, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"10px 12px", borderRadius:8, border:"1px solid #f3f4f6",
              background: c.compliant ? "#f0fdf4" : "#fef2f2" }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#111827" }}>{c.component}</p>
                <p style={{ margin:"2px 0 0", fontSize:10, color: c.expired ? "#ef4444" : "#6b7280" }}>
                  Cert expiry: {c.cert_expiry || "—"}{c.expired ? " · EXPIRED" : ""}
                </p>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:80, height:5, background:"#e5e7eb", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${c.pct}%`,
                      background: c.pct===100?"#22c55e":c.pct>=60?"#f59e0b":"#ef4444", borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700,
                    color: c.pct===100?"#22c55e":c.pct>=60?"#f59e0b":"#ef4444" }}>{c.pct}%</span>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5,
                  background: c.compliant?"#dcfce7":"#fee2e2",
                  color: c.compliant?"#16a34a":"#dc2626" }}>
                  {c.compliant ? "✓ Compliant" : "✗ Gap"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Check Pass Rate Modal ─────────────────────────────────────────────────────
function CheckPassModal({ scored, roleCfg, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:14,
        boxShadow:"0 20px 60px rgba(0,0,0,0.18)", width:"min(580px,95vw)", maxHeight:"80vh",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f3f4f6",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderTop:"4px solid #0ea5e9" }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#111827" }}>Check Pass Rate — Consolidated</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#6b7280" }}>
              {roleCfg.label} · {scored.length} components evaluated
            </p>
          </div>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:16, color:"#6b7280",
            display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {/* per-check breakdown */}
        <div style={{ overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          {roleCfg.checks.map(k => {
            const meta = CHECK_META[k];
            const Icon = meta.Icon;
            const passCount = scored.filter(c => c.checks[k]).length;
            const failCount = scored.length - passCount;
            const pct = scored.length ? Math.round((passCount / scored.length) * 100) : 0;
            const barColor = pct < 60 ? "#ef4444" : meta.accentColor;
            return (
              <div key={k} style={{ border:"1px solid #f3f4f6", borderRadius:10,
                padding:"12px 14px", borderLeft:`4px solid ${barColor}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Icon size={14} color={barColor}/>
                    <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{meta.label}</span>
                    <span style={{ fontSize:10, color:"#6b7280" }}>— {meta.desc}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, color: barColor }}>{pct}%</span>
                </div>
                <div style={{ height:8, background:"#f3f4f6", borderRadius:4, overflow:"hidden", marginBottom:8 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background: barColor,
                    borderRadius:4, boxShadow:`0 0 8px ${barColor}55` }}/>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>✓ Pass: {passCount}</span>
                  <span style={{ fontSize:11, color:"#dc2626", fontWeight:600 }}>✗ Fail: {failCount}</span>
                  <span style={{ fontSize:11, color:"#6b7280" }}>of {scored.length} components</span>
                </div>
                {/* per-component pass/fail chips */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                  {scored.map((c, i) => (
                    <span key={i} style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:5,
                      background: c.checks[k] ? "#f0fdf4" : "#fef2f2",
                      color: c.checks[k] ? "#16a34a" : "#dc2626",
                      border: `1px solid ${c.checks[k] ? "#bbf7d0" : "#fecaca"}` }}>
                      {c.component.split(" ").slice(0,2).join(" ")}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function R156OTAPanel({ role = "OEM", component = "", regulation = "" }) {
  const [raw,     setRaw]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCertModal,  setShowCertModal]  = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/compliance/r156-status")
      .then(r => r.json())
      .then(d => { setRaw(d.components || []); setLoading(false); })
      .catch(() => { setRaw(FALLBACK); setLoading(false); });
  }, []);

  const roleCfg = ROLE_CFG[role] || ROLE_CFG["OEM"];

  const rows = useMemo(() => {
    if (!raw) return [];
    let list = component ? raw.filter(c => c.component === component) : raw;
    // Authority role: only show components with SUMS cert (audit-relevant)
    if (role.startsWith("Authority") && !component) list = list.filter(c => c.sums_cert_valid);
    return list;
  }, [raw, component, role]);

  const isExpired = d => d && new Date(d) < new Date();

  const scored = useMemo(() => rows.map(c => {
    const expired = isExpired(c.cert_expiry);
    const checks = {
      sums_cert_valid:  c.sums_cert_valid && !expired,
      rollback_capable: c.rollback_capable,
      integrity_check:  c.integrity_check,
      power_check:      c.power_check,
      user_notified:    c.user_notified,
    };
    const passed = roleCfg.checks.filter(k => checks[k]).length;
    const pct    = Math.round((passed / roleCfg.checks.length) * 100);
    const compliant = passed === roleCfg.checks.length;
    return { ...c, checks, passed, pct, compliant, expired };
  }), [rows, roleCfg]);

  const compliantCount = scored.filter(c => c.compliant).length;
  const readinessPct   = scored.length ? Math.round((compliantCount / scored.length) * 100) : 0;
  const gaugeColor     = readinessPct >= 80 ? "#22c55e" : readinessPct >= 50 ? "#f59e0b" : "#ef4444";
  const expiredCount   = scored.filter(c => c.expired).length;
  const gapCount       = scored.filter(c => !c.compliant).length;

  // Radar data — per-check pass rate across all rows
  const radarData = roleCfg.checks.map(k => ({
    subject: CHECK_META[k].label,
    value: scored.length
      ? Math.round((scored.filter(c => c.checks[k]).length / scored.length) * 100)
      : 0,
  }));

  if (loading) return (
    <div style={{ padding:24, color:"#9ca3af", fontSize:13 }}>Loading OTA status…</div>
  );

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>

      {showCertModal && (
        <CertReadyModal scored={scored} readinessPct={readinessPct} gaugeColor={gaugeColor}
          role={role} component={component} onClose={() => setShowCertModal(false)} />
      )}
      {showCheckModal && (
        <CheckPassModal scored={scored} roleCfg={roleCfg} onClose={() => setShowCheckModal(false)} />
      )}

      {/* ── Regulation note banner ── */}
      {regulation && (
        <div style={{ marginBottom:16, padding:"8px 14px", background:"#eff6ff",
          border:"1.5px solid #bfdbfe", borderRadius:8, fontSize:11,
          color:"#1d4ed8", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
          <ShieldCheck size={13} color="#2563eb"/>
          {REG_NOTE[regulation] || REG_NOTE[""]}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Components",    value: scored.length,    color:"#3b82f6", Icon: ShieldCheck   },
          { label:"Compliant",     value: compliantCount,   color:"#0d9488", Icon: CheckCircle2  },
          { label:"Gaps",          value: gapCount,         color: gapCount  > 0 ? "#ef4444" : "#7c3aed", Icon: XCircle       },
          { label:"Cert Expired",  value: expiredCount,     color: expiredCount > 0 ? "#f59e0b" : "#0ea5e9", Icon: Clock },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="sub-card" style={{ "--sc-accent":color, background:"#fff", border:`1.5px solid ${color}22`,
            borderTop:`3px solid ${color}`, borderRadius:10,
            padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <Icon size={13} color={color}/>
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
            </div>
            <p style={{ fontSize:26, fontWeight:800, color, lineHeight:1, margin:0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Main visual row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"148px 1fr 1fr", gap:18, marginBottom:20, alignItems:"start" }}>

        {/* Arc Gauge */}
        <div className="sub-card" onClick={() => setShowCertModal(true)}
          style={{ "--sc-accent":gaugeColor, background:"#fff", border:"1.5px solid #e5e7eb", borderTop:`3px solid ${gaugeColor}`, borderRadius:12,
          padding:"16px 10px", textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", cursor:"pointer" }}>
          <ArcGauge pct={readinessPct} color={gaugeColor}/>
          <p style={{ fontSize:11, fontWeight:700, color: gaugeColor, marginTop:2 }}>
            {readinessPct >= 80 ? "Cert Ready" : readinessPct >= 50 ? "Partial" : "Non-Compliant"}
          </p>
          <p style={{ fontSize:9, color:"#9ca3af", marginTop:2 }}>{roleCfg.label}</p>
          <p style={{ fontSize:9, color:"#0ea5e9", marginTop:6, fontWeight:600 }}>click for details ↗</p>
          <div style={{ marginTop:10, padding:"5px 8px",
            background: readinessPct >= 80 ? "#f0fdf4" : readinessPct >= 50 ? "#fffbeb" : "#fef2f2",
            borderRadius:6 }}>
            <p style={{ fontSize:9, color:"#6b7280", margin:0 }}>
              <span style={{ fontWeight:700, color: gaugeColor }}>{role}</span>
              {" · "}{component || "All ECUs"}
            </p>
          </div>
        </div>

        {/* Radar chart */}
        <div className="sub-card" style={{ "--sc-accent":"#6366f1", background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #6366f1", borderRadius:12,
          padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>OTA Requirement Coverage</p>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="#c7d2fe" strokeWidth={1.5} strokeDasharray=""/>
              <PolarAngleAxis dataKey="subject"
                tick={{ fontSize:10, fill:"#6b7280", fontWeight:600 }}/>
              <Radar dataKey="value" stroke="#6366f1" fill="#818cf8"
                fillOpacity={0.22} strokeWidth={2}/>
              <Tooltip content={<RadarTip/>}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-check pass rate bars */}
        <div className="sub-card" onClick={() => setShowCheckModal(true)}
          style={{ "--sc-accent":"#0ea5e9", background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #0ea5e9", borderRadius:12,
          padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", cursor:"pointer" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:14,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>Check Pass Rate
            <span style={{ marginLeft:6, fontSize:9, color:"#0ea5e9", fontWeight:600,
              background:"#e0f2fe", borderRadius:4, padding:"1px 6px" }}>click for details</span>
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {roleCfg.checks.map(k => {
              const meta = CHECK_META[k];
              const passCount = scored.filter(c => c.checks[k]).length;
              const pct = scored.length ? Math.round((passCount / scored.length) * 100) : 0;
              const barColor = pct < 60 ? "#ef4444" : meta.accentColor;
              const Icon = meta.Icon;
              return (
                <div key={k}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <Icon size={11} color={barColor}/>
                      <span style={{ fontSize:11, color:"#374151", fontWeight:600 }}>{meta.label}</span>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color: barColor }}>{passCount}/{scored.length}</span>
                  </div>
                  <div style={{ height:7, background:"#f3f4f6", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: barColor,
                      borderRadius:4, transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                      boxShadow:`0 0 6px ${barColor}55` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Compliance detail table ── */}
      <div className="sub-card" style={{ "--sc-accent":"#7c3aed", background:"#fff", border:"1.5px solid #e5e7eb", borderTop:"3px solid #7c3aed", borderRadius:12,
        overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#374151",
            textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>
            OTA Certification Detail — UN R156 / SUMS
          </p>
          <span style={{ fontSize:10, color:"#9ca3af" }}>
            {component || "All Components"} · {regulation || "All Regulations"}
          </span>
        </div>
        {scored.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#9ca3af", fontSize:13 }}>
            <AlertTriangle size={28} style={{ margin:"0 auto 10px", opacity:0.4 }}/>
            No OTA data for selected component
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  {["Component","RXSWIN","SUMS Cert","Cert Expiry","Rollback","Integrity","Power Safe","User Notify","Score","Status"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10,
                      fontWeight:700, color:"#6b7280", textTransform:"uppercase",
                      letterSpacing:"0.07em", borderBottom:"1px solid #e5e7eb",
                      whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scored.map((c, i) => {
                  const scoreColor = c.pct === 100 ? "#22c55e" : c.pct >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid #f3f4f6",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding:"8px 12px", fontWeight:600, color:"#111827" }}>{c.component}</td>
                      <td style={{ padding:"8px 12px", fontFamily:"monospace", fontSize:11, color:"#2563eb", fontWeight:700 }}>{c.rxswin}</td>
                      {["sums_cert_valid"].map(k => (
                        <td key={k} style={{ padding:"8px 12px", textAlign:"center" }}>
                          {c.checks[k]
                            ? <CheckCircle2 size={14} color="#0d9488"/>
                            : <XCircle size={14} color="#ef4444"/>}
                        </td>
                      ))}
                      <td style={{ padding:"8px 12px", fontSize:11, fontWeight:600,
                        color: c.expired ? "#ef4444" : "#374151", whiteSpace:"nowrap" }}>
                        {c.cert_expiry || "—"}
                        {c.expired && <span style={{ marginLeft:4, fontSize:9, background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>EXPIRED</span>}
                      </td>
                      {["rollback_capable","integrity_check","power_check","user_notified"].map(k => (
                        <td key={k} style={{ padding:"8px 12px", textAlign:"center" }}>
                          {c.checks[k]
                            ? <CheckCircle2 size={14} color="#22c55e"/>
                            : <XCircle size={14} color="#ef4444"/>}
                        </td>
                      ))}
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ flex:1, height:5, background:"#f3f4f6", borderRadius:3, overflow:"hidden", minWidth:50 }}>
                            <div style={{ height:"100%", width:`${c.pct}%`, background: scoreColor, borderRadius:3 }}/>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color: scoreColor, minWidth:28 }}>{c.pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{
                          display:"inline-flex", alignItems:"center", gap:4,
                          background: c.compliant ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${c.compliant ? "#bbf7d0" : "#fecaca"}`,
                          color: c.compliant ? "#16a34a" : "#dc2626",
                          borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700
                        }}>
                          {c.compliant
                            ? <><CheckCircle2 size={10}/>Compliant</>
                            : <><XCircle size={10}/>Gap</>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
