import { useState, useEffect, useCallback } from "react";

const BASE = "http://localhost:5000";

const KPI_META = {
  crash_integrity: {
    icon: "🔥",
    label: "Crash-Signal Integrity",
    color: "blue",
    description: "Measures how many communication-channel threats (CAN spoofing, replay, MitM, DoS) are secured.",
    checklistTab: "r155",
  },
  active_threats: {
    icon: "⚠️",
    label: "Active Threats",
    color: "amber",
    description: "Count of checklist items across all sections that are Not Started or In Progress.",
    checklistTab: "r155",
  },
  critical_threats: {
    icon: "🔴",
    label: "Critical Threats",
    color: "red",
    description: "High-risk UN R155 Annex 5 items (4.3.2, 4.3.6, 4.3.7) not yet Verified.",
    checklistTab: "r155",
  },
  asil_level: {
    icon: "⚡",
    label: "ASIL Level",
    color: "orange",
    description: "Automotive Safety Integrity Level classification per ISO 26262 for each component.",
    checklistTab: "r155",
  },
};

const STATUS_STYLE = {
  "Not Started":  "bg-gray-100 text-gray-600 border-gray-300",
  "In Progress":  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Implemented":  "bg-blue-100 text-blue-700 border-blue-300",
  "Completed":    "bg-blue-100 text-blue-700 border-blue-300",
  "Verified":     "bg-green-100 text-green-700 border-green-300",
  "ASIL D":       "bg-red-100 text-red-700 border-red-300",
  "ASIL C":       "bg-orange-100 text-orange-700 border-orange-300",
  "ASIL B":       "bg-yellow-100 text-yellow-700 border-yellow-300",
  "ASIL A":       "bg-blue-100 text-blue-700 border-blue-300",
  "QM":           "bg-gray-100 text-gray-600 border-gray-300",
};

const COLOR_MAP = {
  blue:   { header: "bg-blue-600",   badge: "bg-blue-50 text-blue-700 border-blue-200",   bar: "bg-blue-500"   },
  amber:  { header: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400"  },
  red:    { header: "bg-red-600",    badge: "bg-red-50 text-red-700 border-red-200",       bar: "bg-red-500"    },
  orange: { header: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-400" },
};

// ── Mini horizontal bar chart for status counts ───────────────────────────────
function StatusChart({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const COLORS = {
    "Not Started": "#9ca3af",
    "In Progress":  "#f59e0b",
    "Implemented":  "#3b82f6",
    "Completed":    "#3b82f6",
    "Verified":     "#22c55e",
    "ASIL D": "#ef4444",
    "ASIL C": "#f97316",
    "ASIL B": "#eab308",
    "ASIL A": "#3b82f6",
    "QM":     "#9ca3af",
  };
  return (
    <div className="space-y-1.5">
      {Object.entries(counts).filter(([, v]) => v > 0).map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(count / total) * 100}%`, backgroundColor: COLORS[label] || "#6b7280" }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section breakdown bars ────────────────────────────────────────────────────
function SectionBreakdown({ breakdown, kpiType, colorKey }) {
  const bar = COLOR_MAP[colorKey]?.bar || "bg-blue-500";
  // For non-percentage KPIs (active/critical/asil), values are counts not %
  const isPercent = kpiType === "crash_integrity";
  const maxVal = isPercent ? 100 : Math.max(...Object.values(breakdown), 1);

  return (
    <div className="space-y-2">
      {Object.entries(breakdown).map(([section, val]) => (
        <div key={section} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-44 shrink-0 truncate" title={section}>{section}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${bar} transition-all`}
              style={{ width: `${(val / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-10 text-right">
            {isPercent ? `${val}%` : val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function KpiDrillDownPanel({ kpiType, role, component, onClose, onViewInChecklist }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");

  const meta   = KPI_META[kpiType] || {};
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.blue;

  const load = useCallback(() => {
    if (!kpiType) return;
    setLoading(true);
    const q = new URLSearchParams({ type: kpiType, role, component });
    fetch(`${BASE}/api/analytics/kpi-details?${q}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [kpiType, role, component]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filteredItems = (data?.items || []).filter(item =>
    !search || item.clause.toLowerCase().includes(search.toLowerCase()) ||
    item.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`${colors.header} text-white px-5 py-4 flex items-start justify-between shrink-0`}>
          <div>
            {/* Breadcrumb */}
            <p className="text-xs text-white/70 mb-1">Dashboard › {meta.label} Breakdown</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <h2 className="text-base font-bold">{meta.label}</h2>
                {data && (
                  <p className="text-xs text-white/80 mt-0.5">{data.calculation}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm animate-pulse">
            Loading breakdown…
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Value + formula */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className={`text-4xl font-bold ${colors.header.replace("bg-", "text-")}`}>
                {data.value}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{meta.description}</p>
                <code className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                  {data.formula}
                </code>
              </div>
            </div>

            {/* Status distribution chart */}
            {data.statusCounts && Object.keys(data.statusCounts).length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Status Distribution
                </p>
                <StatusChart counts={data.statusCounts} />
              </div>
            )}

            {/* Section breakdown */}
            {data.sectionBreakdown && Object.keys(data.sectionBreakdown).length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {kpiType === "crash_integrity" ? "Section Compliance %" : "Affected Sections"}
                </p>
                <SectionBreakdown
                  breakdown={data.sectionBreakdown}
                  kpiType={kpiType}
                  colorKey={meta.color}
                />
              </div>
            )}

            {/* Clause / item list */}
            {data.items?.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {kpiType === "asil_level" ? "Component ASIL Mapping" : "Contributing Clauses"}
                    <span className="ml-2 text-gray-400 font-normal normal-case">
                      ({filteredItems.length} items)
                    </span>
                  </p>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-28"
                  />
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 text-gray-500 uppercase sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left">
                          {kpiType === "asil_level" ? "Component" : "Clause / ID"}
                        </th>
                        <th className="py-2 px-3 text-center">
                          {kpiType === "asil_level" ? "ASIL" : "Status"}
                        </th>
                        <th className="py-2 px-3 text-left">
                          {kpiType === "asil_level" ? "Safety Goal" : "Evidence"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-blue-700 whitespace-nowrap">
                            {item.clause}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded border font-semibold ${STATUS_STYLE[item.status] || STATUS_STYLE["Not Started"]}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500 max-w-[160px] truncate" title={item.evidenceFile || "—"}>
                            {item.evidenceFile
                              ? <span className="text-green-700">📎 {item.evidenceFile}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View in Checklist CTA */}
            <button
              onClick={() => { onViewInChecklist(meta.checklistTab); onClose(); }}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${colors.header} hover:opacity-90 transition-opacity`}
            >
              View in Checklist →
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            No data available
          </div>
        )}
      </div>
    </>
  );
}
