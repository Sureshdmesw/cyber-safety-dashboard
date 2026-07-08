import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ShieldAlert, Database, TrendingUp, Network,
  ChevronRight, ChevronDown, ArrowRight, Activity, AlertTriangle, BookOpen,
} from "lucide-react";

// ── Static intelligence data ──────────────────────────────────────

const ATTACK_CONSEQUENCES = [
  {
    id: "driving",
    title: "Driving Function Failures",
    severity: "Critical",
    affectedEcus: ["Brake Control Module", "ADAS ECU", "Powertrain ECU"],
    items: ["Loss of brake control", "Loss of steering control", "Loss of engine control", "Unintended acceleration"],
    color: "#FF3B30"
  },
  {
    id: "vehicle",
    title: "Vehicle System Failures",
    severity: "High",
    affectedEcus: ["Body Control Module", "Central Gateway ECU"],
    items: ["Door lock malfunction", "Lights failure", "Passenger safety disruption", "HVAC compromise"],
    color: "#FF9800"
  },
  {
    id: "data",
    title: "Data Breach",
    severity: "High",
    affectedEcus: ["Telematics Control Unit", "Infotainment Head Unit"],
    items: ["Personal data theft", "Vehicle telemetry exposure", "Infrastructure compromise", "Location tracking"],
    color: "#00B0FF"
  },
  {
    id: "safety",
    title: "Safety Impact",
    severity: "Critical",
    affectedEcus: ["Airbag ECU", "Seatbelt Pretensioner ECU", "ADAS ECU"],
    items: ["Collision risk", "Airbag non-deployment", "Seatbelt failure", "Injuries / fatalities"],
    color: "#FF3B30"
  },
  {
    id: "commercial",
    title: "Commercial Impact",
    severity: "Medium",
    affectedEcus: [],
    items: ["Brand damage", "Revenue loss", "Regulatory penalties", "Customer trust reduction"],
    color: "#00E676"
  },
];

const THREAT_DISTRIBUTION = [
  { name: "Spoofing",            value: 24, color: "#00B0FF" },
  { name: "DoS / DDoS",          value: 19, color: "#FF3B30" },
  { name: "Malware",             value: 17, color: "#00FF87" },
  { name: "APT",                 value: 14, color: "#9C27B0" },
  { name: "Unauthorized Access", value: 16, color: "#FF9800" },
  { name: "Malicious Apps",      value: 10, color: "#00D1B2" },
];

const MARKET_TIMELINE = [
  { year: "2015", ecus: 30,  automated: 10,  autonomous: 0  },
  { year: "2018", ecus: 55,  automated: 40,  autonomous: 1  },
  { year: "2020", ecus: 70,  automated: 80,  autonomous: 4  },
  { year: "2023", ecus: 100, automated: 150, autonomous: 8  },
  { year: "2025", ecus: 120, automated: 220, autonomous: 13 },
  { year: "2030", ecus: 150, automated: 300, autonomous: 22 },
  { year: "2040", ecus: 200, automated: 370, autonomous: 33 },
];

const MARKET_FACTS = [
  { value: "100M+", label: "ECUs in vehicles globally",           color: "#00B0FF" },
  { value: "370M",  label: "Automated vehicles expected by 2040", color: "#00FF87" },
  { value: "13M",   label: "Highly automated vehicles (2025)",    color: "#FF9800" },
  { value: "33M",   label: "Autonomous vehicles by 2040",         color: "#9C27B0" },
  { value: "1.4M",  label: "Vehicle recalls due to cybersecurity",color: "#FF3B30" },
];

const COMM_CHANNELS = [
  { id: "intra", label: "Within Vehicle", desc: "ECU-to-ECU via CAN / LIN / Automotive Ethernet", nodes: ["Airbag ECU", "Gateway", "ADAS ECU", "BCM"], color: "#021421" },
  { id: "v2v",   label: "V2V",            desc: "Speed, position, hazard sharing with nearby vehicles", nodes: ["TCU", "DSRC / C-V2X"], color: "#00B0FF" },
  { id: "v2i",   label: "V2I",            desc: "Traffic lights, road signs, infrastructure systems", nodes: ["TCU", "RSU", "Traffic Mgmt"], color: "#8FA3B0" },
  { id: "v2d",   label: "V2D",            desc: "Smartphones, wearables, pedestrian devices", nodes: ["IHU", "BLE / WiFi"], color: "#EAEAEA" },
  { id: "v2n",   label: "V2N",            desc: "Cloud backend, OTA update servers, fleet management", nodes: ["OTA Module", "Cloud", "Backend API"], color: "#00D1B2" },
];

const STORY_STEPS = [
  { label: "Threat",       key: "threat",     value: "CAN Bus Spoofing (4.1)" },
  { label: "Attack Path",  key: "path",       value: "OBD Port → CAN Bus → Gateway ECU" },
  { label: "Affected ECU", key: "ecu",        value: "Airbag ECU / Brake Control Module" },
  { label: "Impact",       key: "impact",     value: "False deployment signal — collision risk" },
  { label: "Mitigation",   key: "mitigation", value: "M10 — Message Authentication (HMAC)" },
  { label: "Status",       key: "status",     value: "Not Implemented — Risk: Critical" },
];

const SEVERITY_STYLE = {
  Critical: "bg-red-100 text-red-900 border-red-300",
  High:     "bg-orange-100 text-orange-900 border-orange-300",
  Medium:   "bg-yellow-100 text-yellow-900 border-yellow-300",
};

// ── Theme mapping for accent colors ──────────────────────────────
const accentToTheme = {
  "#00B0FF": "premium-theme-bmw",
  "#00FF87": "premium-theme-tesla",
  "#021421": "premium-theme-bmw",
  "#FF9800": "premium-theme-amber",
  "#00E676": "premium-theme-green",
  "#9C27B0": "premium-theme-cyberpurple",
};

// ── Shared neutral subsection wrapper ────────────────────────────
function IntelCard({ icon: Icon, title, subtitle, accentColor = "#3b82f6", children, theme = null }) {
  // Auto-determine theme from accentColor if not provided
  const appliedTheme = theme || accentToTheme[accentColor] || "premium-theme-bmw";
  
  return (
    <div className="rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden mb-4 relative">
      <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `0 0 30px ${accentColor}40, 0 0 60px ${accentColor}20, inset 0 0 20px ${accentColor}10`,
          background: `linear-gradient(135deg, ${accentColor}05 0%, transparent 50%, ${accentColor}05 100%)`
        }}>
      </div>
      <div className="relative">
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 premium-heading-container ${appliedTheme}`}>
          <Icon size={18} className="flex-shrink-0 premium-section-icon" />
          <div className="min-w-0 flex-1">
            <p 
              className="premium-section-heading"
            >
              {title}
            </p>
            {subtitle && (
              <p 
                className="premium-section-subtitle"
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="p-4 bg-white">{children}</div>
      </div>
    </div>
  );
}

// ── Sub-sections ──────────────────────────────────────────────────

function DashboardPurpose() {
  const items = [
    { label: "End-to-end cybersecurity validation", detail: "UN R155 · ISO/SAE 21434", color: "#00B0FF" },
    { label: "Threat identification and mitigation tracking", detail: "TARA-aligned", color: "#00FF87" },
    { label: "Real-time compliance monitoring", detail: "Clause-level evidence", color: "#FF3B30" },
    { label: "Safety-critical ECU risk assessment", detail: "ASIL D · ISO 26262", color: "#9C27B0" },
  ];
  return (
    <IntelCard icon={ShieldAlert} title="Why This Dashboard Matters"
      subtitle="Automotive Cybersecurity Intelligence Platform — aligned to TÜV SÜD / UN R155 / ISO 21434"
      accentColor="#00B0FF">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 transition-all hover:shadow-md relative"
            style={{ borderColor: item.color + '40', backgroundColor: item.color + '05' }}>
            <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                boxShadow: `0 0 25px ${item.color}40, 0 0 50px ${item.color}20, inset 0 0 15px ${item.color}10`,
                background: `linear-gradient(135deg, ${item.color}08 0%, transparent 50%, ${item.color}08 100%)`
              }} />
            <div className="relative">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.label}</p>
                <p className="text-base text-gray-600 mt-2 font-medium" style={{ color: item.color + '99' }}>{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </IntelCard>
  );
}

function AttackConsequences({ onEcuHighlight }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <IntelCard icon={AlertTriangle} title="Consequences of Cyber Attacks"
      subtitle="Impact taxonomy aligned to UN R155 Annex 5 — click a category to highlight affected ECUs"
      accentColor="#021421">
      <div className="space-y-2">
        {ATTACK_CONSEQUENCES.map(cat => (
          <div key={cat.id} className="border-2 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all relative"
            style={{ borderColor: cat.color + '40' }}>
            <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                boxShadow: `0 0 30px ${cat.color}40, 0 0 60px ${cat.color}20, inset 0 0 20px ${cat.color}10`,
                background: `linear-gradient(135deg, ${cat.color}08 0%, transparent 50%, ${cat.color}08 100%)`
              }} />
            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-l-4 bg-gradient-to-r"
                style={{ borderLeftColor: cat.color, backgroundColor: cat.color + '08' }}
                onClick={() => {
                  setExpanded(expanded === cat.id ? null : cat.id);
                  if (cat.affectedEcus.length) onEcuHighlight?.(cat.affectedEcus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 ${SEVERITY_STYLE[cat.severity]}`}>
                    {cat.severity}
                  </span>
                  <p className="text-sm font-bold" style={{ 
                    color: cat.color,
                    textShadow: '0 0 6px rgba(0, 0, 0, 0.3)'
                  }}>{cat.title}</p>
                  {cat.affectedEcus.length > 0 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg font-bold border-2"
                      style={{ 
                        backgroundColor: cat.color + '20',
                        color: cat.color,
                        borderColor: cat.color + '50'
                      }}>
                      {cat.affectedEcus.length} ECU{cat.affectedEcus.length > 1 ? "s" : ""} affected
                    </span>
                  )}
                </div>
                {expanded === cat.id
                  ? <ChevronDown size={14} className="text-gray-700" />
                  : <ChevronRight size={14} className="text-gray-700" />}
              </button>
              {expanded === cat.id && (
                <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-t-2"
                  style={{ borderColor: cat.color + '30' }}>
                  <ul className="space-y-1 mb-3">
                    {cat.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <div className="w-1 h-1 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: cat.color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {cat.affectedEcus.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t-2"
                      style={{ borderColor: cat.color + '20' }}>
                      <span className="text-[10px] text-gray-600 font-bold mr-2">Affected ECUs:</span>
                      {cat.affectedEcus.map(ecu => (
                        <span key={ecu} className="text-[10px] px-2 py-1 rounded-lg font-bold border-2"
                          style={{ 
                            backgroundColor: cat.color + '15',
                            color: cat.color,
                            borderColor: cat.color + '40'
                          }}>
                          {ecu}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </IntelCard>
  );
}

function ThreatLandscape() {
  return (
    <IntelCard icon={Activity} title="Cyber Threat Landscape"
      subtitle="Threat category distribution across automotive attack surface" accentColor="#00FF87">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ 
              fontSize: '17px',
              fontWeight: '600',
              letterSpacing: '0.4px',
              color: '#00B0FF',
              textShadow: '0 0 8px rgba(0, 176, 255, 0.4)'
            }}>Threat Distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={THREAT_DISTRIBUTION} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                stroke="#fff" strokeWidth={1.5}>
                {THREAT_DISTRIBUTION.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ background: "#1e293b", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 12, fontSize: 12 }} />
              <Legend iconSize={12} wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ 
              fontSize: '17px',
              fontWeight: '600',
              letterSpacing: '0.4px',
              color: '#0891b2',
              textShadow: '0 0 8px rgba(8, 145, 178, 0.4)'
            }}>Threat Categories</p>
          <div className="space-y-3">
            {THREAT_DISTRIBUTION.map(t => (
              <div key={t.name} className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-md" style={{ background: t.color }} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold" style={{ 
                      color: t.color,
                      textShadow: '0 0 4px rgba(0, 0, 0, 0.3)'
                    }}>{t.name}</span>
                    <span className="font-bold" style={{ 
                      color: t.color,
                      textShadow: '0 0 4px rgba(0, 0, 0, 0.3)'
                    }}>{t.value}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-400 rounded-full overflow-hidden shadow-sm">
                    <div className="h-full rounded-full shadow-md" style={{ width: `${t.value * 4}%`, background: t.color, boxShadow: `0 0 8px ${t.color}60` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </IntelCard>
  );
}

function VehicleCommArchitecture() {
  const [active, setActive] = useState("intra");
  const ch = COMM_CHANNELS.find(c => c.id === active);
  return (
    <IntelCard icon={Network} title="Vehicle Communication Architecture"
      subtitle="V2X connectivity topology — intra-vehicle to cloud" accentColor="#00D1B2">
      <div className="flex flex-wrap gap-3 mb-6">
        {COMM_CHANNELS.map(c => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all shadow-sm ${
              active === c.id
                ? "text-white border-transparent shadow-md transform scale-105"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:border-gray-400 hover:text-gray-900 hover:shadow-md"
            }`}
            style={active === c.id ? { background: c.color, borderColor: c.color } : {}}>
            {c.label}
          </button>
        ))}
      </div>
      {ch && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 shadow-md relative"
          style={{ borderColor: ch.color + '40', backgroundColor: ch.color + '08' }}>
          <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              boxShadow: `0 0 30px ${ch.color}40, 0 0 60px ${ch.color}20, inset 0 0 20px ${ch.color}10`,
              background: `linear-gradient(135deg, ${ch.color}08 0%, transparent 50%, ${ch.color}08 100%)`
            }} />
          <div className="relative">
            <p className="text-sm text-gray-800 mb-4 font-bold">{ch.desc}</p>
            <div className="flex items-center gap-3 flex-wrap mb-6">
              {ch.nodes.map((node, i) => (
                <div key={node} className="flex items-center gap-3">
                  <span className="text-sm font-bold px-4 py-2 rounded-xl border-2 bg-white shadow-sm relative"
                    style={{ 
                      color: ch.color,
                      borderColor: ch.color + '60',
                      backgroundColor: ch.color + '10'
                    }}>
                    <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        boxShadow: `0 0 20px ${ch.color}40, 0 0 40px ${ch.color}20, inset 0 0 10px ${ch.color}10`,
                        background: `linear-gradient(135deg, ${ch.color}05 0%, transparent 50%, ${ch.color}05 100%)`
                      }} />
                    {node}
                  </span>
                  {i < ch.nodes.length - 1 && (
                    <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t-2"
              style={{ borderColor: ch.color + '30' }}>
              <p className="text-sm font-bold text-gray-700">
                <span className="text-red-600">Attack surface:</span> {ch.id === "intra" ? "CAN injection, replay attacks, ECU firmware tampering" :
                  ch.id === "v2v" ? "Message spoofing, Sybil attacks, position falsification" :
                  ch.id === "v2i" ? "Infrastructure spoofing, signal manipulation, DoS" :
                  ch.id === "v2d" ? "Bluetooth/WiFi exploits, malicious app injection" :
                  "OTA tampering, cloud API attacks, backend compromise"}
              </p>
            </div>
          </div>
        </div>
      )}
    </IntelCard>
  );
}

function MarketOutlook() {
  return (
    <IntelCard icon={TrendingUp} title="Market Facts and Outlook"
      subtitle="Global automotive cybersecurity market intelligence — 2015 to 2040" accentColor="#FF9800">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {MARKET_FACTS.map(f => (
          <div key={f.label} className="text-center p-5 rounded-xl border-2 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg transition-all relative"
            style={{ borderColor: f.color + '40', backgroundColor: f.color + '05' }}>
            <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                boxShadow: `0 0 25px ${f.color}40, 0 0 50px ${f.color}20, inset 0 0 15px ${f.color}10`,
                background: `linear-gradient(135deg, ${f.color}08 0%, transparent 50%, ${f.color}08 100%)`
              }} />
            <div className="relative">
              <p className="text-xl font-bold" style={{ color: f.color }}>{f.value}</p>
              <p className="text-[10px] text-gray-700 mt-2 leading-tight font-bold">{f.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
        style={{ 
          fontSize: '17px',
          fontWeight: '600',
          letterSpacing: '0.4px',
          color: '#f59e0b',
          textShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
        }}>Growth Trajectory (Millions)</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={MARKET_TIMELINE} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gAuto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#047857" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#047857" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gAuto2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6d28d9" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6d28d9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#374151", fontWeight: "bold" }} />
          <YAxis tick={{ fontSize: 12, fill: "#374151", fontWeight: "bold" }} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 12, fontSize: 12 }} />
          <Legend iconSize={12} wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "bold" }} />
          <Area type="monotone" dataKey="automated" name="Automated Vehicles (M)"
            stroke="#047857" fill="url(#gAuto)" strokeWidth={3} />
          <Area type="monotone" dataKey="autonomous" name="Autonomous Vehicles (M)"
            stroke="#6d28d9" fill="url(#gAuto2)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </IntelCard>
  );
}

function InteractiveStoryMode() {
  const [step, setStep] = useState(0);
  const current = STORY_STEPS[step];
  const isLast = step === STORY_STEPS.length - 1;

  return (
    <IntelCard icon={BookOpen} title="Interactive Threat Story Mode"
      subtitle="Trace a cyber attack from threat to compliance status — step by step" accentColor="#9C27B0">
      <div className="flex gap-2 mb-6">
        {STORY_STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`flex-1 h-2 rounded-full transition-all shadow-sm ${i <= step ? "bg-blue-900" : "bg-gray-300"}`} />
        ))}
      </div>
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 p-5 mb-6 shadow-md relative"
        style={{ borderColor: "#00FF8740", backgroundColor: "#00FF8708" }}>
        <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 30px #00FF8740, 0 0 60px #00FF8720, inset 0 0 20px #00FF8710`,
            background: `linear-gradient(135deg, #00FF8708 0%, transparent 50%, #00FF8708 100%)`
          }} />
        <div className="relative">
          <p className="text-[11px] text-gray-700 uppercase tracking-widest mb-2 font-bold">
            Step {step + 1} of {STORY_STEPS.length} — {current.label}
          </p>
          <p className="text-lg font-bold text-gray-900">{current.value}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STORY_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[11px] px-3 py-1.5 rounded-lg border-2 font-bold cursor-pointer transition-all shadow-sm ${
              i === step
                ? "bg-blue-900 text-white border-blue-900 shadow-md"
                : i < step
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:border-gray-400"
            }`} onClick={() => setStep(i)}>
              {s.label}
            </span>
            {i < STORY_STEPS.length - 1 && <ArrowRight size={12} className="text-gray-500" />}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="px-5 py-2 text-sm font-bold border-2 rounded-lg text-gray-700 hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 transition-all shadow-sm">
          Previous
        </button>
        <button onClick={() => setStep(s => Math.min(STORY_STEPS.length - 1, s + 1))} disabled={isLast}
          className="px-5 py-2 text-sm font-bold bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-40 transition-all shadow-md">
          {isLast ? "Complete" : "Next Step"}
        </button>
        {isLast && (
          <span className="ml-3 text-sm text-red-800 font-bold self-center border-2 border-red-300 bg-red-100 px-3 py-1.5 rounded-lg shadow-sm">
            ⚠️ Risk: Critical — Mitigation Required
          </span>
        )}
      </div>
    </IntelCard>
  );
}

function SecurityApproach() {
  const mapping = [
    { tuv: "Risk Analysis",            dashboard: "TARA",                 tab: "checklist" },
    { tuv: "Continuous Monitoring",    dashboard: "Analytics",            tab: "charts"    },
    { tuv: "Cybersecurity Assessment", dashboard: "Compliance Checklist", tab: "checklist" },
    { tuv: "Secure Development Audit", dashboard: "Evidence Upload",      tab: "upload"    },
    { tuv: "Gap Analysis",             dashboard: "OEM Benchmark",        tab: "dashboard" },
  ];
  return (
    <IntelCard icon={Database} title="Security Approach — TÜV SÜD Alignment"
      subtitle="Mapping TÜV SÜD cybersecurity framework concepts to dashboard capabilities" accentColor="#FF3B30">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 uppercase tracking-wide border-b-2 border-gray-300">
              <th className="py-3 px-4 text-left font-bold"
                style={{ 
                  fontSize: '17px',
                  fontWeight: '600',
                  letterSpacing: '0.4px',
                  color: '#FF9800',
                  textShadow: '0 0 8px rgba(255, 152, 0, 0.4)'
                }}>TÜV SÜD Concept</th>
              <th className="py-3 px-4 text-left font-bold"
                style={{ 
                  fontSize: '17px',
                  fontWeight: '600',
                  letterSpacing: '0.4px',
                  color: '#FF9800',
                  textShadow: '0 0 8px rgba(255, 152, 0, 0.4)'
                }}>Dashboard Capability</th>
              <th className="py-3 px-4 text-left font-bold"
                style={{ 
                  fontSize: '17px',
                  fontWeight: '600',
                  letterSpacing: '0.4px',
                  color: '#FF9800',
                  textShadow: '0 0 8px rgba(255, 152, 0, 0.4)'
                }}>Standard</th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((row, i) => (
              <tr key={i} className="border-t-2 border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all relative">
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: `0 0 20px #FF3B3040, 0 0 40px #FF3B3020, inset 0 0 10px #FF3B3010`,
                    background: `linear-gradient(135deg, #FF3B3005 0%, transparent 50%, #FF3B3005 100%)`
                  }} />
                <td className="relative py-2 px-3 font-bold text-gray-900 text-sm">{row.tuv}</td>
                <td className="relative py-2 px-3">
                  <span className="bg-purple-100 text-purple-800 border-2 border-purple-300 px-2 py-1 rounded-lg font-bold shadow-sm text-sm">
                    {row.dashboard}
                  </span>
                </td>
                <td className="relative py-2 px-3 text-gray-700 font-medium text-sm">
                  {row.tab === "checklist" ? "UN R155 / ISO 21434" :
                   row.tab === "charts"    ? "ISO 21434 §15" :
                   row.tab === "upload"    ? "UN R155 §A5.3" : "ISO 21434 §8"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IntelCard>
  );
}

// ── Main export ───────────────────────────────────────────────────
export default function CyberIntelligencePanel({ onEcuHighlight }) {
  return (
    <div className="mt-2">
      <div className="rounded-xl border-2 border-gray-300 bg-white shadow-xl overflow-hidden mb-8">
        <div className="flex items-center gap-4 px-6 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-900">Cyber Intelligence</p>
            <p className="text-base text-gray-700 mt-2 font-medium">Threat awareness · V2X architecture · Market intelligence — TÜV SÜD / UN R155 / ISO 21434</p>
          </div>
          <ShieldAlert size={20} className="flex-shrink-0" style={{ color: "#dc2626" }} />
        </div>
      </div>
      <DashboardPurpose />
      <AttackConsequences onEcuHighlight={onEcuHighlight} />
      <ThreatLandscape />
      <VehicleCommArchitecture />
      <MarketOutlook />
      <InteractiveStoryMode />
      <SecurityApproach />
    </div>
  );
}
