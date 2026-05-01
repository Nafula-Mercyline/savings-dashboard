"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line
} from "recharts";
import {
  PiggyBank, CreditCard, Users, TrendingUp, TrendingDown,
  ArrowDownLeft, ArrowUpRight, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle, Clock, Eye, MoreHorizontal,
  Wallet, RefreshCw, Bell, Calendar
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchDashboard = async () => ({
  stats: {
    totalSavings: { value: 284_500_000, change: +12.4, up: true },
    loanPortfolio: { value: 87_500_000, change: +22.1, up: true },
    activeMembers: { value: 412, change: +8, up: true },
    interestIncome: { value: 6_450_000, change: +7.1, up: true },
    overdueLoans: { value: 23, change: +5, up: false },
  },
  monthly: [
    { month: "Jan", savings: 18_200_000, loans: 42_000_000, repayments: 28_000_000, interest: 2_820_000 },
    { month: "Feb", savings: 21_500_000, loans: 38_000_000, repayments: 31_000_000, interest: 3_100_000 },
    { month: "Mar", savings: 19_800_000, loans: 55_000_000, repayments: 34_000_000, interest: 3_340_000 },
    { month: "Apr", savings: 23_400_000, loans: 61_000_000, repayments: 38_000_000, interest: 3_780_000 },
    { month: "May", savings: 26_100_000, loans: 49_000_000, repayments: 42_000_000, interest: 4_020_000 },
    { month: "Jun", savings: 24_700_000, loans: 72_000_000, repayments: 45_000_000, interest: 4_450_000 },
    { month: "Jul", savings: 28_900_000, loans: 68_000_000, repayments: 51_000_000, interest: 4_820_000 },
    { month: "Aug", savings: 31_200_000, loans: 84_000_000, repayments: 58_000_000, interest: 5_100_000 },
    { month: "Sep", savings: 29_600_000, loans: 79_000_000, repayments: 62_000_000, interest: 5_340_000 },
    { month: "Oct", savings: 34_500_000, loans: 91_000_000, repayments: 67_000_000, interest: 5_780_000 },
    { month: "Nov", savings: 38_200_000, loans: 88_000_000, repayments: 71_000_000, interest: 6_020_000 },
    { month: "Dec", savings: 42_600_000, loans: 96_000_000, repayments: 78_000_000, interest: 6_450_000 },
  ],
  recentTransactions: [
    { member: "Alice Nakamura", type: "Deposit", amount: 500_000, time: "09:14 AM", status: "Success", category: "Savings" },
    { member: "Frank Mugisha", type: "Withdrawal", amount: 1_200_000, time: "10:03 AM", status: "Success", category: "Savings" },
    { member: "Brian Okello", type: "Disbursement", amount: 5_000_000, time: "11:30 AM", status: "Success", category: "Loan" },
    { member: "Carol Nambi", type: "Repayment", amount: 95_000, time: "14:22 PM", status: "Success", category: "Loan" },
    { member: "David Ssebunya", type: "Deposit", amount: 200_000, time: "15:00 PM", status: "Pending", category: "Shares" },
    { member: "Eva Tumwine", type: "Withdrawal", amount: 150_000, time: "09:55 AM", status: "Failed", category: "Savings" },
  ],
  loanSummary: [
    { member: "Brian Okello", type: "Business", principal: 20_000_000, outstanding: 18_500_000, rate: "16%", nextDue: "Jan 15", status: "Current" },
    { member: "Frank Mugisha", type: "Business", principal: 50_000_000, outstanding: 45_000_000, rate: "15%", nextDue: "Jan 8", status: "At Risk" },
    { member: "Carol Nambi", type: "Emergency", principal: 1_500_000, outstanding: 900_000, rate: "12%", nextDue: "Dec 31", status: "Overdue" },
    { member: "Eva Tumwine", type: "Education", principal: 8_000_000, outstanding: 7_600_000, rate: "10%", nextDue: "Feb 5", status: "Current" },
  ],
  alerts: [
    { type: "warning", message: "23 loan accounts are overdue — follow-up required", time: "Today" },
    { type: "info", message: "Monthly report for December 2024 is ready to download", time: "Today" },
    { type: "success", message: "UGX 78M in repayments collected in December — target met", time: "Yesterday" },
    { type: "warning", message: "Frank Mugisha's loan is 45 days past due (UGX 45M)", time: "2 days ago" },
  ],
  portfolioHealth: [
    { label: "Current", pct: 58, color: "#3ecf8e" },
    { label: "Watch List", pct: 21, color: "#f59e0b" },
    { label: "Substandard", pct: 12, color: "#fb923c" },
    { label: "Non-Performing", pct: 9, color: "#f56565" },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(1)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtFull = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n.toLocaleString();

const COLORS = ["#c9a84c", "#3ecf8e", "#63b3ed", "#f56565", "#a78bfa", "#fb923c"];

const txTypeConfig: Record<string, { color: string; bg: string; icon: any; sign: string }> = {
  Deposit: { color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowDownLeft, sign: "+" },
  Repayment: { color: "text-emerald-600", bg: "bg-emerald-50", icon: RefreshCw, sign: "+" },
  Withdrawal: { color: "text-red-500", bg: "bg-red-50", icon: ArrowUpRight, sign: "-" },
  Disbursement: { color: "text-amber-600", bg: "bg-amber-50", icon: CreditCard, sign: "-" },
};

const statusStyle: Record<string, string> = {
  Success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border border-amber-200",
  Failed: "bg-red-50 text-red-600 border border-red-200",
};

const loanStatusStyle: Record<string, string> = {
  Current: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "At Risk": "bg-amber-50 text-amber-700 border border-amber-200",
  Overdue: "bg-red-50 text-red-600 border border-red-200",
};

const alertStyle: Record<string, { bar: string; icon: any; iconColor: string; bg: string }> = {
  warning: { bar: "bg-amber-400", icon: AlertTriangle, iconColor: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
  info: { bar: "bg-blue-400", icon: Bell, iconColor: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
  success: { bar: "bg-emerald-400", icon: CheckCircle, iconColor: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-gray-600">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold">UGX {fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  const [period, setPeriod] = useState("2024");

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const { stats, monthly, recentTransactions, loanSummary, alerts, portfolioHealth } = data;

  const lastMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const netPosition = lastMonth.savings + lastMonth.repayments + lastMonth.interest - lastMonth.loans;

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
            <Wallet size={13} />
            <span>Kampala Savings & Credit Co-operative</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Good morning, James ·{" "}
            {new Date().toLocaleDateString("en-UG", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {["2022", "2023", "2024"].map((y) => (
              <button
                key={y}
                onClick={() => setPeriod(y)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === y ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
              >
                {y}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Calendar size={15} /> December 2024
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Savings",
            value: fmt(stats.totalSavings.value),
            change: stats.totalSavings.change,
            up: true,
            icon: PiggyBank,
            accent: "bg-amber-50 text-amber-600",
            border: "border-amber-100",
            sub: `${stats.activeMembers.value} active members`,
            subIcon: Users,
          },
          {
            label: "Loan Portfolio",
            value: fmt(stats.loanPortfolio.value),
            change: stats.loanPortfolio.change,
            up: true,
            icon: CreditCard,
            accent: "bg-blue-50 text-blue-600",
            border: "border-blue-100",
            sub: `${stats.overdueLoans.value} overdue accounts`,
            subIcon: AlertTriangle,
          },
          {
            label: "Interest Income",
            value: fmt(stats.interestIncome.value),
            change: stats.interestIncome.change,
            up: true,
            icon: TrendingUp,
            accent: "bg-emerald-50 text-emerald-600",
            border: "border-emerald-100",
            sub: "vs. last month",
            subIcon: ChevronUp,
          },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${s.accent}`}>
                  <s.icon size={20} />
                </div>
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}
                >
                  {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(s.change)}{s.change < 50 ? "%" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 font-mono leading-tight">{s.value}</p>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <s.subIcon size={12} className="text-gray-400" />
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Financial Summary Banner ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Deposits (Dec)", value: fmt(lastMonth.savings), icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Disbursements", value: fmt(lastMonth.loans), icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-50 border-red-100" },
          { label: "Repayments", value: fmt(lastMonth.repayments), icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Net Position", value: fmt(netPosition), icon: Wallet, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
        ].map((item) => (
          <div key={item.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${item.bg}`}>
            <item.icon size={18} className={`${item.color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              <p className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Area chart */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Monthly Cash Flow</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Savings, disbursements & repayments — {period}
                </p>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded inline-block" />Savings</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded inline-block" />Loans</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" />Repaid</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {[
                    { id: "savGrad", color: "#f59e0b" },
                    { id: "lnGrad", color: "#60a5fa" },
                    { id: "rpGrad", color: "#3ecf8e" },
                  ].map((g) => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="savings" stroke="#f59e0b" strokeWidth={2} fill="url(#savGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="loans" stroke="#60a5fa" strokeWidth={2} fill="url(#lnGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="repayments" stroke="#3ecf8e" strokeWidth={2} fill="url(#rpGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Portfolio health */}
        <div className="flex flex-col gap-4">
          <Card className="border border-gray-100 shadow-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">Portfolio Health</CardTitle>
              <p className="text-xs text-gray-400">Loan classification — December 2024</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {portfolioHealth.map((p) => (
                <div key={p.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-gray-600 font-medium">{p.label}</span>
                    </div>
                    <span className="font-bold text-gray-800">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                </div>
              ))}
              {/* Interest trend mini chart */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Interest Income Trend</p>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={monthly.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Line type="monotone" dataKey="interest" stroke="#c9a84c" strokeWidth={2} dot={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [`UGX ${fmtShort(v)}`, "Interest"]}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Alerts ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">System Alerts</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((a, i) => {
            const cfg = alertStyle[a.type];
            return (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg}`}>
                <div className={`w-1 self-stretch rounded-full ${cfg.bar} flex-shrink-0`} />
                <cfg.icon size={15} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom tables ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Recent Transactions */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800">Recent Transactions</CardTitle>
              <a href="/transactions" className="text-xs font-medium text-amber-600 hover:underline">View all →</a>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Type", "Amount", "Time", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2.5 px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map((t, i) => {
                  const initials = t.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                  const color = COLORS[i % COLORS.length];
                  const tc = txTypeConfig[t.type] ?? txTypeConfig["Deposit"];
                  const TypeIcon = tc.icon;
                  return (
                    <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-gray-800 text-xs">{t.member}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`flex items-center gap-1 text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
                          <TypeIcon size={11} /> {t.type}
                        </span>
                      </td>
                      <td className={`py-3 px-5 font-mono text-xs font-bold ${tc.color}`}>
                        {tc.sign}{fmtFull(t.amount)}
                      </td>
                      <td className="py-3 px-5 text-xs text-gray-400">{t.time}</td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800">Active Loans</CardTitle>
              <a href="/loans" className="text-xs font-medium text-amber-600 hover:underline">View all →</a>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Type", "Outstanding", "Rate", "Next Due", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2.5 px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loanSummary.map((l, i) => {
                  const initials = l.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                  const color = COLORS[i % COLORS.length];
                  const repaidPct = Math.round(((l.principal - l.outstanding) / l.principal) * 100);
                  return (
                    <tr key={i} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-gray-800 text-xs">{l.member}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs text-gray-500">{l.type}</td>
                      <td className="py-3 px-5">
                        <div>
                          <span className="font-mono text-xs font-bold text-gray-900">{fmt(l.outstanding)}</span>
                          <div className="mt-1 h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${repaidPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs font-semibold text-amber-600">{l.rate}</td>
                      <td className="py-3 px-5 text-xs text-gray-400">{l.nextDue}</td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${loanStatusStyle[l.status]}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
