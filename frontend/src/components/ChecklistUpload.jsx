import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { FileDown, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

const LEVEL      = (s) => s >= 16 ? "Critical" : s >= 9 ? "High" : s >= 4 ? "Medium" : "Low";
const LEVEL_BADGE = {
  Critical: "bg-red-600/80 text-white",
  High:     "bg-orange-500/80 text-white",
  Medium:   "bg-yellow-400/80 text-gray-900",
  Low:      "bg-green-500/80 text-white",
};
const RESULT_STYLE = {
  Pass:        "text-green-400 font-semibold",
  Fail:        "text-red-400 font-semibold",
  "Not Tested":"text-white/30",
};

function downloadTemplate() {
  const rows = [
    { threat_code: "4.1",  title: "CAN Message Spoofing",      category: "Communication", impact_score: 5, feasibility_score: 4, asil_level: "ASIL D", safety_impact: true,  result: "Pass",       notes: "" },
    { threat_code: "6.2",  title: "Man-in-the-Middle Attack",  category: "Communication", impact_score: 4, feasibility_score: 3, asil_level: "ASIL C", safety_impact: true,  result: "Fail",       notes: "Needs HMAC" },
    { threat_code: "12.1", title: "Compromised OTA Update",    category: "Update",        impact_score: 5, feasibility_score: 3, asil_level: "ASIL D", safety_impact: true,  result: "Not Tested", notes: "" },
    { threat_code: "24.1", title: "CAN Denial of Service",     category: "Communication", impact_score: 5, feasibility_score: 5, asil_level: "ASIL D", safety_impact: true,  result: "Pass",       notes: "" },
    { threat_code: "26.1", title: "Weak Encryption",           category: "Cryptography",  impact_score: 4, feasibility_score: 4, asil_level: "ASIL C", safety_impact: true,  result: "Not Tested", notes: "Review AES key length" },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [10,30,14,12,16,10,12,10,30].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Validation Checklist");
  XLSX.writeFile(wb, "IACCD-checklist-template.xlsx");
}

export default function ChecklistUpload({ component, role, onResultsLoaded }) {
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results,   setResults]   = useState(null);
  const [error,     setError]     = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setError(""); setResults(null); setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch("http://localhost:5000/api/upload/checklist", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Upload failed");
      else         setResults(data);
    } catch {
      setError("Could not reach server. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const passCount     = results?.threats.filter(t => String(t.result).toLowerCase() === "pass").length   ?? 0;
  const failCount     = results?.threats.filter(t => String(t.result).toLowerCase() === "fail").length   ?? 0;
  const untestedCount = results?.threats.filter(t => !["pass","fail"].includes(String(t.result).toLowerCase())).length ?? 0;
  const compliance    = results ? Math.round((passCount / results.summary.total) * 100) : 0;

  return (
    <div className="mt-6 space-y-4">

      {/* Instructions */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-5">
        <h3 className="text-sm font-medium text-blue-900 mb-2 tracking-wide">How to use the Upload Checklist</h3>
        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
          <li>Download the template and fill in your validation results (Pass / Fail / Not Tested)</li>
          <li>Required column: <code className="bg-white/10 px-1 rounded text-blue-900">threat_code</code>. Optional: title, category, impact_score, feasibility_score, asil_level, result, notes</li>
          <li>Upload your completed file — results appear instantly below</li>
          <li>Click <span className="text-blue-900 font-medium">"Load into Checklist"</span> to merge results into the compliance dashboard</li>
        </ol>
        <button
          onClick={downloadTemplate}
          className="mt-4 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200"
        >
          <FileDown size={13} /> Download Template (.xlsx)
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-blue-500/60 bg-blue-500/10"
            : "border-white/10 bg-gray-800 hover:border-white/20 hover:bg-gray-700"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-white/95">Parsing file…</p>
          </div>
        ) : (
          <>
            <Upload size={28} className="mx-auto mb-3 text-white/80" strokeWidth={1.25} />
            <p className="text-sm font-medium text-white">Drag & drop your checklist here</p>
            <p className="text-xs text-white mt-1">or click to browse — .xlsx, .xls, .csv accepted</p>
            <p className="text-xs text-white/95 mt-2">Max 5 MB</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6">

          {/* Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            <div>
              <h3 className="text-base font-medium text-white tracking-wide">Upload Results</h3>
              <p className="text-xs text-white/60 mt-0.5">
                Component: <span className="text-white/75">{component}</span>
                &nbsp;·&nbsp;Role: <span className="text-white/75">{role}</span>
              </p>
            </div>
            <button
              onClick={() => onResultsLoaded(results.threats)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <CheckCircle2 size={13} /> Load into Checklist
            </button>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total Threats", value: results.summary.total, color: "text-white" },
              { label: "Passed",        value: passCount,             color: "text-green-400" },
              { label: "Failed",        value: failCount,             color: "text-red-400" },
              { label: "Not Tested",    value: untestedCount,         color: "text-white/60" },
              { label: "Compliance",    value: `${compliance}%`,      color: compliance >= 80 ? "text-green-400" : compliance >= 50 ? "text-yellow-400" : "text-red-400" },
            ].map((k, i) => (
              <div key={i} className="bg-black/20 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-2xl font-semibold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-white/60 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Threat Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/70 uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Code</th>
                  <th className="text-left py-2 px-3 font-medium">Threat</th>
                  <th className="text-left py-2 px-3 font-medium">Category</th>
                  <th className="text-center py-2 px-3 font-medium">Impact</th>
                  <th className="text-center py-2 px-3 font-medium">Feasibility</th>
                  <th className="text-center py-2 px-3 font-medium">Risk</th>
                  <th className="text-center py-2 px-3 font-medium">Level</th>
                  <th className="text-center py-2 px-3 font-medium">ASIL</th>
                  <th className="text-center py-2 px-3 font-medium">Result</th>
                  <th className="text-left py-2 px-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results.threats.map((t, i) => {
                  const level     = LEVEL(t.risk_score);
                  const result    = t.result || "Not Tested";
                  const resultKey = Object.keys(RESULT_STYLE).find(k => k.toLowerCase() === result.toLowerCase()) || "Not Tested";
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                      <td className="py-2 px-3 font-mono text-blue-400">{t.threat_code}</td>
                      <td className="py-2 px-3 text-white/85">{t.title || "—"}</td>
                      <td className="py-2 px-3 text-white/60">{t.category || "—"}</td>
                      <td className="py-2 px-3 text-center text-white/70">{t.impact_score}</td>
                      <td className="py-2 px-3 text-center text-white/70">{t.feasibility_score}</td>
                      <td className="py-2 px-3 text-center text-white/90 font-semibold">{t.risk_score}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${LEVEL_BADGE[level]}`}>{level}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold ${t.asil_level === "ASIL D" ? "text-red-400" : t.asil_level === "ASIL C" ? "text-orange-400" : "text-yellow-400"}`}>
                          {t.asil_level}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={RESULT_STYLE[resultKey]}>{result}</span>
                      </td>
                      <td className="py-2 px-3 text-white/50">{t.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
