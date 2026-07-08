import React from "react";

function getColor(score) {
  if (score < 6) return "bg-green-600";
  if (score < 12) return "bg-yellow-500";
  if (score < 18) return "bg-orange-500";
  return "bg-red-600";
}

function CyberAsilHeatmap({ threats }) {
  if (!threats) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Cyber → ASIL Interaction Heatmap
      </h3>

      {threats.map((t, index) => (
        <div
          key={index}
          className={`flex justify-between p-2 rounded mb-2 ${getColor(
            t.residualRisk
          )}`}
        >
          <span>
            {t.code} – {t.title}
          </span>
          <span className="font-bold">
            {t.residualRisk > 15 ? "ASIL D Risk" : 
             t.residualRisk > 10 ? "ASIL C Risk" :
             t.residualRisk > 5 ? "ASIL B Risk" : "ASIL A Risk"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default CyberAsilHeatmap;