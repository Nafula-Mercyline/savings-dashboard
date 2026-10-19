"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Percent, TrendingUp, CalendarDays, CreditCard, Pencil, Plus, X, Download, Trash2, CheckCircle, AlertTriangle, UserPlus } from "lucide-react";
import {
  STORAGE_KEY,
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  saveData,
  setMonthEntries,
  uid,
  upsertMember,
  xlRound,
  type Dashboard,
  type Member,
  type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const C_INTEREST = "#199e70";
const C_LOANS = "#d95926";
const SURFACE = "#070d1f";
const GRID = "#131c33";
const TEXT_SECONDARY = "#94a3b8";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const btnAdd = `${btnBase} border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400 hover:bg-amber-500/20`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const rowEditBtn = `${btnBase} border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800`;
const rowDeleteBtn = `${btnBase} border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-400 hover:bg-rose-500/20`;
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";

const axisFmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));
const ratePct = (r: number) => `${+(r * 100).toFixed(2)}%`;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));

type ModalState = { kind: "interest"; month: string | null } | { kind: "member"; id: string | null } | null;

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

// Record or correct the interest the group collected in one month.
function InterestForm({
  data,
  dash,
  month: startMonth,
  onSave,
  onClose,
}: {
  data: SaccoData;
  dash: Dashboard;
  month: string | null;
  onSave: (month: string, amount: number) => void;
  onClose: () => void;
}) {
  const first = startMonth ?? dash.defaultMonth;
  const [month, setMonth] = useState(first);
  const [amount, setAmount] = useState(data.interest[first] ? String(data.interest[first]) : "");
  const [err, setErr] = useState("");
  const months = Array.from(new Set([...dash.monthOptions, first])).sort();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = num(amount);
    if (!Number.isFinite(a) || a < 0) return setErr("Interest must be 0 or more.");
    onSave(month, Math.round(a));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Month">
          <select
            className={inputCls}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setAmount(data.interest[e.target.value] ? String(data.interest[e.target.value]) : "");
            }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interest collected (UGX)" hint="From loans, this month">
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
        </Field>
      </div>
      {data.interest[month] ? (
        <p className="text-[10px] text-slate-500">This month already has UGX {money(data.interest[month])}. Saving replaces it.</p>
      ) : null}
      <p className="text-[10px] text-slate-500">The interest is shared between members by the shares they hold.</p>
      <FormActions onClose={onClose} error={err} label="Save interest" />
    </form>
  );
}

// Add a member, or change one member's name, opening balance and the shares bought each month.
// The interest a member gets is worked out from their shares, so it is shown live as a preview.
function MemberSharesForm({
  data,
  dash,
  memberId,
  onSave,
  onClose,
}: {
  data: SaccoData;
  dash: Dashboard;
  memberId: string | null;
  onSave: (member: Member, shares: Record<string, number>) => void;
  onClose: () => void;
}) {
  const initial = memberId ? data.members.find((m) => m.id === memberId) ?? null : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [opening, setOpening] = useState(String(initial?.opening ?? data.settings.openingBalance));
  const [entries, setEntries] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial ? data.savings[initial.id] ?? {} : {}).map(([m, v]) => [m, String(v)]))
  );
  const [err, setErr] = useState("");

  const months = useMemo(() => {
    const own = Object.keys(initial ? data.savings[initial.id] ?? {} : {});
    return Array.from(new Set([...dash.monthOptions, ...own])).sort();
  }, [data, dash.monthOptions, initial]);

  const parsed = useMemo(() => {
    const out: Record<string, number> = {};
    let bad = false;
    for (const m of months) {
      const v = num(entries[m] ?? "");
      if (!Number.isFinite(v) || v < 0) bad = true;
      else if (v > 0) out[m] = v;
    }
    return { out, bad };
  }, [entries, months]);

  const totalShares = Object.values(parsed.out).reduce((a, b) => a + b, 0);

  // What this member would get, and what everyone else's share becomes, with these shares.
  const preview = useMemo(() => {
    if (parsed.bad) return null;
    const id = initial?.id ?? "__new";
    const me: Member = { id, name: name || "New member", opening: Math.round(num(opening)) || 0, joined: initial?.joined ?? null, phone: initial?.phone ?? "" };
    const members = initial ? data.members.map((m) => (m.id === id ? me : m)) : [...data.members, me];
    const next: SaccoData = { ...data, members, savings: { ...data.savings, [id]: parsed.out } };
    return computeDashboard(next, "all").members.find((m) => m.id === id) ?? null;
  }, [data, initial, name, opening, parsed]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = name.split(/\s+/).filter(Boolean).join(" ");
    const o = num(opening);
    if (!clean) return setErr("Enter the member's name.");
    if (data.members.some((m) => m.id !== initial?.id && m.name.toLowerCase() === clean.toLowerCase())) return setErr("A member with this name already exists.");
    if (!Number.isFinite(o) || o < 0) return setErr("Opening balance must be 0 or more.");
    if (parsed.bad) return setErr("Shares must be 0 or more in every month.");
    onSave(
      { id: initial?.id ?? uid("m"), name: clean, opening: Math.round(o), joined: initial?.joined ?? null, phone: initial?.phone ?? "" },
      parsed.out
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus={!initial} />
        </Field>
        <Field label="Opening balance (UGX)">
          <input className={inputCls} inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Shares bought each month</p>
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 sm:grid-cols-3">
          {months.map((m) => (
            <label key={m} className="block">
              <span className="mb-0.5 block text-[10px] text-slate-500">{monthLabel(m)}</span>
              <input
                className={inputCls}
                inputMode="decimal"
                placeholder="0"
                value={entries[m] ?? ""}
                onChange={(e) => setEntries((prev) => ({ ...prev, [m]: e.target.value }))}
                aria-label={`Shares in ${monthLabel(m)}`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total shares</p>
          <p className="mt-1 font-mono font-bold text-slate-200">{fmtShares(totalShares)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saved (UGX)</p>
          <p className="mt-1 font-mono font-bold text-slate-200">{money(totalShares * data.settings.shareValue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Interest share, all time (UGX)</p>
          <p className="mt-1 font-mono font-bold text-emerald-400">{preview ? money(preview.interest) : "–"}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        Interest is shared by shares held, so changing shares changes this member's interest (and slightly everyone else's). To change the interest the group collected, use Record interest.
      </p>
      <FormActions
        onClose={onClose}
        error={err}
        label={initial ? "Save changes" : "Add member"}
        left={
          initial ? (
            <button type="button" className={`${btnGhost} border-rose-500/40 text-rose-400 hover:bg-rose-500/10`} onClick={() => setEntries({})}>
              <Trash2 size={12} /> Clear all shares
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, unit, sub, icon: Icon, tint }: { label: string; value: string; unit?: string; sub: string; icon: typeof Percent; tint: string }) {
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

export default function InterestPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [period, setPeriod] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setData(loadData());
    // Pick up changes made in another browser tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) setData(loadData());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const dash = useMemo(() => (data ? computeDashboard(data, period) : null), [data, period]);

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

  // Change only the interest of one month; shares stay exactly as they are.
  const saveInterest = (month: string, amount: number, message: string) => {
    const shares: Record<string, number> = Object.fromEntries(data.members.map((m) => [m.id, data.savings[m.id]?.[month] ?? 0]));
    commit(setMonthEntries(data, month, shares, amount), message);
  };

  // Remove every share recorded for one member (the member stays in the group).
  const clearShares = (id: string, name: string, shares: number) => {
    if (!window.confirm(`Delete all ${fmtShares(shares)} shares recorded for ${name}? Their interest share will drop to 0. The member stays in the group.`)) return;
    commit({ ...data, savings: { ...data.savings, [id]: {} } }, `Shares deleted for ${name}.`);
  };

  const years = ["all", ...cycleYears(data)];
  const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
  const T = dash.memberTotals;
  const withInterest = dash.chart.filter((p) => p.interest > 0);
  const best = withInterest.reduce<(typeof withInterest)[number] | null>((b, p) => (!b || p.interest > b.interest ? p : b), null);
  const average = withInterest.length ? Math.round(dash.kpi.interest / withInterest.length) : 0;
  const loanInterest = dash.loans.reduce((a, l) => a + l.interest, 0);

  const byRate = new Map<number, number>();
  for (const l of dash.loans) byRate.set(l.rate, (byRate.get(l.rate) ?? 0) + l.interest);
  const rateRows = Array.from(byRate.entries()).sort((a, b) => a[0] - b[0]);

  // Each member's share of the interest collected in the CHOSEN period
  // (same rule as the workbook: month by month, by shares held, rounded each month).
  const periodMonths = Object.entries(data.interest).filter(([m, v]) => v > 0 && (period === "all" || m.startsWith(period)));
  const shareOfInterest = (shares: number) =>
    T.shares > 0 ? periodMonths.reduce((a, [, c]) => a + xlRound((shares / T.shares) * c), 0) : 0;
  const memberRows = dash.members
    .map((m) => ({ ...m, periodInterest: shareOfInterest(m.shares) }))
    .sort((a, b) => b.periodInterest - a.periodInterest);
  const memberInterestTotal = memberRows.reduce((a, m) => a + m.periodInterest, 0);
  const periodName = period === "all" ? "all time" : period;

  const exportCsv = () => {
    const head = `Member,Shares,Interest share ${periodName} (UGX)\n`;
    const body = memberRows.map((m) => `"${m.name.replace(/"/g, '""')}",${m.shares},${m.periodInterest}`).join("\n");
    const months = "\n\nMonth,Interest collected (UGX)\n" + dash.chart.map((p) => `${p.label},${p.interest}`).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([head + body + months], { type: "text/csv;charset=utf-8;" }));
    link.download = `interest_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-2xl font-black tracking-tight text-white">Interest</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Interest collected from loans and shared by members' shares · {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className={btnGhost} onClick={() => setModal({ kind: "member", id: null })}>
            <UserPlus size={14} /> Add member
          </button>
          <button className={btnPrimary} onClick={() => setModal({ kind: "interest", month: null })}>
            <Plus size={14} /> Record interest
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
        <Kpi label="Interest collected" unit="UGX" value={money(dash.kpi.interest)} sub={`Over ${withInterest.length} months`} icon={TrendingUp} tint="bg-emerald-500/10 text-emerald-400" />
        <Kpi label="Average a month" unit="UGX" value={money(average)} sub="In months with interest" icon={Percent} tint="bg-amber-500/10 text-amber-400" />
        <Kpi label="Best month" unit="UGX" value={best ? money(best.interest) : "0"} sub={best ? best.label : "No interest recorded"} icon={CalendarDays} tint="bg-blue-500/10 text-blue-400" />
        <Kpi label="Interest on loans" unit="UGX" value={money(loanInterest)} sub="Total charged on loans in this period" icon={CreditCard} tint="bg-orange-500/10 text-orange-400" />
      </div>

      {/* Chart + by rate */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-slate-900 bg-slate-900/40 xl:col-span-2">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Interest collected each month</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dash.chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barCategoryGap="20%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => axisFmt(Number(v))} tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE }} />
                <Bar dataKey="interest" name="Interest collected" fill={C_INTEREST} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Charged on loans, by rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {rateRows.length === 0 ? (
              <p className="text-xs text-slate-500">No loans in this period.</p>
            ) : (
              rateRows.map(([rate, amount]) => {
                const pct = loanInterest > 0 ? Math.round((amount / loanInterest) * 100) : 0;
                return (
                  <div key={rate}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{ratePct(rate)} a month</span>
                      <span className="font-mono text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-950">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C_LOANS }} />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">UGX {money(amount)}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Month by month (editable) */}
        <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Month by month</CardTitle>
            <p className="mt-0.5 text-xs text-slate-400">Add, correct or clear the interest for any month</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    <th className={thCls}>Month</th>
                    <th className={`${thCls} text-right`}>Interest (UGX)</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {dash.chart.map((p) => (
                    <tr key={p.month} className="hover:bg-slate-900/60">
                      <td className="px-4 py-2.5 text-slate-300">{p.label}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">{p.interest ? money(p.interest) : <span className="font-normal text-slate-600">–</span>}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {p.interest ? null : (
                            <button className={btnAdd} onClick={() => setModal({ kind: "interest", month: p.month })}>
                              <Plus size={11} /> Add
                            </button>
                          )}
                          {p.interest ? (
                            <>
                              <button className={iconBtn} aria-label={`Edit interest for ${p.label}`} onClick={() => setModal({ kind: "interest", month: p.month })}>
                                <Pencil size={13} />
                              </button>
                              <button
                                className={`${iconBtn} hover:text-rose-400`}
                                aria-label={`Clear interest for ${p.label}`}
                                onClick={() => {
                                  if (window.confirm(`Clear the interest recorded for ${p.label}?`)) saveInterest(p.month, 0, "Interest cleared.");
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-900">
                  <tr className="border-t border-slate-800 font-bold">
                    <td className="px-4 py-2.5 text-slate-300">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{money(dash.kpi.interest)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Each member's share */}
        <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Each member's share · {periodName}</CardTitle>
            <p className="mt-0.5 text-xs text-slate-400">Worked out from the shares each member holds, for the period selected above. Edit changes a member's shares month by month; Delete removes all of their shares.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    <th className={thCls}>Member</th>
                    <th className={`${thCls} text-right`}>Shares</th>
                    <th className={`${thCls} text-right`}>Interest (UGX)</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {memberRows.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-2.5 font-bold text-slate-200">{m.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">{fmtShares(m.shares)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">{money(m.periodInterest)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className={rowEditBtn} aria-label={`Edit shares for ${m.name}`} onClick={() => setModal({ kind: "member", id: m.id })}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            className={rowDeleteBtn}
                            aria-label={`Delete shares for ${m.name}`}
                            disabled={m.shares === 0}
                            onClick={() => clearShares(m.id, m.name, m.shares)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-900">
                  <tr className="border-t border-slate-800 font-bold">
                    <td className="px-4 py-2.5 text-slate-300">Total</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">{fmtShares(T.shares)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{money(memberInterestTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {modal?.kind === "interest" ? (
        <Modal title="Record interest" onClose={() => setModal(null)}>
          <InterestForm
            data={data}
            dash={dash}
            month={modal.month}
            onClose={() => setModal(null)}
            onSave={(month, amount) => saveInterest(month, amount, `${monthLabel(month)} saved.`)}
          />
        </Modal>
      ) : null}

      {modal?.kind === "member" ? (
        <Modal title={modal.id ? "Edit member" : "Add member"} wide onClose={() => setModal(null)}>
          <MemberSharesForm
            data={data}
            dash={dash}
            memberId={modal.id}
            onClose={() => setModal(null)}
            onSave={(member, shares) => {
              const added = upsertMember(data, member);
              commit({ ...added, savings: { ...added.savings, [member.id]: shares } }, modal.id ? `${member.name} saved.` : `${member.name} added.`);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
