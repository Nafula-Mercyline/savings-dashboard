"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Search,
    Plus,
    Download,
    Eye,
    MoreHorizontal,
    Phone,
    Calendar,
    CreditCard,
    PiggyBank,
} from "lucide-react";
import { getMembers, getMembersDashboard } from "@/lib/api/membersService";

type MemberMetric = { value: number; change: number; up: boolean };
type GrowthPoint = { month: string; members: number };
type BranchSummary = { branch: string; count: number; pct: number; color: string };
type StatusSummary = { label: string; count: number; color: string };
type Member = {
    id: string;
    name: string;
    phone: string;
    joined: string;
    savings: number;
    loans: number;
    shares: number;
    status: string;
    branch: string;
};

type MembersDashboardData = {
    stats: {
        total: MemberMetric;
        active: MemberMetric;
        suspended: MemberMetric;
        newThisMonth: MemberMetric;
    };
    growth: GrowthPoint[];
    branchSummary?: BranchSummary[];
    statusSummary?: StatusSummary[];
    members: Member[];
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};

const emptyMembersDashboard: MembersDashboardData = {
    stats: {
        total: { value: 0, change: 0, up: true },
        active: { value: 0, change: 0, up: true },
        suspended: { value: 0, change: 0, up: true },
        newThisMonth: { value: 0, change: 0, up: true },
    },
    growth: [],
    branchSummary: [],
    statusSummary: [],
    members: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
};

// Premium institutional color scheme (Deep Golds, Emeralds, Slates)
const COLORS = ["#d4af37", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#eab308"];

const statusConfig: Record<string, string> = {
    Active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    Suspended: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    Pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const fmt = (amount = 0) =>
    amount >= 1_000_000 ? `UGX ${(amount / 1_000_000).toFixed(2)}M` : `UGX ${amount.toLocaleString()}`;

function getInitials(name = "") {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function buildBranchSummary(members: Member[]) {
    const total = members.length || 1;
    const counts = members.reduce<Record<string, number>>((acc, member) => {
        acc[member.branch] = (acc[member.branch] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts).map(([branch, count], index) => ({
        branch,
        count,
        pct: Math.round((count / total) * 100),
        color: COLORS[index % COLORS.length],
    }));
}

function buildStatusSummary(members: Member[]) {
    const statusColors: Record<string, string> = {
        Active: "#10b981",
        Suspended: "#ef4444",
        Pending: "#f59e0b",
    };

    const counts = members.reduce<Record<string, number>>((acc, member) => {
        acc[member.status] = (acc[member.status] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts).map(([label, count], index) => ({
        label,
        count,
        color: statusColors[label] || COLORS[index % COLORS.length],
    }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm shadow-2xl">
            <p className="mb-1 font-semibold text-slate-300">{label}</p>
            <p className="text-slate-400">
                Members: <span className="font-bold text-amber-400">{payload[0].value}</span>
            </p>
        </div>
    );
};

export default function MemberPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [page, setPage] = useState(1);
    const year = "2024";

    const { data, error, isFetching, isLoading } = useQuery<MembersDashboardData>({
        queryKey: ["members-dashboard", year, page],
        queryFn: () => getMembersDashboard({ year, page, pageSize: 10 }),
        staleTime: 60_000,
    });

    const dashboard = data ?? emptyMembersDashboard;
    const { stats, growth, members, pagination } = dashboard;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return members.filter((member) => {
            const matchSearch =
                !term ||
                member.name.toLowerCase().includes(term) ||
                member.id.toLowerCase().includes(term) ||
                member.phone.toLowerCase().includes(term);
            const matchFilter = filter === "All" || member.status === filter;
            return matchSearch && matchFilter;
        });
    }, [filter, members, search]);

    const branchSummary = dashboard.branchSummary?.length ? dashboard.branchSummary : buildBranchSummary(members);
    const statusSummary = dashboard.statusSummary?.length ? dashboard.statusSummary : buildStatusSummary(members);

    const kpis = [
        { label: "Total Members", value: stats.total.value.toLocaleString(), change: stats.total.change, up: stats.total.up, icon: Users, accent: "bg-amber-500/10 text-amber-400", border: "border-slate-800" },
        { label: "Active Members", value: stats.active.value.toLocaleString(), change: stats.active.change, up: stats.active.up, icon: UserCheck, accent: "bg-emerald-500/10 text-emerald-400", border: "border-slate-800" },
        { label: "Suspended", value: stats.suspended.value.toLocaleString(), change: stats.suspended.change, up: stats.suspended.up, icon: UserX, accent: "bg-rose-500/10 text-rose-400", border: "border-slate-800" },
        { label: "New This Month", value: stats.newThisMonth.value.toLocaleString(), change: stats.newThisMonth.change, up: stats.newThisMonth.up, icon: UserPlus, accent: "bg-indigo-500/10 text-indigo-400", border: "border-slate-800" },
    ];

    const handleExport = () => {
        getMembers({ format: "csv", status: filter === "All" ? undefined : filter, search });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#12141c]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <p className="text-sm font-medium text-slate-500">Loading SACCO member registry Data…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 bg-[#12141c] p-6 text-slate-100 antialiased">
            {/* Header section */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-500/90">
                        <Users size={13} />
                        <span>SACCO Member Registry</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Registry Directory</h1>
                    <p className="mt-1 text-xs text-slate-400">
                        Fiscal Year {year} &bull; System Date: {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
                        {isFetching ? " &bull; Syncing operational records..." : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button onClick={handleExport} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm transition-all hover:bg-slate-800/80 hover:text-white">
                        <Download size={15} /> Export Registry
                    </button>
                    <a href="/member/new" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-amber-500/10 transition-all hover:brightness-110">
                        <Plus size={15} /> Onboard Member
                    </a>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                    Database Communication Failure: {(error as Error).message}
                </div>
            ) : null}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item) => (
                    <Card key={item.label} className="border-slate-800/80 bg-slate-900/40 shadow-sm backdrop-blur-md">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className={`rounded-xl p-2.5 ${item.accent}`}>
                                    <item.icon size={18} />
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${item.up ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                    {item.change > 0 ? "+" : ""}{item.change} MoM
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                                <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-white">{item.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts & Analytics */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="border-slate-800/80 bg-slate-900/40 xl:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Membership Growth Metrics</CardTitle>
                        <p className="text-xs text-slate-500">Cumulative historical metrics &bull; {year}</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={growth} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="members" stroke="#d4af37" strokeWidth={2} fill="url(#memberGrad)" dot={false} activeDot={{ r: 4, fill: "#d4af37" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-slate-800/80 bg-slate-900/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Operational Allocations</CardTitle>
                        <p className="text-xs text-slate-500">Regional & programmatic metrics</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">By Branch Network</p>
                            {branchSummary.map((branch) => (
                                <div key={branch.branch}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-medium text-slate-300">{branch.branch}</span>
                                        <span className="text-slate-400">
                                            {branch.count} accounts &bull; <span className="font-bold" style={{ color: branch.color }}>{branch.pct}%</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${branch.pct}%`, background: branch.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 border-t border-slate-800/60 pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account Classification</p>
                            {statusSummary.map((status) => (
                                <div key={status.label} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                                        <span className="text-slate-300">{status.label}</span>
                                    </div>
                                    <span className="font-mono font-semibold text-slate-200">{status.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Core Data Directory */}
            <Card className="border-slate-800/80 bg-slate-900/40 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Member Asset Ledger</CardTitle>
                            <p className="text-xs text-slate-500">Displaying {filtered.length} matching entries of {members.length} records</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 shadow-inner">
                                <Search size={14} className="text-slate-500" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Query Registry..."
                                    className="w-40 bg-transparent text-xs text-slate-200 outline-none placeholder-slate-500 transition-all focus:w-48"
                                />
                            </div>
                            {["All", "Active", "Suspended", "Pending"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${filter === status ? "border-amber-500/30 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10" : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {["Member Account", "Account ID", "Phone Signature", "Branch Node", "Activation Date", "Savings Balance", "Active Facility", "Share Capital", "Status", ""].map((heading) => (
                                    <th key={heading} className="px-4 py-3 first:pl-6">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/10">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-xs text-slate-500">No organizational records correspond to your query parameters.</td>
                                </tr>
                            ) : (
                                filtered.map((member, index) => {
                                    const color = COLORS[index % COLORS.length];
                                    return (
                                        <tr key={member.id} className="group transition-colors hover:bg-slate-800/40">
                                            <td className="py-3.5 pl-6 pr-4 font-medium text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                                                        {getInitials(member.name)}
                                                    </div>
                                                    <span className="whitespace-nowrap">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5"><span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-400">{member.id}</span></td>
                                            <td className="px-4 py-3.5 text-slate-400"><div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" />{member.phone}</div></td>
                                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{member.branch}</td>
                                            <td className="px-4 py-3.5 text-slate-400"><div className="flex items-center gap-1.5"><Calendar size={11} className="text-slate-500" />{member.joined}</div></td>
                                            <td className="px-4 py-3.5"><div className="flex items-center gap-1.5"><PiggyBank size={12} className="text-amber-500/80" /><span className="font-mono font-semibold text-slate-100">{fmt(member.savings)}</span></div></td>
                                            <td className="px-4 py-3.5">
                                                {member.loans > 0 ? <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-400"><CreditCard size={10} />{member.loans} Active</span> : <span className="text-slate-600">&mdash;</span>}
                                            </td>
                                            <td className="px-4 py-3.5"><span className="font-mono font-semibold text-amber-500">{member.shares}</span></td>
                                            <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusConfig[member.status] ?? statusConfig.Pending}`}>{member.status}</span></td>
                                            <td className="py-3.5 pl-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <a href={`/member/${member.id}`} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"><Eye size={14} /></a>
                                                    <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"><MoreHorizontal size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-slate-800/60 bg-slate-950/20 px-6 py-4">
                        <p className="text-xs text-slate-500">
                            Showing page {pagination?.page ?? page} of {pagination?.totalPages ?? 1} &bull; Total records: {pagination?.total ?? members.length}
                        </p>
                        <div className="flex gap-1.5">
                            {Array.from({ length: Math.min(pagination?.totalPages ?? 1, 5) }, (_, index) => index + 1).map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    onClick={() => setPage(pageNumber)}
                                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${pageNumber === page ? "bg-amber-500 text-slate-950" : "bg-slate-900 border border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
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