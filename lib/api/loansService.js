/**
 * lib/api/loansService.js  ← FRONTEND FILE
 *
 * This file lives in lib/api/ and runs in the BROWSER.
 * It only uses fetch/axios through the api client to call your Express backend.
 * It must NEVER import sequelize, models, or config/db.
 */

import api from "./client";

// ─── GET /api/dashboard/loans ─────────────────────────────────────────────────
export async function getLoansDashboard({
  year     = new Date().getFullYear(),
  status,
  page     = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams({
    year,
    page,
    pageSize,
    ...(status ? { status } : {}),
  });
  
  // FIXED: Routing changed from `/loans/dashboard` to match your Express router structure (/api/dashboard + /loans)
  const data = await api.get(`/dashboard/loans?${params}`);
  return data?.data || data || null;
}

// ─── GET /api/loans ───────────────────────────────────────────────────────────
export async function getLoans({
  page   = 1,
  limit  = 20,
  status = "all",
  search = "",
} = {}) {
  const params = new URLSearchParams({ page, limit, status, search });
  const data = await api.get(`/loans?${params}`);
  return data;
}

// ─── GET /api/loans/:id ───────────────────────────────────────────────────────
export async function getLoanById(id) {
  const data = await api.get(`/loans/${id}`);
  return data.data;
}

// ─── POST /api/loans ──────────────────────────────────────────────────────────
export async function createLoan(loanData) {
  const data = await api.post("/loans", loanData);
  return data.data;
}

// ─── PUT /api/loans/:id ───────────────────────────────────────────────────────
export async function updateLoan(id, loanData) {
  const data = await api.put(`/loans/${id}`, loanData);
  return data.data;
}

// ─── DELETE /api/loans/:id ────────────────────────────────────────────────────
export async function deleteLoan(id) {
  return api.delete(`/loans/${id}`);
}

// ─── PUT /api/loans/:id/approve ───────────────────────────────────────────────
export async function approveLoan(id, notes = "") {
  const data = await api.put(`/loans/${id}/approve`, { notes });
  return data.data;
}

// ─── PUT /api/loans/:id/reject ────────────────────────────────────────────────
export async function rejectLoan(id, reason) {
  const data = await api.put(`/loans/${id}/reject`, { reason });
  return data.data;
}

// ─── PUT /api/loans/:id/disburse ──────────────────────────────────────────────
export async function disburseLoan(id, { disbursedAt, notes } = {}) {
  const data = await api.put(`/loans/${id}/disburse`, { disbursedAt, notes });
  return data.data;
}

// ─── POST /api/loans/:id/repayment ────────────────────────────────────────────
export async function recordRepayment(id, {
  amount, paymentMethod = "cash", reference, notes,
}) {
  const data = await api.post(`/loans/${id}/repayment`, {
    amount, paymentMethod, reference, notes,
  });
  return data.data;
}

// ─── GET /api/loans/:id/repayments ────────────────────────────────────────────
export async function getLoanRepayments(id, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const data = await api.get(`/loans/${id}/repayments?${params}`);
  return data;
}

// ─── GET /api/loans/:id/schedule ─────────────────────────────────────────────
export async function getLoanSchedule(id) {
  const data = await api.get(`/loans/${id}/schedule`);
  return data.data;
}

// ─── GET /api/loans/member/:memberId ─────────────────────────────────────────
export async function getLoansByMember(memberId) {
  const data = await api.get(`/loans/member/${memberId}`);
  return data.data;
}

// ─── GET /api/loans/overdue ───────────────────────────────────────────────────
export async function getOverdueLoans({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const data = await api.get(`/loans/overdue?${params}`);
  return data;
}