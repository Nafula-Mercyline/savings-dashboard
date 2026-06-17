// ─── .env.local (save this as .env.local in your project ROOT) ───────────────
// This tells Next.js where your Express backend is running

NEXT_PUBLIC_API_URL=http://localhost:5000/api


// ─── lib/hooks/useApi.js ──────────────────────────────────────────────────────
// React hook for making API calls with loading and error states

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for API calls.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => getDashboardSummary());
 */
export function useApi(apiFunc, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunc();
      setData(result);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for mutations (POST, PUT, DELETE).
 * Does NOT auto-run — call execute() manually.
 *
 * Usage:
 *   const { execute, loading, error } = useMutation(
 *     (data) => createMember(data),
 *     { onSuccess: (result) => router.push("/members") }
 *   );
 */
export function useMutation(apiFunc, { onSuccess, onError } = {}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunc(...args);
      setData(result);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      setError(err.message || "Something went wrong");
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, data };
}
