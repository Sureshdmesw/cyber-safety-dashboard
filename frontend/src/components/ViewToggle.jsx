function ViewToggle({ view, setView }) {
  return (
    <div className="flex justify-center mt-6 gap-4">
      <button
        onClick={() => setView("executive")}
        className={`px-4 py-2 rounded ${
          view === "executive" ? "bg-blue-600 text-white" : "bg-gray-300"
        }`}
      >
        Executive View
      </button>

      <button
        onClick={() => setView("engineering")}
        className={`px-4 py-2 rounded ${
          view === "engineering" ? "bg-blue-600 text-white" : "bg-gray-300"
        }`}
      >
        Engineering Deep-Dive
      </button>
    </div>
  );
}

export default ViewToggle;