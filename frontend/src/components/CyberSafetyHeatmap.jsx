function CyberSafetyHeatmap({ data }) {
  if (!data) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Cyber → Safety Interaction Map
      </h3>

      {data.map((row, i) => (
        <div key={i} className="flex justify-between border-b border-gray-700 py-2">
          <span>{row.threat}</span>
          <span className="text-red-400 font-bold">{row.asil}</span>
        </div>
      ))}
    </div>
  );
}

export default CyberSafetyHeatmap;