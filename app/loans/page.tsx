"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Download,
  Eye,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getLoans, getLoansDashboard } from "@/lib/api/loansService";

type LoanMetric = { value: number; change: number; up: boolean };
type MonthlyLoanPoint = { month: string; disbursed: number; repaid: number };
type RiskBucket = { label: string; value: number; color: string };
type LoanTypeSummary = { type: string; count: number; rate: string; color: string };
type Loan = {
  id: string;
  member: string;
  type: string;
  principal: number;
  outstanding: number;
  rate: string;
  term: string;
  nextDue: string;
  daysOverdue: number;
  status: string;
};

type LoansDashboardData = {
  stats: {
    totalPortfolio: LoanMetric;
    activeLoans: LoanMetric;
    overdueAccounts: LoanMetric;
    parRatio: LoanMetric;
  };
  monthly: MonthlyLoanPoint[];
  riskBuckets: RiskBucket[];
  loanTypes: LoanTypeSummary[];
  loans: Loan[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const emptyLoansDashboard: LoansDashboardData = {
  stats: {
    totalPortfolio: { value: 0, change: 0, up: true },
    activeLoans: { value: 0, change: 0, up: true },
    overdueAccounts: { value: 0, change: 0, up: true },
    parRatio: { value: 0, change: 0, up: true },
  },
  monthly: [],
  riskBuckets: [],
  loanTypes: [],
  loans: [],
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
};

const INITIALS_COLORS = ["#d97706", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#059669", "#ec4899"];

const statusConfig: Record<string, { pill: string; dot: string }> = {
  Current: { pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-500" },
  Overdue: { pill: "bg-red-500/10 text-red-400 border border-red-500/20", dot: "bg-red-500" },
  "At Risk": { pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dot: "bg-amber-500" },
  "Paid Off": { pill: "bg-blue-500/10 text-blue-400 border border-blue-500/20", dot: "bg-blue-400" },
};

// Fixed and properly closed formatting functions
const fmt = (amount = 0) =>
  amount >= 1_000_000 
    ? `UGX ${(amount / 1_000_000).toFixed(2)}M` 
    : `UGX ${amount.toLocaleString()}`;

const fmtShort = (amount = 0) => 
  amount >= 1_000_000 
    ? `${(amount / 1_000_000).toFixed(0)}M` 
    : amount.toLocaleString();

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-zinc-300">{label}</p>
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 text-zinc-400">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="capitalize">{item.name}:</span>
          <span className="font-semibold text-zinc-100">UGX {fmtShort(item.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function LoanPage() {
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const year = "2026";

  const { data, error, isFetching, isLoading } = useQuery<LoansDashboardData>({
    queryKey: ["loans-dashboard", year, status, page],
    queryFn: () => getLoansDashboard({ year, status: status === "All" ? undefined : status, page, pageSize: 10 }),
    staleTime: 60_000,
  });

  const dashboard = data ?? emptyLoansDashboard;
  const { stats, monthly, riskBuckets, loanTypes, loans, pagination } = dashboard;

  const visibleLoans = useMemo(() => {
    if (status === "All") return loans;
    return loans.filter((loan) => loan.status === status);
  }, [loans, status]);

  const overdueFollowUps = stats.overdueAccounts.value;
  const activeFilters = ["All", "Current", "Overdue", "At Risk", "Paid Off"];

  const handleExport = () => {
    getLoans({ format: "csv", year, status: status === "All" ? undefined : status });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-400">Loading loan records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 p-6 text-zinc-100 antialiased">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <CreditCard size={13} className="text-amber-500" />
            <span>Credit Registry & Operations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Loan Portfolio Analysis</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Fiscal Year {year} · Ledger Snapshot: {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
            {isFetching ? <span className="text-amber-500 animate-pulse"> · Synchronizing…</span> : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-zinc-850 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 shadow-sm transition-colors hover:bg-zinc-800 hover:text-zinc-50">
            <Download size={15} /> Export Ledger
          </button>
          <a href="/loans/new" className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition-colors hover:bg-amber-500">
            <Plus size={15} /> New Disbursement
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
          Security or connectivity limitation: {(error as Error).message}
        </div>
      ) : null}

      {/* ── KPI Panels ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Gross Loan Portfolio", value: fmt(stats.totalPortfolio.value), change: stats.totalPortfolio.change, up: stats.totalPortfolio.up, icon: CreditCard, accent: "bg-amber-500/10 text-amber-400", border: "border-amber-500/10", suffix: "%" },
          { label: "Active Capital Accounts", value: stats.activeLoans.value.toLocaleString(), change: stats.activeLoans.change, up: stats.activeLoans.up, icon: CheckCircle, accent: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/10", suffix: "" },
          { label: "Delinquent Accounts", value: stats.overdueAccounts.value.toString(), change: stats.overdueAccounts.change, up: stats.overdueAccounts.up, icon: AlertTriangle, accent: "bg-red-500/10 text-red-400", border: "border-red-500/10", suffix: "" },
          { label: "Portfolio at Risk (PAR 30)", value: `${stats.parRatio.value}%`, change: stats.parRatio.change, up: stats.parRatio.up, icon: Clock, accent: "bg-violet-500/10 text-violet-400", border: "border-violet-500/10", suffix: "%" },
        ].map((item) => {
          const isHealthy = (item.icon !== AlertTriangle && item.icon !== Clock ? item.up : !item.up);
          return (
            <Card key={item.label} className="bg-zinc-900 border-zinc-800 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl p-2.5 ${item.accent}`}>
                    <item.icon size={18} />
                  </div>
                  <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${isHealthy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {item.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {Math.abs(item.change)}{item.suffix}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{item.label}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-zinc-100">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">vs. previous period</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Monthly Flows */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl xl:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-200">Capital Performance Matrix</CardTitle>
                <p className="mt-0.5 text-xs text-zinc-400">Monthly allocations balanced against collections</p>
              </div>
              <div className="flex gap-4 text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Disbursed</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />Repaid</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={5}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="disbursed" fill="#d97706" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="repaid" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Breakdown */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-zinc-200">Portfolio Quality Stratification</CardTitle>
            <p className="text-xs text-zinc-400">Concentration parameters segmented by age tiers</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={riskBuckets} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} strokeWidth={0}>
                    {riskBuckets.map((bucket, index) => <Cell key={`${bucket.label}-${index}`} fill={bucket.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, ""]} contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: 8, color: "#f4f4f5" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {riskBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: bucket.color }} />
                    <span className="text-zinc-400">{bucket.label}</span>
                  </div>
                  <span className="font-mono font-semibold text-zinc-200">{bucket.value}%</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-red-400">
                <AlertTriangle size={13} /> Immediate action required on {overdueFollowUps} non-performing profiles.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Product Segmentation ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {loanTypes.map((loanType) => (
          <Card key={loanType.type} className="bg-zinc-900 border-zinc-800 shadow-md">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: loanType.color }} />
                <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide" style={{ background: `${loanType.color}15`, color: loanType.color }}>
                  {loanType.rate} p.a.
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-400 truncate">{loanType.type}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-zinc-100">{loanType.count}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Allocated profiles</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Data Register ── */}
      <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-zinc-800/60">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-200">Active Capital Register</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Displaying {visibleLoans.length} active classifications sorted by risk exposure thresholds</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setStatus(filter);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    status === filter 
                      ? "bg-amber-600 border-amber-600 text-zinc-50 shadow-md shadow-amber-900/20" 
                      : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 bg-zinc-900/40"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-900/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                  <th className="py-3 px-6 text-left">Member Entity</th>
                  <th className="py-3 px-4 text-left">Account ID</th>
                  <th className="py-3 px-4 text-left">Facility Type</th>
                  <th className="py-3 px-4 text-left">Principal</th>
                  <th className="py-3 px-4 text-left">Outstanding Bal</th>
                  <th className="py-3 px-4 text-left">Yield Rate</th>
                  <th className="py-3 px-4 text-left">Duration</th>
                  <th className="py-3 px-4 text-left">Maturity Window</th>
                  <th className="py-3 px-4 text-left">Risk Status</th>
                  <th className="py-3 px-6 text-right">Oversight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/10">
                {visibleLoans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-zinc-500 font-medium">
                      No records matched the selected parameters.
                    </td>
                  </tr>
                ) : (
                  visibleLoans.map((loan, index) => {
                    const color = INITIALS_COLORS[index % INITIALS_COLORS.length];
                    const config = statusConfig[loan.status] ?? statusConfig.Current;
                    const repaidPct = loan.principal > 0 ? Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100) : 100;

                    return (
                      <tr key={loan.id} className="group hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                              {getInitials(loan.member)}
                            </div>
                            <span className="whitespace-nowrap font-medium text-zinc-200">{loan.member}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><span className="rounded bg-zinc-800/80 border border-zinc-700/30 px-2 py-0.5 font-mono text-xs text-zinc-400">{loan.id}</span></td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-zinc-400 text-xs">{loan.type}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-zinc-300 text-xs">{fmt(loan.principal)}</td>
                        <td className="px-4 py-3.5">
                          <span className="whitespace-nowrap font-mono font-semibold text-zinc-100 text-xs">{loan.outstanding === 0 ? "—" : fmt(loan.outstanding)}</span>
                          {loan.outstanding > 0 && loan.principal > 0 ? (
                            <div className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${repaidPct}%` }} />
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-amber-500 text-xs">{loan.rate}</td>
                        <td className="px-4 py-3.5 text-zinc-400 text-xs">{loan.term}</td>
                        <td className="px-4 py-3.5">
                          <div className={`whitespace-nowrap text-xs ${loan.daysOverdue > 0 ? "font-semibold text-red-400" : "text-zinc-500"}`}>
                            <span>{loan.nextDue}</span>
                            {loan.daysOverdue > 0 ? <p className="text-[10px] text-red-400/80 font-medium mt-0.5">({loan.daysOverdue}d arrears)</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-semibold ${config.pill}`}>
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
                            {loan.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={`/loans/${loan.id}`} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"><Eye size={14} /></a>
                            <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"><MoreHorizontal size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 px-6 py-4 bg-zinc-900/20">
            <p className="text-xs text-zinc-500">
              Data Record {pagination?.page ?? page} of {pagination?.totalPages ?? 1} · System total: {pagination?.total ?? loans.length} accounts
            </p>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pagination?.totalPages ?? 1, 5) }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`h-7 w-7 rounded-md text-xs font-semibold transition-all ${
                    pageNumber === page 
                      ? "bg-amber-600 text-zinc-50" 
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}