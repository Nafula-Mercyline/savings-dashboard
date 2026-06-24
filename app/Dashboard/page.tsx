"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  PiggyBank,
  CreditCard,
  Users,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Wallet,
  Bell,
  Calendar,
  Building2,
} from "lucide-react";
import { getDashboardSummary } from "@/lib/api/dashboardService";

type Metric = { value: number; change: number; up: boolean };
type MonthlyPoint = { month: string; savings: number; loans: number; repayments: number; interest: number };
type Transaction = { member: string; type: string; amount: number; time: string; status: string; category?: string };
type LoanSummary = { member: string; type: string; principal: number; outstanding: number; rate: string; nextDue: string; status: string };
type Alert = { type: "warning" | "info" | "success"; message: string; time: string };
type PortfolioHealth = { label: string; pct: number; color: string };

type DashboardData = {
  stats: {
    totalSavings: Metric;
    loanPortfolio: Metric;
    activeMembers: Metric;
    interestIncome: Metric;
    overdueLoans: Metric;
  };
  monthly: MonthlyPoint[];
  recentTransactions: Transaction[];
  loanSummary: LoanSummary[];
  alerts: Alert[];
  portfolioHealth: PortfolioHealth[];
};

const emptyDashboard: DashboardData = {
  stats: {
    totalSavings: { value: 0, change: 0, up: true },
    loanPortfolio: { value: 0, change: 0, up: true },
    activeMembers: { value: 0, change: 0, up: true },
    interestIncome: { value: 0, change: 0, up: true },
    overdueLoans: { value: 0, change: 0, up: true },
  },
  monthly: [],
  recentTransactions: [],
  loanSummary: [],
  alerts: [],
  portfolioHealth: [],
};

const fmt = (n = 0) =>
  n >= 1_000_000 ? `UGX ${(n / 1_000_000).toFixed(1)}M` : `UGX ${n.toLocaleString()}`;

const fmtFull = (n = 0) =>
  n >= 1_000_000 ? `UGX ${(n / 1_000_000).toFixed(2)}M` : `UGX ${n.toLocaleString()}`;

const fmtShort = (n = 0) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n.toLocaleString());

const AVATAR_COLORS = ["#d4af37", "#38bdf8", "#34d399", "#f87171", "#a78bfa", "#fb923c"];

const txTypeConfig: Record<string, { color: string; bg: string; icon: any; sign: string }> = {
  Deposit: { color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20", icon: ArrowDownLeft, sign: "+" },
  Repayment: { color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20", icon: ArrowDownLeft, sign: "+" },
  Withdrawal: { color: "text-rose-400", bg: "bg-rose-500/10 border border-rose-500/20", icon: ArrowUpRight, sign: "-" },
  Disbursement: { color: "text-amber-400", bg: "bg-amber-500/10 border border-amber-500/20", icon: CreditCard, sign: "-" },
};

const statusStyle: Record<string, string> = {
  Success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Failed: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

const loanStatusStyle: Record<string, string> = {
  Current: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "At Risk": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Overdue: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

const alertStyle = {
  warning: { bar: "bg-amber-500", icon: AlertTriangle, iconColor: "text-amber-400", bg: "bg-slate-900 border-amber-500/20 text-slate-300" },
  info: { bar: "bg-sky-500", icon: Bell, iconColor: "text-sky-400", bg: "bg-slate-900 border-sky-500/20 text-slate-300" },
  success: { bar: "bg-emerald-500", icon: CheckCircle, iconColor: "text-emerald-400", bg: "bg-slate-900 border-emerald-500/20 text-slate-300" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md p-4 text-xs shadow-2xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-400 mt-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-mono font-semibold text-slate-200">UGX {fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [period, setPeriod] = useState("2024");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isFetching, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard", period],
    queryFn: () => getDashboardSummary({ period }),
    staleTime: 60_000,
  });

  const dashboard = data ?? emptyDashboard;
  const { stats, monthly, recentTransactions, loanSummary, alerts, portfolioHealth } = dashboard;

  const lastMonth = monthly[monthly.length - 1] ?? { month: "N/A", savings: 0, loans: 0, repayments: 0, interest: 0 };
  const netPosition = lastMonth.savings + lastMonth.repayments + lastMonth.interest - lastMonth.loans;

  const kpis = useMemo(
    () => [
      {
        label: "Total Savings",
        value: fmt(stats.totalSavings.value),
        change: stats.totalSavings.change,
        up: stats.totalSavings.up,
        icon: PiggyBank,
        accent: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        sub: `${stats.activeMembers.value} active members`,
        subIcon: Users,
      },
      {
        label: "Loan Portfolio",
        value: fmt(stats.loanPortfolio.value),
        change: stats.loanPortfolio.change,
        up: stats.loanPortfolio.up,
        icon: CreditCard,
        accent: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
        sub: `${stats.overdueLoans.value} overdue accounts`,
        subIcon: AlertTriangle,
      },
      {
        label: "Interest Income",
        value: fmt(stats.interestIncome.value),
        change: stats.interestIncome.change,
        up: stats.interestIncome.up,
        icon: TrendingUp,
        accent: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        sub: "vs. last month",
        subIcon: ChevronUp,
      },
    ],
    [stats]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Loading Ledger Engine…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8 relative overflow-hidden">
      {/* Premium ambient backdrop glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Corporate Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6 relative z-10">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">
            <Building2 size={12} />
            <span>Kampala Savings & Credit Co-operative</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-sans">Executive Core Console</h1>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            System Identity: James · Operational Date:{" "}
            {mounted && new Date().toLocaleDateString("en-UG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Time Window Framework Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-inner">
            {["2022", "2023", "2024"].map((year) => (
              <button
                key={year}
                onClick={() => setPeriod(year)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                  period === year ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 shadow-sm transition-colors hover:bg-slate-800 border-slate-700/60"
          >
            <Calendar size={14} className="text-amber-500" /> {isFetching ? "Syncing…" : `${lastMonth.month} ${period}`}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-400">
          Sync Execution Fault: {(error as Error).message}
        </div>
      ) : null}

      {/* Main KPI Matrix */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 relative z-10">
        {kpis.map((item) => (
          <Card key={item.label} className="border-slate-900 bg-slate-900/40 backdrop-blur-sm shadow-xl transition-all duration-300 hover:border-slate-800">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className={`rounded-xl p-3 ${item.accent}`}>
                  <item.icon size={20} />
                </div>
                <span
                  className={`flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    item.up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {item.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(item.change)}%
                </span>
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="font-mono text-2xl font-bold tracking-tight text-white">{item.value}</p>
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-900 pt-3">
                <item.subIcon size={12} className="text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Liquidity Overview Ribbon */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 relative z-10">
        {[
          { label: `Deposits (${lastMonth.month})`, value: fmt(lastMonth.savings), icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
          { label: "Disbursements", value: fmt(lastMonth.loans), icon: ArrowUpRight, color: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/10" },
          { label: "Repayments", value: fmt(lastMonth.repayments), icon: ArrowDownLeft, color: "text-sky-400", bg: "bg-sky-500/5 border-sky-500/10" },
          { label: "Net Position", value: fmt(netPosition), icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/10" },
        ].map((item) => (
          <div key={item.label} className={`flex items-center gap-3.5 rounded-xl border p-4 ${item.bg}`}>
            <div className="p-2 rounded-lg bg-slate-950/60">
               <item.icon size={16} className={`${item.color} shrink-0`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className={`font-mono text-sm font-bold tracking-tight ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cash Flow Visualizations */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 relative z-10">
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-sm shadow-xl xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Monthly Cash Flow Framework</CardTitle>
            <p className="text-xs text-slate-500">Savings liabilities, credit originations & asset recovery vectors — {period}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#64748b", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="savings" name="savings" stroke="#f59e0b" strokeWidth={2} fill="url(#savGrad)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="loans" name="loans" stroke="#38bdf8" strokeWidth={2} fill="url(#lnGrad)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="repayments" name="repayments" stroke="#34d399" strokeWidth={2} fill="url(#rpGrad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Portfolio Stratification Breakdown */}
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Portfolio Security Strata</CardTitle>
            <p className="text-xs text-slate-500">Regulatory asset status metric classification — {lastMonth.month} {period}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolioHealth.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    <span className="font-medium text-slate-400">{item.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-200">{item.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-950 shadow-inner">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
            
            <div className="border-t border-slate-900 pt-4 mt-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Yield Curve Velocity</p>
              <ResponsiveContainer width="100%" height={65}>
                <LineChart data={monthly.slice(-6)} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                  <Line type="monotone" dataKey="interest" stroke="#d4af37" strokeWidth={2} dot={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`UGX ${fmtShort(value)}`, "Yield"]} contentStyle={{ fontSize: 11, background: "#020617", borderColor: "#1e293b", borderRadius: 8, color: "#cbd5e1" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Notification Triggers */}
      {alerts.length > 0 && (
        <div className="relative z-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Real-Time Exception Monitors</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map((alert, index) => {
              const cfg = alertStyle[alert.type];
              return (
                <div key={`${alert.message}-${index}`} className={`flex items-start gap-3.5 rounded-xl border bg-slate-900/50 backdrop-blur-sm p-4 ${cfg.bg}`}>
                  <div className={`self-stretch w-1 shrink-0 rounded-full ${cfg.bar}`} />
                  <cfg.icon size={15} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{alert.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Ledgers Table Rows */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 relative z-10">
        
        {/* Recent Transactions Matrix */}
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-sm shadow-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-900/60 bg-slate-900/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Transaction Registry Journal</CardTitle>
              <a href="/transactions" className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors">View All Registries →</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-2 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900/60 bg-slate-950/20">
                  {["Member Entity", "Classification", "Allocation Value", "Timestamp", "State"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {recentTransactions.map((transaction, index) => {
                  const initials = transaction.member.split(" ").map((name) => name[0]).join("").slice(0, 2);
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const txConfig = txTypeConfig[transaction.type] ?? txTypeConfig.Deposit;
                  const TypeIcon = txConfig.icon;

                  return (
                    <tr key={`${transaction.member}-${transaction.time}-${index}`} className="transition-colors hover:bg-slate-900/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black" style={{ background: `${avatarColor}15`, color: avatarColor, border: `1px solid ${avatarColor}30` }}>{initials}</div>
                          <span className="text-xs font-semibold text-slate-200">{transaction.member}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${txConfig.bg} ${txConfig.color}`}>
                          <TypeIcon size={10} /> {transaction.type}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 font-mono text-xs font-bold ${txConfig.color}`}>{txConfig.sign}{fmtFull(transaction.amount)}</td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500">{transaction.time}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[transaction.status] ?? statusStyle.Pending}`}>{transaction.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Credit Origination Matrix */}
        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-sm shadow-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-900/60 bg-slate-900/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Active Risk Allocations</CardTitle>
              <a href="/loans" className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors">View All Asset Exposure →</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-2 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900/60 bg-slate-950/20">
                  {["Debtor", "Instrument", "Outstanding Asset", "Yield", "Maturity Date", "Stratum"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {loanSummary.map((loan, index) => {
                  const initials = loan.member.split(" ").map((name) => name[0]).join("").slice(0, 2);
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const repaidPct = loan.principal > 0 ? Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100) : 0;

                  return (
                    <tr key={`${loan.member}-${loan.nextDue}-${index}`} className="transition-colors hover:bg-slate-900/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black" style={{ background: `${avatarColor}15`, color: avatarColor, border: `1px solid ${avatarColor}30` }}>{initials}</div>
                          <span className="text-xs font-semibold text-slate-200">{loan.member}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-400">{loan.type}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-200">{fmt(loan.outstanding)}</span>
                        <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-slate-950 shadow-inner">
                          <div className="h-full rounded-full bg-amber-500 shadow-md" style={{ width: `${repaidPct}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-amber-400 font-mono">{loan.rate}</td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500">{loan.nextDue}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${loanStatusStyle[loan.status] ?? loanStatusStyle.Current}`}>{loan.status}</span>
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