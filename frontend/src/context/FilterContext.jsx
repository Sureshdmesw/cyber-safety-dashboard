import { createContext, useContext, useState, useCallback } from "react";

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [selectedRole,       setSelectedRole]       = useState("OEM");
  const [selectedComponent,  setSelectedComponent]  = useState("");
  const [selectedRegulation, setSelectedRegulation] = useState("ALL");
  const [analyticsVersion,   setAnalyticsVersion]   = useState(0);

  const refreshAnalytics = useCallback(() => setAnalyticsVersion(v => v + 1), []);

  return (
    <FilterContext.Provider value={{
      selectedRole,       setSelectedRole,
      selectedComponent,  setSelectedComponent,
      selectedRegulation, setSelectedRegulation,
      analyticsVersion,   refreshAnalytics,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterContext must be inside FilterProvider");
  return ctx;
}
