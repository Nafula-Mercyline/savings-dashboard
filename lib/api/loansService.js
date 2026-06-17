/**
 * lib/api/loansService.js
 * Loans API calls
 */

import api from "./client";

export async function getLoans({ page = 1, limit = 20, status = "all", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status, search });
  const data = await api.get(`/loans?${params}`);
  return data;
}

export async function getLoanById(id) {
  const data = await api.get(`/loans/${id}`);
  return data.data;
}

export async function createLoan(loanData) {
  const data = await api.post("/loans", loanData);
  return data.data;
}

export async function updateLoan(id, loanData) {
  const data = await api.put(`/loans/${id}`, loanData);
  return data.data;
}

export async function deleteLoan(id) {
  return api.delete(`/loans/${id}`);
}

export async function approveLoan(id, notes = "") {
  const data = await api.put(`/loans/${id}/approve`, { notes });
  return data.data;
}

export async function rejectLoan(id, reason) {
  const data = await api.put(`/loans/${id}/reject`, { reason });
  return data.data;
}

export async function disburseLoan(id, { disbursedAt, notes } = {}) {
  const data = await api.put(`/loans/${id}/disburse`, { disbursedAt, notes });
  return data.data;
}

export async function recordRepayment(id, { amount, paymentMethod = "cash", reference, notes }) {
  const data = await api.post(`/loans/${id}/repayment`, { amount, paymentMethod, reference, notes });
  return data.data;
}

export async function getLoanRepayments(id, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const data = await api.get(`/loans/${id}/repayments?${params}`);
  return data;
}

export async function getLoanSchedule(id) {
  const data = await api.get(`/loans/${id}/schedule`);
  return data.data;
}

export async function getLoansByMember(memberId) {
  const data = await api.get(`/loans/member/${memberId}`);
  return data.data;
}

export async function getOverdueLoans({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const data = await api.get(`/loans/overdue?${params}`);
  return data;
}
