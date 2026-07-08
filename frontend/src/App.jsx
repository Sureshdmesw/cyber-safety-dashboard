import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  LayoutDashboard, ShieldCheck, BarChart3, Upload,
  ChevronDown, AlertTriangle, Cpu, Settings2, BadgeCheck, BookOpen,
  Activity, ShieldAlert, TrendingUp, TrendingDown,
} from "lucide-react";
import { FilterProvider, useFilterContext } from "./context/FilterContext";
import ComplianceGauge from "./components/ComplianceGauge";

const RiskHeatmap            = lazy(() => import("./components/RiskHeatmap"));
const TARAPanel              = lazy(() => import("./components/TARAPanel"));
const MitigationComplianceTable = lazy(() => import("./components/MitigationComplianceTable"));
const R156OTAPanel           = lazy(() => import("./components/R156OTAPanel"));
const AuthorityView          = lazy(() => import("./components/AuthorityView"));
const OemBenchmarkPanel      = lazy(() => import("./components/OemBenchmarkPanel"));
const RestraintSimulator     = lazy(() => import("./components/RestraintSimulator"));
const ThreatCoverageChart    = lazy(() => import("./components/ThreatCoverageChart"));
const ComplianceChecklist    = lazy(() => import("./components/ComplianceChecklist"));
const ValidationCharts       = lazy(() => import("./components/ValidationCharts"));
const ExportToolbar          = lazy(() => import("./components/ExportToolbar"));
const ChecklistUpload        = lazy(() => import("./components/ChecklistUpload"));
const KpiDrillDownPanel      = lazy(() => import("./components/KpiDrillDownPanel"));
const CyberIntelligencePanel = lazy(() => import("./components/CyberIntelligencePanel"));

function PanelFallback() {
  return <div className="h-32 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>;
}

const ROLES = ["OEM", "Tier-1", "Authority (ARAI/TÜV/ICAT)"];

const REGULATIONS = [
  { value: "",         label: "All Regulations" },
  { value: "UNR155",   label: "UN R155" },
  { value: "ISO21434", label: "ISO/SAE 21434" },
  { value: "CSMS",     label: "CSMS" },
];

// Fallback TARA data — used when backend is unreachable
const FALLBACK_TARA = {
  threatRisks: [
    { threat_code: "4.1",  title: "CAN Bus Spoofing",          category: "Communication", impact_score: 5, feasibility_score: 4, risk_score: 20, asil_level: "ASIL D", residual_risk: 6 },
    { threat_code: "6.2",  title: "Man-in-the-Middle",         category: "Communication", impact_score: 4, feasibility_score: 3, risk_score: 12, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "6.3",  title: "Session Hijacking",         category: "Communication", impact_score: 4, feasibility_score: 3, risk_score: 12, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "11.1", title: "ECU Firmware Tampering",    category: "Software",      impact_score: 5, feasibility_score: 3, risk_score: 15, asil_level: "ASIL D", residual_risk: 5 },
    { threat_code: "11.3", title: "Bootloader Bypass",         category: "Software",      impact_score: 5, feasibility_score: 2, risk_score: 10, asil_level: "ASIL D", residual_risk: 4 },
    { threat_code: "12.1", title: "Compromised OTA Update",    category: "Update",        impact_score: 5, feasibility_score: 3, risk_score: 15, asil_level: "ASIL D", residual_risk: 5 },
    { threat_code: "12.3", title: "OTA Rollback Attack",       category: "Update",        impact_score: 4, feasibility_score: 3, risk_score: 12, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "12.4", title: "OTA Package Forgery",       category: "Update",        impact_score: 5, feasibility_score: 2, risk_score: 10, asil_level: "ASIL D", residual_risk: 4 },
    { threat_code: "13.1", title: "Update Server Compromise",  category: "Backend",       impact_score: 5, feasibility_score: 3, risk_score: 15, asil_level: "ASIL D", residual_risk: 5 },
    { threat_code: "16.1", title: "Replay Attack",             category: "Communication", impact_score: 4, feasibility_score: 4, risk_score: 16, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "18.1", title: "Telematics Data Exfil",     category: "Privacy",       impact_score: 4, feasibility_score: 3, risk_score: 12, asil_level: "ASIL B", residual_risk: 5 },
    { threat_code: "18.3", title: "Remote Diagnostic Abuse",   category: "Privacy",       impact_score: 3, feasibility_score: 3, risk_score: 9,  asil_level: "ASIL B", residual_risk: 4 },
    { threat_code: "20.1", title: "Sensor Data Manipulation",  category: "Sensor",        impact_score: 5, feasibility_score: 3, risk_score: 15, asil_level: "ASIL D", residual_risk: 5 },
    { threat_code: "21.1", title: "GPS Spoofing",              category: "Sensor",        impact_score: 4, feasibility_score: 4, risk_score: 16, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "24.1", title: "CAN Denial of Service",     category: "Communication", impact_score: 5, feasibility_score: 5, risk_score: 25, asil_level: "ASIL D", residual_risk: 8 },
    { threat_code: "25.1", title: "Airbag Signal Spoofing",    category: "Safety",        impact_score: 5, feasibility_score: 4, risk_score: 20, asil_level: "ASIL D", residual_risk: 6 },
    { threat_code: "26.1", title: "Weak Encryption",           category: "Cryptography",  impact_score: 4, feasibility_score: 4, risk_score: 16, asil_level: "ASIL C", residual_risk: 5 },
    { threat_code: "28.2", title: "Physical ECU Tampering",    category: "Physical",      impact_score: 4, feasibility_score: 2, risk_score: 8,  asil_level: "ASIL B", residual_risk: 4 },
    { threat_code: "29.2", title: "Backend Server Compromise", category: "Backend",       impact_score: 5, feasibility_score: 3, risk_score: 15, asil_level: "ASIL D", residual_risk: 5 },
  ],
};

// Canonical fallback — matches DB master list exactly
const FALLBACK_COMPONENTS = [
  { id: 1,  name: "Airbag ECU" },
  { id: 2,  name: "Seatbelt Pretensioner ECU" },
  { id: 3,  name: "OTA Module" },
  { id: 4,  name: "Central Gateway ECU" },
  { id: 5,  name: "Telematics Control Unit" },
  { id: 6,  name: "Body Control Module" },
  { id: 7,  name: "ADAS ECU" },
  { id: 8,  name: "Powertrain ECU" },
  { id: 9,  name: "Brake Control Module" },
  { id: 10, name: "EV Battery Management" },
  { id: 11, name: "Chassis Control ECU" },
  { id: 12, name: "Infotainment Head Unit" },
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

// Role-specific gauge labels and colors
const ROLE_GAUGES = {
  "OEM": [
    { key: "r155",    title: "UN R155 Compliance",    color: "#2E7D32" },
    { key: "iso21434",title: "ISO 21434 Maturity",    color: "#F9A825" },
    { key: "iso26262",title: "ISO 26262 Alignment",   color: "#1565C0" },
    { key: "r156",    title: "UN R156 OTA Readiness", color: "#6D28D9" },
  ],
  "Tier-1": [
    { key: "iso21434",title: "ISO 21434 TARA Depth",  color: "#F9A825" },
    { key: "iso26262",title: "ISO 26262 ASIL",        color: "#1565C0" },
    { key: "r155",    title: "UN R155 CSMS",          color: "#2E7D32" },
    { key: "dynamic", title: "Component Compliance",  color: "#0891B2" },
  ],
  "Authority (ARAI/TÜV/ICAT)": [
    { key: "r155",    title: "UN R155 Type Approval", color: "#2E7D32" },
    { key: "r156",    title: "UN R156 OTA Cert",      color: "#6D28D9" },
    { key: "iso21434",title: "ISO 21434 Audit",       color: "#F9A825" },
    { key: "iso26262",title: "ISO 26262 Functional",  color: "#1565C0" },
  ],
};

function AppInner() {
  const { setSelectedRole, setSelectedComponent, setSelectedRegulation, refreshAnalytics } = useFilterContext();
  const [role,          setRole]          = useState("OEM");
  const [component,     setComponent]     = useState("");
  const [regulation,    setRegulation]    = useState("");
  const [scrolled,      setScrolled]      = useState(false);
  const [toast,         setToast]         = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [allComponents, setAllComponents] = useState([]);
  const [taraData,      setTaraData]      = useState(null);
  const [gauges,        setGauges]        = useState({ r155: 0, iso21434: 0, iso26262: 92, r156: 0 });
  const [checked,       setChecked]       = useState({});
  const [activeTab,     setActiveTab]     = useState("dashboard");
  const [loading,       setLoading]       = useState(true);
  const [activeKpi,     setActiveKpi]     = useState(null); // drill-down panel

  // ── Fetch on mount + on role change ─────────────────────────────
  useEffect(() => {
    setLoading(true);
    setTaraData(null);
    Promise.all([
      fetch(`http://localhost:5000/api/component?role=${encodeURIComponent(role)}`).then(r => r.json()),
      fetch("http://localhost:5000/api/compliance/annex5-status").then(r => r.json()),
      fetch("http://localhost:5000/api/compliance/1").then(r => r.json()),
      fetch("http://localhost:5000/api/compliance/r156-status").then(r => r.json()),
      fetch("http://localhost:5000/api/compliance/tara-summary").then(r => r.json()),
    ])
      .then(([comps, annex5, comp1, r156, tara]) => {
        const resolvedComps = (Array.isArray(comps) && comps.length) ? comps : FALLBACK_COMPONENTS;
        setAllComponents(resolvedComps);
        if (resolvedComps.length) setComponent(resolvedComps[0].name);
        setGauges({
          r155:     annex5.compliancePercent || 0,
          iso21434: comp1.mitigationPercent  || 0,
          iso26262: 92,
          r156:     r156.otaReadiness        || 0,
        });
        setTaraData((tara?.threatRisks ?? tara?.threats) ? tara : FALLBACK_TARA);
        setLoading(false);
      })
      .catch(() => {
        setAllComponents(FALLBACK_COMPONENTS);
        setComponent(FALLBACK_COMPONENTS[0].name);
        setGauges({ r155: 72, iso21434: 65, iso26262: 92, r156: 58 });
        setTaraData(FALLBACK_TARA);
        setToast("Backend unavailable — showing demo data");
        setTimeout(() => setToast(null), 4000);
        setLoading(false);
      });
  }, [role]);

  // ── Threats for current component + regulation filter ──────────
  const componentThreats = useMemo(() => {
    if (!taraData) return [];
    // Support both { threatRisks: [] } and { threats: [] } response shapes
    const allThreats = taraData.threatRisks ?? taraData.threats ?? [];
    if (!allThreats.length) return [];
    const codes = COMPONENT_THREATS[component];
    let threats = codes
      ? allThreats.filter(t => codes.includes(t.threat_code))
      : allThreats;
    if (regulation === "ISO21434") threats = threats.filter(t => (t.risk_score ?? 0) >= 9);
    if (regulation === "CSMS")     threats = threats.filter(t => (t.risk_score ?? 0) >= 16);
    return threats;
  }, [taraData, component, regulation]);

  // Reset checked when component changes
  useEffect(() => {
    const init = {};
    componentThreats.forEach(t => { init[t.threat_code] = true; });
    setChecked(init);
  }, [componentThreats]);

  const onToggle = useCallback((code) => {
    setChecked(prev => ({ ...prev, [code]: !prev[code] }));
  }, []);

  // Sync local role/component/regulation into context + trigger re-fetch
  useEffect(() => { setSelectedRole(role);             }, [role,       setSelectedRole]);
  useEffect(() => { setSelectedComponent(component);   }, [component,  setSelectedComponent]);
  useEffect(() => { setSelectedRegulation(regulation); refreshAnalytics(); }, [regulation, setSelectedRegulation]);

  // ── Dynamic compliance from checked threats ─────────────────────
  const activeThreats = componentThreats.filter(t => checked[t.threat_code]);
  const total     = activeThreats.length || 1;
  const mitigated = activeThreats.filter(t => {
    const r = t.risk_score;
    return (r >= 16 ? Math.round(r*0.3) : r >= 9 ? Math.round(r*0.6) : Math.round(r*0.8)) < r;
  }).length;
  const dynamicCompliance = Math.round((mitigated / total) * 100);

  const gaugeValues = { ...gauges, dynamic: dynamicCompliance };

  // allComponents is already role-filtered from backend
  const components = allComponents;


const criticalCount = componentThreats.filter(t => t.risk_score >= 16).length;
  const maxRisk = Math.max(...componentThreats.map(t => t.risk_score), 0);

  return (
    <div className="page-layout bg-lightbg">

      {/* ── Critical Alert Banner ── */}
      {maxRisk >= 16 && (
        <div className="flex items-center justify-center gap-2 bg-red-600 text-white py-2 text-xs font-semibold tracking-wide">
          <AlertTriangle size={14} />
          Critical Cyber Risk — {component} — Immediate Mitigation Required (Score: {maxRisk})
        </div>
      )}

      {/* ══ CHROME: wordmark + controls + tabs — single sticky block ══ */}
      <div className={`app-chrome transition-shadow duration-200 ${
        scrolled ? "shadow-2xl" : "shadow-md"
      }`}>

        {/* Row 1: Wordmark bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-screen-xl mx-auto px-8 h-32 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative h-28 w-64 flex-shrink-0 rounded-xl overflow-hidden shadow-xl ring-2 ring-gray-200">
                  <img
                    src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=90&auto=format&fit=crop"
                    alt="Porsche Luxury Automotive"
                    className="h-full w-full object-cover brightness-90 contrast-110"
                  />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(10,20,50,0.45) 0%,rgba(0,10,30,0.22) 100%)" }} />
                  <HeaderTopology component={component} />
                  <div style={{ position:"absolute", bottom:4, left:6, fontSize:7, color:"#93c5fd", fontWeight:700, letterSpacing:1 }}>ECU TOPOLOGY</div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={15} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-gray-900 text-sm font-semibold tracking-tight leading-none">IACCD</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5 tracking-wide">Automotive Cyber-Safety Platform</p>
                </div>
              </div>
              <div className="hidden lg:block w-px h-6 bg-gray-200" />
              <p className="hidden lg:block text-[11px] text-gray-400 tracking-wide">
                UN R155 &nbsp;·&nbsp; UN R156 &nbsp;·&nbsp; ISO/SAE 21434 &nbsp;·&nbsp; ISO 26262
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              {[
                { Icon: BadgeCheck, label: "Lab Certified" },
                { Icon: ShieldCheck, label: "Cyber Hardened" },
                { Icon: Cpu,         label: "ASIL Compliant" },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-md px-2.5 py-1 bg-gray-50">
                  <Icon size={12} className="text-blue-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Controls bar */}
        <div className="bg-gray-50 border-b border-gray-200 controls-row">
          <div className="max-w-screen-xl mx-auto px-8 py-2 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-5 flex-wrap flex-1">
              {/* Role */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Role</span>
                <div className="relative">
                  <select
                    value={role}
                    onChange={e => { setRole(e.target.value); setActiveTab("dashboard"); }}
                    className="appearance-none bg-white border border-gray-300 pl-3 pr-7 py-1.5 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer shadow-sm"
                  >
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              {/* Component */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Component</span>
                {loading ? (
                  <span className="text-xs text-gray-400 italic">Loading…</span>
                ) : (
                  <div className="relative">
                    <select
                      value={component}
                      onChange={e => setComponent(e.target.value)}
                      style={{ minWidth: 200 }}
                      className="appearance-none bg-white border border-gray-300 pl-3 pr-7 py-1.5 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer shadow-sm"
                    >
                      {components.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-gray-200" />
              {/* Regulation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Regulation</span>
                <div className="relative">
                  <select
                    value={regulation}
                    onChange={e => { setRegulation(e.target.value); refreshAnalytics(); }}
                    className={`appearance-none bg-white border pl-3 pr-7 py-1.5 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-sm transition-colors ${
                      regulation ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-300"
                    }`}
                  >
                    {REGULATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {regulation && (
                  <button onClick={() => { setRegulation(""); refreshAnalytics(); }}
                    className="text-gray-400 hover:text-gray-700 text-xs leading-none" title="Clear">✕</button>
                )}
              </div>
              {/* Threat count pill */}
              {component && !loading && (
                <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Cpu size={12} className="text-gray-400" />
                  <span>{componentThreats.length} threats</span>
                  {criticalCount > 0 && (
                    <span className="ml-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {criticalCount} critical
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Tab navigation bar — always below controls, never overlapping */}
        <div className="tab-row">
          <div className="max-w-screen-xl mx-auto px-8">
            <div className="flex items-center gap-1">
              {[
                { id: "dashboard",    label: "Dashboard",           Icon: LayoutDashboard, accent: "#3b82f6" },
                { id: "checklist",    label: "Compliance Checklist", Icon: ShieldCheck,     accent: "#10b981" },
                { id: "charts",       label: "Analytics",            Icon: BarChart3,       accent: "#f59e0b" },
                { id: "intelligence", label: "Cyber Intelligence",   Icon: BookOpen,        accent: "#8b5cf6" },
                ...(!role.startsWith("Authority") ? [{ id: "upload", label: "Upload Checklist", Icon: Upload, accent: "#06b6d4" }] : []),
              ].map(({ id, label, Icon, accent }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`tab-btn${active ? " tab-btn--active" : ""}`}
                    style={{ "--tab-accent": accent }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={active ? 2.5 : 1.75}
                      className="tab-btn__icon"
                      style={{ transition: "color 0.2s, filter 0.2s" }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>{/* end .app-chrome */}

      <main className="main-content px-6 pb-8 max-w-screen-xl mx-auto">

        {/* ── Context strip ── */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm text-xs flex-wrap">
          <span className="text-gray-400 font-medium">Active context:</span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded font-semibold">{role}</span>
          {component && <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded font-semibold">{component}</span>}
          <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded">
            {REGULATIONS.find(r => r.value === regulation)?.label || "All Regulations"}
          </span>
          {regulation && <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Filtered: {regulation}</span>}
          <span className="ml-auto text-gray-400">{componentThreats.length} threats in scope</span>
        </div>

        <Suspense fallback={<PanelFallback />}>
          <ExportToolbar threats={componentThreats} checked={checked} role={role} component={component} />
        </Suspense>

        {/* ══════════════ DASHBOARD TAB — OEM Dark Engineering Layout ══════════════ */}
        {activeTab === "dashboard" && (
          <div className="oem-dashboard">

            {/* ── Regulatory severity accent bar ── */}
            <div className="oem-accent-bar" />

            {/* ── OEM Full System Topology Hero Banner ── */}
            <div style={{ position:"relative", width:"100%", height:260, borderRadius:12, overflow:"hidden", border:"1px solid rgba(37,99,235,0.25)" }}>

              {/* 8K base image — automotive electronics / circuit board lab */}
              <img
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=3840&q=100&auto=format&fit=crop"
                alt="OEM Full System Topology"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center",
                  filter:"brightness(0.38) saturate(0.75) hue-rotate(210deg) contrast(1.3)" }}
              />

              {/* Second layer — wiring harness detail blended on right */}
              <img
                src="https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=3840&q=100&auto=format&fit=crop"
                alt="ECU Wiring Harness"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"right center",
                  filter:"brightness(0.32) saturate(0.6) hue-rotate(215deg) contrast(1.25)",
                  maskImage:"linear-gradient(to left, rgba(0,0,0,0.9) 0%, transparent 55%)",
                  WebkitMaskImage:"linear-gradient(to left, rgba(0,0,0,0.9) 0%, transparent 55%)" }}
              />

              {/* Cinematic blue vignette */}
              <div style={{ position:"absolute", inset:0,
                background:"linear-gradient(to right, rgba(0,8,30,0.82) 0%, rgba(0,18,55,0.35) 40%, rgba(0,18,55,0.35) 60%, rgba(0,8,30,0.82) 100%)" }} />

              {/* Top-to-bottom depth */}
              <div style={{ position:"absolute", inset:0,
                background:"linear-gradient(to bottom, rgba(0,5,20,0.65) 0%, transparent 35%, transparent 65%, rgba(0,5,20,0.80) 100%)" }} />

              {/* Blue radial ambient glow */}
              <div style={{ position:"absolute", inset:0,
                background:"radial-gradient(ellipse 70% 90% at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 65%)" }} />

              {/* Dynamic ECU topology SVG */}
              <TopologyBanner component={component} />

              {/* Top label bar */}
              <div style={{ position:"absolute", top:0, left:0, right:0,
                background:"rgba(5,12,35,0.82)", padding:"5px 16px",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"#93C5FD", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
                  AUTOMOTIVE ECU NETWORK — SAFETY ZONE TOPOLOGY
                </span>
                <span style={{ fontSize:9, color:"#FCA5A5", fontWeight:700 }}>● LIVE</span>
              </div>

              {/* Bottom overlay — role context + badge */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0,
                background:"linear-gradient(to top, rgba(5,12,35,0.92) 0%, transparent 100%)",
                padding:"20px 20px 14px", display:"flex", alignItems:"flex-end",
                justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div>
                  <p style={{ fontSize:11, color:"#93C5FD", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>
                    {role==="OEM"?"OEM — Full System Topology":role==="Tier-1"?"Tier-1 Supplier — Component Risk View":"Authority — Audit Dashboard"}
                  </p>
                  <p style={{ fontSize:14, color:"rgba(255,255,255,0.88)", fontWeight:500 }}>
                    {component||"Select a component"} &nbsp;·&nbsp; {REGULATIONS.find(r=>r.value===regulation)?.label||"All Regulations"}
                  </p>
                </div>
                <RoleBadge role={role} />
              </div>
            </div>

            {loading ? <SkeletonMatrix /> : (
              <div className="section-stack">

                {/* ── 4-col KPI grid ── */}
                <div className="oem-kpi-grid">
                  {[
                    { type: "crash_integrity",  label: "Crash-Signal Integrity", value: `${dynamicCompliance}%`,                              accent: "#2563EB",  valueColor: dynamicCompliance >= 80 ? "#16A34A" : dynamicCompliance >= 50 ? "#D97706" : "#DC2626" },
                    { type: "active_threats",   label: "Active Threats",         value: `${activeThreats.length} / ${componentThreats.length}`, accent: "#6366F1",  valueColor: "#4F46E5" },
                    { type: "critical_threats", label: "Critical Threats",       value: `${criticalCount}`,                                    accent: criticalCount > 0 ? "#DC2626" : "#16A34A", valueColor: criticalCount > 0 ? "#DC2626" : "#16A34A" },
                    { type: "asil_level",       label: "ASIL Level",             value: "ASIL D",                                              accent: "#EA580C",  valueColor: "#EA580C" },
                  ].map(m => (
                    <button key={m.type} onClick={() => setActiveKpi(m.type)}
                      className={`oem-kpi-card${activeKpi === m.type ? " active" : ""}`}
                      style={{ borderTop: `3px solid ${m.accent}`, "--kpi-accent": m.accent }}>
                      <p style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>{m.label}</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: m.valueColor, letterSpacing: "-1px", lineHeight: 1 }}>{m.value}</p>
                      <p style={{ fontSize: 9, color: "#9CA3AF", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Click to explore</p>
                    </button>
                  ))}
                </div>

                {/* ── 4-col Compliance Gauge grid ── */}
                <div className="oem-gauge-grid">
                  {ROLE_GAUGES[role]?.map(g => (
                    <div key={g.key} className="oem-gauge-card" style={{ borderTop: `3px solid ${g.color}`, "--gauge-accent": g.color }}>
                      <ComplianceGauge value={gaugeValues[g.key] ?? 0} title={g.title} color={g.color} />
                    </div>
                  ))}
                </div>

                {/* ── Role module panels — full-width stacked ── */}
                {role === "OEM" && (
                  <>
                    <OemPanel label="Risk Heatmap" sub="Component Threat View" accent="#EF4444">
                      <Suspense fallback={<PanelFallback />}><RiskHeatmap componentThreats={componentThreats} component={component} /></Suspense>
                    </OemPanel>
                    <OemPanel label="Threat Coverage" sub="Mitigation Coverage Analysis" accent="#3B82F6">
                      <Suspense fallback={<PanelFallback />}><ThreatCoverageChart role={role} component={component} regulation={regulation} /></Suspense>
                    </OemPanel>
                    <OemPanel label="UN R156 OTA Readiness" sub="OTA Certification Status" accent="#7C3AED">
                      <Suspense fallback={<PanelFallback />}><R156OTAPanel role={role} component={component} regulation={regulation} /></Suspense>
                    </OemPanel>
                    <OemPanel label="OEM Benchmark" sub="Peer Comparison" accent="#10B981">
                      <Suspense fallback={<PanelFallback />}><OemBenchmarkPanel role="OEM" /></Suspense>
                    </OemPanel>
                  </>
                )}

                {role === "Tier-1" && (
                  <>
                    <OemPanel label="Risk Heatmap" sub="Component Threat View" accent="#EF4444">
                      <Suspense fallback={<PanelFallback />}>
                        {componentThreats.length === 0
                          ? <EmptyState message="No threat data for this component" />
                          : <RiskHeatmap componentThreats={componentThreats} component={component} />}
                      </Suspense>
                    </OemPanel>
                    <OemPanel label="Mitigation Table" sub="CSMS Compliance" accent="#F59E0B">
                      <Suspense fallback={<PanelFallback />}><MitigationComplianceTable component={component} /></Suspense>
                    </OemPanel>
                    <OemPanel label="TARA Panel" sub="ISO/SAE 21434 · CTSA & CRRA" accent="#3B82F6">
                      <Suspense fallback={<PanelFallback />}><TARAPanel component={component} /></Suspense>
                    </OemPanel>
                    <OemPanel label="OEM Benchmark" sub="Supplier Comparison" accent="#10B981">
                      <Suspense fallback={<PanelFallback />}><OemBenchmarkPanel role="Tier-1" /></Suspense>
                    </OemPanel>
                    <OemPanel label="Restraint Simulator" sub="Safety Validation" accent="#F97316">
                      <Suspense fallback={<PanelFallback />}><RestraintSimulator /></Suspense>
                    </OemPanel>
                  </>
                )}

                {role.startsWith("Authority") && (
                  <>
                    <OemPanel label="Authority View" sub="UN R155 · Audit Dashboard" accent="#10B981">
                      <Suspense fallback={<PanelFallback />}><AuthorityView /></Suspense>
                    </OemPanel>
                    <OemPanel label="UN R156 OTA" sub="OTA Certification" accent="#8B5CF6">
                      <Suspense fallback={<PanelFallback />}><R156OTAPanel role={role} component={component} regulation={regulation} /></Suspense>
                    </OemPanel>
                    <OemPanel label="Risk Heatmap" sub="Compliance Threat View" accent="#EF4444">
                      <Suspense fallback={<PanelFallback />}><RiskHeatmap componentThreats={componentThreats} component={component} /></Suspense>
                    </OemPanel>
                  </>
                )}

              </div>
            )}
          </div>
        )}

        {/* ══════════════ CHECKLIST TAB ══════════════ */}
        {activeTab === "checklist" && (
          <div className="oem-dashboard">
            <Suspense fallback={<PanelFallback />}><ChecklistWithTabs role={role} component={component} /></Suspense>
          </div>
        )}

        {activeTab === "charts" && (
          <div className="oem-dashboard">
            <OemPanel label="Analytics" sub="Validation & Risk Charts" accent="#3B82F6">
              <Suspense fallback={<PanelFallback />}><ValidationCharts threats={componentThreats} checked={checked} role={role} component={component} refreshAnalytics={refreshAnalytics} /></Suspense>
            </OemPanel>
          </div>
        )}

        {activeTab === "intelligence" && (
          <div className="oem-dashboard">
            <OemPanel label="Cyber Intelligence" sub="Threat Intelligence Feed" accent="#EF4444">
              <Suspense fallback={<PanelFallback />}>
                <CyberIntelligencePanel
                  onEcuHighlight={(ecus) => {
                    const match = allComponents.find(c => ecus.includes(c.name));
                    if (match) { setComponent(match.name); setActiveTab("dashboard"); }
                  }}
                />
              </Suspense>
            </OemPanel>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="oem-dashboard">
            <OemPanel label="Upload Checklist" sub="Bulk Import · XLSX / CSV" accent="#8B5CF6">
              <Suspense fallback={<PanelFallback />}>
                <ChecklistUpload
                  component={component}
                  role={role}
                  allComponents={components}
                  onResultsLoaded={(uploadedThreats) => {
                    const merged = {};
                    uploadedThreats.forEach(t => { merged[t.threat_code] = true; });
                    setChecked(prev => ({ ...prev, ...merged }));
                    setActiveTab("checklist");
                  }}
                />
              </Suspense>
            </OemPanel>
          </div>
        )}

      </main>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-700 text-white text-sm px-4 py-3 rounded-lg shadow-xl flex items-center gap-2">
          <AlertTriangle size={14} />
          {toast}
        </div>
      )}

      {/* KPI Drill-Down Panel */}
      {activeKpi && (
        <Suspense fallback={null}>
          <KpiDrillDownPanel
            kpiType={activeKpi}
            role={role}
            component={component}
            onClose={() => setActiveKpi(null)}
            onViewInChecklist={(tab) => {
              setActiveTab("checklist");
              setActiveKpi(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <AppInner />
    </FilterProvider>
  );
}

// ── Shared topology node config ─────────────────────────────────────────────
// Each node: id, label, tooltip, cx/cy in 960×260 space, match keywords, type
const TOPO_NODES = [
  { id:"acu",  l:"ACU",  tip:"Airbag ECU — Controls deployment logic",          cx:80,  cy:60,  match:["airbag"],                        type:"ecu"    },
  { id:"gw",   l:"GW",   tip:"Central Gateway ECU — CAN bus routing hub",        cx:240, cy:60,  match:["central gateway","gateway"],      type:"ecu"    },
  { id:"adas", l:"ADAS", tip:"ADAS ECU — Advanced driver assistance",            cx:480, cy:60,  match:["adas"],                          type:"ecu"    },
  { id:"tcu",  l:"TCU",  tip:"Telematics Control Unit — V2X & connectivity",     cx:720, cy:60,  match:["telematics"],                    type:"ecu"    },
  { id:"ota",  l:"OTA",  tip:"OTA Module — Over-the-air firmware updates",       cx:880, cy:60,  match:["ota module"],                    type:"ecu"    },
  { id:"sbt",  l:"SBT",  tip:"Seatbelt Pretensioner ECU — Restraint control",   cx:80,  cy:130, match:["seatbelt","pretensioner"],        type:"ecu"    },
  { id:"bcm",  l:"BCM",  tip:"Body Control Module — Lighting & access",          cx:240, cy:130, match:["body control"],                   type:"ecu"    },
  { id:"ecu",  l:"ECU",  tip:"Powertrain ECU — Engine & transmission control",   cx:480, cy:130, match:["powertrain"],                    type:"ecu"    },
  { id:"pwr",  l:"PWR",  tip:"EV Battery Management — HV battery system",        cx:720, cy:130, match:["ev battery","battery management"], type:"ecu"    },
  { id:"ihu",  l:"IHU",  tip:"Infotainment Head Unit — HMI & media",             cx:880, cy:130, match:["infotainment"],                   type:"ecu"    },
  { id:"brk",  l:"BRK",  tip:"Brake Control Module — ABS & ESC",                cx:160, cy:200, match:["brake"],                         type:"ecu"    },
  { id:"ev",   l:"EV",   tip:"EV Battery Management — Cell monitoring",          cx:400, cy:200, match:["ev battery"],                     type:"ecu"    },
  { id:"chs",  l:"CHS",  tip:"Chassis Control ECU — Suspension & steering",     cx:560, cy:200, match:["chassis"],                       type:"ecu"    },
  { id:"ptn",  l:"PTN",  tip:"Powertrain ECU — Drivetrain integration",          cx:800, cy:200, match:["powertrain"],                    type:"ecu"    },
  // Airbag sub-nodes — horizontal row centered at x:480, cy:185
  // 7 nodes evenly spaced across x:290–670, well clear of bottom overlay
  { id:"dag",  l:"D-Air",  tip:"Driver Airbag — Steering wheel deployment",     cx:290, cy:185, match:["airbag"], type:"airbag" },
  { id:"pag",  l:"P-Air",  tip:"Passenger Airbag — Dashboard deployment",       cx:350, cy:175, match:["airbag"], type:"airbag" },
  { id:"sag",  l:"S-Air",  tip:"Side Airbag — Door panel deployment",           cx:420, cy:185, match:["airbag"], type:"airbag" },
  { id:"cag",  l:"C-Air",  tip:"Curtain Airbag — Roof rail deployment",         cx:480, cy:170, match:["airbag"], type:"airbag" },
  { id:"dkab", l:"D-Knee", tip:"Driver Knee Airbag — Lower limb protection",    cx:540, cy:185, match:["airbag"], type:"airbag" },
  { id:"pkab", l:"PKAB",   tip:"Passenger Knee Airbag — Front passenger knees", cx:610, cy:175, match:["airbag"], type:"airbag" },
  { id:"pedag",l:"Ped",    tip:"Pedestrian Airbag — Bonnet external deployment", cx:670, cy:185, match:["airbag"], type:"airbag" },
];

const TOPO_LINES = [
  ["acu","gw"],["gw","adas"],["adas","tcu"],["tcu","ota"],
  ["sbt","bcm"],["bcm","ecu"],["ecu","pwr"],["pwr","ihu"],
  ["acu","sbt"],["gw","bcm"],["adas","ecu"],["tcu","pwr"],
  ["sbt","brk"],["ecu","ev"],["ecu","chs"],["pwr","ptn"],
  // airbag connections — ACU to each node via center relay point (480,148)
  ["acu","dag"],["acu","pag"],["acu","sag"],["acu","cag"],
  ["acu","dkab"],["acu","pkab"],["acu","pedag"],
];

// Build id→node lookup
const TOPO_MAP = Object.fromEntries(TOPO_NODES.map(n => [n.id, n]));

// ── TopologyBanner — dynamic full-size hero SVG ───────────────────────────────
function TopologyBanner({ component }) {
  const [tooltip, setTooltip] = useState(null); // {text, x, y}
  const active = (component || "").toLowerCase();

  const isActive = (node) => node.match.some(k => active.includes(k));

  // Collect all active node ids + their direct neighbours
  const activeIds = new Set(TOPO_NODES.filter(isActive).map(n => n.id));
  const neighbourIds = new Set();
  TOPO_LINES.forEach(([a, b]) => {
    if (activeIds.has(a)) neighbourIds.add(b);
    if (activeIds.has(b)) neighbourIds.add(a);
  });
  const hasSelection = activeIds.size > 0;

  return (
    <svg
      style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
      viewBox="0 0 960 260"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="bnrglow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bnrpulse">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="abglow">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Green radial glow — centered ellipse behind arc */}
        <radialGradient id="abZoneGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#3b82f6" stopOpacity="0.22"/>
          <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Component zone label — fixed at bottom-clear zone (cy=243), never overlaps nodes */}
      {(() => {
        // All labels sit at cy=243 — below the lowest node row (cy≤200) and clear of bottom overlay
        // cx spread across the banner width to roughly align with each component's column
        const ZONE_LABELS = [
          { match: ["airbag"],                         label: "AIRBAG SAFETY SYSTEM",       cx: 480 },
          { match: ["seatbelt", "pretensioner"],        label: "SEATBELT PRE-TENSIONER ECU", cx: 160 },
          { match: ["ota module"],                      label: "OTA UPDATE MODULE",           cx: 800 },
          { match: ["central gateway", "gateway"],      label: "CENTRAL GATEWAY ECU",        cx: 320 },
          { match: ["telematics"],                      label: "TELEMATICS CONTROL UNIT",     cx: 640 },
          { match: ["body control"],                    label: "BODY CONTROL MODULE",         cx: 320 },
          { match: ["adas"],                            label: "ADAS ECU",                    cx: 480 },
          { match: ["powertrain"],                      label: "POWERTRAIN ECU",              cx: 560 },
          { match: ["brake"],                           label: "BRAKE CONTROL MODULE",        cx: 200 },
          { match: ["ev battery", "battery management"],label: "EV BATTERY MANAGEMENT",      cx: 480 },
          { match: ["chassis"],                         label: "CHASSIS CONTROL ECU",         cx: 560 },
          { match: ["infotainment"],                    label: "INFOTAINMENT HEAD UNIT",      cx: 800 },
        ];
        const zone = ZONE_LABELS.find(z => z.match.some(k => active.includes(k)));
        if (!zone) return null;
        const cy = 243;
        const labelW = zone.label.length * 6.2 + 28; // approx pill width
        return (
          <g style={{ pointerEvents:"none", transition:"opacity 0.4s", opacity: hasSelection ? 1 : 0.7 }}>
            {/* Subtle pill background */}
            <rect x={zone.cx - labelW / 2} y={cy - 13} width={labelW} height={17} rx={4}
              fill="rgba(15,30,80,0.72)" stroke="#3b82f6" strokeWidth="0.6" opacity="0.85" />
            <text x={zone.cx} y={cy} textAnchor="middle" fontSize="11" fill="#93c5fd"
              fontWeight="700" letterSpacing="2" opacity="0.97">◈  {zone.label}  ◈</text>
          </g>
        );
      })()}

      {/* Connection lines */}
      {TOPO_LINES.map(([aid, bid], i) => {
        const a = TOPO_MAP[aid], b = TOPO_MAP[bid];
        if (!a || !b) return null;
        const isActiveLine = activeIds.has(aid) || activeIds.has(bid);
        const isAirbagLine = (a.type==="airbag" || b.type==="airbag");
        if (isAirbagLine) {
          // Smooth cubic bezier from ACU (top-left) curving right toward each node
          const cpx1 = a.cx + (b.cx - a.cx) * 0.5;
          const cpy1 = a.cy + 60;
          const cpx2 = b.cx - 30;
          const cpy2 = b.cy - 30;
          return (
            <path key={i}
              d={`M${a.cx},${a.cy} C${cpx1},${cpy1} ${cpx2},${cpy2} ${b.cx},${b.cy}`}
              fill="none"
              stroke={isActiveLine ? "#60a5fa" : "#1e3a5f"}
              strokeWidth={isActiveLine ? 1.6 : 0.4}  // reduced non-active dotted curve weight
              strokeDasharray={isActiveLine ? "none" : "4 3"}
              strokeLinecap="round"
              opacity={hasSelection ? (isActiveLine ? 0.95 : 0.2) : 0.5}
              style={{ transition:"all 0.35s" }}
            />
          );
        }
        return (
          <line key={i}
            x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
            stroke={isActiveLine ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={isActiveLine ? 1.5 : 0.4}  // reduced non-active dotted line weight
            strokeDasharray={isActiveLine ? "6 3" : "4 4"}
            opacity={hasSelection ? (isActiveLine ? 0.9 : 0.15) : 0.45}
            style={{ transition:"all 0.3s" }}
          />
        );
      })}

      {/* Nodes */}
      {TOPO_NODES.map((node) => {
        const act = activeIds.has(node.id);
        const nbr = !act && neighbourIds.has(node.id);
        const isAirbag = node.type === "airbag";
        const dim = hasSelection && !act && !nbr;
        const opacity = isAirbag
          ? (act ? 1 : dim ? 0.4 : 0.75)
          : (dim ? 0.18 : 1);
        const r = isAirbag ? (act ? 16 : nbr ? 14 : 13) : (act ? 14 : nbr ? 11 : 10);
        return (
          <g
            key={node.id}
            style={{ cursor:"pointer", transition:"all 0.3s", opacity }}
            filter={act ? (isAirbag ? "url(#abglow)" : "url(#bnrpulse)") : nbr ? "url(#bnrglow)" : undefined}
            onMouseEnter={(e) => {
              const svg = e.currentTarget.closest("svg");
              const rect = svg.getBoundingClientRect();
              const scaleX = rect.width / 960;
              const scaleY = rect.height / 260;
              setTooltip({ text: node.tip, x: node.cx * scaleX, y: node.cy * scaleY - 20 });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Active outer rings — blue for all nodes */}
            {act && <circle cx={node.cx} cy={node.cy} r={r+10}
              fill="#2563eb" opacity="0.13"/>}
            {act && <circle cx={node.cx} cy={node.cy} r={r+5}
              fill="none" stroke="#93c5fd" strokeWidth="1.2" opacity="0.55"/>}
            {/* Both ECU and airbag: circle, full blue palette */}
            <circle cx={node.cx} cy={node.cy} r={r}
              fill={act ? "#1e3a8a" : nbr ? "#1e293b" : (isAirbag ? "#0f1e3d" : "#0f172a")}
              stroke={act ? "#60a5fa" : nbr ? "#3b82f6" : (isAirbag ? "#2563eb" : "#1e3a5f")}
              strokeWidth={act ? 2 : nbr ? 1.4 : (isAirbag ? 1.2 : 0.8)}
              style={{ transition:"all 0.3s" }}
            />
            <text x={node.cx} y={node.cy + 3.5} textAnchor="middle"
              fontSize={act ? (isAirbag ? "8.5" : "8") : (isAirbag ? "7.5" : "6.5")}
              fill={act ? "#dbeafe" : nbr ? "#93c5fd" : (isAirbag ? "#60a5fa" : "#475569")}
              fontWeight={act || isAirbag ? "bold" : "normal"}
              style={{ transition:"all 0.3s", pointerEvents:"none" }}
            >{node.l}</text>
            {act && <circle cx={node.cx+(r-2)} cy={node.cy-(r-2)} r={3}
              fill="#60a5fa" filter="url(#bnrglow)"/>}
          </g>
        );
      })}



      {/* Tooltip */}
      {tooltip && (
        <g style={{ pointerEvents:"none" }}>
          <rect x={tooltip.x - 80} y={tooltip.y - 18} width={160} height={20}
            rx={4} fill="rgba(5,12,35,0.92)" stroke="#60a5fa" strokeWidth="0.8"/>
          <text x={tooltip.x} y={tooltip.y - 4} textAnchor="middle"
            fontSize="7.5" fill="#e0f2fe" fontWeight="600">{tooltip.text}</text>
        </g>
      )}
    </svg>
  );
}

// ── HeaderTopology — compact dynamic SVG for the header image ────────────────
function HeaderTopology({ component }) {
  const active = (component || "").toLowerCase();
  const isActive = (node) => node.match.some(k => active.includes(k));
  const activeIds = new Set(TOPO_NODES.filter(isActive).map(n => n.id));
  const hasSelection = activeIds.size > 0;

  // Scale 960×260 → 256×112
  const sx = 256 / 960, sy = 112 / 260;

  // Only show non-airbag nodes in header (space constraint)
  const headerNodes = TOPO_NODES.filter(n => n.type === "ecu");
  const headerLines = TOPO_LINES.filter(([a,b]) =>
    TOPO_MAP[a]?.type==="ecu" && TOPO_MAP[b]?.type==="ecu"
  );

  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 256 112">
      <defs>
        <filter id="hglow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {headerLines.map(([aid, bid], i) => {
        const a = TOPO_MAP[aid], b = TOPO_MAP[bid];
        if (!a || !b) return null;
        const lit = activeIds.has(aid) || activeIds.has(bid);
        return (
          <line key={i}
            x1={a.cx*sx} y1={a.cy*sy} x2={b.cx*sx} y2={b.cy*sy}
            stroke={lit ? "#60a5fa" : "#1e3a5f"}
            strokeWidth={lit ? 0.9 : 0.5}
            strokeDasharray="3 2"
            opacity={hasSelection ? (lit ? 0.85 : 0.12) : 0.5}
            style={{ transition:"all 0.3s" }}
          />
        );
      })}
      {headerNodes.map((node) => {
        const act = activeIds.has(node.id);
        const dim = hasSelection && !act;
        const cx = node.cx * sx, cy = node.cy * sy;
        return (
          <g key={node.id} filter={act ? "url(#hglow)" : undefined}
            style={{ opacity: dim ? 0.18 : 1, transition:"all 0.3s" }}>
            {act && <circle cx={cx} cy={cy} r={9} fill="#2563eb" opacity="0.18"/>}
            <circle cx={cx} cy={cy} r={act ? 6 : 4.5}
              fill={act ? "#1e3a8a" : "#0f172a"}
              stroke={act ? "#60a5fa" : "#1e3a5f"}
              strokeWidth={act ? 1.2 : 0.7}
              style={{ transition:"all 0.3s" }}
            />
            <text x={cx} y={cy+2.5} textAnchor="middle"
              fontSize={act ? "4.5" : "3.8"}
              fill={act ? "#bfdbfe" : "#334155"}
              fontWeight={act ? "bold" : "normal"}
              style={{ pointerEvents:"none" }}
            >{node.l}</text>
            {act && <circle cx={cx+5} cy={cy-5} r={1.8} fill="#22c55e" filter="url(#hglow)"/>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = {
    "OEM":                        { cls: "bg-blue-50 border-blue-200 text-blue-700",   label: "OEM View" },
    "Tier-1":                     { cls: "bg-amber-50 border-amber-200 text-amber-700", label: "Tier-1 Supplier" },
    "Authority (ARAI/TÜV/ICAT)":  { cls: "bg-green-50 border-green-200 text-green-700", label: "Testing Authority" },
  };
  const c = cfg[role] || cfg["OEM"];
  return (
    <div className={`flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs font-semibold ${c.cls}`}>
      <Settings2 size={11} />
      {c.label}
    </div>
  );
}

// ── OEM KPI Card (count-up hook only — card rendered inline) ─────────────────
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const numTarget = parseFloat(String(target).replace(/[^0-9.]/g, ""));
    const numPrev   = parseFloat(String(prev.current).replace(/[^0-9.]/g, ""));
    if (isNaN(numTarget) || isNaN(numPrev) || numTarget === numPrev) {
      setDisplay(target); prev.current = target; return;
    }
    const suffix = String(target).replace(/[0-9.]/g, "");
    const steps  = 30;
    const step   = (numTarget - numPrev) / steps;
    let current  = numPrev;
    let count    = 0;
    const id = setInterval(() => {
      current += step; count++;
      setDisplay(`${Math.round(current)}${suffix}`);
      if (count >= steps) { clearInterval(id); setDisplay(target); prev.current = target; }
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return display;
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <BarChart3 size={40} className="mb-4 text-gray-300" strokeWidth={1.25} />
      <p className="text-base font-medium">{message || "No data available for selected role"}</p>
      <p className="text-sm mt-1">Try selecting a different component or regulation filter.</p>
    </div>
  );
}

// ── OEM Panel — light full-width card with clean header ──────────────────────
function OemPanel({ label, sub, accent = "#2563EB", children }) {
  return (
    <div className="oem-panel" style={{ "--panel-accent": accent }}>
      <div className="card-header" style={{ borderTop: `3px solid ${accent}` }}>
        <div>
          <p className="card-header-title">{label}</p>
          {sub && <p className="card-header-sub">{sub}</p>}
        </div>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0, opacity: 0.7 }} />
      </div>
      <div style={{ background: "#ffffff", padding: 16 }}>{children}</div>
    </div>
  );
}

// ── Cybersecurity Compliance Checklist with tab navigation card ─────────────
const CHECKLIST_TABS = [
  { id: "r155",  label: "UN R155" },
  { id: "tara",  label: "TARA \u2013 ISO/SAE 21434" },
  { id: "csms",  label: "CSMS" },
];

function ChecklistWithTabs({ role, component }) {
  const [activeChecklistTab, setActiveChecklistTab] = useState("r155");
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        {CHECKLIST_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChecklistTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeChecklistTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ComplianceChecklist role={role} component={component} defaultTab={activeChecklistTab} />
    </div>
  );
}

// ── Skeleton for light layout ─────────────────────────────────────────────────
function SkeletonMatrix() {
  return (
    <div className="section-stack">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200">
        <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-sm font-medium text-blue-600">Loading dashboard…</span>
      </div>
      <div className="oem-kpi-grid">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
      <div className="oem-gauge-grid">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />)}
    </div>
  );
}
