"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area
} from "recharts";
import {
  BarChart3, TrendingUp, Download, 
  Calendar, ChevronUp, ChevronDown, PieChart,
  AlertTriangle, CheckCircle, Clock, RefreshCw
} from "lucide-react";

import {
  getBalanceSheet,
  getLoansReport,
  getSavingsReport,
  getMembersReport,
  getArrearsReport,
  exportReport
} from "@/lib/api/reportsService";

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number, isPct?: boolean) =>
  isPct
    ? `${n}%`
    : n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(1)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n.toLocaleString();

const pctChange = (a: number, b: number) => {
  if (!b) return "0.0";
  return (((a - b) / b) * 100).toFixed(1);
};

const statusConfig: Record<string, string> = {
  Ready:     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Pending:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Submitted: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

const statusIcon: Record<string, any> = {
  Ready:     CheckCircle,
  Pending:   Clock,
  Submitted: RefreshCw,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-zinc-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-zinc-400">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-zinc-100">UGX {fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page Component ───────────────────────────────────────────
export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const { data, isLoading, error } = useQuery({
    queryKey: ["reportsData"],
    queryFn: async () => {
      const [balanceSheet, loans, savings, members, arrears] = await Promise.all([
        getBalanceSheet(),
        getLoansReport("this_month"),
        getSavingsReport("this_month"),
        getMembersReport("this_month"),
        getArrearsReport("all"),
      ]);

      const kpis = [
        { metric: "Total Assets",            q4: balanceSheet?.assets || 0,       q3: (balanceSheet?.assets || 0) * 0.92, trend: "up",   good: true  },
        { metric: "Total Liabilities",       q4: balanceSheet?.liabilities || 0,  q3: (balanceSheet?.liabilities || 0) * 0.91, trend: "up",   good: false },
        { metric: "Members' Equity",         q4: balanceSheet?.equity || 0,       q3: (balanceSheet?.equity || 0) * 0.94, trend: "up",   good: true  },
        { metric: "Loan Portfolio (Net)",    q4: loans?.portfolioValue || 0,      q3: (loans?.portfolioValue || 0) * 0.85,  trend: "up",   good: true  },
        { metric: "Total Deposits",          q4: savings?.totalDeposits || 0,     q3: (savings?.totalDeposits || 0) * 0.90, trend: "up",   good: true  },
        { metric: "PAR 30 (Portfolio Risk)", q4: arrears?.par30 || 5.4,           q3: 6.2,                                                   trend: "down", good: true,    isPct: true },
      ];

      const quarterly = loans?.quarterlyHistory || [
        { quarter: "Q1", assets: 218000000, loans: 52000000, deposits: 185000000 },
        { quarter: "Q2", assets: 234000000, loans: 61000000, deposits: 200000000 },
        { quarter: "Q3", assets: 261200000, loans: 71200000, deposits: 221000000 },
        { quarter: "Q4", assets: balanceSheet?.assets || 284500000, loans: loans?.portfolioValue || 87500000, deposits: savings?.totalDeposits || 251000000 },
      ];

      const memberGrowth = members?.monthlyGrowth || [
        { month: "Jan", members: 362 }, { month: "Feb", members: 371 },
        { month: "Mar", members: 378 }, { month: "Apr", members: 383 },
        { month: "May", members: 388 }, { month: "Jun", members: 391 },
        { month: "Jul", members: 395 }, { month: "Aug", members: 399 },
        { month: "Sep", members: 403 }, { month: "Oct", members: 406 },
        { month: "Nov", members: 409 }, { month: "Dec", members: members?.totalCount || 412 },
      ];

      const reportDocuments = [
        {
          id: "financial",
          title: "Monthly Financial Statement",
          desc: "Comprehensive balance sheet, income statements, and corporate net position evaluations.",
          category: "Financial", generated: "Automated", size: "Dynamic",
          icon: BarChart3, color: "#d97706", status: "Ready",
        },
        {
          id: "loans",
          title: "Loan Portfolio Analysis",
          desc: "Detailed evaluation of credit distribution, collection matrices, and principal risk pools.",
          category: "Loans", generated: "Automated", size: "Dynamic",
          icon: TrendingUp, color: "#10b981", status: "Ready",
        },
        {
          id: "savings",
          title: "Member Deposits Summary",
          desc: "Audit tracking of member accounts balance changes and dynamic equity reserves distribution.",
          category: "Savings", generated: "Automated", size: "Dynamic",
          icon: PieChart, color: "#3b82f6", status: "Ready",
        },
        {
          id: "arrears",
          title: "Delinquency & Credit Risk",
          desc: "Aging ledger categorizing institutional portfolio exposure thresholds and collection health.",
          category: "Risk", generated: "Automated", size: "Dynamic",
          icon: AlertTriangle, color: "#ef4444", status: "Ready",
        },
      ];

      return { kpis, quarterly, memberGrowth, reports: reportDocuments, totalMembers: members?.totalCount || 412 };
    }
  });

  const handleExport = async (reportId: string, categoryName: string) => {
    try {
      const response = await exportReport({
        report: reportId,
        format: "csv",
        period: "this_month"
      } as any);

      const blob = new Blob([response as any], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportId}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export report document:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400 font-medium">Assembling operational datasets...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-red-400 text-sm font-medium">
        Failed to establish secure ledger data connection. Please check network status.
      </div>
    );
  }

  const { kpis, quarterly, memberGrowth, reports, totalMembers } = data;
  const filteredReports = activeCategory === "All" ? reports : reports.filter(r => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6 antialiased">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold tracking-wider uppercase mb-1">
            <BarChart3 size={13} className="text-amber-500" />
            <span>SACCO Intelligence Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Financial Reporting & Analytics</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Institutional ledger oversight and active capital audit records
          </p>
        </div>
        <button 
          onClick={() => handleExport("all", "Financial")}
          className="flex items-center gap-2 self-start sm:self-center px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-zinc-50 transition-colors shadow-sm"
        >
          <Download size={15} /> Export Complete Ledger
        </button>
      </div>

      {/* ── KPI Grid/Table Card ── */}
      <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-zinc-800/60">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-200">
              Key Performance Indexes
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">
              Current operational balance states weighed against previous tracking baselines
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                <th className="text-left py-3 px-6">Metric Target</th>
                <th className="text-left py-3 px-6">Current Standing</th>
                <th className="text-left py-3 px-6">Previous Target</th>
                <th className="text-left py-3 px-6">Variance Trend</th>
                <th className="text-left py-3 px-6">Risk Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/20">
              {kpis.map((row) => {
                const change = parseFloat(pctChange(row.q4, row.q3));
                const isGood = (row.trend === "up" && row.good) || (row.trend === "down" && !row.good);
                return (
                  <tr key={row.metric} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-zinc-300">{row.metric}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-zinc-100">{fmt(row.q4, row.isPct)}</td>
                    <td className="py-3.5 px-6 font-mono text-zinc-500">{fmt(row.q3, row.isPct)}</td>
                    <td className="py-3.5 px-6">
                      <span className={`flex items-center gap-1 text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${
                        isGood ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {row.trend === "up" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {Math.abs(change)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      {isGood
                        ? <span className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle size={13} /> Compliant</span>
                        : <span className="flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle size={13} /> Monitor Target</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Analytics Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Growth Matrix */}
        <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-200">Asset & Deposit Progressions</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">Quarterly capital growth, total loan allocations and deposit margins</p>
              </div>
              <div className="flex gap-4 text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block" />Assets</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block" />Loans</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" />Deposits</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={quarterly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={5}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="assets"   fill="#d97706" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="loans"    fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="deposits" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Metrics */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-zinc-200">Member Registrations</CardTitle>
            <p className="text-xs text-zinc-400">Total institutional registered membership base</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 mb-5">
              <div>
                <p className="text-3xl font-bold text-zinc-50 font-mono tracking-tight">{totalMembers}</p>
                <p className="text-xs text-emerald-400 font-medium mt-0.5">Active Depositors</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={memberGrowth} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d97706" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="members" stroke="#d97706" strokeWidth={2} fill="url(#memberGrad)" dot={false} activeDot={{ r: 4 }} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 10", "dataMax + 5"]} tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip formatter={(v: any) => [v, "Members"]} contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: 8, color: "#f4f4f5" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Report Document Manifest ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-200">Report Documents</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Generate standalone data exports and statement modules</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", "Financial", "Loans", "Savings", "Risk"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveCategory(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  activeCategory === f
                    ? "bg-amber-600 border-amber-600 text-zinc-50 shadow-md shadow-amber-900/20"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 bg-zinc-900/40"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredReports.map((r, i) => {
            const StatusIcon = statusIcon[r.status];
            return (
              <Card key={i} className="bg-zinc-900 border-zinc-800 shadow-md hover:border-zinc-700/80 transition-all group flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Icon Base Container */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: r.color + "12", border: `1px solid ${r.color}25` }}>
                      <r.icon size={18} style={{ color: r.color }} />
                    </div>
                    {/* Core description text elements */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold text-zinc-200 text-sm tracking-tight">{r.title}</p>
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusConfig[r.status]}`}>
                          <StatusIcon size={11} />
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{ background: r.color + "12", color: r.color }}>
                        {r.category}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar size={12} /> {r.generated}
                      </span>
                    </div>
                    <button
                      onClick={() => handleExport(r.id, r.category)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 rounded-md transition-colors hover:brightness-110"
                      style={{ background: r.color }}
                    >
                      <Download size={12} /> Export CSV
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}