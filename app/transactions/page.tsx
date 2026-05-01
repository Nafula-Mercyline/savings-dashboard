"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  ArrowDownLeft, ArrowUpRight, RefreshCw, Banknote,
  Download, Search, ChevronUp, ChevronDown, Eye,
  MoreHorizontal, AlertCircle, CheckCircle, Clock, Filter
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchTransactions = async () => ({
  stats: {
    totalVolume:  { value: 142_300_000, change: +19.4, up: true },
    deposits:     { value: 68_500_000,  change: +11.2, up: true },
    withdrawals:  { value: 29_800_000,  change: +8.3,  up: false },
    failed:       { value: 7,           change: -3,    up: true },
  },
  daily: Array.from({ length: 28 }, (_, i) => ({
    day: `Dec ${i + 1}`,
    deposits:    Math.floor(1_200_000 + Math.random() * 3_800_000),
    withdrawals: Math.floor(600_000  + Math.random() * 1_800_000),
  })),
  hourly: Array.from({ length: 12 }, (_, i) => ({
    hour: `${(i + 7) % 12 || 12}${i + 7 < 12 ? "am" : "pm"}`,
    count: Math.floor(2 + Math.random() * 18),
  })),
  transactions: [
    { id: "TXN-20241228-001", member: "Alice Nakamura",  type: "Deposit",      category: "Savings",  amount:  500_000, date: "2024-12-28", time: "09:14", channel: "Mobile",   ref: "MPM-8821-XZ", status: "Success" },
    { id: "TXN-20241228-002", member: "Frank Mugisha",   type: "Withdrawal",   category: "Savings",  amount: 1_200_000, date: "2024-12-28", time: "10:03", channel: "Counter",  ref: "CTR-0041-KJ", status: "Success" },
    { id: "TXN-20241228-003", member: "Brian Okello",    type: "Disbursement", category: "Loan",     amount: 5_000_000, date: "2024-12-28", time: "11:30", channel: "Counter",  ref: "CTR-0042-LM", status: "Success" },
    { id: "TXN-20241227-012", member: "Carol Nambi",     type: "Repayment",    category: "Loan",     amount:  95_000,  date: "2024-12-27", time: "14:22", channel: "Mobile",   ref: "MPM-8799-AA", status: "Success" },
    { id: "TXN-20241227-013", member: "David Ssebunya",  type: "Deposit",      category: "Shares",   amount:  200_000, date: "2024-12-27", time: "15:00", channel: "Transfer", ref: "TRF-2210-BV", status: "Pending" },
    { id: "TXN-20241226-009", member: "Eva Tumwine",     type: "Withdrawal",   category: "Savings",  amount:  150_000, date: "2024-12-26", time: "09:55", channel: "Mobile",   ref: "MPM-8780-CC", status: "Failed" },
    { id: "TXN-20241226-010", member: "Grace Atim",      type: "Deposit",      category: "Savings",  amount:  800_000, date: "2024-12-26", time: "11:10", channel: "Counter",  ref: "CTR-0038-NN", status: "Success" },
    { id: "TXN-20241225-004", member: "Henry Byamukama", type: "Repayment",    category: "Loan",     amount:  250_000, date: "2024-12-25", time: "13:45", channel: "Transfer", ref: "TRF-2204-QR", status: "Success" },
    { id: "TXN-20241224-019", member: "Alice Nakamura",  type: "Deposit",      category: "Savings",  amount:  320_000, date: "2024-12-24", time: "08:30", channel: "Mobile",   ref: "MPM-8761-EF", status: "Success" },
    { id: "TXN-20241224-020", member: "Brian Okello",    type: "Withdrawal",   category: "Savings",  amount:  450_000, date: "2024-12-24", time: "16:05", channel: "Counter",  ref: "CTR-0036-GH", status: "Reversed" },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `UGX ${(n / 1_000_000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

const INITIALS_COLORS = ["#c9a84c","#3ecf8e","#63b3ed","#f56565","#a78bfa","#fb923c","#34d399","#f472b6","#60a5fa","#fbbf24"];

const typeConfig: Record<string, { color: string; bg: string; icon: any; sign: "+" | "-" }> = {
  Deposit:      { color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowDownLeft,  sign: "+" },
  Repayment:    { color: "text-emerald-600", bg: "bg-emerald-50", icon: RefreshCw,      sign: "+" },
  Withdrawal:   { color: "text-red-500",     bg: "bg-red-50",     icon: ArrowUpRight,   sign: "-" },
  Disbursement: { color: "text-amber-600",   bg: "bg-amber-50",   icon: Banknote,       sign: "-" },
};

const statusConfig: Record<string, string> = {
  Success:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending:  "bg-amber-50 text-amber-700 border border-amber-200",
  Failed:   "bg-red-50 text-red-600 border border-red-200",
  Reversed: "bg-gray-100 text-gray-500 border border-gray-200",
};

const statusIcon: Record<string, any> = {
  Success:  CheckCircle,
  Pending:  Clock,
  Failed:   AlertCircle,
  Reversed: RefreshCw,
};

const channelBadge: Record<string, string> = {
  Mobile:   "bg-violet-50 text-violet-600 border border-violet-200",
  Counter:  "bg-blue-50 text-blue-600 border border-blue-200",
  Transfer: "bg-teal-50 text-teal-600 border border-teal-200",
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
export default function TransactionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const [search, setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading transactions…</p>
        </div>
      </div>
    );
  }

  const { stats, daily, hourly, transactions } = data;

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.member.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.ref.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
            <RefreshCw size={13} />
            <span>Transaction Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            December 2024 · Real-time financial movements
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={15} /> Export
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Volume (Dec)",  value: fmt(stats.totalVolume.value), change: stats.totalVolume.change, up: stats.totalVolume.up, icon: RefreshCw,    accent: "bg-amber-50 text-amber-600",    border: "border-amber-100" },
          { label: "Total Deposits",      value: fmt(stats.deposits.value),    change: stats.deposits.change,    up: stats.deposits.up,    icon: ArrowDownLeft, accent: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
          { label: "Total Withdrawals",   value: fmt(stats.withdrawals.value), change: stats.withdrawals.change, up: false,                icon: ArrowUpRight,  accent: "bg-red-50 text-red-500",        border: "border-red-100" },
          { label: "Failed Transactions", value: stats.failed.value.toString(),change: Math.abs(stats.failed.change), up: true,            icon: AlertCircle,   accent: "bg-violet-50 text-violet-600",  border: "border-violet-100" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                  <s.icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                  s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}>
                  {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(s.change)}{typeof s.change === "number" && s.change <= 20 ? "%" : ""}
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

        {/* Daily volume area chart */}
        <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Daily Transaction Volume</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Deposits vs withdrawals — December 2024</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded inline-block" />Deposits</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 rounded inline-block" />Withdrawals</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wdrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f56565" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#f56565" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  interval={3} tickFormatter={(v) => v.replace("Dec ", "")} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={46} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="deposits"    stroke="#f59e0b" strokeWidth={2} fill="url(#depGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="withdrawals" stroke="#f56565" strokeWidth={2} fill="url(#wdrGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions by hour */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Activity by Hour</CardTitle>
            <p className="text-xs text-gray-400">Transaction count — today</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip formatter={(v: any) => [v, "Transactions"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#c9a84c" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>

            {/* Channel breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">By Channel</p>
              {[
                { label: "Mobile Money", pct: 54, color: "#a78bfa" },
                { label: "Counter",      pct: 31, color: "#60a5fa" },
                { label: "Bank Transfer",pct: 15, color: "#34d399" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{c.label}</span>
                    <span className="font-semibold text-gray-800">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction Table ── */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Transaction Ledger</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {transactions.length} records</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search member, ID or ref…"
                  className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-48"
                />
              </div>
              {/* Type filters */}
              {["All","Deposit","Withdrawal","Repayment","Disbursement"].map((f) => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    typeFilter === f
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}>
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
                {["Member","Transaction ID","Type","Category","Amount","Date & Time","Channel","Ref","Status",""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-4 first:pl-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((txn, i) => {
                const initials = txn.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                const color    = INITIALS_COLORS[i % INITIALS_COLORS.length];
                const tc       = typeConfig[txn.type] ?? typeConfig["Deposit"];
                const TypeIcon = tc.icon;
                const sc       = statusConfig[txn.status] ?? statusConfig["Pending"];
                const SIcon    = statusIcon[txn.status]   ?? statusIcon["Pending"];
                return (
                  <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors group">
                    {/* Member */}
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}>
                          {initials}
                        </div>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{txn.member}</span>
                      </div>
                    </td>
                    {/* ID */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{txn.id}</span>
                    </td>
                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit px-2.5 py-1 rounded-full ${tc.bg} ${tc.color}`}>
                        <TypeIcon size={12} /> {txn.type}
                      </span>
                    </td>
                    {/* Category */}
                    <td className="py-3.5 px-4 text-gray-500 text-xs">{txn.category}</td>
                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold whitespace-nowrap ${tc.color}`}>
                        {tc.sign}{fmt(txn.amount)}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs">
                        <p className="text-gray-700 font-medium">{txn.date}</p>
                        <p className="text-gray-400">{txn.time}</p>
                      </div>
                    </td>
                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${channelBadge[txn.channel] ?? ""}`}>
                        {txn.channel}
                      </span>
                    </td>
                    {/* Ref */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-400">{txn.ref}</span>
                    </td>
                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${sc}`}>
                        <SIcon size={11} /> {txn.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-3.5 px-4 pr-6">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-sm text-gray-400">
                    No transactions match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 pt-4 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400">Showing 1–10 of 1,284 transactions</p>
            <div className="flex gap-1">
              {[1, 2, 3, "…", 129].map((p, i) => (
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
