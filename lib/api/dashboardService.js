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

/**
 * Returns the response body whether or not your api client already strips the Axios layer.
 * (A raw Axios response has status + headers + data; an already-unwrapped body doesn't.)
 */
function bodyOf(response) {
  if (!response) return {};
  const looksLikeAxios =
    response.status !== undefined && response.headers !== undefined && response.data !== undefined;
  return looksLikeAxios ? response.data || {} : response;
}

/** Pulls a list out of { success, data: [...] } or { success, members: [...] } or a bare array. */
function listOf(response) {
  const body = bodyOf(response);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.members)) return body.members;
  if (Array.isArray(body.savings)) return body.savings;
  return [];
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getDashboardSummary({ period = "2024" } = {}) {
  const response = await api.get(
    `${DASHBOARD_BASE_PATH}/summary${buildQuery({ period })}`
  );

  // Fall back to an empty object so TanStack Query always gets a valid object.
  if (!response) return {};

  // If your api client interceptor already strips the Axios '.data' layer,
  // 'response' itself is the data. Otherwise, use 'response.data'.
  return response.data || response || {};
}

/** Member picker: GET /api/members/search?q=...  (admin, treasurer, secretary) */
export async function searchMembers(q, limit = 6) {
  const response = await api.get(
    `/members/search${buildQuery({ q, status: "active", limit })}`
  );
  return listOf(response);
}

/** A member's savings accounts: GET /api/members/:id/savings */
export async function getMemberSavings(memberId) {
  const response = await api.get(`/members/${memberId}/savings`);
  return listOf(response);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** POST /api/transactions  (admin only)
 *  Body: { memberId, savingId, type, amount, paymentMethod, description? } */
export async function createTransaction(payload) {
  const response = await api.post("/transactions", payload);
  return bodyOf(response);
}

/** DELETE /api/transactions/:id  (admin only) — reverses it. Body: { reason } */
export async function reverseTransaction(id, reason) {
  const response = await api.delete(`/transactions/${id}`, { data: { reason } });
  return bodyOf(response);
}

// ─── Loans ────────────────────────────────────────────────────────────────────

/** POST /api/loans  (admin, treasurer, secretary)
 *  Body: { memberId, loanType, principal, interestRate (decimal), termMonths, purpose? } */
export async function createLoan(payload) {
  const response = await api.post("/loans", payload);
  return bodyOf(response);
}

/** PUT /api/loans/:id  (admin only, pending loans only)
 *  Body: { principal?, interestRate?, termMonths?, purpose? } */
export async function updateLoan(id, payload) {
  const response = await api.put(`/loans/${id}`, payload);
  return bodyOf(response);
}

/** DELETE /api/loans/:id  (admin only, pending loans only) — cancels the application */
export async function cancelLoan(id) {
  const response = await api.delete(`/loans/${id}`);
  return bodyOf(response);
}

/** POST /api/loans/:id/repayment  (admin, treasurer)
 *  Body: { amount, paymentMethod, reference?, notes? } */
export async function recordRepayment(id, payload) {
  const response = await api.post(`/loans/${id}/repayment`, payload);
  return bodyOf(response);
}

export default {
  getDashboardSummary,
  searchMembers,
  getMemberSavings,
  createTransaction,
  reverseTransaction,
  createLoan,
  updateLoan,
  cancelLoan,
  recordRepayment,
};
