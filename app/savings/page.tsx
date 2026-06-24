"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  PiggyBank, TrendingUp, Users, Wallet,
  Download, Plus, Eye, MoreHorizontal, ChevronUp, ChevronDown,
  ShieldCheck, ArrowUpRight, Filter
} from "lucide-react";
import { getSavings } from "@/lib/api/savingsService";

// ── 1. TypeScript Interface Contracts ──────────────────────────────────────────
interface SavingsApiResponse {
  data?: any[];
  results?: any[];
  stats?: {
    totalDeposits?: { value: number; change: number; up: boolean };
    activeAccounts?: { value: number; change: number; up: boolean };
    avgBalance?: { value: number; change: number; up: boolean };
    interestPaid?: { value: number; change: number; up: boolean };
  };
  monthly?: Array<{ month: string; deposits: number; withdrawals: number; interest: number }>;
  accountTypes?: Array<{ type: string; count: number; balance: number; rate: string; color: string }>;
}

// ── SACCO Core Fallback Structures ──────────────────────────────────────────────
const DEFAULT_STATS = {
  totalDeposits: { value: 284_500_000, change: +12.4, up: true },
  activeAccounts: { value: 412, change: +8, up: true },
  avgBalance: { value: 690_534, change: -2.1, up: false },
  interestPaid: { value: 4_830_000, change: +7.0, up: true },
};

const DEFAULT_MONTHLY = [
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
];

const DEFAULT_ACCOUNT_TYPES = [
  { type: "Compulsory Shares", count: 210, balance: 142_000_000, rate: "9.5%", color: "#f59e0b" },
  { type: "Ordinary Savings", count: 98, balance: 58_200_000, rate: "4.0%", color: "#10b981" },
  { type: "Fixed Deposit Vault", count: 72, balance: 64_800_000, rate: "11.5%", color: "#3b82f6" },
  { type: "Target Sacco Fund", count: 32, balance: 19_500_000, rate: "6.0%", color: "#8b5cf6" },
];

// ── Financial Formatting Helpers ──────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Dormant: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Matured: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

const INITIALS_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-4 text-xs backdrop-blur-md">
      <p className="font-semibold text-slate-300 mb-2">{label} Asset Log</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-3 text-slate-400 my-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize min-w-[70px]">{p.name}:</span>
          <span className="font-mono font-bold text-slate-200">UGX {p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page Component ───────────────────────────────────────────
export default function SavingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const { data: rawQueryData, isLoading } = useQuery({
    queryKey: ["savings", statusFilter, page],
    queryFn: () => getSavings({ page, limit, status: statusFilter }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Sacco Ledgers…</p>
        </div>
      </div>
    );
  }

  const data = (rawQueryData || {}) as SavingsApiResponse;

  const rawAccountsList = data?.data || data?.results || (Array.isArray(data) ? data : []);
  const stats = { ...DEFAULT_STATS, ...(data?.stats || {}) };
  const monthly = data?.monthly || DEFAULT_MONTHLY;
  const accountTypes = Array.isArray(data?.accountTypes) ? data.accountTypes : DEFAULT_ACCOUNT_TYPES;

  const totalBalance = accountTypes.reduce(
    (s: number, a: typeof DEFAULT_ACCOUNT_TYPES[0]) => s + (Number(a?.balance) || 0),
    0
  );

  const recentAccounts = Array.isArray(rawAccountsList)
    ? rawAccountsList.map((acc: any) => ({
      id: acc.id || acc.accountNumber || "N/A",
      name: acc.memberName || acc.member?.name || acc.name || "Unknown Member",
      type: acc.accountType || acc.type || "Ordinary Savings",
      balance: Number(acc.balance || 0),
      status: acc.status ? acc.status.charAt(0).toUpperCase() + acc.status.slice(1) : "Active",
      date: acc.createdAt || acc.date || new Date().toISOString().split('T')[0]
    }))
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 antialiased selection:bg-amber-500 selection:text-slate-950">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-500 font-bold tracking-widest uppercase mb-1.5">
            <ShieldCheck size={14} className="text-amber-500" />
            <span>SACCO Asset Vault Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Savings Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System Operations · Live Audit Statement Balance Updated on {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2.5 w-full md:w-auto">
          <button className="flex items-center justify-center gap-2 flex-1 md:flex-initial px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 transition-all shadow-lg active:scale-95 cursor-pointer">
            <Download size={14} /> Export Sheets
          </button>
          <button className="flex items-center justify-center gap-2 flex-1 md:flex-initial px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer">
            <Plus size={14} /> Provision Account
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total SACCO Deposits",
            value: fmt(stats.totalDeposits?.value ?? 0),
            change: stats.totalDeposits?.change ?? 0,
            up: stats.totalDeposits?.up ?? true,
            icon: Wallet,
            accent: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          },
          {
            label: "Active Members",
            value: (stats.activeAccounts?.value ?? 0).toLocaleString(),
            change: stats.activeAccounts?.change ?? 0,
            up: stats.activeAccounts?.up ?? true,
            icon: Users,
            accent: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          },
          {
            label: "Average Portfolio Hold",
            value: fmt(stats.avgBalance?.value ?? 0),
            change: stats.avgBalance?.change ?? 0,
            up: stats.avgBalance?.up ?? false,
            icon: TrendingUp,
            accent: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          },
          {
            label: "Dividend Outflow",
            value: fmt(stats.interestPaid?.value ?? 0),
            change: stats.interestPaid?.change ?? 0,
            up: stats.interestPaid?.up ?? true,
            icon: PiggyBank,
            accent: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
          },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900/40 border-slate-900 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-800 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                  <s.icon size={16} />
                </div>
                <span className={`flex items-center gap-0.5 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${s.up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                  {s.up ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {Math.abs(Number(s.change))}%
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1 font-mono tracking-tight">{s.value}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-900">
                  <span>MoM Statement Variance</span>
                  <ArrowUpRight size={12} className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Analytics Graphics Section ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Cash Flow Statement Curve */}
        <Card className="xl:col-span-2 bg-slate-900/40 border-slate-900 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-4 border-b border-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider">Revenue Stream Liquidity</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Statistical projection of continuous capital intake vs withdrawals</p>
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 inline-block rounded-full" />Deposits</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 inline-block rounded-full" />Withdrawals</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withdrawGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="deposits" stroke="#f59e0b" strokeWidth={2.5} fill="url(#depositGrad)" dot={false} activeDot={{ r: 6, fill: "#f59e0b" }} />
                <Area type="monotone" dataKey="withdrawals" stroke="#3b82f6" strokeWidth={2.5} fill="url(#withdrawGrad)" dot={false} activeDot={{ r: 6, fill: "#3b82f6" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Micro Asset Distribution Portfolio */}
        <Card className="bg-slate-900/40 border-slate-900 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <CardHeader className="pb-4 border-b border-slate-900/60">
            <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider">Asset Matrix Allocations</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Total Allocation Value: <span className="font-mono text-slate-200 font-bold">{fmt(totalBalance)}</span></p>
          </CardHeader>
          <CardContent className="pt-6 space-y-[15px] flex-1">
            {accountTypes.map((a: typeof DEFAULT_ACCOUNT_TYPES[0]) => {
              const balanceValue = Number(a?.balance || 0);
              const pct = totalBalance > 0 ? Math.round((balanceValue / totalBalance) * 100) : 0;
              return (
                <div key={a?.type || Math.random().toString()} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a?.color || "#ccc" }} />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{a?.type || "Unknown Type"}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-400">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden p-[1px]">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: a?.color || "#ccc" }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] font-medium text-slate-500">
                    <span>{a?.count ?? 0} holdings · {a?.rate || "0%"} yield</span>
                    <span className="font-mono text-slate-400 font-semibold">{fmtShort(balanceValue)}</span>
                  </div>
                </div>
              );
            })}

            {/* Micro Interest Volume Histogram */}
            <div className="mt-4 pt-4 border-t border-slate-900/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rolling Sacco Interest Disbursed</p>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={monthly.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="interest" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.85} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [`UGX ${v.toLocaleString()}`, "Yield Total"]} contentStyle={{ fontSize: 11, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SACCO Core Ledger Account Table ── */}
      <Card className="bg-slate-900/40 border-slate-900 shadow-xl backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider">Savings Capital Register</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Showing {recentAccounts.length} live synchronized accounts matching active parameters</p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-900">
              <div className="px-2 text-slate-500"><Filter size={12} /></div>
              {["all", "active", "dormant", "matured"].map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer ${statusFilter === f
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/5"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                  {["Sacco Beneficiary / Member", "Account Identifier", "Account Type Allocation", "Available Balance", "Origination Date", "Audit Status", "Actions"].map((h) => (
                    <th key={h} className="py-3 px-6 text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 bg-slate-900/10">
                {recentAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-slate-500 font-medium py-12 bg-slate-950/20">
                      No transactional entities found satisfying execution constraints.
                    </td>
                  </tr>
                ) : (
                  recentAccounts.map((acc, i) => {
                    const initials = acc.name.split(" ").filter(Boolean).map((n: string) => n.charAt(0)).join("").slice(0, 2);
                    const color = INITIALS_COLORS[i % INITIALS_COLORS.length];
                    return (
                      <tr key={acc.id} className="hover:bg-slate-900/60 transition-colors group">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: color + "15", color, border: `1px solid ${color}30` }}>
                              {initials}
                            </div>
                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{acc.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-mono text-[11px] text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-lg">{acc.id}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-300 font-medium">{acc.type}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-mono font-bold text-amber-400 text-sm tracking-tight">{fmt(acc.balance)}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400 font-medium font-mono">{acc.date}</td>
                        <td className="py-3.5 px-6">
                          <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-md uppercase ${statusStyle[acc.status] || "bg-slate-800 text-slate-400"}`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
                              <Eye size={13} />
                            </button>
                            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
                              <MoreHorizontal size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-900 bg-slate-950/30">
            <p className="text-[11px] text-slate-500 font-bold tracking-wider uppercase">Active Ledger Segment · Index {page}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-[11px] font-bold border border-slate-800 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                Previous Segment
              </button>
              <button
                disabled={recentAccounts.length < limit}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-[11px] font-bold border border-slate-800 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                Next Segment
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}