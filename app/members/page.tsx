"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PiggyBank, Wallet, CreditCard, Pencil, Plus, X, Download, Search, Phone, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import {
    computeDashboard,
    loadData,
    money,
    saveData,
    uid,
    upsertMember,
    type Member,
    type MemberRow,
    type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const btnBase =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const inputCls =
    "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";

const COLORS = ["#d4af37", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#eab308"];
const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));
const initials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
const niceDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" }) : "–";

type ModalState = { kind: "member"; id: string | null } | null;
type Filter = "all" | "owing" | "clear";

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h2>
                    <button type="button" onClick={onClose} className={iconBtn} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-[10px] text-slate-500">{hint}</span> : null}
        </label>
    );
}

function FormActions({ onClose, error, label = "Save", left }: { onClose: () => void; error?: string; label?: string; left?: ReactNode }) {
    return (
        <div className="mt-5">
            {error ? <p className="mb-3 text-xs font-semibold text-rose-400">{error}</p> : null}
            <div className="flex items-center justify-between gap-2">
                <div>{left}</div>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className={btnGhost}>
                        Cancel
                    </button>
                    <button type="submit" className={btnPrimary}>
                        {label}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MemberForm({
    initial,
    defaultOpening,
    names,
    onSave,
    onClose,
}: {
    initial: Member | null;
    defaultOpening: number;
    names: string[];
    onSave: (m: Member) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? "");
    const [opening, setOpening] = useState(String(initial?.opening ?? defaultOpening));
    const [joined, setJoined] = useState(initial?.joined ?? "");
    const [phone, setPhone] = useState(initial?.phone ?? "");
    const [err, setErr] = useState("");

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const clean = name.split(/\s+/).filter(Boolean).join(" ");
        const o = num(opening);
        if (!clean) return setErr("Enter the member's name.");
        if (names.some((n) => n.toLowerCase() === clean.toLowerCase())) return setErr("A member with this name already exists.");
        if (!Number.isFinite(o) || o < 0) return setErr("Opening balance must be 0 or more.");
        onSave({ id: initial?.id ?? uid("m"), name: clean, opening: Math.round(o), joined: joined || null, phone: phone.trim() });
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <Field label="Full name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Opening balance (UGX)">
                    <input className={inputCls} inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} />
                </Field>
                <Field label="Date joined">
                    <input className={inputCls} type="date" value={joined} onChange={(e) => setJoined(e.target.value)} />
                </Field>
            </div>
            <Field label="Phone (optional)">
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <FormActions onClose={onClose} error={err} label={initial ? "Save changes" : "Add member"} />
        </form>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, unit, sub, icon: Icon, tint }: { label: string; value: string; unit?: string; sub: string; icon: typeof Users; tint: string }) {
    return (
        <Card className="border-slate-900 bg-slate-900/40">
            <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${tint}`}>
                        <Icon size={18} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                </div>
                <p className="font-mono text-2xl font-bold tracking-tight text-white">
                    {unit ? <span className="mr-1.5 text-xs font-semibold text-slate-500">{unit}</span> : null}
                    {value}
                </p>
                <p className="mt-3 border-t border-slate-900 pt-3 text-xs font-medium text-slate-500">{sub}</p>
            </CardContent>
        </Card>
    );
}

export default function MembersPage() {
    const [data, setData] = useState<SaccoData | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [query, setQuery] = useState("");
    const [modal, setModal] = useState<ModalState>(null);
    const [notice, setNotice] = useState("");
    const [saveFailed, setSaveFailed] = useState(false);

    useEffect(() => {
        setData(loadData());
    }, []);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(""), 4000);
        return () => clearTimeout(t);
    }, [notice]);

    const dash = useMemo(() => (data ? computeDashboard(data, "all") : null), [data]);

    // Loans each member has not finished repaying
    const openLoans = useMemo(() => {
        const map = new Map<string, number>();
        for (const l of dash?.loans ?? []) if (l.open) map.set(l.memberId, (map.get(l.memberId) ?? 0) + 1);
        return map;
    }, [dash]);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (dash?.members ?? []).filter((m) => {
            const owing = (openLoans.get(m.id) ?? 0) > 0;
            if (filter === "owing" && !owing) return false;
            if (filter === "clear" && owing) return false;
            return !q || m.name.toLowerCase().includes(q) || m.phone.toLowerCase().includes(q);
        });
    }, [dash, filter, query, openLoans]);

    if (!data || !dash) {
        return (
            <div className="flex min-h-[400px] items-center justify-center bg-slate-950">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    const commit = (next: SaccoData, message: string) => {
        setData(next);
        setSaveFailed(!saveData(next));
        setModal(null);
        setNotice(message);
    };

    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
    const joinedOf = (id: string) => data.members.find((m) => m.id === id)?.joined ?? null;
    const T = dash.memberTotals;
    const owingCount = dash.members.filter((m) => (openLoans.get(m.id) ?? 0) > 0).length;
    const editing = modal?.kind === "member" && modal.id ? data.members.find((m) => m.id === modal.id) ?? null : null;

    const exportCsv = () => {
        const head = "Member,Phone,Date joined,Shares,Savings (UGX),Opening balance (UGX),Owed (UGX),Net position (UGX)\n";
        const body = dash.members
            .map((m) => `"${m.name.replace(/"/g, '""')}","${m.phone}",${joinedOf(m.id) ?? ""},${m.shares},${m.saved},${m.opening},${m.owed},${m.net}`)
            .join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8;" }));
        link.download = `members_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quatres Savings Group</p>
                    <h1 className="text-2xl font-black tracking-tight text-white">Members</h1>
                    <p className="mt-1 text-xs font-medium text-slate-400">Everyone in the group, with their shares, savings and loans · {today}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className={btnGhost} onClick={exportCsv}>
                        <Download size={14} /> Export CSV
                    </button>
                    <button className={btnPrimary} onClick={() => setModal({ kind: "member", id: null })}>
                        <Plus size={14} /> Add member
                    </button>
                </div>
            </div>

            {notice ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle size={14} /> {notice}
                </div>
            ) : null}
            {saveFailed ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400">
                    <AlertTriangle size={14} /> This browser could not save your changes. They will be lost when you close the page.
                </div>
            ) : null}

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Members" value={money(dash.members.length)} sub="In the savings group" icon={Users} tint="bg-amber-500/10 text-amber-400" />
                <Kpi label="Shares held" value={fmtShares(T.shares)} sub={`1 share = UGX ${money(data.settings.shareValue)}`} icon={PiggyBank} tint="bg-emerald-500/10 text-emerald-400" />
                <Kpi label="Total savings" unit="UGX" value={money(T.saved)} sub={`Plus UGX ${money(T.opening)} in opening balances`} icon={Wallet} tint="bg-blue-500/10 text-blue-400" />
                <Kpi label="Members owing" value={money(owingCount)} sub={`UGX ${money(T.owed)} still owed in loans`} icon={CreditCard} tint="bg-orange-500/10 text-orange-400" />
            </div>

            {/* Register */}
            <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
                <CardHeader className="border-b border-slate-900/60 pb-4">
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Member register</CardTitle>
                            <p className="mt-0.5 text-xs text-slate-400">
                                {rows.length} of {dash.members.length} members
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1">
                                {([["all", "All"], ["owing", "Owing a loan"], ["clear", "No loan owed"]] as const).map(([f, label]) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${filter === f ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                                <input className={`${inputCls} pl-8 sm:w-52`} placeholder="Search name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-900 bg-slate-950/40">
                                    <th className={thCls}>Member</th>
                                    <th className={thCls}>Phone</th>
                                    <th className={thCls}>Joined</th>
                                    <th className={`${thCls} text-right`}>Shares</th>
                                    <th className={`${thCls} text-right`}>Savings</th>
                                    <th className={`${thCls} text-right`}>Opening</th>
                                    <th className={thCls}>Loans owing</th>
                                    <th className={`${thCls} text-right`}>Net position</th>
                                    <th className={thCls}></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-10 text-center text-slate-500">
                                            No members match.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((m: MemberRow, i) => {
                                        const color = COLORS[i % COLORS.length];
                                        const owing = openLoans.get(m.id) ?? 0;
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-900/60">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                                                            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                                                        >
                                                            {initials(m.name)}
                                                        </div>
                                                        <span className="whitespace-nowrap font-bold text-slate-200">{m.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">
                                                    {m.phone ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <Phone size={11} className="text-slate-500" />
                                                            {m.phone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600">–</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={11} className="text-slate-500" />
                                                        {niceDate(joinedOf(m.id))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-300">{fmtShares(m.shares)}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">{money(m.saved)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-400">{money(m.opening)}</td>
                                                <td className="px-4 py-3">
                                                    {owing > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-400">
                                                            <CreditCard size={10} />
                                                            {owing} · UGX {money(m.owed)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600">–</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">{money(m.net)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end">
                                                        <button className={iconBtn} aria-label={`Edit ${m.name}`} onClick={() => setModal({ kind: "member", id: m.id })}>
                                                            <Pencil size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {rows.length > 0 && !query && filter === "all" ? (
                                <tfoot>
                                    <tr className="border-t border-slate-800 bg-slate-950/40 font-bold">
                                        <td className="px-4 py-3 text-slate-300">Total</td>
                                        <td />
                                        <td />
                                        <td className="px-4 py-3 text-right font-mono text-slate-200">{fmtShares(T.shares)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-amber-400">{money(T.saved)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.opening)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-300">UGX {money(T.owed)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-100">{money(T.net)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            ) : null}
                        </table>
                    </div>
                </CardContent>
            </Card>

            {modal?.kind === "member" ? (
                <Modal title={editing ? "Edit member" : "Add member"} onClose={() => setModal(null)}>
                    <MemberForm
                        initial={editing}
                        defaultOpening={data.settings.openingBalance}
                        names={data.members.filter((m) => m.id !== editing?.id).map((m) => m.name)}
                        onClose={() => setModal(null)}
                        onSave={(m: Member) => commit(upsertMember(data, m), editing ? "Member updated." : "Member added.")}
                    />
                </Modal>
            ) : null}
        </div>
    );
}
