"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line
} from "recharts";
import {
    TrendingUp, TrendingDown, Percent, Calculator,
    Download, ChevronUp, ChevronDown, AlertCircle, CheckCircle
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────
const fetchInterest = async () => ({
    stats: {
        totalEarned: { value: 48_300_000, change: +7.1, up: true },
        totalPaid: { value: 12_600_000, change: +7.3, up: false },
        netIncome: { value: 35_700_000, change: +7.0, up: true },
        nim: { value: 3.82, change: +0.18, up: true },
    },
    monthly: [
        { month: "Jan", earned: 2_820_000, paid: 840_000, net: 1_980_000 },
        { month: "Feb", earned: 3_100_000, paid: 910_000, net: 2_190_000 },
        { month: "Mar", earned: 3_340_000, paid: 980_000, net: 2_360_000 },
        { month: "Apr", earned: 3_780_000, paid: 1_050_000, net: 2_730_000 },
        { month: "May", earned: 4_020_000, paid: 1_110_000, net: 2_910_000 },
        { month: "Jun", earned: 4_450_000, paid: 1_220_000, net: 3_230_000 },
        { month: "Jul", earned: 4_820_000, paid: 1_240_000, net: 3_580_000 },
        { month: "Aug", earned: 5_100_000, paid: 1_310_000, net: 3_790_000 },
        { month: "Sep", earned: 5_340_000, paid: 1_380_000, net: 3_960_000 },
        { month: "Oct", earned: 5_780_000, paid: 1_450_000, net: 4_330_000 },
        { month: "Nov", earned: 6_020_000, paid: 1_510_000, net: 4_510_000 },
        { month: "Dec", earned: 6_450_000, paid: 1_620_000, net: 4_830_000 },
    ],
    products: [
        { name: "Personal Loans", rate: 18.0, balance: 28_500_000, monthly: 427_500, type: "income", color: "#c9a84c" },
        { name: "Business Loans", rate: 15.5, balance: 59_000_000, monthly: 762_083, type: "income", color: "#3ecf8e" },
        { name: "Emergency Loans", rate: 12.0, balance: 4_800_000, monthly: 48_000, type: "income", color: "#63b3ed" },
        { name: "Education Loans", rate: 10.0, balance: 8_000_000, monthly: 66_667, type: "income", color: "#a78bfa" },
        { name: "Regular Savings", rate: 5.0, balance: 18_200_000, monthly: 75_833, type: "expense", color: "#fb923c" },
        { name: "Fixed Deposits", rate: 9.0, balance: 42_000_000, monthly: 315_000, type: "expense", color: "#f56565" },
        { name: "Holiday Savings", rate: 4.0, balance: 7_800_000, monthly: 26_000, type: "expense", color: "#34d399" },
        { name: "Junior Savings", rate: 3.0, balance: 2_100_000, monthly: 5_250, type: "expense", color: "#f472b6" },
    ],
    pending: [
        { member: "Brian Okello", product: "Business Loan", amount: 762_083, dueDate: "2025-01-15", status: "Due Soon" },
        { member: "Carol Nambi", product: "Emergency Loan", amount: 48_000, dueDate: "2024-12-31", status: "Overdue" },
        { member: "Frank Mugisha", product: "Business Loan", amount: 316_667, dueDate: "2025-01-08", status: "Overdue" },
        { member: "Eva Tumwine", product: "Education Loan", amount: 66_667, dueDate: "2025-02-05", status: "Due Soon" },
        { member: "Alice Nakamura", product: "Personal Loan", amount: 75_000, dueDate: "2025-01-20", status: "Due Soon" },
    ],
});

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) =>
    n >= 1_000_000
        ? `UGX ${(n / 1_000_000).toFixed(2)}M`
        : `UGX ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

const INITIALS_COLORS = ["#c9a84c", "#3ecf8e", "#63b3ed", "#f56565", "#a78bfa", "#fb923c"];

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
export default function InterestSummaryPage() {
    const { data, isLoading } = useQuery({ queryKey: ["interest"], queryFn: fetchInterest });

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading interest data…</p>
                </div>
            </div>
        );
    }

    const { stats, monthly, products, pending } = data;
    const incomeProducts = products.filter(p => p.type === "income");
    const expenseProducts = products.filter(p => p.type === "expense");
    const totalIncome = incomeProducts.reduce((s, p) => s + p.monthly, 0);
    const totalExpense = expenseProducts.reduce((s, p) => s + p.monthly, 0);

    return (
        <div className="min-h-screen bg-gray-50/60 p-6 space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">
                        <Percent size={13} />
                        <span>Interest Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Interest Summary</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Fiscal Year 2024 · Updated {new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    <Download size={15} /> Export Report
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: "Total Interest Earned", value: fmt(stats.totalEarned.value), change: stats.totalEarned.change, up: stats.totalEarned.up, icon: TrendingUp, accent: "bg-amber-50 text-amber-600", border: "border-amber-100" },
                    { label: "Total Interest Paid", value: fmt(stats.totalPaid.value), change: stats.totalPaid.change, up: false, icon: TrendingDown, accent: "bg-red-50 text-red-500", border: "border-red-100" },
                    { label: "Net Interest Income", value: fmt(stats.netIncome.value), change: stats.netIncome.change, up: stats.netIncome.up, icon: Calculator, accent: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
                    { label: "Net Interest Margin", value: `${stats.nim.value}%`, change: stats.nim.change, up: stats.nim.up, icon: Percent, accent: "bg-violet-50 text-violet-600", border: "border-violet-100" },
                ].map((s) => (
                    <Card key={s.label} className={`border ${s.border} shadow-sm hover:shadow-md transition-shadow`}>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-xl ${s.accent}`}>
                                    <s.icon size={18} />
                                </div>
                                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${s.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                                    }`}>
                                    {s.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {Math.abs(s.change)}%
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

            {/* ── Trend Charts ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Area chart — earned vs paid vs net */}
                <Card className="xl:col-span-2 border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-800">Interest Trend — 2024</CardTitle>
                                <p className="text-xs text-gray-400 mt-0.5">Earned, paid, and net interest income monthly</p>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded inline-block" />Earned</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 rounded inline-block" />Paid</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" />Net</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <defs>
                                    {[
                                        { id: "earnedGrad", color: "#f59e0b" },
                                        { id: "paidGrad", color: "#f56565" },
                                        { id: "netGrad", color: "#3ecf8e" },
                                    ].map(g => (
                                        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={g.color} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="earned" stroke="#f59e0b" strokeWidth={2} fill="url(#earnedGrad)" dot={false} activeDot={{ r: 5 }} />
                                <Area type="monotone" dataKey="paid" stroke="#f56565" strokeWidth={2} fill="url(#paidGrad)" dot={false} activeDot={{ r: 5 }} />
                                <Area type="monotone" dataKey="net" stroke="#3ecf8e" strokeWidth={2} fill="url(#netGrad)" dot={false} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* This month summary panel */}
                <Card className="border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-gray-800">December 2024</CardTitle>
                        <p className="text-xs text-gray-400">Monthly interest breakdown</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            { label: "Gross Interest Earned", value: monthly[11].earned, color: "text-amber-600", bg: "bg-amber-50", icon: TrendingUp },
                            { label: "Interest Paid Out", value: monthly[11].paid, color: "text-red-500", bg: "bg-red-50", icon: TrendingDown },
                            { label: "Net Interest Income", value: monthly[11].net, color: "text-emerald-600", bg: "bg-emerald-50", icon: Calculator },
                        ].map((item) => (
                            <div key={item.label} className={`flex items-center justify-between p-3 ${item.bg} rounded-xl`}>
                                <div className="flex items-center gap-2">
                                    <item.icon size={15} className={item.color} />
                                    <span className="text-xs font-medium text-gray-600">{item.label}</span>
                                </div>
                                <span className={`text-sm font-bold font-mono ${item.color}`}>{fmt(item.value)}</span>
                            </div>
                        ))}

                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">NIM Trend (6 months)</p>
                            <ResponsiveContainer width="100%" height={70}>
                                <LineChart data={monthly.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Line type="monotone" dataKey="net" stroke="#c9a84c" strokeWidth={2} dot={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v: any) => [`UGX ${fmtShort(v)}`, "Net"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Income vs Expense Products ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Income — loans */}
                <Card className="border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-800">Interest Income</CardTitle>
                                <p className="text-xs text-gray-400 mt-0.5">From loan products · UGX {fmtShort(totalIncome)} / month</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                Income
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {incomeProducts.map((p) => {
                            const pct = Math.round((p.monthly / totalIncome) * 100);
                            return (
                                <div key={p.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                            <span className="text-sm font-medium text-gray-700">{p.name}</span>
                                            <span className="text-xs text-gray-400">@ {p.rate}%</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono font-semibold text-gray-800">{fmt(p.monthly)}/mo</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Balance: {fmt(p.balance)}</p>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Expense — savings */}
                <Card className="border border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-800">Interest Expense</CardTitle>
                                <p className="text-xs text-gray-400 mt-0.5">On savings products · UGX {fmtShort(totalExpense)} / month</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
                                Expense
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {expenseProducts.map((p) => {
                            const pct = Math.round((p.monthly / totalExpense) * 100);
                            return (
                                <div key={p.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                            <span className="text-sm font-medium text-gray-700">{p.name}</span>
                                            <span className="text-xs text-gray-400">@ {p.rate}%</span>
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-gray-800">{fmt(p.monthly)}/mo</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Balance: {fmt(p.balance)}</p>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* ── Pending Interest Table ── */}
            <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold text-gray-800">Pending Interest Collections</CardTitle>
                            <p className="text-xs text-gray-400 mt-0.5">{pending.length} accounts with interest due</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                <AlertCircle size={13} /> 2 overdue
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                <AlertCircle size={13} /> 3 due soon
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 px-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {["Member", "Product", "Interest Due", "Due Date", "Status", ""].map((h) => (
                                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-6">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {pending.map((p, i) => {
                                const initials = p.member.split(" ").map((n) => n[0]).join("").slice(0, 2);
                                const color = INITIALS_COLORS[i % INITIALS_COLORS.length];
                                const isOverdue = p.status === "Overdue";
                                return (
                                    <tr key={i} className="hover:bg-gray-50/70 transition-colors group">
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                                    style={{ background: color + "22", color, border: `1.5px solid ${color}40` }}>
                                                    {initials}
                                                </div>
                                                <span className="font-medium text-gray-800">{p.member}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-6 text-gray-600">{p.product}</td>
                                        <td className="py-3.5 px-6">
                                            <span className="font-mono font-semibold text-gray-900">{fmt(p.amount)}</span>
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                                                {p.dueDate}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOverdue
                                                    ? "bg-red-50 text-red-600 border border-red-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                                }`}>
                                                {isOverdue
                                                    ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />{p.status}</>
                                                    : <><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />{p.status}</>
                                                }
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100">
                                                    <CheckCircle size={12} /> Collect
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

        </div>
    );
}
