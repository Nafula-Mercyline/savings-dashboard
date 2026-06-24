"use client";

/**
 * lib/hooks/useApi.js
 * Reusable React hooks for API calls in the SACCO savings dashboard.
 *
 * Keep environment variables in `.env.local` at the project root, for example:
 * NEXT_PUBLIC_API_URL=http://localhost:5000/api
 *
 * Do not paste `.env.local` values into this JavaScript file because bare
 * `KEY=value` lines are not valid JavaScript syntax.
 */

import { useCallback, useEffect, useState } from "react";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    DEFAULT_ERROR_MESSAGE
  );
}

/**
 * Generic hook for read-only API calls.
 *
 * Usage:
 *   const dashboardQuery = useMemo(() => () => getDashboardSummary(), []);
 *   const { data, loading, error, refetch } = useApi(dashboardQuery);
 */
export function useApi(apiFunc, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunc();
      setData(result);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  useEffect(() => {
    fetchData();
    // `deps` is intentionally caller-controlled so screens can refetch when
    // filters, dates, member IDs, or account IDs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for API mutations such as POST, PUT, PATCH, and DELETE.
 * It does not auto-run; call execute() manually.
 *
 * Usage:
 *   const { execute, loading, error } = useMutation(createMember, {
 *     onSuccess: (result) => router.push(`/members/${result.id}`),
 *   });
 */
export function useMutation(apiFunc, { onSuccess, onError } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);

        const result = await apiFunc(...args);
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, onError, onSuccess]
  );

  return { execute, loading, error, data };
}
