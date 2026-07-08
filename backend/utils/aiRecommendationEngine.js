function getPriority(score) {
  if (score > 18) return "Critical";
  if (score > 12) return "High";
  if (score > 6) return "Medium";
  return "Low";
}

function generateRecommendations(threatMatrix) {
  const recommendations = [];

  threatMatrix.forEach((threat) => {
    if (threat.residualRisk >= 12) {
      let rec = {
        threat: threat.code,
        title: threat.title,
        priority: getPriority(threat.residualRisk),
        recommendation: "",
        owner: "",
        action: ""
      };

      switch (threat.code) {
        case "4.1":
          rec.recommendation = "Implement message authentication (M10)";
          rec.owner = "Tier1";
          rec.action = "Enable Secure CAN + HMAC validation";
          break;

        case "24.1":
          rec.recommendation = "Implement DoS detection (M13)";
          rec.owner = "Tier1";
          rec.action = "Add CAN watchdog + bus load monitoring";
          break;

        case "25.1":
          rec.recommendation = "Protect ECU parameters (M7)";
          rec.owner = "Tier1";
          rec.action = "Encrypt deployment threshold data";
          break;

        case "12.1":
          rec.recommendation = "Secure OTA update process (M16)";
          rec.owner = "OEM";
          rec.action = "Enable signed firmware + HSM key storage";
          break;

        default:
          rec.recommendation = "Review mitigation implementation";
          rec.owner = "OEM";
          rec.action = "Conduct cybersecurity gap assessment";
      }

      recommendations.push(rec);
    }
  });

  return recommendations;
}

module.exports = { generateRecommendations };