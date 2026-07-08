import { useEffect, useState, useCallback } from "react";

const BASE = "http://localhost:5000";

export function useAnalytics(role, component, version) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch_ = useCallback(async () => {
    if (!role || !component) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/analytics/${encodeURIComponent(role)}/${encodeURIComponent(component)}`);
      const d   = await res.json();
      setData(d);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [role, component]);

  useEffect(() => { fetch_(); }, [fetch_, version]);
  return { data, loading, error, refetch: fetch_ };
}

export function useChecklist(role, component, version) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(() => {
    if (!role || !component) return;
    setLoading(true);
    fetch(`${BASE}/api/analytics/checklist/${encodeURIComponent(role)}/${encodeURIComponent(component)}`)
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [role, component]);

  useEffect(() => { fetch_(); }, [fetch_, version]);
  return { rows, loading, refetch: fetch_ };
}

export function useEvidence(role, component, version) {
  const [evidence, setEvidence] = useState([]);

  const fetch_ = useCallback(() => {
    if (!role || !component) return;
    fetch(`${BASE}/api/evidence/${encodeURIComponent(role)}/${encodeURIComponent(component)}`)
      .then(r => r.json())
      .then(d => setEvidence(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [role, component]);

  useEffect(() => { fetch_(); }, [fetch_, version]);
  return { evidence, refetch: fetch_ };
}
