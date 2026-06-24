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
    totalVolume: { value: 142300000, change: +19.4, up: true },
    deposits: { value: 68500000, change: +11.2, up: true },
    withdrawals: { value: 29800000, change: +8.3, up: false },
    failed: { value: 7, change: -3, up: true },
  },
  daily: Array.from({ length: 28 }, (_, i) => ({
    day: `Dec ${i + 1}`,
    deposits: Math.floor(1200000 + Math.random() * 3800000),
    withdrawals: Math.floor(600000 + Math.random() * 1800000),
  })),
  hourly: Array.from({ length: 12 }, (_, i) => ({
    hour: `${(i + 7) % 12 || 12}${i + 7 < 12 ? "am" : "pm"}`,
    count: Math.floor(2 + Math.random() * 18),
  })),
  transactions: [
    { id: "TXN-20241228-001", member: "Alice Nakamura", type: "Deposit", category: "Savings", amount: 500000, date: "2024-12-28", time: "09:14", channel: "Mobile", ref: "MPM-8821-XZ", status: "Success" },
    { id: "TXN-20241228-002", member: "Frank Mugisha", type: "Withdrawal", category: "Savings", amount: 1200000, date: "2024-12-28", time: "10:03", channel: "Counter", ref: "CTR-0041-KJ", status: "Success" },
    { id: "TXN-20241228-003", member: "Brian Okello", type: "Disbursement", category: "Loan", amount: 5000000, date: "2024-12-28", time: "11:30", channel: "Counter", ref: "CTR-0042-LM", status: "Success" },
    { id: "TXN-20241227-012", member: "Carol Nambi", type: "Repayment", category: "Loan", amount: 95000, date: "2024-12-27", time: "14:22", channel: "Mobile", ref: "MPM-8799-AA", status: "Success" },
    { id: "TXN-20241227-013", member: "David Ssebunya", type: "Deposit", category: "Shares", amount: 200000, date: "2024-12-27", time: "15:00", channel: "Transfer", ref: "TRF-2210-BV", status: "Pending" },
    { id: "TXN-20241226-009", member: "Eva Tumwine", type: "Withdrawal", category: "Savings", amount: 150000, date: "2024-12-26", time: "09:55", channel: "Mobile", ref: "MPM-8780-CC", status: "Failed" },
    { id: "TXN-20241226-010", member: "Grace Atim", type: "Deposit", category: "Savings", amount: 800000, date: "2024-12-26", time: "11:10", channel: "Counter", ref: "CTR-0038-NN", status: "Success" },
    { id: "TXN-20241225-004", member: "Henry Byamukama", type: "Repayment", category: "Loan", amount: 250000, date: "2024-12-25", time: "13:45", channel: "Transfer", ref: "TRF-2204-QR", status: "Success" },
    { id: "TXN-20241224-019", member: "Alice Nakamura", type: "Deposit", category: "Savings", amount: 320000, date: "2024-12-24", time: "08:30", channel: "Mobile", ref: "MPM-8761-EF", status: "Success" },
    { id: "TXN-20241224-020", member: "Brian Okello", type: "Withdrawal", category: "Savings", amount: 450000, date: "2024-12-24", time: "16:05", channel: "Counter", ref: "CTR-0036-GH", status: "Reversed" },
  ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1000000
    ? `UGX ${(n / 1000000).toFixed(2)}M`
    : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n.toLocaleString();

const INITIALS_COLORS = ["#94a3b8", "#38bdf8", "#34d399", "#f87171", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6", "#60a5fa", "#fbbf24"];

const typeConfig: Record<string, { color: string; bg: string; icon: any; sign: "+" | "-" }> = {
  Deposit: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: ArrowDownLeft, sign: "+" },
  Repayment: { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: RefreshCw, sign: "+" },
  Withdrawal: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: ArrowUpRight, sign: "-" },
  Disbursement: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Banknote, sign: "-" },
};

const statusConfig: Record<string, string> = {
  Success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Reversed: "bg-slate-700/50 text-slate-400 border-slate-600/30",
};

const statusIcon: Record<string, any> = {
  Success: CheckCircle,
  Pending: Clock,
  Failed: AlertCircle,
  Reversed: RefreshCw,
};

const channelBadge: Record<string, string> = {
  Mobile: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Counter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Transfer: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 text-sm">
      <p className="font-semibold text-slate-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-200">UGX {fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: fetchTransactions });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading SACCO platform...</p>
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
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between border-b border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium tracking-widest uppercase mb-1">
            <RefreshCw size={13} className="text-slate-400" />
            <span>Central Transaction Registry</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Ledger</h1>
          <p className="text-sm text-slate-400 mt-1">
            Audited financial movements and multi-channel asset allocations.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700/60 rounded-lg hover:bg-slate-700 hover:text-white transition-colors shadow-sm">
          <Download size={15} /> Export Ledger
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Aggregate Volume", value: fmt(stats.totalVolume.value), change: stats.totalVolume.change, up: stats.totalVolume.up, icon: RefreshCw, accent: "bg-slate-800 text-slate-300", border: "border-slate-800/80" },
          { label: "Member Deposits", value: fmt(stats.deposits.value), change: stats.deposits.change, up: stats.deposits.up, icon: ArrowDownLeft, accent: "bg-emerald-500/10 text-emerald-400", border: "border-slate-800/80" },
          { label: "Member Withdrawals", value: fmt(stats.withdrawals.value), change: stats.withdrawals.change, up: false, icon: ArrowUpRight, accent: "bg-rose-500/10 text-rose-400", border: "border-slate-800/80" },
          { label: "Failed Pipeline", value: stats.failed.value.toString(), change: Math.abs(stats.failed.change), up: true, icon: AlertCircle, accent: "bg-purple-500/10 text-purple-400", border: "border-slate-800/80" },
        ].map((s) => (
          <Card key={s.label} className={`bg-slate-900 border ${s.border} shadow-lg rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                  <s.icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${s.up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(s.change)}{typeof s.change === "number" && s.change <= 20 ? "%" : ""}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1 font-mono tracking-tight">{s.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">vs. previous audit cycle</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Daily volume area chart */}
        <Card className="xl:col-span-2 bg-slate-900 border border-slate-800/80 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-200">Daily Asset Liquidity Flow</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Comparative track of inbound deposits and outbound liquidity drawdowns</p>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 rounded inline-block" />Deposits</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose-400 rounded inline-block" />Withdrawals</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wdrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                  interval={3} tickFormatter={(v) => v.replace("Dec ", "")} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={46} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="deposits" stroke="#0ea5e9" strokeWidth={2} fill="url(#depGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="withdrawals" stroke="#f43f5e" strokeWidth={2} fill="url(#wdrGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transactions by hour */}
        <Card className="bg-slate-900 border border-slate-800/80 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200">System Load Velocity</CardTitle>
            <p className="text-xs text-slate-400">Transaction execution frequency distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip formatter={(v: any) => [v, "Transactions"]} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }} />
                <Bar dataKey="count" fill="#475569" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>

            {/* Channel breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-2">Settlement Channels</p>
              {[
                { label: "Mobile Networks", pct: 54, color: "#c084fc" },
                { label: "Over-The-Counter (OTC)", pct: 31, color: "#60a5fa" },
                { label: "Electronic Funds Transfer", pct: 15, color: "#2dd4bf" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{c.label}</span>
                    <span className="font-semibold text-slate-200">{c.pct}%</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction Table ── */}
      <Card className="bg-slate-900 border border-slate-800/80 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 bg-slate-900/40 border-b border-slate-800/60">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-slate-200">System Transaction Ledger</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Showing {filtered.length} matching administrative line-items</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-slate-700 transition-colors">
                <Search size={14} className="text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by Member, ID or Ref..."
                  className="bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500 w-48"
                />
              </div>
              {/* Type filters */}
              {["All", "Deposit", "Withdrawal", "Repayment", "Disbursement"].map((f) => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${typeFilter === f
                      ? "bg-slate-100 text-slate-900 border-white"
                      : "bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white"
                    }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400">
                  {["Member Detail", "Reference ID", "Type", "Portfolio", "Amount Matrix", "Timestamp", "Channel", "Gateway Ref", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider py-3.5 px-4 first:pl-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((txn, i) => {
                  const initials = txn.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                  const color = INITIALS_COLORS[i % INITIALS_COLORS.length];
                  const tc = typeConfig[txn.type] ?? typeConfig["Deposit"];
                  const TypeIcon = tc.icon;
                  const sc = statusConfig[txn.status] ?? statusConfig["Pending"];
                  const SIcon = statusIcon[txn.status] ?? statusIcon["Pending"];
                  return (
                    <tr key={txn.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Member */}
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: color + "15", color, border: `1px solid ${color}30` }}>
                            {initials}
                          </div>
                          <span className="font-medium text-slate-200 whitespace-nowrap">{txn.member}</span>
                        </div>
                      </td>
                      {/* ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-400 bg-slate-950 border border-slate-800/60 px-2 py-0.5 rounded">{txn.id}</span>
                      </td>
                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className={`flex items-center gap-1.5 text-[11px] font-semibold w-fit px-2 py-0.5 rounded border ${tc.bg} ${tc.color}`}>
                          <TypeIcon size={11} /> {txn.type}
                        </span>
                      </td>
                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs font-medium">{txn.category}</td>
                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <span className={`font-mono font-bold whitespace-nowrap tracking-tight ${tc.color}`}>
                          {tc.sign}{fmt(txn.amount)}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          <p className="text-slate-300 font-medium">{txn.date}</p>
                          <p className="text-slate-500 font-mono mt-0.5">{txn.time}</p>
                        </div>
                      </td>
                      {/* Channel */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${channelBadge[txn.channel] ?? ""}`}>
                          {txn.channel}
                        </span>
                      </td>
                      {/* Ref */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-400">{txn.ref}</span>
                      </td>
                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border w-fit ${sc}`}>
                          <SIcon size={11} /> {txn.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-3.5 px-4 pr-6">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-sm text-slate-500 bg-slate-900/10">
                      No matching financial recordings found inside this active ledger framework.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 pt-4 pb-4 border-t border-slate-800/80 bg-slate-950/10">
            <p className="text-xs text-slate-500">Displaying entries 1–10 of 1,284 verified transactions</p>
            <div className="flex gap-1">
              {[1, 2, 3, "…", 129].map((p, i) => (
                <button key={i} className={`w-7 h-7 text-xs rounded font-medium transition-colors ${p === 1 ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}