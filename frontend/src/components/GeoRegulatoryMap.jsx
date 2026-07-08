function GeoRegulatoryMap({ region = "EU", compliance = 0 }) {

  // Regulation Status (UN R155 Implementation)
  const regions = [
    { name: "EU", status: "mandatory" },
    { name: "Japan", status: "mandatory" },
    { name: "India", status: "phased" },
    { name: "Korea", status: "mandatory" },
    { name: "UK", status: "mandatory" }
  ];

  const getBaseColor = (status) => {
    if (status === "mandatory") return "bg-green-600";
    if (status === "phased") return "bg-yellow-500";
    return "bg-gray-600";
  };

  const getComplianceOverlay = () => {
    if (compliance >= 80) return "border-green-400";
    if (compliance >= 60) return "border-yellow-400";
    return "border-red-500";
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Geo Regulatory Readiness (UN R155)
      </h3>

      {regions.map((r) => (
        <div
          key={r.name}
          className={`flex justify-between items-center py-2 px-3 mb-2 rounded border ${r.name === region ? getComplianceOverlay() : "border-transparent"}`}
        >
          <span>{r.name}</span>

          <div className={`w-6 h-6 rounded ${getBaseColor(r.status)}`} />
        </div>
      ))}

      <div className="mt-4 text-sm text-gray-400">
        <p>Green = Mandatory</p>
        <p>Yellow = Phased / Transitional</p>
        <p>Border Color = Your Compliance Level</p>
      </div>
    </div>
  );
}

export default GeoRegulatoryMap;