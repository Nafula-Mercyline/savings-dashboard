/**
 * lib/api/loansService.js
 * Loan API calls for the SACCO savings dashboard.
 */

import api from "./client";

const LOANS_BASE_PATH = "/loans";

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

export async function getLoans(params = {}) {
  const response = await api.get(
    `${LOANS_BASE_PATH}${buildQuery(params)}`
  );
  return response.data;
}

export async function getLoansDashboard(params = {}) {
  const response = await api.get(
    `${LOANS_BASE_PATH}/dashboard${buildQuery(params)}`
  );
  return response.data;
}

export async function getLoanById(loanId) {
  const response = await api.get(
    `${LOANS_BASE_PATH}/${encodeURIComponent(loanId)}`
  );
  return response.data;
}

export async function createLoanApplication(payload) {
  const response = await api.post(
    LOANS_BASE_PATH,
    payload
  );
  return response.data;
}

export async function approveLoan(loanId, payload = {}) {
  const response = await api.put(
    `${LOANS_BASE_PATH}/${encodeURIComponent(loanId)}/approve`,
    payload
  );
  return response.data;
}

export async function disburseLoan(loanId, payload) {
  const response = await api.post(
    `${LOANS_BASE_PATH}/${encodeURIComponent(loanId)}/disburse`,
    payload
  );
  return response.data;
}

export async function recordLoanRepayment(loanId, payload) {
  const response = await api.post(
    `${LOANS_BASE_PATH}/${encodeURIComponent(loanId)}/repayments`,
    payload
  );
  return response.data;
}

export async function exportLoans(params = {}) {
  const response = await api.get(
    `${LOANS_BASE_PATH}/export${buildQuery(params)}`,
    {
      responseType: "blob",
    }
  );

  const format = params.format || "csv";

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `loans_${format}.${format}`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

export default {
  getLoans,
  getLoansDashboard,
  getLoanById,
  createLoanApplication,
  approveLoan,
  disburseLoan,
  recordLoanRepayment,
  exportLoans,
};