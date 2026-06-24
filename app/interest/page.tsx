"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  Download,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { collectPendingInterest, exportInterestReport, getInterestDashboard } from "@/lib/api/interestService";

type InterestMetric = { value: number; change: number; up: boolean };
type MonthlyInterest = { month: string; earned: number; paid: number; net: number };
type InterestProduct = {
  name: string;
  rate: number;
  balance: number;
  monthly: number;
  type: "income" | "expense";
  color: string;
};
type PendingInterest = {
  id?: string;
  member: string;
  product: string;
  amount: number;
  dueDate: string;
  status: "Due Soon" | "Overdue" | string;
};

type InterestDashboardData = {
  stats: {
    totalEarned: InterestMetric;
    totalPaid: InterestMetric;
    netIncome: InterestMetric;
    nim: InterestMetric;
  };
  monthly: MonthlyInterest[];
  products: InterestProduct[];
  pending: PendingInterest[];
};

const emptyInterestDashboard: InterestDashboardData = {
  stats: {
    totalEarned: { value: 0, change: 0, up: true },
    totalPaid: { value: 0, change: 0, up: false },
    netIncome: { value: 0, change: 0, up: true },
    nim: { value: 0, change: 0, up: true },
  },
  monthly: [],
  products: [],
  pending: [],
};

const INITIALS_COLORS = ["#c9a84c", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#f97316"];

const fmt = (amount = 0) =>
  amount >= 1_000_000 ? `UGX ${(amount / 1_000_000).toFixed(2)}M` : `UGX ${amount.toLocaleString()}`;

const fmtShort = (amount = 0) => (amount >= 1_000_000 ? `${(amount / 1_000_000).toFixed(1)}M` : amount.toLocaleString());

function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm shadow-xl backdrop-blur-md">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="capitalize">{item.name}:</span>
          <span className="font-semibold text-slate-200">UGX {fmtShort(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function InterestSummaryPage() {
  const queryClient = useQueryClient();
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const year = "2024";

  const { data, error, isFetching, isLoading } = useQuery<InterestDashboardData>({
    queryKey: ["interest-dashboard", year],
    queryFn: () => getInterestDashboard({ year }),
    staleTime: 60_000,
  });

  const dashboard = data ?? emptyInterestDashboard;
  const { stats, monthly, products, pending } = dashboard;

  const incomeProducts = useMemo(() => products.filter((product) => product.type === "income"), [products]);
  const expenseProducts = useMemo(() => products.filter((product) => product.type === "expense"), [products]);
  const totalIncome = incomeProducts.reduce((sum, product) => sum + product.monthly, 0);
  const totalExpense = expenseProducts.reduce((sum, product) => sum + product.monthly, 0);
  const currentMonth = monthly[monthly.length - 1] ?? { month: "N/A", earned: 0, paid: 0, net: 0 };
  const overdueCount = pending.filter((item) => item.status === "Overdue").length;
  const dueSoonCount = pending.filter((item) => item.status === "Due Soon").length;

  const handleExport = () => {
    exportInterestReport({ format: "csv", year });
  };

  const handleCollect = async (item: PendingInterest) => {
    if (!item.id) return;

    try {
      setCollectingId(item.id);
      await collectPendingInterest(item.id);
      await queryClient.invalidateQueries({ queryKey: ["interest-dashboard", year] });
    } finally {
      setCollectingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Loading SACCO interest registers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
            <Percent size={13} />
            <span>SACCO Treasury & Portfolio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Interest Summary Ledger</h1>
          <p className="mt-1 text-sm text-slate-400">
            Fiscal Year {year} · Updated {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
            {isFetching ? " · Synchronizing changes…" : ""}
          </p>
        </div>
        <button 
          onClick={handleExport} 
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 shadow-sm transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Download size={15} /> Export Audit Report
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-400 backdrop-blur-sm">
          Failed to load interest accounting registers: {(error as Error).message}
        </div>
      ) : null}

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Portfolio Interest Earned", value: fmt(stats.totalEarned.value), change: stats.totalEarned.change, up: stats.totalEarned.up, icon: TrendingUp, accent: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/20" },
          { label: "Total Savings Interest Paid", value: fmt(stats.totalPaid.value), change: stats.totalPaid.change, up: stats.totalPaid.up, icon: TrendingDown, accent: "bg-rose-500/10 text-rose-400", border: "border-rose-500/20" },
          { label: "Net Interest Income (NII)", value: fmt(stats.netIncome.value), change: stats.netIncome.change, up: stats.netIncome.up, icon: Calculator, accent: "bg-amber-500/10 text-amber-400", border: "border-amber-500/20" },
          { label: "Net Interest Margin (NIM)", value: `${stats.nim.value}%`, change: stats.nim.change, up: stats.nim.up, icon: Percent, accent: "bg-blue-500/10 text-blue-400", border: "border-blue-500/20" },
        ].map((item) => (
          <Card key={item.label} className={`border ${item.border} bg-slate-900 shadow-sm transition-all hover:border-slate-700`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-2.5 ${item.accent}`}>
                  <item.icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${item.up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {item.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(item.change)}%
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 font-mono text-xl font-bold text-white tracking-tight">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">vs. previous month cycle</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Trends section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-slate-800 bg-slate-900 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-200">SACCO Performance Trajectory — {year}</CardTitle>
                <p className="mt-0.5 text-xs text-slate-400">Monthly breakdown of gross vs net cash flows</p>
              </div>
              <div className="flex gap-4 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />Earned</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-rose-500" />Paid</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-3 rounded-full bg-amber-500" />Net</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  {[
                    { id: "earnedGrad", color: "#10b981" },
                    { id: "paidGrad", color: "#f43f5e" },
                    { id: "netGrad", color: "#f59e0b" },
                  ].map((gradient) => (
                    <linearGradient key={gradient.id} id={gradient.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={gradient.color} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={gradient.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="earned" stroke="#10b981" strokeWidth={2} fill="url(#earnedGrad)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="paid" stroke="#f43f5e" strokeWidth={2} fill="url(#paidGrad)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2} fill="url(#netGrad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breakdown Card */}
        <Card className="border border-slate-800 bg-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200">{currentMonth.month} {year} Closeout</CardTitle>
            <p className="text-xs text-slate-400">Statement period balances</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Gross Interest Earned", value: currentMonth.earned, color: "text-emerald-400", bg: "bg-emerald-500/5 border border-emerald-500/10", icon: TrendingUp },
              { label: "Interest Paid to Depositors", value: currentMonth.paid, color: "text-rose-400", bg: "bg-rose-500/5 border border-rose-500/10", icon: TrendingDown },
              { label: "Retained Treasury Net", value: currentMonth.net, color: "text-amber-400", bg: "bg-amber-500/5 border border-amber-500/10", icon: Calculator },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between rounded-xl p-3 ${item.bg}`}>
                <div className="flex items-center gap-2">
                  <item.icon size={15} className={item.color} />
                  <span className="text-xs font-medium text-slate-300">{item.label}</span>
                </div>
                <span className={`font-mono text-sm font-bold ${item.color}`}>{fmt(item.value)}</span>
              </div>
            ))}

            <div className="border-t border-slate-800 pt-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">6-Month Margin Directional Delta</p>
              <ResponsiveContainer width="100%" height={70}>
                <LineChart data={monthly.slice(-6)} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                  <Line type="monotone" dataKey="net" stroke="#c9a84c" strokeWidth={2} dot={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`UGX ${fmtShort(value)}`, "Net Portfolio Yield"]} contentStyle={{ fontSize: 11, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allocations & Product performance split */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border border-slate-800 bg-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-200">Asset Yield (Loan Income)</CardTitle>
                <p className="mt-0.5 text-xs text-slate-400">Yield across lending books · UGX {fmtShort(totalIncome)} / mo</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">Credit In</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomeProducts.map((product) => {
              const pct = totalIncome > 0 ? Math.round((product.monthly / totalIncome) * 100) : 0;
              return (
                <div key={product.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: product.color }} />
                      <span className="text-sm font-medium text-slate-300">{product.name}</span>
                      <span className="font-mono text-xs text-slate-500">({product.rate}%)</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-200">{fmt(product.monthly)}/mo</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: product.color }} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">Outstanding Book Value: {fmt(product.balance)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-200">Liability Expenses (Dividends & Dividends Due)</CardTitle>
                <p className="mt-0.5 text-xs text-slate-400">Cost of retail capitalization · UGX {fmtShort(totalExpense)} / mo</p>
              </div>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">Capital Out</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseProducts.map((product) => {
              const pct = totalExpense > 0 ? Math.round((product.monthly / totalExpense) * 100) : 0;
              return (
                <div key={product.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: product.color }} />
                      <span className="text-sm font-medium text-slate-300">{product.name}</span>
                      <span className="font-mono text-xs text-slate-500">({product.rate}%)</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-200">{fmt(product.monthly)}/mo</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: product.color }} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">Aggregate Liquidity Base: {fmt(product.balance)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Collections Ledger / Table */}
      <Card className="border border-slate-800 bg-slate-900 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-200">Pending Institutional Interest Inflows</CardTitle>
              <p className="mt-0.5 text-xs text-slate-400">{pending.length} verified clearing entries pending ledger settlement</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400">
                <AlertCircle size={13} /> {overdueCount} Overdue Aging
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                <AlertCircle size={13} /> {dueSoonCount} Nearing Maturity
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-950/40 text-slate-400">
                {["Shareholder / Member", "Loan Asset Class", "Unrealized Interest", "Maturity Target", "Aging Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">No open pending collections found in this ledger period.</td>
                </tr>
              ) : (
                pending.map((item, index) => {
                  const color = INITIALS_COLORS[index % INITIALS_COLORS.length];
                  const isOverdue = item.status === "Overdue";
                  return (
                    <tr key={item.id ?? `${item.member}-${item.product}-${index}`} className="group transition-colors hover:bg-slate-850/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                            {getInitials(item.member)}
                          </div>
                          <span className="font-medium text-slate-200">{item.member}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{item.product}</td>
                      <td className="px-6 py-4"><span className="font-mono font-semibold text-white">{fmt(item.amount)}</span></td>
                      <td className="px-6 py-4"><span className={`text-sm font-mono ${isOverdue ? "font-semibold text-rose-400" : "text-slate-400"}`}>{item.dueDate}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium border ${isOverdue ? "border-rose-900/30 bg-rose-500/5 text-rose-400" : "border-amber-900/30 bg-amber-500/5 text-amber-400"}`}>
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isOverdue ? "bg-rose-500" : "bg-amber-500"}`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            disabled={!item.id || collectingId === item.id}
                            onClick={() => handleCollect(item)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <CheckCircle size={12} /> {collectingId === item.id ? "Posting Entry…" : "Reconcile"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}