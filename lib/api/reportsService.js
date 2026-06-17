/**
 * lib/api/reportsService.js
 * Reports API calls
 */

import api from "./client";

export async function getFinancialReport(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/reports/financial?${params}`);
  return data.data;
}

export async function getSavingsReport(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/reports/savings?${params}`);
  return data.data;
}

export async function getLoansReport(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/reports/loans?${params}`);
  return data.data;
}

export async function getMembersReport(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/reports/members?${params}`);
  return data.data;
}

export async function getArrearsReport(agingBucket = "all") {
  const data = await api.get(`/reports/arrears?agingBucket=${agingBucket}`);
  return data.data;
}

export async function getBalanceSheet(asAt) {
  const params = asAt ? new URLSearchParams({ asAt }) : "";
  const data = await api.get(`/reports/balance-sheet?${params}`);
  return data.data;
}

export async function getCashFlowReport(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/reports/cashflow?${params}`);
  return data.data;
}

export async function exportReport({ report, format = "csv", period = "this_month", from, to } = {}) {
  const params = new URLSearchParams({ report, format, period, ...(from && { from }), ...(to && { to }) });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/reports/export?${params}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("savings_token")}` } }
  );
  const blob = await response.blob();
  const url  = window.URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${report}_report.${format}`;
  a.click();
  window.URL.revokeObjectURL(url);
}


/**
 * lib/api/settingsService.js
 * Settings API calls
 */

export async function getAllSettings(group = "all") {
  const data = await api.get(`/settings?group=${group}`);
  return data.data;
}

export async function getPublicSettings() {
  const data = await api.get("/settings/public");
  return data.data;
}

export async function getFinancialSettings() {
  const data = await api.get("/settings/financial");
  return data.data;
}

export async function updateSettings(updates) {
  const data = await api.put("/settings", updates);
  return data.data;
}

export async function resetSetting(key) {
  const data = await api.put(`/settings/${key}/reset`, {});
  return data.data;
}
