"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  BarChart3, TrendingUp, FileText, Download, Eye,
  Calendar, ChevronUp, ChevronDown, PieChart,
  AlertTriangle, CheckCircle, Clock, RefreshCw
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchReports = async () => ({
  kpis: [
    { metric: "Total Assets",            q4: 284_500_000, q3: 261_200_000, trend: "up",   good: true  },
    { metric: "Total Liabilities",       q4: 198_300_000, q3: 182_700_000, trend: "up",   good: false },
    { metric: "Members' Equity",         q4: 86_200_000,  q3: 78_500_000,  trend: "up",   good: true  },
    { metric: "Loan Portfolio (Net)",    q4: 87_500_000,  q3: 71_200_000,  trend: "up",   good: true  },
    { metric: "Total Deposits",          q4: 284_500_000, q3: 251_200_000, trend: "up",   good: true  },
    { metric: "PAR 30 (Portfolio Risk)", q4: 9.2,         q3: 7.8,         trend: "up",   good: false, isPct: true },
    { metric: "Return on Assets",        q4: 3.4,         q3: 3.1,         trend: "up",   good: true,  isPct: true },
    { metric: "Capital Adequacy Ratio",  q4: 18.6,        q3: 19.2,        trend: "down", good: false, isPct: true },
  ],
  quarterly: [
    { quarter: "Q1",  assets: 218_000_000, loans: 52_000_000, deposits: 185_000_000 },
    { quarter: "Q2",  assets: 234_000_000, loans: 61_000_000, deposits: 200_000_000 },
    { quarter: "Q3",  assets: 261_200_000, loans: 71_200_000, deposits: 221_000_000 },
    { quarter: "Q4",  assets: 284_500_000, loans: 87_500_000, deposits: 251_000_000 },
  ],
  memberGrowth: [
    { month: "Jan", members: 362 }, { month: "Feb", members: 371 },
    { month: "Mar", members: 378 }, { month: "Apr", members: 383 },
    { month: "May", members: 388 }, { month: "Jun", members: 391 },
    { month: "Jul", members: 395 }, { month: "Aug", members: 399 },
    { month: "Sep", members: 403 }, { month: "Oct", members: 406 },
    { month: "Nov", members: 409 }, { month: "Dec", members: 412 },
  ],
  reports: [
    {
      title: "Monthly Financial Statement",
      desc: "Income, expenses & net position — December 2024",
      category: "Financial", generated: "2025-01-01", size: "1.4 MB",
      icon: BarChart3, color: "#c9a84c", status: "Ready",
    },
    {
      title: "Loan Portfolio Report",
      desc: "Disbursements, repayments & PAR analysis — Q4 2024",
      category: "Loans", generated: "2025-01-01", size: "2.1 MB",
      icon: TrendingUp, color: "#3ecf8e", status: "Ready",
    },
    {
      title: "Member Savings Summary",
      desc: "Account balances & interest earned by member",
      category: "Savings", generated: "2025-01-01", size: "980 KB",
      icon: PieChart, color: "#63b3ed", status: "Ready",
    },
    {
      title: "Delinquency Report",
      desc: "Overdue loans categorised by age of arrears",
      category: "Risk", generated: "2024-12-31", size: "640 KB",
      icon: AlertTriangle, color: "#f56565", status: "Ready",
    },
    {
      title: "Quarterly Board Report — Q4 2024",
      desc: "Comprehensive Q4 performance summary for the board",
      category: "Governance", generated: "2024-12-31", size: "3.8 MB",
      icon: FileText, color: "#a78bfa", status: "Ready",
    },
    {
      title: "Annual Report 2024",
      desc: "Full-year audited financial statements & narrative",
      category: "Annual", generated: "Pending audit", size: "—",
      icon: Calendar, color: "#fb923c", status: "Pending",
    },
    {
      title: "Interest Income Breakdown",
      desc: "Earned vs paid interest margin analysis — Dec 2024",
      category: "Financial", generated: "2025-01-01", size: "760 KB",
      icon: BarChart3, color: "#34d399", status: "Ready",
    },
    {
      title: "Regulatory Compliance Report",
      desc: "UBOS / BOU submission — December 2024",
      category: "Compliance", generated: "2025-01-02", size: "1.1 MB",
      icon: CheckCircle, color: "#f472b6", status: "Submitted",
    },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number, isPct?: boolean) =>
  isPct
    ? `${n}%`
    : n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(1)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n.toLocaleString();

const pctChange = (a: number, b: number) =>
  (((a - b) / b) * 100).toFixed(1);

const statusConfig: Record<string, string> = {
  Ready:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  Submitted: "bg-blue-50 text-blue-700 border border-blue-200",
};

const statusIcon: Record<string, any> = {
  Ready:     CheckCircle,
  Pending:   Clock,
  Submitted: RefreshCw,
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
export default function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading reports…</p>
        </div>
      </div>
    );
  }

  const { kpis, quarterly, memberGrowth, reports } = data;

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
            <BarChart3 size={13} />
            <span>Reports & Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fiscal Year 2024 · Q4 Board Package
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={15} /> Export All
        </button>
      </div>

      {/* ── KPI Table ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">
                Key Performance Indicators — Q4 vs Q3 2024
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Quarter-on-quarter comparison across core financial metrics
              </p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={13} /> Export KPIs
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Metric", "Q4 2024", "Q3 2024", "Change", "Health"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kpis.map((row) => {
                const change = parseFloat(pctChange(row.q4, row.q3));
                const isGood = (row.trend === "up" && row.good) || (row.trend === "down" && !row.good);
                return (
                  <tr key={row.metric} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-gray-800">{row.metric}</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-gray-900">{fmt(row.q4, row.isPct)}</td>
                    <td className="py-3.5 px-6 font-mono text-gray-400">{fmt(row.q3, row.isPct)}</td>
                    <td className="py-3.5 px-6">
                      <span className={`flex items-center gap-1 text-xs font-semibold w-fit px-2 py-1 rounded-full ${
                        isGood ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                      }`}>
                        {row.trend === "up" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {Math.abs(change)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      {isGood
                        ? <span className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle size={13} /> Good</span>
                        : <span className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={13} /> Monitor</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Quarterly asset growth */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Quarterly Growth — 2024</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Assets, loan portfolio & deposits by quarter</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-amber-400 rounded inline-block" />Assets</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-400 rounded inline-block" />Loans</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-emerald-400 rounded inline-block" />Deposits</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={quarterly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="assets"   fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="loans"    fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="deposits" fill="#3ecf8e" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member growth line */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Member Growth</CardTitle>
            <p className="text-xs text-gray-400">Jan – Dec 2024 · +50 new members</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-3xl font-bold text-gray-900 font-mono">412</p>
                <p className="text-xs text-gray-400 mt-0.5">Total members</p>
              </div>
              <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                <ChevronUp size={12} /> 13.8%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={memberGrowth} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c9a84c" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="members" stroke="#c9a84c" strokeWidth={2} fill="url(#memberGrad)" dot={false} activeDot={{ r: 4 }} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 10", "dataMax + 5"]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v: any) => [v, "Members"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Report Documents ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Report Documents</h2>
            <p className="text-xs text-gray-400 mt-0.5">Download or preview all generated reports</p>
          </div>
          <div className="flex gap-2">
            {["All","Financial","Loans","Risk","Governance"].map((f) => (
              <button key={f} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors bg-white">
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reports.map((r, i) => {
            const StatusIcon = statusIcon[r.status];
            return (
              <Card key={i} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-5">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: r.color + "18", border: `1.5px solid ${r.color}30` }}>
                      <r.icon size={20} style={{ color: r.color }} />
                    </div>
                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-800 text-sm leading-snug">{r.title}</p>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusConfig[r.status]}`}>
                          <StatusIcon size={11} />
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{r.desc}</p>
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: r.color + "18", color: r.color }}>
                          {r.category}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={11} /> {r.generated}
                        </span>
                        {r.size !== "—" && (
                          <span className="text-xs text-gray-400">{r.size}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 px-5 pb-4 pt-0 border-t border-gray-50 mt-1">
                    <button
                      disabled={r.status === "Pending"}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      disabled={r.status === "Pending"}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: r.status === "Pending" ? "#9ca3af" : r.color }}>
                      <Download size={13} /> Download
                    </button>
                    {r.status === "Pending" && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 ml-1">
                        <Clock size={12} /> Awaiting audit sign-off
                      </span>
                    )}
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
