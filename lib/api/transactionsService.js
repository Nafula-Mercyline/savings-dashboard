/**
 * lib/api/transactionsService.js
 * Transactions API calls
 */

import api from "./client";

export async function getTransactions({ type = "all", status = "all", from, to, page = 1, limit = 20, search = "" } = {}) {
  const params = new URLSearchParams({ type, status, page, limit, search, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/transactions?${params}`);
  return data;
}

export async function getTransactionById(id) {
  const data = await api.get(`/transactions/${id}`);
  return data.data;
}

export async function getRecentTransactions(limit = 10, type = "all") {
  const params = new URLSearchParams({ limit, type });
  const data = await api.get(`/transactions/recent?${params}`);
  return data.data;
}

export async function getTransactionSummary(period = "this_month", from, to) {
  const params = new URLSearchParams({ period, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/transactions/summary?${params}`);
  return data.data;
}

export async function exportTransactions({ from, to, type = "all", format = "csv" } = {}) {
  const params = new URLSearchParams({ from, to, type, format });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/transactions/export?${params}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("savings_token")}`,
      },
    }
  );
  const blob = await response.blob();
  const url  = window.URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `transactions_${from}_${to}.${format}`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function reverseTransaction(id, reason) {
  const data = await api.delete(`/transactions/${id}`, { body: JSON.stringify({ reason }) });
  return data.data;
}

export async function getTransactionsByMember(memberId, { type = "all", from, to, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ type, page, limit, ...(from && { from }), ...(to && { to }) });
  const data = await api.get(`/transactions/member/${memberId}?${params}`);
  return data;
}
