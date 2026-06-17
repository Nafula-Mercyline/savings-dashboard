/**
 * lib/api/savingsService.js
 * Savings API calls
 */

import api from "./client";

export async function getSavings({ page = 1, limit = 20, status = "active", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status, search });
  const data = await api.get(`/savings?${params}`);
  return data;
}

export async function getSavingById(id) {
  const data = await api.get(`/savings/${id}`);
  return data.data;
}

export async function createSaving(savingData) {
  const data = await api.post("/savings", savingData);
  return data.data;
}

export async function updateSaving(id, savingData) {
  const data = await api.put(`/savings/${id}`, savingData);
  return data.data;
}

export async function deleteSaving(id) {
  return api.delete(`/savings/${id}`);
}

export async function deposit(id, { amount, paymentMethod = "cash", reference, notes }) {
  const data = await api.post(`/savings/${id}/deposit`, { amount, paymentMethod, reference, notes });
  return data.data;
}

export async function withdraw(id, { amount, paymentMethod = "cash", reference, notes }) {
  const data = await api.post(`/savings/${id}/withdraw`, { amount, paymentMethod, reference, notes });
  return data.data;
}

export async function getSavingTransactions(id, { type = "all", from, to, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ type, page, limit, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/savings/${id}/transactions?${params}`);
  return data;
}

export async function getSavingStatement(id, from, to) {
  const params = new URLSearchParams({ from, to });
  const data = await api.get(`/savings/${id}/statement?${params}`);
  return data.data;
}

export async function getSavingsByMember(memberId) {
  const data = await api.get(`/savings/member/${memberId}`);
  return data.data;
}
