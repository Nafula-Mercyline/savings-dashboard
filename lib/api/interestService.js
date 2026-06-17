/**
 * lib/api/interestService.js
 * Interest API calls
 */

import api from "./client";

export async function getInterest({ type = "all", period = "all", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ type, period, page, limit });
  const data = await api.get(`/interest?${params}`);
  return data;
}

export async function getInterestSummary(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/interest/summary?${params}`);
  return data.data;
}

export async function calculateSavingsInterest({ period = "monthly", asAt, dryRun = false } = {}) {
  const data = await api.post("/interest/calculate/savings", { period, asAt, dryRun });
  return data.data;
}

export async function calculateLoanInterest({ period = "monthly", asAt, dryRun = false } = {}) {
  const data = await api.post("/interest/calculate/loans", { period, asAt, dryRun });
  return data.data;
}

export async function calculateAllInterest({ period = "monthly", asAt, dryRun = false } = {}) {
  const data = await api.post("/interest/calculate/all", { period, asAt, dryRun });
  return data.data;
}

export async function processInterestPayout({ period, memberIds } = {}) {
  const data = await api.post("/interest/payout", { period, memberIds });
  return data.data;
}

export async function getInterestByMember(memberId, { type = "all", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ type, page, limit });
  const data = await api.get(`/interest/member/${memberId}?${params}`);
  return data;
}
