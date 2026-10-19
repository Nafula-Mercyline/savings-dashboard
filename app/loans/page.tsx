"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CreditCard, AlertTriangle, CheckCircle, Wallet, Percent, Pencil, Plus, X, Download, Trash2, Search, Users } from "lucide-react";
import {
  STORAGE_KEY,
  addRepayment,
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  removeLoan,
  saveData,
  uid,
  upsertLoan,
  type Loan,
  type LoanRow,
  type Member,
  type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const C_LOANS = "#d95926";
const SURFACE = "#070d1f";
const GRID = "#131c33";
const TEXT_SECONDARY = "#94a3b8";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const btnDanger = `${btnBase} border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-rose-400 hover:bg-rose-500/20`;
const btnAdd = `${btnBase} border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400 hover:bg-amber-500/20`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";
const linkBtn = "mt-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300";

const axisFmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
const ratePct = (r: number) => `${+(r * 100).toFixed(2)}%`;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));

type ModalState = { kind: "loan"; id: string | null; memberId?: string } | { kind: "repay"; id: string } | null;
type Filter = "all" | "open" | "paid";

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

/*
 * Interest rule used by the group (checked against the existing loans):
 *   interest = amount lent x monthly rate x number of months
 *   total to repay = amount lent + interest
 * The form works both out by itself. Either can still be typed in by hand
 * (for loans that were agreed on different terms), and "Use automatic" switches back.
 */
function LoanForm({
  initial,
  presetMemberId,
  members,
  monthOptions,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Loan | null;
  presetMemberId?: string;
  members: Member[];
  monthOptions: string[];
  onSave: (l: Loan) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  // When editing, work out how many months the saved interest corresponds to.
  const guessMonths = (() => {
    if (!initial) return null;
    const base = initial.principal * initial.rate;
    if (base <= 0) return null;
    const k = Math.round((initial.interest / base) * 100) / 100;
    if (k <= 0) return null;
    return Math.abs(initial.interest - Math.round(base * k)) <= 1 ? k : null;
  })();

  const [memberId, setMemberId] = useState(initial?.memberId ?? presetMemberId ?? "");
  const [month, setMonth] = useState(initial?.month ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : "");
  const [rate, setRate] = useState(String(initial?.rate ?? 0.06));
  const [months, setMonths] = useState(guessMonths ? String(guessMonths) : "1");
  const [interest, setInterest] = useState(initial ? String(initial.interest) : "");
  const [interestManual, setInterestManual] = useState(!!initial && guessMonths === null);
  const [repayable, setRepayable] = useState(initial ? String(initial.repayable) : "");
  const [repayableManual, setRepayableManual] = useState(!!initial && initial.repayable !== initial.principal + initial.interest);
  const [repaid, setRepaid] = useState(initial ? String(initial.repaid) : "0");
  const [err, setErr] = useState("");

  const monthList = Array.from(new Set([...monthOptions, ...(month ? [month] : [])])).sort();

  const p = num(principal);
  const r = Number(rate);
  const mo = num(months);
  const autoInterest = p > 0 && mo > 0 ? Math.round(p * r * mo) : 0;
  const interestVal = interestManual ? num(interest) : autoInterest;
  const autoRepayable = Math.round(p + interestVal);
  const repayableVal = repayableManual ? num(repayable) : autoRepayable;
  const owedNow = Math.max(0, repayableVal - num(repaid));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const paid = num(repaid);
    if (!memberId) return setErr("Choose the member.");
    if (!Number.isFinite(p) || p <= 0) return setErr("Enter the amount lent.");
    if (![0.04, 0.06].includes(r)) return setErr("The rate must be 4% or 6%.");
    if (!interestManual && (!Number.isFinite(mo) || mo <= 0)) return setErr("Enter how many months the loan runs for.");
    if (!Number.isFinite(interestVal) || interestVal < 0) return setErr("Interest must be 0 or more.");
    if (!Number.isFinite(repayableVal) || repayableVal < p) return setErr("Total to repay can't be less than the amount lent.");
    if (!Number.isFinite(paid) || paid < 0) return setErr("Amount repaid must be 0 or more.");
    if (paid > repayableVal) return setErr("Amount repaid can't be more than the total to repay.");
    onSave({
      id: initial?.id ?? uid("l"),
      memberId,
      month: month || null,
      date: date || null,
      principal: Math.round(p),
      rate: r,
      interest: Math.round(interestVal),
      repayable: Math.round(repayableVal),
      repaid: Math.round(paid),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Member">
        <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">Choose a member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loan month" hint={month ? undefined : "Needed for it to show under a year"}>
          <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Not set</option>
            {monthList.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Loan date (optional)">
          <input
            className={inputCls}
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (!month && e.target.value.length === 10) setMonth(e.target.value.slice(0, 7));
            }}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount lent (UGX)">
          <input className={inputCls} inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </Field>
        <Field label="Monthly rate">
          <select className={inputCls} value={rate} onChange={(e) => setRate(e.target.value)}>
            <option value="0.04">4%</option>
            <option value="0.06">6%</option>
          </select>
        </Field>
        <Field label="Months">
          <input className={inputCls} inputMode="decimal" value={months} onChange={(e) => setMonths(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field
            label="Total interest (UGX)"
            hint={interestManual ? "Typed in by hand" : p > 0 && mo > 0 ? `${money(p)} × ${ratePct(r)} × ${mo} month${mo === 1 ? "" : "s"}` : "Worked out from amount, rate and months"}
          >
            <input
              className={inputCls}
              inputMode="numeric"
              value={interestManual ? interest : String(autoInterest)}
              onChange={(e) => {
                setInterest(e.target.value);
                setInterestManual(true);
              }}
            />
          </Field>
          {interestManual ? (
            <button type="button" className={linkBtn} onClick={() => setInterestManual(false)}>
              Use automatic
            </button>
          ) : null}
        </div>
        <div>
          <Field label="Total to repay (UGX)" hint={repayableManual ? "Typed in by hand" : "Lent amount + interest"}>
            <input
              className={inputCls}
              inputMode="numeric"
              value={repayableManual ? repayable : String(autoRepayable)}
              onChange={(e) => {
                setRepayable(e.target.value);
                setRepayableManual(true);
              }}
            />
          </Field>
          {repayableManual ? (
            <button type="button" className={linkBtn} onClick={() => setRepayableManual(false)}>
              Use automatic
            </button>
          ) : null}
        </div>
      </div>
      <Field label="Already repaid (UGX)">
        <input className={inputCls} inputMode="numeric" value={repaid} onChange={(e) => setRepaid(e.target.value)} />
      </Field>
      <p className="text-xs text-slate-400">
        Still owed: <span className="font-mono font-bold text-slate-200">UGX {money(owedNow)}</span>
      </p>
      <FormActions
        onClose={onClose}
        error={err}
        label={initial ? "Save changes" : "Add loan"}
        left={
          onDelete ? (
            <button type="button" className={btnDanger} onClick={onDelete}>
              <Trash2 size={12} /> Delete
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

function RepayForm({ loan, onSave, onClose }: { loan: LoanRow; onSave: (amount: number) => void; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = num(amount);
    if (!Number.isFinite(a) || a <= 0) return setErr("Enter an amount greater than 0.");
    if (a > loan.balance) return setErr(`That is more than is still owed (UGX ${money(loan.balance)}).`);
    onSave(Math.round(a));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-slate-400">
        {loan.memberName} · lent UGX {money(loan.principal)} at {ratePct(loan.rate)}. Still owed{" "}
        <span className="font-mono font-bold text-slate-200">UGX {money(loan.balance)}</span>
      </p>
      <Field label="Amount paid (UGX)">
        <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      {num(amount) > 0 && num(amount) <= loan.balance ? (
        <p className="text-xs text-slate-400">
          Still owed after this: <span className="font-mono font-bold text-slate-200">UGX {money(loan.balance - num(amount))}</span>
        </p>
      ) : null}
      <FormActions onClose={onClose} error={err} label="Record payment" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, unit, sub, icon: Icon, tint }: { label: string; value: string; unit?: string; sub: string; icon: typeof CreditCard; tint: string }) {
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

export default function LoansPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [period, setPeriod] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setData(loadData());
    // Pick up changes made in another browser tab (for example a member added on the Members page).
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (dash?.loans ?? []).filter(
      (l) =>
        (filter === "all" || (filter === "open" ? l.open : !l.open)) && (!q || l.memberName.toLowerCase().includes(q))
    );
  }, [dash, filter, query]);

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
  const K = dash.kpi;
  const totalInterest = dash.loans.reduce((a, l) => a + l.interest, 0);
  const totalRepaid = dash.loans.reduce((a, l) => a + l.repaid, 0);
  const paidOff = dash.loans.length - K.openLoans;
  const noMonth = dash.loans.filter((l) => !l.month).length;

  // Members who have never been given a loan (so they have no row in the register yet)
  const loanedIds = new Set(data.loans.map((l) => l.memberId));
  const noLoanMembers = data.members.filter((m) => !loanedIds.has(m.id));

  const exportCsv = () => {
    const head = "Member,Month,Lent (UGX),Rate,Interest (UGX),To repay (UGX),Repaid (UGX),Still owed (UGX)\n";
    const body = dash.loans
      .map((l) => `"${l.memberName.replace(/"/g, '""')}",${l.month ? monthLabel(l.month) : ""},${l.principal},${ratePct(l.rate)},${l.interest},${l.repayable},${l.repaid},${l.balance}`)
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8;" }));
    link.download = `loans_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editingLoan = modal?.kind === "loan" && modal.id ? data.loans.find((l) => l.id === modal.id) ?? null : null;
  const repayingLoan: LoanRow | null = modal?.kind === "repay" ? dash.loans.find((l) => l.id === modal.id) ?? null : null;
  const totalPrincipal = dash.rateSplit.reduce((a, r) => a + r.principal, 0);

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quatres Savings Group</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Loans</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Loans given to members and what has been repaid · {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className={btnPrimary} onClick={() => setModal({ kind: "loan", id: null })}>
            <Plus size={14} /> New loan
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
        <Kpi label="Loans given" unit="UGX" value={money(K.loansGiven)} sub={`${money(K.loanCount)} loans`} icon={CreditCard} tint="bg-orange-500/10 text-orange-400" />
        <Kpi label="Still owed" unit="UGX" value={money(K.owed)} sub={`${money(K.openLoans)} loans not fully repaid`} icon={Wallet} tint="bg-amber-500/10 text-amber-400" />
        <Kpi label="Repaid so far" unit="UGX" value={money(totalRepaid)} sub={`${money(paidOff)} loans fully repaid`} icon={CheckCircle} tint="bg-emerald-500/10 text-emerald-400" />
        <Kpi label="Interest on loans" unit="UGX" value={money(totalInterest)} sub="Total interest charged" icon={Percent} tint="bg-violet-500/10 text-violet-400" />
      </div>

      {/* Chart + rate split */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-slate-900 bg-slate-900/40 xl:col-span-2">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Loans given each month</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dash.chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barCategoryGap="20%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => axisFmt(Number(v))} tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE }} />
                <Bar dataKey="loans" name="Loans given" fill={C_LOANS} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">By monthly rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {dash.rateSplit.length === 0 ? (
              <p className="text-xs text-slate-500">No loans in this period.</p>
            ) : (
              dash.rateSplit.map((r) => {
                const pct = totalPrincipal > 0 ? Math.round((r.principal / totalPrincipal) * 100) : 0;
                return (
                  <div key={r.rate}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{ratePct(r.rate)} a month</span>
                      <span className="font-mono text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-950">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C_LOANS }} />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">UGX {money(r.principal)} lent</p>
                  </div>
                );
              })
            )}
            {noMonth > 0 ? (
              <p className="border-t border-slate-900 pt-3 text-[11px] text-amber-400/90">
                {noMonth} loan{noMonth > 1 ? "s have" : " has"} no month set, so {noMonth > 1 ? "they don't" : "it doesn't"} show in the chart. Use Edit to add one.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Loan register */}
      <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Loan register</CardTitle>
              <p className="mt-0.5 text-xs text-slate-400">
                {rows.length} of {dash.loans.length} loans
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1">
                {([["all", "All"], ["open", "Owing"], ["paid", "Repaid"]] as const).map(([f, label]) => (
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
                <input className={`${inputCls} pl-8 sm:w-52`} placeholder="Search member" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  <th className={thCls}>Month</th>
                  <th className={`${thCls} text-right`}>Lent</th>
                  <th className={`${thCls} text-right`}>Rate</th>
                  <th className={`${thCls} text-right`}>Interest</th>
                  <th className={`${thCls} text-right`}>To repay</th>
                  <th className={`${thCls} text-right`}>Repaid</th>
                  <th className={`${thCls} text-right`}>Still owed</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500">
                      No loans match.
                    </td>
                  </tr>
                ) : (
                  rows.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-3 font-bold text-slate-200">{l.memberName}</td>
                      <td className="px-4 py-3 text-slate-400">{l.month ? monthLabel(l.month) : <span className="text-amber-400/90">Not set</span>}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{money(l.principal)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-500">{ratePct(l.rate)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{money(l.interest)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">{money(l.repayable)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-slate-300">{money(l.repaid)}</span>
                        <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${l.paidPct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">{l.balance ? money(l.balance) : "–"}</td>
                      <td className="px-4 py-3">
                        {l.open ? (
                          <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">Owing</span>
                        ) : (
                          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">Repaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {l.open ? (
                            <button className={btnAdd} onClick={() => setModal({ kind: "repay", id: l.id })}>
                              <Plus size={11} /> Repay
                            </button>
                          ) : null}
                          <button className={iconBtn} aria-label={`Edit loan for ${l.memberName}`} onClick={() => setModal({ kind: "loan", id: l.id })}>
                            <Pencil size={13} />
                          </button>
                          <button
                            className={`${iconBtn} hover:text-rose-400`}
                            aria-label={`Delete loan for ${l.memberName}`}
                            onClick={() => {
                              if (window.confirm(`Delete the ${money(l.principal)} loan for ${l.memberName}? This can't be undone.`)) {
                                commit(removeLoan(data, l.id), "Loan deleted.");
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Members who have not borrowed yet (new members show up here straight away) */}
      {noLoanMembers.length > 0 ? (
        <Card className="border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
              <Users size={14} className="text-slate-500" /> Members without a loan
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-400">{noLoanMembers.length} members have not borrowed yet. A member shows in the register above once they have a loan.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-5">
            {noLoanMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-3 pr-1.5">
                <span className="text-xs font-bold text-slate-200">{m.name}</span>
                <button className={btnAdd} onClick={() => setModal({ kind: "loan", id: null, memberId: m.id })}>
                  <Plus size={11} /> Give loan
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Forms */}
      {modal?.kind === "loan" ? (
        <Modal title={editingLoan ? "Edit loan" : "New loan"} onClose={() => setModal(null)}>
          <LoanForm
            initial={editingLoan}
            presetMemberId={modal.memberId}
            members={data.members}
            monthOptions={dash.monthOptions}
            onClose={() => setModal(null)}
            onSave={(l: Loan) => commit(upsertLoan(data, l), editingLoan ? "Loan updated." : "Loan added.")}
            onDelete={
              editingLoan
                ? () => {
                  if (window.confirm("Delete this loan? This can't be undone (except by restoring a backup).")) {
                    commit(removeLoan(data, editingLoan.id), "Loan deleted.");
                  }
                }
                : undefined
            }
          />
        </Modal>
      ) : null}

      {modal?.kind === "repay" && repayingLoan ? (
        <Modal title="Record repayment" onClose={() => setModal(null)}>
          <RepayForm
            loan={repayingLoan}
            onClose={() => setModal(null)}
            onSave={(amount) => commit(addRepayment(data, repayingLoan.id, amount), "Payment recorded.")}
          />
        </Modal>
      ) : null}
    </div>
  );
}
