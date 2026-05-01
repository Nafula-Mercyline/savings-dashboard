"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
    Users, UserCheck, UserX, UserPlus, Search,
    Plus, Download, Eye, MoreHorizontal, Filter,
    Phone, Calendar, CreditCard, PiggyBank
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchMembers = async () => ({
    stats: {
        total: { value: 412, change: +8, up: true },
        active: { value: 388, change: +6, up: true },
        suspended: { value: 14, change: -2, up: true },
        newThisMonth: { value: 18, change: +18, up: true },
    },
    growth: [
        { month: "Jan", members: 340 },
        { month: "Feb", members: 348 },
        { month: "Mar", members: 355 },
        { month: "Apr", members: 361 },
        { month: "May", members: 368 },
        { month: "Jun", members: 374 },
        { month: "Jul", members: 379 },
        { month: "Aug", members: 385 },
        { month: "Sep", members: 390 },
        { month: "Oct", members: 396 },
        { month: "Nov", members: 404 },
        { month: "Dec", members: 412 },
    ],
    members: [
        { id: "MBR-001", name: "Alice Nakamura", phone: "+256 701 234 567", joined: "2021-03-15", savings: 4_250_000, loans: 1, shares: 120, status: "Active", branch: "Kampala Central" },
        { id: "MBR-002", name: "Brian Okello", phone: "+256 782 345 678", joined: "2020-07-22", savings: 12_000_000, loans: 1, shares: 340, status: "Active", branch: "Nakawa" },
        { id: "MBR-003", name: "Carol Nambi", phone: "+256 703 456 789", joined: "2022-01-10", savings: 890_000, loans: 1, shares: 60, status: "Active", branch: "Kampala Central" },
        { id: "MBR-004", name: "David Ssebunya", phone: "+256 774 567 890", joined: "2021-11-30", savings: 2_100_000, loans: 0, shares: 90, status: "Suspended", branch: "Entebbe" },
        { id: "MBR-005", name: "Eva Tumwine", phone: "+256 705 678 901", joined: "2023-05-18", savings: 560_000, loans: 1, shares: 30, status: "Active", branch: "Kampala Central" },
        { id: "MBR-006", name: "Frank Mugisha", phone: "+256 756 789 012", joined: "2019-02-14", savings: 30_000_000, loans: 1, shares: 800, status: "Active", branch: "Nakawa" },
        { id: "MBR-007", name: "Grace Atim", phone: "+256 707 890 123", joined: "2022-09-01", savings: 1_200_000, loans: 0, shares: 70, status: "Active", branch: "Entebbe" },
        { id: "MBR-008", name: "Henry Byamukama", phone: "+256 788 901 234", joined: "2024-01-20", savings: 300_000, loans: 0, shares: 10, status: "Pending", branch: "Kampala Central" },
        { id: "MBR-009", name: "Irene Apio", phone: "+256 709 012 345", joined: "2023-08-14", savings: 750_000, loans: 0, shares: 25, status: "Active", branch: "Nakawa" },
        { id: "MBR-010", name: "James Odong", phone: "+256 771 123 456", joined: "2020-04-09", savings: 5_600_000, loans: 1, shares: 210, status: "Active", branch: "Entebbe" },
    ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
    n >= 1_000_000
        ? `UGX ${(n / 1_000_000).toFixed(2)}M`
        : `UGX ${n.toLocaleString()}`;

const COLORS = ["#c9a84c", "#3ecf8e", "#63b3ed", "#f56565", "#a78bfa", "#fb923c", "#34d399", "#f472b6", "#38bdf8", "#facc15"];

const statusConfig: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Suspended: "bg-red-50 text-red-600 border border-red-200",
    Pending: "bg-amber-50 text-amber-700 border border-amber-200",
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            <p className="text-gray-600">Members: <span className="font-bold text-gray-900">{payload[0].value}</span></p>
        </div>
    );
};

// ── Page ─────────────────────────────────────────────────────
export default function MemberPage() {
    const { data, isLoading } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading member data…</p>
                </div>
            </div>
        );
    }

    const { stats, growth, members } = data;

    const filtered = members.filter((m) => {
        const matchSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.id.toLowerCase().includes(search.toLowerCase()) ||
            m.phone.includes(search);
        const matchFilter = filter === "All" || m.status === filter;
        return matchSearch && matchFilter;
    });

    return (
        <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
                        <Users size={13} />
                        <span>Member Registry</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Members</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Fiscal Year 2024 · Updated {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <Download size={15} /> Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                        <Plus size={15} /> Add Member
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: "Total Members", value: stats.total.value.toLocaleString(), change: `+${stats.total.change}`, icon: Users, accent: "bg-amber-50 text-amber-600", border: "border-amber-100" },
                    { label: "Active Members", value: stats.active.value.toLocaleString(), change: `+${stats.active.change}`, icon: UserCheck, accent: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
                    { label: "Suspended", value: stats.suspended.value.toLocaleString(), change: `${stats.suspended.change}`, icon: UserX, accent: "bg-red-50 text-red-500", border: "border-red-100" },
                    { label: "New This Month", value: stats.newThisMonth.value.toLocaleString(), change: `+${stats.newThisMonth.change}`, icon: UserPlus, accent: "bg-violet-50 text-violet-600", border: "border-violet-100" },
                ].map((s) => (
                    <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                                    <s.icon size={18} />
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                                    {s.change} this month
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{s.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Growth Chart + Branch Split ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Membership growth */}
                <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-gray-800">Membership Growth</CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">Cumulative members — January to December 2024</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={growth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis domain={[300, 430]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="members" stroke="#f59e0b" strokeWidth={2.5}
                                    fill="url(#memberGrad)" dot={false} activeDot={{ r: 5, fill: "#f59e0b" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Branch breakdown */}
                <Card className="border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-gray-800">By Branch</CardTitle>
                        <p className="text-xs text-gray-400">Member distribution</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { branch: "Kampala Central", count: 198, pct: 48, color: "#c9a84c" },
                            { branch: "Nakawa", count: 124, pct: 30, color: "#3ecf8e" },
                            { branch: "Entebbe", count: 90, pct: 22, color: "#63b3ed" },
                        ].map((b) => (
                            <div key={b.branch}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-gray-700">{b.branch}</span>
                                    <span className="text-xs text-gray-400">{b.count} members · <span className="font-semibold" style={{ color: b.color }}>{b.pct}%</span></span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                                </div>
                            </div>
                        ))}

                        <div className="pt-3 border-t border-gray-100 space-y-2">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Member Status</p>
                            {[
                                { label: "Active", count: 388, color: "#3ecf8e" },
                                { label: "Suspended", count: 14, color: "#f56565" },
                                { label: "Pending", count: 10, color: "#f59e0b" },
                            ].map((s) => (
                                <div key={s.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                        <span className="text-sm text-gray-600">{s.label}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 font-mono">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Member Table ── */}
            <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-0">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <CardTitle className="text-base font-semibold text-gray-800">Member Directory</CardTitle>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {members.length} members</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Search */}
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                                <Search size={14} className="text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, ID or phone…"
                                    className="text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400 w-48"
                                />
                            </div>
                            {/* Filters */}
                            {["All", "Active", "Suspended", "Pending"].map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === f
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
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
                                {["Member", "Member ID", "Phone", "Branch", "Joined", "Savings", "Loans", "Shares", "Status", ""].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-4 first:pl-6">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                                        No members match your search.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m, i) => {
                                    const initials = m.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                                    const color = COLORS[i % COLORS.length];
                                    return (
                                        <tr key={m.id} className="hover:bg-gray-50/70 transition-colors group">
                                            <td className="py-3.5 pl-6 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                        style={{ background: color + "22", color, border: `1.5px solid ${color}44` }}>
                                                        {initials}
                                                    </div>
                                                    <span className="font-medium text-gray-800 whitespace-nowrap">{m.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{m.id}</span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                    <Phone size={12} />
                                                    {m.phone}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">{m.branch}</td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                                    <Calendar size={11} />
                                                    {m.joined}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <PiggyBank size={12} className="text-amber-400" />
                                                    <span className="font-mono font-semibold text-gray-800 text-xs">{fmt(m.savings)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {m.loans > 0
                                                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100"><CreditCard size={10} />{m.loans}</span>
                                                    : <span className="text-gray-300 text-xs">—</span>
                                                }
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono text-sm font-semibold text-amber-600">{m.shares}</span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[m.status]}`}>
                                                    {m.status}
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
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 pt-4 border-t border-gray-100 mt-2">
                        <p className="text-xs text-gray-400">Showing 1–10 of 412 members</p>
                        <div className="flex gap-1">
                            {[1, 2, 3, "…", 42].map((p, i) => (
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
