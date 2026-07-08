const getLevel = (score) =>
  score >= 16 ? "Critical" : score >= 9 ? "High" : score >= 4 ? "Medium" : "Low";

const LEVEL_META = {
  Critical: { bg: "#450a0a", border: "#ef4444", text: "#fca5a5", bar: "#ef4444", badge: "#7f1d1d", badgeText: "#fecaca" },
  High:     { bg: "#431407", border: "#f97316", text: "#fdba74", bar: "#f97316", badge: "#7c2d12", badgeText: "#fed7aa" },
  Medium:   { bg: "#422006", border: "#eab308", text: "#fde047", bar: "#eab308", badge: "#713f12", badgeText: "#fef08a" },
  Low:      { bg: "#052e16", border: "#22c55e", text: "#86efac", bar: "#22c55e", badge: "#14532d", badgeText: "#bbf7d0" },
};

const cellBg = (score) => {
  if (score >= 16) return "#dc2626";
  if (score >= 9)  return "#ea580c";
  if (score >= 4)  return "#ca8a04";
  return "#16a34a";
};
const cellText = () => "#ffffff";

function buildItems(componentThreats, threats) {
  if (componentThreats?.length) {
    return componentThreats.map(t => ({
      name:        `${t.threat_code} – ${t.title}`,
      impact:      t.impact_score  ?? t.impact      ?? 0,
      feasibility: t.feasibility_score ?? t.feasibility ?? 0,
      score:       t.risk_score    ?? t.score       ?? 0,
      level:       getLevel(t.risk_score ?? t.score ?? 0),
      residual:    t.residual_risk ?? (
        (t.risk_score ?? 0) >= 16 ? Math.round((t.risk_score ?? 0) * 0.3)
        : (t.risk_score ?? 0) >= 9  ? Math.round((t.risk_score ?? 0) * 0.6)
        : Math.round((t.risk_score ?? 0) * 0.8)
      ),
      category: t.category  ?? "—",
      asil:     t.asil_level ?? t.asil ?? "—",
    }));
  }
  if (threats?.length) {
    return threats.map(t => {
      const s = (t.impact ?? 0) * (t.feasibility ?? 0);
      return {
        name: t.name ?? t.title ?? "—",
        impact: t.impact ?? 0, feasibility: t.feasibility ?? 0,
        score: t.score ?? s, level: t.level || getLevel(t.score ?? s),
        residual: t.residual ?? Math.round((t.score ?? s) * ((t.score ?? s) >= 16 ? 0.3 : (t.score ?? s) >= 9 ? 0.6 : 0.8)),
        category: t.category ?? "—", asil: t.asil ?? "—",
      };
    });
  }
  return [];
}

const RiskHeatmap = ({ threats = [], componentThreats = [], component = "" }) => {
  const items = buildItems(componentThreats, threats);

  if (!items.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"48px 0", gap:12, background:"#0f172a", borderRadius:10 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #1e3a5f",
        borderTopColor:"#3b82f6", animation:"spin 1s linear infinite" }} />
      <p style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>
        {component ? `Loading threat data for ${component}…` : "Select a component to view its threat risk heatmap"}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const counts = {
    Critical: items.filter(t => t.level === "Critical").length,
    High:     items.filter(t => t.level === "High").length,
    Medium:   items.filter(t => t.level === "Medium").length,
    Low:      items.filter(t => t.level === "Low").length,
  };
  const maxCount = Math.max(...Object.values(counts), 1);
  const maxScore = Math.max(...items.map(t => t.score));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, background:"#0f172a", borderRadius:12, padding:20 }}>

      {/* ── Top row: distribution bars + matrix ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        {/* Risk distribution */}
        <div className="sub-card" style={{ "--sc-accent":"#ef4444", background:"#1e293b", border:"1px solid #334155", borderTop:"3px solid #ef4444", borderRadius:10, padding:"16px 18px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.12em",
            textTransform:"uppercase", marginBottom:16 }}>Risk Distribution</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {Object.entries(counts).map(([level, count]) => {
              const m = LEVEL_META[level];
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={level}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: m.text }}>{level}</span>
                    <span style={{ fontSize:13, fontWeight:800, color: m.text }}>{count}</span>
                  </div>
                  <div style={{ height:8, background:"#0f172a", borderRadius:4, overflow:"hidden",
                    border:"1px solid #1e3a5f" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: m.bar, borderRadius:4,
                      transition:"width 0.6s ease", boxShadow:`0 0 6px ${m.bar}88` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Max risk callout */}
          <div style={{ marginTop:18, padding:"10px 14px", background:"#450a0a",
            border:"1px solid #ef4444", borderRadius:8,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#fca5a5", letterSpacing:"0.05em" }}>MAX RISK SCORE</span>
            <span style={{ fontSize:22, fontWeight:900, color:"#f87171", letterSpacing:"-1px" }}>{maxScore}</span>
          </div>
        </div>

        {/* 5×5 matrix */}
        <div className="sub-card" style={{ "--sc-accent":"#f59e0b", background:"#1e293b", border:"1px solid #334155", borderTop:"3px solid #f59e0b", borderRadius:10, padding:"16px 18px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.12em",
            textTransform:"uppercase", marginBottom:12 }}>Impact × Feasibility Matrix</p>
          <div style={{ display:"flex", gap:8 }}>
            {/* Y-axis */}
            <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-around", paddingBottom:20 }}>
              {[5,4,3,2,1].map(f => (
                <span key={f} style={{ fontSize:10, fontWeight:600, color:"#64748b", width:12, textAlign:"right" }}>{f}</span>
              ))}
            </div>
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3 }}>
                {[5,4,3,2,1].map(f =>
                  [1,2,3,4,5].map(i => {
                    const s = i * f;
                    const hasT = items.some(t => t.impact === i && t.feasibility === f);
                    return (
                      <div key={`${f}-${i}`} title={`Impact ${i} × Feasibility ${f} = ${s}`}
                        style={{ width:36, height:28, background: cellBg(s), borderRadius:4,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          position:"relative", border: hasT ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                          boxShadow: hasT ? "0 0 8px rgba(255,255,255,0.3)" : "none" }}>
                        <span style={{ fontSize:10, fontWeight:800, color: cellText(s) }}>{s}</span>
                        {hasT && (
                          <span style={{ position:"absolute", top:2, right:2, width:6, height:6,
                            borderRadius:"50%", background:"#ffffff", boxShadow:"0 0 4px #fff" }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {/* X-axis */}
              <div style={{ display:"flex", gap:3, marginTop:5 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ width:36, textAlign:"center", fontSize:10, fontWeight:600, color:"#64748b" }}>{i}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:10, fontWeight:600, color:"#475569" }}>← Feasibility</span>
            <span style={{ fontSize:10, fontWeight:600, color:"#475569" }}>Impact →</span>
          </div>
          {/* Legend */}
          <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
            {["Critical","High","Medium","Low"].map(l => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:2, background: LEVEL_META[l].bar,
                  display:"inline-block", boxShadow:`0 0 4px ${LEVEL_META[l].bar}` }} />
                <span style={{ fontSize:10, fontWeight:600, color:"#94a3b8" }}>{l}</span>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"#ffffff",
                display:"inline-block", boxShadow:"0 0 4px #fff" }} />
              <span style={{ fontSize:10, fontWeight:600, color:"#94a3b8" }}>Active threat</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Threat table ── */}
      <div className="sub-card" style={{ "--sc-accent":"#3b82f6", border:"1px solid #334155", borderTop:"3px solid #3b82f6", borderRadius:10, overflow:"hidden" }}>
        {/* Table header bar */}
        <div style={{ background:"#1e3a5f", padding:"10px 16px", borderBottom:"1px solid #334155",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#93c5fd", letterSpacing:"0.12em", textTransform:"uppercase" }}>
            Threat Register — {component || "All Components"}
          </p>
          <span style={{ fontSize:11, fontWeight:700, color:"#60a5fa",
            background:"#1e3a8a", padding:"2px 10px", borderRadius:20, border:"1px solid #3b82f6" }}>
            {items.length} threats
          </span>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#1e293b", borderBottom:"2px solid #334155" }}>
                {["Threat","Category","Impact","Feasibility","Risk Score","Level","Residual","ASIL"].map(h => (
                  <th key={h} style={{ padding:"10px 14px",
                    textAlign: h==="Threat"||h==="Category" ? "left" : "center",
                    fontSize:10, fontWeight:700, color:"#7dd3fc",
                    letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t, i) => {
                const m = LEVEL_META[t.level];
                return (
                  <tr key={i} style={{ borderBottom:"1px solid #1e293b",
                    background: i % 2 === 0 ? "#0f172a" : "#131f35" }}>
                    <td style={{ padding:"10px 14px", color:"#e2e8f0", fontWeight:600, maxWidth:240 }}>
                      <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {t.name}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8", fontWeight:500 }}>{t.category}</td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <span style={{ display:"inline-block", minWidth:28, padding:"2px 6px", borderRadius:6,
                        background:"#1e3a8a", color:"#93c5fd", fontWeight:800, fontSize:12,
                        textAlign:"center", border:"1px solid #3b82f6" }}>{t.impact}</span>
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <span style={{ display:"inline-block", minWidth:28, padding:"2px 6px", borderRadius:6,
                        background:"#14532d", color:"#86efac", fontWeight:800, fontSize:12,
                        textAlign:"center", border:"1px solid #22c55e" }}>{t.feasibility}</span>
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <span style={{ fontSize:17, fontWeight:900, color: m.text,
                        textShadow:`0 0 8px ${m.bar}88` }}>{t.score}</span>
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <span style={{ padding:"3px 12px", borderRadius:20, fontSize:10, fontWeight:700,
                        background: m.badge, color: m.badgeText, border:`1px solid ${m.border}`,
                        whiteSpace:"nowrap" }}>
                        {t.level}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center", color:"#cbd5e1", fontWeight:700, fontSize:13 }}>
                      {t.residual}
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <span style={{ fontWeight:800, fontSize:12,
                        color: t.asil==="ASIL D" ? "#f87171"
                             : t.asil==="ASIL C" ? "#fb923c"
                             : t.asil==="ASIL B" ? "#fbbf24"
                             : "#475569" }}>
                        {t.asil || "—"}
                      </span>
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
};

export default RiskHeatmap;
