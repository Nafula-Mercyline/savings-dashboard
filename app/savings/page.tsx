"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import {
  PiggyBank, TrendingUp, Users, ArrowUpRight,
  ArrowDownRight, Wallet, Calendar, Download,
  Plus, Eye, MoreHorizontal, ChevronUp, ChevronDown
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchSavings = async () => ({
  stats: {
    totalDeposits: { value: 284_500_000, change: +12.4, up: true },
    activeAccounts: { value: 412, change: +8, up: true },
    avgBalance: { value: 690_534, change: -2.1, up: false },
    interestPaid: { value: 4_830_000, change: +7.0, up: true },
  },
  monthly: [
    { month: "Jan", deposits: 18_200_000, withdrawals: 6_400_000, interest: 910_000 },
    { month: "Feb", deposits: 21_500_000, withdrawals: 7_100_000, interest: 1_075_000 },
    { month: "Mar", deposits: 19_800_000, withdrawals: 5_900_000, interest: 990_000 },
    { month: "Apr", deposits: 23_400_000, withdrawals: 8_200_000, interest: 1_170_000 },
    { month: "May", deposits: 26_100_000, withdrawals: 9_300_000, interest: 1_305_000 },
    { month: "Jun", deposits: 24_700_000, withdrawals: 7_800_000, interest: 1_235_000 },
    { month: "Jul", deposits: 28_900_000, withdrawals: 10_100_000, interest: 1_445_000 },
    { month: "Aug", deposits: 31_200_000, withdrawals: 11_400_000, interest: 1_560_000 },
    { month: "Sep", deposits: 29_600_000, withdrawals: 9_700_000, interest: 1_480_000 },
    { month: "Oct", deposits: 34_500_000, withdrawals: 12_300_000, interest: 1_725_000 },
    { month: "Nov", deposits: 38_200_000, withdrawals: 13_100_000, interest: 1_910_000 },
    { month: "Dec", deposits: 42_600_000, withdrawals: 14_800_000, interest: 2_130_000 },
  ],
  accountTypes: [
    { type: "Regular Savings", count: 210, balance: 58_200_000, rate: "5.0%", color: "#c9a84c" },
    { type: "Fixed Deposit", count: 98, balance: 142_000_000, rate: "9.0%", color: "#3ecf8e" },
    { type: "Holiday Savings", count: 72, balance: 24_800_000, rate: "4.0%", color: "#63b3ed" },
    { type: "Junior Savings", count: 32, balance: 8_500_000, rate: "3.0%", color: "#f56565" },
  ],
  recentAccounts: [
    { id: "SAV-001", name: "Alice Nakamura", type: "Fixed Deposit", balance: 4_250_000, status: "Active", date: "2023-01-15" },
    { id: "SAV-002", name: "Brian Okello", type: "Regular Savings", balance: 12_000_000, status: "Active", date: "2023-03-08" },
    { id: "SAV-003", name: "Carol Nambi", type: "Holiday Savings", balance: 890_000, status: "Active", date: "2023-06-20" },
    { id: "SAV-004", name: "David Ssebunya", type: "Regular Savings", balance: 2_100_000, status: "Dormant", date: "2023-07-11" },
    { id: "SAV-005", name: "Eva Tumwine", type: "Junior Savings", balance: 560_000, status: "Active", date: "2024-01-03" },
    { id: "SAV-006", name: "Frank Mugisha", type: "Fixed Deposit", balance: 30_000_000, status: "Matured", date: "2022-11-22" },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Dormant: "bg-amber-50 text-amber-700 border border-amber-200",
  Matured: "bg-blue-50 text-blue-700 border border-blue-200",
};

const INITIALS_COLORS = [
  "#c9a84c", "#3ecf8e", "#63b3ed", "#f56565", "#a78bfa", "#fb923c"
];

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
export default function SavingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["savings"], queryFn: fetchSavings });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading savings data…</p>
        </div>
      </div>
    );
  }

  const { stats, monthly, accountTypes, recentAccounts } = data!;
  const totalBalance = accountTypes.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
            <PiggyBank size={13} />
            <span>Savings Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Savings Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fiscal Year 2024 · Updated {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={15} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
            <Plus size={15} /> New Account
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total Deposits",
            value: fmt(stats.totalDeposits.value),
            change: stats.totalDeposits.change,
            up: stats.totalDeposits.up,
            icon: Wallet,
            accent: "bg-amber-50 text-amber-600",
            border: "border-amber-100",
          },
          {
            label: "Active Accounts",
            value: stats.activeAccounts.value.toLocaleString(),
            change: stats.activeAccounts.change,
            up: stats.activeAccounts.up,
            icon: Users,
            accent: "bg-emerald-50 text-emerald-600",
            border: "border-emerald-100",
          },
          {
            label: "Average Balance",
            value: fmt(stats.avgBalance.value),
            change: stats.avgBalance.change,
            up: stats.avgBalance.up,
            icon: TrendingUp,
            accent: "bg-blue-50 text-blue-600",
            border: "border-blue-100",
          },
          {
            label: "Interest Paid (Dec)",
            value: fmt(stats.interestPaid.value),
            change: stats.interestPaid.change,
            up: stats.interestPaid.up,
            icon: PiggyBank,
            accent: "bg-violet-50 text-violet-600",
            border: "border-violet-100",
          },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                  <s.icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                  }`}>
                  {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(s.change)}{typeof s.change === "number" && s.change < 10 && !Number.isInteger(s.change) ? "" : "%"}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1 font-mono">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">vs. previous month</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Area chart — deposits trend */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Deposit & Withdrawal Trend</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Monthly cash flows — January to December 2024</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />Deposits</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />Withdrawals</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withdrawGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="deposits" stroke="#f59e0b" strokeWidth={2} fill="url(#depositGrad)" dot={false} activeDot={{ r: 5, fill: "#f59e0b" }} />
                <Area type="monotone" dataKey="withdrawals" stroke="#60a5fa" strokeWidth={2} fill="url(#withdrawGrad)" dot={false} activeDot={{ r: 5, fill: "#60a5fa" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account type breakdown */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Portfolio Breakdown</CardTitle>
            <p className="text-xs text-gray-400">By account type · UGX {fmtShort(totalBalance)} total</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountTypes.map((a) => {
              const pct = Math.round((a.balance / totalBalance) * 100);
              return (
                <div key={a.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-sm font-medium text-gray-700">{a.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-800">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: a.color }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{a.count} accounts · {a.rate} p.a.</span>
                    <span className="text-xs font-mono text-gray-500">{fmt(a.balance)}</span>
                  </div>
                </div>
              );
            })}

            {/* Interest bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Monthly Interest (Dec)</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={monthly.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="interest" fill="#c9a84c" radius={[3, 3, 0, 0]} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [`UGX ${fmtShort(v)}`, "Interest"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Accounts Table ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Savings Accounts Register</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">{recentAccounts.length} accounts shown · sorted by balance</p>
            </div>
            <div className="flex gap-2">
              {["All", "Active", "Dormant", "Matured"].map((f) => (
                <button key={f} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Member", "Account ID", "Type", "Balance", "Opened", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-6 first:pl-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentAccounts.map((acc, i) => {
                const initials = acc.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const color = INITIALS_COLORS[i % INITIALS_COLORS.length];
                return (
                  <tr key={acc.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}>
                          {initials}
                        </div>
                        <span className="font-medium text-gray-800">{acc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{acc.id}</span>
                    </td>
                    <td className="py-3.5 px-6 text-gray-600">{acc.type}</td>
                    <td className="py-3.5 px-6">
                      <span className="font-mono font-semibold text-gray-900">{fmt(acc.balance)}</span>
                    </td>
                    <td className="py-3.5 px-6 text-gray-400 text-xs">{acc.date}</td>
                    <td className="py-3.5 px-6">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[acc.status]}`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 pt-4 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400">Showing 1–6 of 412 accounts</p>
            <div className="flex gap-1">
              {[1, 2, 3, "…", 69].map((p, i) => (
                <button key={i} className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${p === 1 ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}