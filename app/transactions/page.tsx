"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  Wallet,
  CreditCard,
  RefreshCw,
  Pencil,
  Plus,
  X,
  Download,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  removeLoan,
  saveData,
  setMonthEntries,
  uid,
  upsertLoan,
  type Dashboard,
  type Loan,
  type Member,
  type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const C_SAVINGS = "#3987e5";
const C_LOANS = "#d95926";
const C_INTEREST = "#199e70";
const SURFACE = "#070d1f";
const GRID = "#131c33";
const TEXT_SECONDARY = "#94a3b8";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const btnDanger = `${btnBase} border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-rose-400 hover:bg-rose-500/20`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";

const axisFmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));
const ratePct = (r: number) => `${+(r * 100).toFixed(2)}%`;
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));

const PAGE_SIZE = 25;

type Kind = "Savings" | "Loan" | "Interest";
type Entry = {
  key: string;
  kind: Kind;
  month: string; // "YYYY-MM" or "" when a loan has no month yet
  who: string; // member name, or "Whole group" for interest
  memberId: string | null;
  loanId: string | null;
  detail: string;
  amount: number;
};
type ModalState =
  | { kind: "saving"; memberId: string | null; month: string | null }
  | { kind: "loan"; id: string | null }
  | { kind: "interest"; month: string | null }
  | null;

const kindStyle: Record<Kind, { pill: string; sign: "+" | "-"; text: string; icon: typeof Wallet }> = {
  Savings: { pill: "border-blue-500/20 bg-blue-500/10 text-blue-400", sign: "+", text: "text-blue-400", icon: ArrowDownLeft },
  Interest: { pill: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400", sign: "+", text: "text-emerald-400", icon: Percent },
  Loan: { pill: "border-orange-500/20 bg-orange-500/10 text-orange-400", sign: "-", text: "text-orange-400", icon: ArrowUpRight },
};

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

// Add or correct the shares one member bought in one month.
function MemberSavingForm({
  data,
  dash,
  memberId,
  month: startMonth,
  onSave,
  onClose,
}: {
  data: SaccoData;
  dash: Dashboard;
  memberId: string | null;
  month: string | null;
  onSave: (memberId: string, month: string, shares: number) => void;
  onClose: () => void;
}) {
  const [who, setWho] = useState(memberId ?? data.members[0]?.id ?? "");
  const first = startMonth ?? dash.defaultMonth;
  const [month, setMonth] = useState(first);
  const months = Array.from(new Set([...dash.monthOptions, first])).sort();
  const existing = (id: string, m: string) => data.savings[id]?.[m];
  const [shares, setShares] = useState(() => (existing(who, first) ? String(existing(who, first)) : ""));
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
            {months.map((m) => (
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

function LoanForm({
  initial,
  members,
  monthOptions,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Loan | null;
  members: Member[];
  monthOptions: string[];
  onSave: (l: Loan) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [memberId, setMemberId] = useState(initial?.memberId ?? "");
  const [month, setMonth] = useState(initial?.month ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : "");
  const [rate, setRate] = useState(String(initial?.rate ?? 0.06));
  const [interest, setInterest] = useState(initial ? String(initial.interest) : "");
  const [repayable, setRepayable] = useState(initial ? String(initial.repayable) : "");
  const [repayableEdited, setRepayableEdited] = useState(!!initial);
  const [repaid, setRepaid] = useState(initial ? String(initial.repaid) : "0");
  const [err, setErr] = useState("");

  const months = Array.from(new Set([...monthOptions, ...(month ? [month] : [])])).sort();
  const p = num(principal);
  const i = num(interest);
  const owedNow = Math.max(0, num(repayable) - num(repaid));

  // "Total to repay" follows principal + interest until it is typed in by hand
  const syncRepayable = (pr: string, int: string) => {
    if (!repayableEdited) setRepayable(String(num(pr) + num(int)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = Number(rate);
    const rep = num(repayable);
    const paid = num(repaid);
    if (!memberId) return setErr("Choose the member.");
    if (!Number.isFinite(p) || p <= 0) return setErr("Enter the amount lent.");
    if (![0.04, 0.06].includes(r)) return setErr("The rate must be 4% or 6%.");
    if (!Number.isFinite(i) || i < 0) return setErr("Interest must be 0 or more.");
    if (!Number.isFinite(rep) || rep < p) return setErr("Total to repay can't be less than the amount lent.");
    if (!Number.isFinite(paid) || paid < 0) return setErr("Amount repaid must be 0 or more.");
    if (paid > rep) return setErr("Amount repaid can't be more than the total to repay.");
    onSave({
      id: initial?.id ?? uid("l"),
      memberId,
      month: month || null,
      date: date || null,
      principal: Math.round(p),
      rate: r,
      interest: Math.round(i),
      repayable: Math.round(rep),
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
            {months.map((m) => (
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount lent (UGX)">
          <input
            className={inputCls}
            inputMode="numeric"
            value={principal}
            onChange={(e) => {
              setPrincipal(e.target.value);
              syncRepayable(e.target.value, interest);
            }}
          />
        </Field>
        <Field label="Monthly rate">
          <select className={inputCls} value={rate} onChange={(e) => setRate(e.target.value)}>
            <option value="0.04">4%</option>
            <option value="0.06">6%</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Total interest (UGX)"
          hint={p > 0 ? `One month at ${ratePct(Number(rate))} = UGX ${money(p * Number(rate))}` : undefined}
        >
          <input
            className={inputCls}
            inputMode="numeric"
            value={interest}
            onChange={(e) => {
              setInterest(e.target.value);
              syncRepayable(principal, e.target.value);
            }}
          />
        </Field>
        <Field label="Total to repay (UGX)" hint="Lent amount + interest">
          <input
            className={inputCls}
            inputMode="numeric"
            value={repayable}
            onChange={(e) => {
              setRepayable(e.target.value);
              setRepayableEdited(true);
            }}
          />
        </Field>
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, unit, sub, icon: Icon, tint }: { label: string; value: string; unit?: string; sub: string; icon: typeof Wallet; tint: string }) {
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

export default function TransactionsPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [period, setPeriod] = useState("all");
  const [kindFilter, setKindFilter] = useState<"All" | Kind>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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

  // Every line in the ledger is built from the group's records, so editing a line edits the record behind it.
  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    const inPeriod = (m: string) => period === "all" || (m !== "" && m.startsWith(period));
    const out: Entry[] = [];
    for (const mem of data.members) {
      for (const [m, shares] of Object.entries(data.savings[mem.id] ?? {})) {
        if (shares > 0 && inPeriod(m)) {
          out.push({
            key: `s:${mem.id}:${m}`,
            kind: "Savings",
            month: m,
            who: mem.name,
            memberId: mem.id,
            loanId: null,
            detail: `${fmtShares(shares)} share${shares === 1 ? "" : "s"}`,
            amount: Math.round(shares * data.settings.shareValue),
          });
        }
      }
    }
    for (const [m, amount] of Object.entries(data.interest)) {
      if (amount > 0 && inPeriod(m)) {
        out.push({ key: `i:${m}`, kind: "Interest", month: m, who: "Whole group", memberId: null, loanId: null, detail: "Collected from loans", amount });
      }
    }
    for (const l of data.loans) {
      const m = l.month ?? "";
      if (!inPeriod(m)) continue;
      out.push({
        key: `l:${l.id}`,
        kind: "Loan",
        month: m,
        who: data.members.find((x) => x.id === l.memberId)?.name ?? "Unknown member",
        memberId: l.memberId,
        loanId: l.id,
        detail: `${ratePct(l.rate)} a month · repaid ${money(l.repaid)} of ${money(l.repayable)}`,
        amount: l.principal,
      });
    }
    // newest month first; loans with no month last
    return out.sort((a, b) => (a.month === b.month ? a.who.localeCompare(b.who) : a.month === "" ? 1 : b.month === "" ? -1 : b.month.localeCompare(a.month)));
  }, [data, period]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => (kindFilter === "All" || e.kind === kindFilter) && (!q || e.who.toLowerCase().includes(q)));
  }, [entries, kindFilter, query]);

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

  const sharesOfMonth = (month: string): Record<string, number> =>
    Object.fromEntries(data.members.map((m) => [m.id, data.savings[m.id]?.[month] ?? 0]));

  const saveSaving = (memberId: string, month: string, shares: number, message: string) => {
    const map = sharesOfMonth(month);
    map[memberId] = shares;
    commit(setMonthEntries(data, month, map, data.interest[month] ?? 0), message);
  };
  const saveInterest = (month: string, amount: number, message: string) =>
    commit(setMonthEntries(data, month, sharesOfMonth(month), amount), message);

  const years = ["all", ...cycleYears(data)];
  const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageNo = Math.min(page, pages);
  const shown = rows.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
  const repaidTotal = dash.loans.reduce((a, l) => a + l.repaid, 0);

  const editEntry = (e: Entry) => {
    if (e.kind === "Savings") setModal({ kind: "saving", memberId: e.memberId, month: e.month });
    else if (e.kind === "Interest") setModal({ kind: "interest", month: e.month });
    else setModal({ kind: "loan", id: e.loanId });
  };

  const deleteEntry = (e: Entry) => {
    if (e.kind === "Savings" && e.memberId) {
      if (window.confirm(`Remove ${e.who}'s savings for ${monthLabel(e.month)}?`)) saveSaving(e.memberId, e.month, 0, "Savings removed.");
    } else if (e.kind === "Interest") {
      if (window.confirm(`Clear the interest recorded for ${monthLabel(e.month)}?`)) saveInterest(e.month, 0, "Interest cleared.");
    } else if (e.loanId) {
      if (window.confirm(`Delete the UGX ${money(e.amount)} loan for ${e.who}? This can't be undone.`)) commit(removeLoan(data, e.loanId), "Loan deleted.");
    }
  };

  const exportCsv = () => {
    const head = "Month,Member,Type,Detail,Amount (UGX)\n";
    const body = rows
      .map((e) => `${e.month ? monthLabel(e.month) : "Not set"},"${e.who.replace(/"/g, '""')}",${e.kind},"${e.detail}",${kindStyle[e.kind].sign === "-" ? "-" : ""}${e.amount}`)
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8;" }));
    link.download = `transactions_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editingLoan = modal?.kind === "loan" && modal.id ? data.loans.find((l) => l.id === modal.id) ?? null : null;

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quatres Savings Group</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Transactions</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">Savings, loans and interest, month by month · {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className={btnGhost} onClick={() => setModal({ kind: "interest", month: null })}>
            <Plus size={14} /> Interest
          </button>
          <button className={btnGhost} onClick={() => setModal({ kind: "loan", id: null })}>
            <Plus size={14} /> Loan
          </button>
          <button className={btnPrimary} onClick={() => setModal({ kind: "saving", memberId: null, month: null })}>
            <Plus size={14} /> Savings
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
            onClick={() => {
              setPeriod(y);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${period === y ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
          >
            {y === "all" ? "All time" : y}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Savings paid in" unit="UGX" value={money(dash.kpi.savings)} sub={`${fmtShares(dash.kpi.shares)} shares`} icon={Wallet} tint="bg-blue-500/10 text-blue-400" />
        <Kpi label="Loans given" unit="UGX" value={money(dash.kpi.loansGiven)} sub={`${money(dash.kpi.loanCount)} loans`} icon={CreditCard} tint="bg-orange-500/10 text-orange-400" />
        <Kpi label="Interest collected" unit="UGX" value={money(dash.kpi.interest)} sub="From loans" icon={Percent} tint="bg-emerald-500/10 text-emerald-400" />
        <Kpi label="Loans repaid so far" unit="UGX" value={money(repaidTotal)} sub="Repayments aren't dated, so they're not listed below" icon={RefreshCw} tint="bg-violet-500/10 text-violet-400" />
      </div>

      {/* Chart */}
      <Card className="border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Money moving each month</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dash.chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barCategoryGap="20%" barGap={2}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v: number) => axisFmt(Number(v))} tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: SURFACE }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: TEXT_SECONDARY }} />
              <Bar dataKey="savings" name="Savings" fill={C_SAVINGS} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="loans" name="Loans given" fill={C_LOANS} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="interest" name="Interest collected" fill={C_INTEREST} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Transaction ledger</CardTitle>
              <p className="mt-0.5 text-xs text-slate-400">
                {rows.length} of {entries.length} entries
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1">
                {(["All", "Savings", "Loan", "Interest"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setKindFilter(f);
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${kindFilter === f ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  className={`${inputCls} pl-8 sm:w-52`}
                  placeholder="Search member"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40">
                  <th className={thCls}>Month</th>
                  <th className={thCls}>Member</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Details</th>
                  <th className={`${thCls} text-right`}>Amount (UGX)</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No entries match.
                    </td>
                  </tr>
                ) : (
                  shown.map((e) => {
                    const st = kindStyle[e.kind];
                    const Icon = st.icon;
                    return (
                      <tr key={e.key} className="hover:bg-slate-900/60">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-300">{e.month ? monthLabel(e.month) : <span className="text-amber-400/90">Not set</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-200">{e.who}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${st.pill}`}>
                            <Icon size={11} /> {e.kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{e.detail}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-bold ${st.text}`}>
                          {st.sign}
                          {money(e.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button className={iconBtn} aria-label={`Edit ${e.kind} entry for ${e.who}`} onClick={() => editEntry(e)}>
                              <Pencil size={13} />
                            </button>
                            <button className={`${iconBtn} hover:text-rose-400`} aria-label={`Delete ${e.kind} entry for ${e.who}`} onClick={() => deleteEntry(e)}>
                              <Trash2 size={13} />
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

          <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950/30 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Page {pageNo} of {pages}
            </p>
            <div className="flex gap-2">
              <button className={btnGhost} disabled={pageNo <= 1} onClick={() => setPage(pageNo - 1)}>
                Previous
              </button>
              <button className={btnGhost} disabled={pageNo >= pages} onClick={() => setPage(pageNo + 1)}>
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms */}
      {modal?.kind === "saving" ? (
        <Modal title={modal.memberId && modal.month ? "Edit savings" : "Add savings"} onClose={() => setModal(null)}>
          <MemberSavingForm
            data={data}
            dash={dash}
            memberId={modal.memberId}
            month={modal.month}
            onClose={() => setModal(null)}
            onSave={(memberId, month, shares) => saveSaving(memberId, month, shares, "Savings saved.")}
          />
        </Modal>
      ) : null}

      {modal?.kind === "interest" ? (
        <Modal title={modal.month ? "Edit interest" : "Add interest"} onClose={() => setModal(null)}>
          <InterestForm
            data={data}
            dash={dash}
            month={modal.month}
            onClose={() => setModal(null)}
            onSave={(month, amount) => saveInterest(month, amount, `${monthLabel(month)} saved.`)}
          />
        </Modal>
      ) : null}

      {modal?.kind === "loan" ? (
        <Modal title={editingLoan ? "Edit loan" : "New loan"} onClose={() => setModal(null)}>
          <LoanForm
            initial={editingLoan}
            members={data.members}
            monthOptions={dash.monthOptions}
            onClose={() => setModal(null)}
            onSave={(l: Loan) => commit(upsertLoan(data, l), editingLoan ? "Loan updated." : "Loan added.")}
            onDelete={
              editingLoan
                ? () => {
                  if (window.confirm("Delete this loan? This can't be undone.")) commit(removeLoan(data, editingLoan.id), "Loan deleted.");
                }
                : undefined
            }
          />
        </Modal>
      ) : null}
    </div>
  );
}
