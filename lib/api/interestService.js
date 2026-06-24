/**
 * lib/api/interestService.js
 * Interest calculation and posting API calls for the SACCO savings dashboard.
 */

import api from "./client";

const INTEREST_BASE_PATH = "/interest";

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

export async function getInterestRates(params = {}) {
  const response = await api.get(
    `${INTEREST_BASE_PATH}/rates${buildQuery(params)}`
  );
  return response.data;
}

export async function getInterestDashboard(params = {}) {
  const response = await api.get(
    `${INTEREST_BASE_PATH}/dashboard${buildQuery(params)}`
  );
  return response.data;
}

export async function calculateInterest(payload) {
  const response = await api.post(
    `${INTEREST_BASE_PATH}/calculate`,
    payload
  );
  return response.data;
}

export async function postSavingsInterest(payload) {
  const response = await api.post(
    `${INTEREST_BASE_PATH}/savings/post`,
    payload
  );
  return response.data;
}

export async function postLoanInterest(payload) {
  const response = await api.post(
    `${INTEREST_BASE_PATH}/loans/post`,
    payload
  );
  return response.data;
}

export async function collectPendingInterest(
  pendingInterestId,
  payload = {}
) {
  const response = await api.post(
    `${INTEREST_BASE_PATH}/pending/${encodeURIComponent(
      pendingInterestId
    )}/collect`,
    payload
  );

  return response.data;
}

export async function exportInterestReport(params = {}) {
  const response = await api.get(
    `${INTEREST_BASE_PATH}/export${buildQuery(params)}`,
    {
      responseType: "blob",
    }
  );

  const format = params.format || "csv";

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `interest_report_${format}.${format}`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

export default {
  getInterestRates,
  getInterestDashboard,
  calculateInterest,
  postSavingsInterest,
  postLoanInterest,
  collectPendingInterest,
  exportInterestReport,
};