function calculateRisk(impact, feasibility) {
  const risk = impact * feasibility;

  if (risk >= 16) return { level: "Critical", score: risk };
  if (risk >= 9) return { level: "High", score: risk };
  if (risk >= 4) return { level: "Medium", score: risk };
  return { level: "Low", score: risk };
}

function calculateResidualRisk(risk, effectiveness) {
  const reduction = {
    High: 0.7,
    Medium: 0.4,
    Low: 0.2
  };

  return Math.round(risk * (1 - reduction[effectiveness]));
}

module.exports = { calculateRisk, calculateResidualRisk };