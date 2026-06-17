/**
 * lib/api/dashboardService.js
 * Dashboard API calls
 */

import api from "./client";

// GET /api/dashboard/summary
export async function getDashboardSummary() {
  const data = await api.get("/dashboard/summary");
  return data.data;
}

// GET /api/dashboard/savings?period=monthly&year=2026
export async function getSavingsTrend(period = "monthly", year = new Date().getFullYear()) {
  const data = await api.get(`/dashboard/savings?period=${period}&year=${year}`);
  return data.data;
}

// GET /api/dashboard/loans
export async function getLoanOverview() {
  const data = await api.get("/dashboard/loans");
  return data.data;
}

// GET /api/dashboard/interest?period=this_month
export async function getInterestSummary(period = "this_month") {
  const data = await api.get(`/dashboard/interest?period=${period}`);
  return data.data;
}

// GET /api/dashboard/members
export async function getMemberActivity() {
  const data = await api.get("/dashboard/members");
  return data.data;
}

// GET /api/dashboard/transactions?limit=10&type=all
export async function getRecentTransactions(limit = 10, type = "all") {
  const data = await api.get(`/dashboard/transactions?limit=${limit}&type=${type}`);
  return data.data;
}
