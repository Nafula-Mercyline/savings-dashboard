"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PiggyBank, Users, Wallet, TrendingUp, Pencil, Plus, X, Download, CheckCircle, AlertTriangle, Search } from "lucide-react";
import {
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  saveData,
  setMonthEntries,
  uid,
  upsertMember,
  type Dashboard,
  type Member,
  type MemberRow,
  type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const C_SAVINGS = "#3987e5";
const SURFACE = "#070d1f";
const GRID = "#131c33";
const TEXT_SECONDARY = "#94a3b8";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const btnAdd = `${btnBase} border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400 hover:bg-amber-500/20`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";

const axisFmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));

type ModalState = { kind: "month" } | { kind: "member"; id: string | null } | { kind: "saving"; id: string | null } | null;

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

// One routine for the end of each month: shares bought by every member + interest collected.
function MonthForm({
  data,
  dash,
  onSave,
  onClose,
}: {
  data: SaccoData;
  dash: Dashboard;
  onSave: (month: string, shares: Record<string, number>, interest: number) => void;
  onClose: () => void;
}) {
  const shareValue = data.settings.shareValue;
  const initFor = (m: string) => ({
    values: Object.fromEntries(
      data.members.map((mem) => [mem.id, data.savings[mem.id]?.[m] ? String(data.savings[mem.id][m]) : ""])
    ) as Record<string, string>,
    interest: data.interest[m] ? String(data.interest[m]) : "",
  });

  const [month, setMonth] = useState(dash.defaultMonth);
  const [form, setForm] = useState(() => initFor(dash.defaultMonth));
  const [err, setErr] = useState("");

  const changeMonth = (m: string) => {
    setMonth(m);
    setForm(initFor(m));
    setErr("");
  };

  const totalShares = data.members.reduce((a, m) => {
    const v = num(form.values[m.id] ?? "");
    return a + (Number.isFinite(v) && v > 0 ? v : 0);
  }, 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const shares: Record<string, number> = {};
    for (const m of data.members) {
      const v = num(form.values[m.id] ?? "");
      if (!Number.isFinite(v) || v < 0) return setErr(`Check the shares for ${m.name}: use 0 or more.`);
      shares[m.id] = v;
    }
    const interest = num(form.interest);
    if (!Number.isFinite(interest) || interest < 0) return setErr("Interest collected must be 0 or more.");
    onSave(month, shares, Math.round(interest));
  };

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Month">
          <select className={inputCls} value={month} onChange={(e) => changeMonth(e.target.value)}>
            {dash.monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interest collected (UGX)" hint="From loans, this month">
          <input
            className={inputCls}
            inputMode="numeric"
            value={form.interest}
            onChange={(e) => setForm({ ...form, interest: e.target.value })}
            placeholder="0"
          />
        </Field>
      </div>

      <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Shares bought this month (1 share = UGX {money(shareValue)})
      </p>
      <div className="grid max-h-[42vh] grid-cols-1 gap-x-6 gap-y-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {data.members.map((m) => (
          <label key={m.id} className="flex items-center justify-between gap-3 py-0.5">
            <span className="truncate text-xs text-slate-300">{m.name}</span>
            <input
              className={`${inputCls} w-20 text-right`}
              inputMode="decimal"
              value={form.values[m.id] ?? ""}
              onChange={(e) => setForm({ ...form, values: { ...form.values, [m.id]: e.target.value } })}
              placeholder="0"
              aria-label={`Shares for ${m.name}`}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Total: <span className="font-mono font-bold text-slate-200">{fmtShares(totalShares)}</span> shares = UGX{" "}
        <span className="font-mono font-bold text-slate-200">{money(totalShares * shareValue)}</span>
      </p>
      <p className="mt-1 text-[10px] text-slate-500">Saving a month that already has figures replaces them.</p>
      <FormActions onClose={onClose} error={err} label="Save month" />
    </form>
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

// Add or correct the shares one member bought in one month.
function MemberSavingForm({
  data,
  dash,
  memberId,
  onSave,
  onClose,
}: {
  data: SaccoData;
  dash: Dashboard;
  memberId: string | null;
  onSave: (memberId: string, month: string, shares: number) => void;
  onClose: () => void;
}) {
  const [who, setWho] = useState(memberId ?? data.members[0]?.id ?? "");
  const [month, setMonth] = useState(dash.defaultMonth);
  const existing = (id: string, m: string) => data.savings[id]?.[m];
  const [shares, setShares] = useState(() => (existing(who, dash.defaultMonth) ? String(existing(who, dash.defaultMonth)) : ""));
  const [err, setErr] = useState("");

  const refill = (id: string, m: string) => setShares(existing(id, m) ? String(existing(id, m)) : "");
  const s = num(shares);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!who) return setErr("Choose the member.");
    if (!Number.isFinite(s) || s < 0) return setErr("Shares must be 0 or more.");
    onSave(who, month, s);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Member">
        <select
          className={inputCls}
          value={who}
          onChange={(e) => {
            setWho(e.target.value);
            refill(e.target.value, month);
          }}
        >
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Month">
          <select
            className={inputCls}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              refill(who, e.target.value);
            }}
          >
            {dash.monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shares bought" hint={`1 share = UGX ${money(data.settings.shareValue)}`}>
          <input className={inputCls} inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" autoFocus />
        </Field>
      </div>
      <p className="text-xs text-slate-400">
        = UGX <span className="font-mono font-bold text-slate-200">{money((Number.isFinite(s) ? s : 0) * data.settings.shareValue)}</span>
      </p>
      {existing(who, month) ? (
        <p className="text-[10px] text-slate-500">This member already has {fmtShares(existing(who, month) ?? 0)} shares in this month. Saving replaces them.</p>
      ) : null}
      <FormActions onClose={onClose} error={err} label="Save savings" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, unit, sub, icon: Icon, tint }: { label: string; value: string; unit?: string; sub: string; icon: typeof PiggyBank; tint: string }) {
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

type TooltipItem = { name: string; color: string; value: number };
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-3 text-xs shadow-2xl">
      <p className="mb-2 font-semibold text-slate-200">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="mt-1 flex items-center gap-2 text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-4 font-mono font-semibold text-slate-200">UGX {money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SavingsPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [period, setPeriod] = useState("all");
  const [view, setView] = useState<"chart" | "table">("chart");
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

  const dash = useMemo(() => (data ? computeDashboard(data, period) : null), [data, period]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (dash?.members ?? []).filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [dash, query]);

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

  const years = ["all", ...cycleYears(data)];
  const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
  const T = dash.memberTotals;

  const exportCsv = () => {
    const head = "Member,Shares,Savings (UGX),Opening balance (UGX),Interest share (UGX),Owed (UGX),Net position (UGX)\n";
    const body = dash.members
      .map((m) => `"${m.name.replace(/"/g, '""')}",${m.shares},${m.saved},${m.opening},${m.interest},${m.owed},${m.net}`)
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8;" }));
    link.download = `savings_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editing = modal?.kind === "member" && modal.id ? data.members.find((m) => m.id === modal.id) ?? null : null;

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quatres Savings Group</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Savings</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Members' shares and savings · {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className={btnGhost} onClick={() => setModal({ kind: "member", id: null })}>
            <Plus size={14} /> Member
          </button>
          <button className={btnPrimary} onClick={() => setModal({ kind: "month" })}>
            <Plus size={14} /> Record month
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

      {/* Period */}
      <div className="inline-flex gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setPeriod(y)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${period === y ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
          >
            {y === "all" ? "All time" : y}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total savings" unit="UGX" value={money(dash.kpi.savings)} sub={`${fmtShares(dash.kpi.shares)} shares at UGX ${money(data.settings.shareValue)}`} icon={Wallet} tint="bg-amber-500/10 text-amber-400" />
        <Kpi label="Opening balances" unit="UGX" value={money(dash.kpi.opening)} sub={`UGX ${money(data.settings.openingBalance)} per member`} icon={PiggyBank} tint="bg-emerald-500/10 text-emerald-400" />
        <Kpi label="Members" value={money(dash.kpi.members)} sub="In the savings group" icon={Users} tint="bg-blue-500/10 text-blue-400" />
        <Kpi label="Interest collected" unit="UGX" value={money(dash.kpi.interest)} sub="Shared by members' shares" icon={TrendingUp} tint="bg-violet-500/10 text-violet-400" />
      </div>

      {/* Monthly savings */}
      <Card className="border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Savings each month</CardTitle>
            <div className="flex gap-1 rounded-lg border border-slate-900 bg-slate-950 p-0.5">
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize ${view === v ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {view === "chart" ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dash.chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barCategoryGap="20%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => axisFmt(Number(v))} tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE }} />
                <Bar dataKey="savings" name="Savings" fill={C_SAVINGS} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="max-h-[280px] overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    <th className={thCls}>Month</th>
                    <th className={`${thCls} text-right`}>Savings (UGX)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {dash.chart.map((p) => (
                    <tr key={p.month}>
                      <td className="px-4 py-2 text-slate-300">{p.label}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-200">{money(p.savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member savings register */}
      <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Member savings</CardTitle>
              <p className="mt-0.5 text-xs text-slate-400">
                {rows.length} of {dash.members.length} members
              </p>
            </div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input className={`${inputCls} pl-8 sm:w-56`} placeholder="Search member" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40">
                  <th className={thCls}>Member</th>
                  <th className={`${thCls} text-right`}>Shares</th>
                  <th className={`${thCls} text-right`}>Savings</th>
                  <th className={`${thCls} text-right`}>Opening</th>
                  <th className={`${thCls} text-right`}>Interest</th>
                  <th className={`${thCls} text-right`}>Owed</th>
                  <th className={`${thCls} text-right`}>Net position</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  rows.map((m: MemberRow) => (
                    <tr key={m.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-3 font-bold text-slate-200">{m.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{fmtShares(m.shares)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">{money(m.saved)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{money(m.opening)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{money(m.interest)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{m.owed ? money(m.owed) : "–"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">{money(m.net)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className={btnAdd} onClick={() => setModal({ kind: "saving", id: m.id })}>
                            <Plus size={11} /> Savings
                          </button>
                          <button className={iconBtn} aria-label={`Edit ${m.name}`} onClick={() => setModal({ kind: "member", id: m.id })}>
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && !query ? (
                <tfoot>
                  <tr className="border-t border-slate-800 bg-slate-950/40 font-bold">
                    <td className="px-4 py-3 text-slate-300">Total</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{fmtShares(T.shares)}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-400">{money(T.saved)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.opening)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.interest)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.owed)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-100">{money(T.net)}</td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Forms */}
      {modal?.kind === "month" ? (
        <Modal title="Record a month" onClose={() => setModal(null)} wide>
          <MonthForm
            data={data}
            dash={dash}
            onClose={() => setModal(null)}
            onSave={(month, shares, interest) => commit(setMonthEntries(data, month, shares, interest), `${monthLabel(month)} saved.`)}
          />
        </Modal>
      ) : null}

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

      {modal?.kind === "saving" ? (
        <Modal title="Add member savings" onClose={() => setModal(null)}>
          <MemberSavingForm
            data={data}
            dash={dash}
            memberId={modal.id}
            onClose={() => setModal(null)}
            onSave={(memberId, month, shares) => {
              const sharesByMember: Record<string, number> = Object.fromEntries(
                data.members.map((m) => [m.id, data.savings[m.id]?.[month] ?? 0])
              );
              sharesByMember[memberId] = shares;
              commit(setMonthEntries(data, month, sharesByMember, data.interest[month] ?? 0), "Savings saved.");
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
