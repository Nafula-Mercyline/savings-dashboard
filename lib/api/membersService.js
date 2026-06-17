/**
 * lib/api/membersService.js
 * Members API calls
 */

import api from "./client";

export async function getMembers({ page = 1, limit = 20, status = "active", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status, search });
  const data = await api.get(`/members?${params}`);
  return data;
}

export async function getMemberById(id) {
  const data = await api.get(`/members/${id}`);
  return data.data;
}

export async function getMemberProfile(id) {
  const data = await api.get(`/members/${id}/profile`);
  return data.data;
}

export async function createMember(memberData) {
  const data = await api.post("/members", memberData);
  return data.data;
}

export async function updateMember(id, memberData) {
  const data = await api.put(`/members/${id}`, memberData);
  return data.data;
}

export async function deleteMember(id) {
  return api.delete(`/members/${id}`);
}

export async function activateMember(id, notes = "") {
  const data = await api.put(`/members/${id}/activate`, { notes });
  return data.data;
}

export async function deactivateMember(id, reason) {
  const data = await api.put(`/members/${id}/deactivate`, { reason });
  return data.data;
}

export async function searchMembers(q, status = "all", limit = 10) {
  const params = new URLSearchParams({ q, status, limit });
  const data = await api.get(`/members/search?${params}`);
  return data.data;
}

export async function getMemberStats() {
  const data = await api.get("/members/stats");
  return data.data;
}

export async function getMemberSavings(id) {
  const data = await api.get(`/members/${id}/savings`);
  return data.data;
}

export async function getMemberLoans(id, status = "all") {
  const data = await api.get(`/members/${id}/loans?status=${status}`);
  return data.data;
}

export async function getMemberTransactions(id, { type = "all", from, to, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ type, page, limit, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/members/${id}/transactions?${params}`);
  return data;
}

export async function getMemberStatement(id, from, to) {
  const params = new URLSearchParams({ from, to });
  const data = await api.get(`/members/${id}/statement?${params}`);
  return data.data;
}
