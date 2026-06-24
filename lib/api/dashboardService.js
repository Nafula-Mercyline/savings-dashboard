/**
 * lib/api/dashboardService.js
 * Dashboard API calls for the SACCO savings dashboard.
 */

import api from "./client";

const DASHBOARD_BASE_PATH = "/dashboard";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getDashboardSummary({ period = "2024" } = {}) {
  const response = await api.get(
    `${DASHBOARD_BASE_PATH}${buildQuery({ period })}`
  );

  return response.data;
}

export default {
  getDashboardSummary,
};