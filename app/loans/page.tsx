"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import {
  CreditCard, AlertTriangle, CheckCircle, Clock,
  Plus, Download, Eye, MoreHorizontal, ChevronUp,
  ChevronDown, TrendingUp, TrendingDown
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchLoans = async () => ({
  stats: {
    totalPortfolio:  { value: 874_500_000, change: +22.1, up: true },
    activeLoans:     { value: 186,         change: +14,   up: true },
    overdueAccounts: { value: 23,          change: +5,    up: false },
    parRatio:        { value: 9.2,         change: +1.4,  up: false },
  },
  monthly: [
    { month: "Jan", disbursed: 42_000_000, repaid: 28_000_000 },
    { month: "Feb", disbursed: 38_000_000, repaid: 31_000_000 },
    { month: "Mar", disbursed: 55_000_000, repaid: 34_000_000 },
    { month: "Apr", disbursed: 61_000_000, repaid: 38_000_000 },
    { month: "May", disbursed: 49_000_000, repaid: 42_000_000 },
    { month: "Jun", disbursed: 72_000_000, repaid: 45_000_000 },
    { month: "Jul", disbursed: 68_000_000, repaid: 51_000_000 },
    { month: "Aug", disbursed: 84_000_000, repaid: 58_000_000 },
    { month: "Sep", disbursed: 79_000_000, repaid: 62_000_000 },
    { month: "Oct", disbursed: 91_000_000, repaid: 67_000_000 },
    { month: "Nov", disbursed: 88_000_000, repaid: 71_000_000 },
    { month: "Dec", disbursed: 96_000_000, repaid: 78_000_000 },
  ],
  riskBuckets: [
    { label: "Current (0 days)",    value: 58, color: "#3ecf8e" },
    { label: "Watch (1–30 days)",   value: 21, color: "#f59e0b" },
    { label: "Substandard (31–90)", value: 12, color: "#fb923c" },
    { label: "Doubtful (91–180)",   value: 6,  color: "#f56565" },
    { label: "Loss (180+ days)",    value: 3,  color: "#9ca3af" },
  ],
  loanTypes: [
    { type: "Personal Loans",  count: 82,  rate: "18%", color: "#c9a84c" },
    { type: "Business Loans",  count: 54,  rate: "15.5%", color: "#3ecf8e" },
    { type: "Emergency Loans", count: 28,  rate: "12%", color: "#63b3ed" },
    { type: "Education Loans", count: 22,  rate: "10%", color: "#a78bfa" },
  ],
  loans: [
    { id: "LN-2024-001", member: "Alice Nakamura",  type: "Personal",   principal: 5_000_000,  outstanding: 3_200_000, rate: "18%", term: "24 mo", nextDue: "2025-01-20", daysOverdue: 0,  status: "Current" },
    { id: "LN-2024-002", member: "Brian Okello",    type: "Business",   principal: 20_000_000, outstanding: 18_500_000, rate: "16%", term: "36 mo", nextDue: "2025-01-15", daysOverdue: 0,  status: "Current" },
    { id: "LN-2024-003", member: "Carol Nambi",     type: "Emergency",  principal: 1_500_000,  outstanding: 900_000,   rate: "12%", term: "12 mo", nextDue: "2024-12-31", daysOverdue: 22, status: "Overdue" },
    { id: "LN-2023-044", member: "David Ssebunya",  type: "Personal",   principal: 3_000_000,  outstanding: 0,          rate: "18%", term: "12 mo", nextDue: "—",          daysOverdue: 0,  status: "Paid Off" },
    { id: "LN-2024-010", member: "Eva Tumwine",     type: "Education",  principal: 8_000_000,  outstanding: 7_600_000, rate: "10%", term: "48 mo", nextDue: "2025-02-05", daysOverdue: 0,  status: "Current" },
    { id: "LN-2024-015", member: "Frank Mugisha",   type: "Business",   principal: 50_000_000, outstanding: 45_000_000, rate: "15%", term: "60 mo", nextDue: "2025-01-08", daysOverdue: 45, status: "At Risk" },
    { id: "LN-2024-018", member: "Grace Atim",      type: "Personal",   principal: 2_500_000,  outstanding: 1_800_000, rate: "18%", term: "18 mo", nextDue: "2025-01-25", daysOverdue: 0,  status: "Current" },
    { id: "LN-2024-021", member: "Henry Byamukama", type: "Emergency",  principal: 800_000,    outstanding: 800_000,   rate: "12%", term: "6 mo",  nextDue: "2025-01-10", daysOverdue: 12, status: "Overdue" },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n.toLocaleString();

const INITIALS_COLORS = ["#c9a84c","#3ecf8e","#63b3ed","#f56565","#a78bfa","#fb923c","#34d399","#f472b6"];

const statusConfig: Record<string, { pill: string; dot: string }> = {
  Current:   { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  Overdue:   { pill: "bg-red-50 text-red-600 border border-red-200",             dot: "bg-red-500" },
  "At Risk": { pill: "bg-amber-50 text-amber-700 border border-amber-200",       dot: "bg-amber-500" },
  "Paid Off":{ pill: "bg-blue-50 text-blue-600 border border-blue-200",          dot: "bg-blue-400" },
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
export default function LoanPage() {
  const { data, isLoading } = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading loan data…</p>
        </div>
      </div>
    );
  }

  const { stats, monthly, riskBuckets, loanTypes, loans } = data;

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
            <CreditCard size={13} />
            <span>Loan Management</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loan Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fiscal Year 2024 · Updated {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={15} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
            <Plus size={15} /> New Loan
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Portfolio",    value: fmt(stats.totalPortfolio.value),          change: stats.totalPortfolio.change,  up: stats.totalPortfolio.up,  icon: CreditCard,     accent: "bg-amber-50 text-amber-600",   border: "border-amber-100" },
          { label: "Active Loans",       value: stats.activeLoans.value.toLocaleString(), change: stats.activeLoans.change,     up: stats.activeLoans.up,     icon: CheckCircle,    accent: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
          { label: "Overdue Accounts",   value: stats.overdueAccounts.value.toString(),   change: stats.overdueAccounts.change, up: stats.overdueAccounts.up, icon: AlertTriangle,  accent: "bg-red-50 text-red-500",       border: "border-red-100" },
          { label: "PAR Ratio (30 days)",value: `${stats.parRatio.value}%`,               change: stats.parRatio.change,        up: stats.parRatio.up,        icon: Clock,          accent: "bg-violet-50 text-violet-600", border: "border-violet-100" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                  <s.icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                  s.up && s.label !== "Overdue Accounts" && s.label !== "PAR Ratio (30 days)"
                    ? "bg-emerald-50 text-emerald-600"
                    : !s.up && (s.label === "Overdue Accounts" || s.label === "PAR Ratio (30 days)")
                    ? "bg-red-50 text-red-500"
                    : s.up ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}>
                  {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(s.change)}{s.label.includes("Ratio") || s.label.includes("PAR") ? "%" : s.change < 100 ? "%" : ""}
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

        {/* Disbursement vs Repayment Bar Chart */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Disbursements vs Repayments</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Monthly comparison — January to December 2024</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-amber-400 inline-block rounded" />Disbursed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-emerald-400 inline-block rounded" />Repaid</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="disbursed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="repaid"    fill="#3ecf8e" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Portfolio Risk</CardTitle>
            <p className="text-xs text-gray-400">Loan classification by arrears</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-2">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={riskBuckets} dataKey="value" cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                    {riskBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5">
              {riskBuckets.map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
                    <span className="text-xs text-gray-600">{b.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{b.value}%</span>
                </div>
              ))}
            </div>

            {/* Alert */}
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={12} /> 23 accounts need follow-up
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Loan Type Summary ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loanTypes.map((l) => (
          <Card key={l.type} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: l.color + "22", color: l.color }}>
                  {l.rate} p.a.
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-700">{l.type}</p>
              <p className="text-2xl font-bold text-gray-900 font-mono mt-1">{l.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">active loans</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Loan Register Table ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Loan Register</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">{loans.length} loans shown · sorted by outstanding balance</p>
            </div>
            <div className="flex gap-2">
              {["All","Current","Overdue","At Risk","Paid Off"].map((f) => (
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
                {["Member","Loan ID","Type","Principal","Outstanding","Rate","Term","Next Due","Status",""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-4 first:pl-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loans.map((loan, i) => {
                const initials = loan.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const color = INITIALS_COLORS[i % INITIALS_COLORS.length];
                const cfg = statusConfig[loan.status] ?? statusConfig["Current"];
                const repaidPct = loan.principal > 0
                  ? Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100)
                  : 100;
                return (
                  <tr key={loan.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}>
                          {initials}
                        </div>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{loan.member}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{loan.id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{loan.type}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">{fmt(loan.principal)}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-semibold text-gray-900 whitespace-nowrap">{loan.outstanding === 0 ? "—" : fmt(loan.outstanding)}</span>
                        {loan.principal > 0 && (
                          <div className="mt-1 h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${repaidPct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-amber-600 font-semibold">{loan.rate}</td>
                    <td className="py-3.5 px-4 text-gray-500">{loan.term}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs whitespace-nowrap ${loan.daysOverdue > 0 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        {loan.nextDue}
                        {loan.daysOverdue > 0 && <span className="ml-1 text-red-400">({loan.daysOverdue}d late)</span>}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.pill}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 pr-6">
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
            <p className="text-xs text-gray-400">Showing 1–8 of 186 loans</p>
            <div className="flex gap-1">
              {[1, 2, 3, "…", 24].map((p, i) => (
                <button key={i} className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                  p === 1 ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}>{p}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}