"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  BarChart3,
  Wallet,
  CreditCard,
  Percent,
  PiggyBank,
  Download,
  Printer,
  Settings,
  X,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  saveData,
  type SaccoData,
  type SaccoSettings,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const C_SAVINGS = "#3987e5";
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

// Saves a table as a CSV file the user can open in Excel.
function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replace(/"/g, '""')}"`);
  const text = [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8;" }));
  link.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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

// The few numbers every report is worked out from.
function SettingsForm({
  initial,
  onSave,
  onClose,
}: {
  initial: SaccoSettings;
  onSave: (s: SaccoSettings) => void;
  onClose: () => void;
}) {
  const [shareValue, setShareValue] = useState(String(initial.shareValue));
  const [opening, setOpening] = useState(String(initial.openingBalance));
  const [payout, setPayout] = useState(String(+(initial.payoutRate * 100).toFixed(2)));
  const [start, setStart] = useState(initial.cycleStart);
  const [months, setMonths] = useState(String(initial.cycleMonths));
  const [err, setErr] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sv = num(shareValue);
    const op = num(opening);
    const pr = num(payout);
    const cm = num(months);
    if (!Number.isFinite(sv) || sv <= 0) return setErr("A share must be worth more than 0.");
    if (!Number.isFinite(op) || op < 0) return setErr("Opening balance must be 0 or more.");
    if (!Number.isFinite(pr) || pr <= 0 || pr > 100) return setErr("Payout rate must be between 1% and 100%.");
    if (!/^\d{4}-\d{2}$/.test(start)) return setErr("Choose the month the saving cycle starts.");
    if (!Number.isInteger(cm) || cm < 1 || cm > 60) return setErr("The cycle must be between 1 and 60 months.");
    onSave({ ...initial, shareValue: Math.round(sv), openingBalance: Math.round(op), payoutRate: pr / 100, cycleStart: start, cycleMonths: cm });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Value of 1 share (UGX)" hint="Changes the value of every share already bought">
          <input className={inputCls} inputMode="numeric" value={shareValue} onChange={(e) => setShareValue(e.target.value)} autoFocus />
        </Field>
        <Field label="Opening balance (UGX)" hint="Pre-filled for new members">
          <input className={inputCls} inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Payout rate (%)" hint="Of net position">
          <input className={inputCls} inputMode="decimal" value={payout} onChange={(e) => setPayout(e.target.value)} />
        </Field>
        <Field label="Cycle starts">
          <input className={inputCls} type="month" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Cycle length (months)">
          <input className={inputCls} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
        </Field>
      </div>
      <p className="text-[10px] text-slate-500">Every page and report is recalculated from these numbers straight away.</p>
      <FormActions onClose={onClose} error={err} label="Save settings" />
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

export default function ReportsPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [period, setPeriod] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  // Savings added up month by month
  const growth = useMemo(() => {
    let running = 0;
    return (dash?.chart ?? []).map((p) => {
      running += p.savings;
      return { label: p.label, total: running };
    });
  }, [dash]);

  if (!data || !dash) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const saveSettings = (s: SaccoSettings) => {
    const next: SaccoData = { ...data, settings: s };
    setData(next);
    setSaveFailed(!saveData(next));
    setSettingsOpen(false);
    setNotice("Settings saved. All reports now use them.");
  };

  const years = ["all", ...cycleYears(data)];
  const periodName = period === "all" ? "all time" : period;
  const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
  const T = dash.memberTotals;
  const K = dash.kpi;
  const repaid = dash.loans.reduce((a, l) => a + l.repaid, 0);
  const loanInterest = dash.loans.reduce((a, l) => a + l.interest, 0);
  const payoutRows = [...dash.members].sort((a, b) => b.payout - a.payout);

  const summary: { metric: string; value: number; note: string }[] = [
    { metric: "Opening balances", value: T.opening, note: `${K.members} members paid in when they joined` },
    { metric: "Savings (shares bought)", value: T.saved, note: `${fmtShares(T.shares)} shares at UGX ${money(data.settings.shareValue)}` },
    { metric: "Interest collected", value: K.interest, note: "Shared between members by their shares" },
    { metric: "Loans given", value: K.loansGiven, note: `${K.loanCount} loans` },
    { metric: "Loans repaid so far", value: repaid, note: "Principal and interest paid back" },
    { metric: "Loans still owed", value: K.owed, note: `${K.openLoans} loans not fully repaid` },
    { metric: "Net position of all members", value: T.net, note: "Opening + savings + interest − owed" },
    { metric: "Projected payout", value: T.payout, note: `At ${+(data.settings.payoutRate * 100).toFixed(2)}% payout rate` },
  ];

  // Each report document is a CSV built from the same figures shown on screen.
  const reports = [
    {
      id: "summary",
      title: "Group summary",
      desc: "The key figures above in one table.",
      color: "#d97706",
      icon: BarChart3,
      rows: summary.length,
      unit: "lines",
      run: () => downloadCsv(`group_summary_${period}`, ["Item", "Amount (UGX)", "Note"], summary.map((s) => [s.metric, s.value, s.note])),
    },
    {
      id: "members",
      title: "Member savings",
      desc: "Shares, savings, opening balance and interest for each member.",
      color: "#3b82f6",
      icon: PiggyBank,
      rows: dash.members.length,
      unit: "members",
      run: () =>
        downloadCsv(
          `member_savings_${period}`,
          ["Member", "Shares", "Savings (UGX)", "Opening (UGX)", "Interest (UGX)", "Owed (UGX)", "Net position (UGX)"],
          dash.members.map((m) => [m.name, m.shares, m.saved, m.opening, m.interest, m.owed, m.net])
        ),
    },
    {
      id: "loans",
      title: "Loans report",
      desc: "Every loan with rate, interest, amount repaid and balance.",
      color: "#10b981",
      icon: CreditCard,
      rows: dash.loans.length,
      unit: "loans",
      run: () =>
        downloadCsv(
          `loans_${period}`,
          ["Member", "Month", "Lent (UGX)", "Monthly rate (%)", "Interest (UGX)", "To repay (UGX)", "Repaid (UGX)", "Still owed (UGX)"],
          dash.loans.map((l) => [l.memberName, l.month ? monthLabel(l.month) : "Not set", l.principal, +(l.rate * 100).toFixed(2), l.interest, l.repayable, l.repaid, l.balance])
        ),
    },
    {
      id: "interest",
      title: "Interest by month",
      desc: "Interest collected each month, and each member's share.",
      color: "#8b5cf6",
      icon: Percent,
      rows: dash.chart.filter((p) => p.interest > 0).length,
      unit: "months",
      run: () =>
        downloadCsv(
          `interest_${period}`,
          ["Month", "Interest collected (UGX)"],
          dash.chart.map((p) => [p.label, p.interest])
        ),
    },
    {
      id: "payout",
      title: "Payout projection",
      desc: "What each member is due at the end of the saving cycle.",
      color: "#ef4444",
      icon: Wallet,
      rows: dash.members.length,
      unit: "members",
      run: () =>
        downloadCsv(
          `payout_projection_${period}`,
          ["Member", "Opening (UGX)", "Savings (UGX)", "Interest (UGX)", "Owed (UGX)", "Net position (UGX)", "Payout (UGX)"],
          payoutRows.map((m) => [m.name, m.opening, m.saved, m.interest, m.owed, m.net, m.payout])
        ),
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quatres Savings Group</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Reports</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Figures for {periodName} · {today}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button className={btnGhost} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
          <button className={btnPrimary} onClick={() => setSettingsOpen(true)}>
            <Settings size={14} /> Edit settings
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
      <div className="inline-flex gap-1 rounded-xl border border-slate-900 bg-slate-950 p-1 print:hidden">
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

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Members" value={money(K.members)} sub={`${fmtShares(T.shares)} shares held`} icon={Users} tint="bg-blue-500/10 text-blue-400" />
        <Kpi label="Total savings" unit="UGX" value={money(T.saved)} sub={`Plus UGX ${money(T.opening)} opening balances`} icon={Wallet} tint="bg-amber-500/10 text-amber-400" />
        <Kpi label="Loans still owed" unit="UGX" value={money(K.owed)} sub={`Of UGX ${money(K.loansGiven)} lent`} icon={CreditCard} tint="bg-orange-500/10 text-orange-400" />
        <Kpi label="Projected payout" unit="UGX" value={money(T.payout)} sub={`Interest charged on loans: UGX ${money(loanInterest)}`} icon={TrendingUp} tint="bg-emerald-500/10 text-emerald-400" />
      </div>

      {/* Summary table */}
      <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Group summary</CardTitle>
          <p className="mt-0.5 text-xs text-slate-400">Where the group stands, from the savings, loans and interest records</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40">
                  <th className={thCls}>Item</th>
                  <th className={`${thCls} text-right`}>Amount (UGX)</th>
                  <th className={thCls}>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {summary.map((s) => (
                  <tr key={s.metric} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-bold text-slate-200">{s.metric}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">{money(s.value)}</td>
                    <td className="px-4 py-3 text-slate-500">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Growth + settings in force */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-slate-900 bg-slate-900/40 xl:col-span-2">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Savings growth</CardTitle>
            <p className="mt-0.5 text-xs text-slate-400">Total savings added up month by month</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={growth} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C_SAVINGS} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C_SAVINGS} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => axisFmt(Number(v))} tick={{ fontSize: 10, fill: TEXT_SECONDARY }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" name="Total savings" stroke={C_SAVINGS} strokeWidth={2} fill="url(#growthFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-900/40">
          <CardHeader className="border-b border-slate-900/60 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Settings in use</CardTitle>
              <button className={`${iconBtn} print:hidden`} aria-label="Edit settings" onClick={() => setSettingsOpen(true)}>
                <Settings size={14} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6 text-xs">
            {[
              ["Value of 1 share", `UGX ${money(data.settings.shareValue)}`],
              ["Opening balance", `UGX ${money(data.settings.openingBalance)}`],
              ["Payout rate", `${+(data.settings.payoutRate * 100).toFixed(2)}%`],
              ["Cycle starts", monthLabel(data.settings.cycleStart)],
              ["Cycle length", `${data.settings.cycleMonths} months`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-slate-900 pb-2 last:border-0">
                <span className="text-slate-400">{k}</span>
                <span className="font-mono font-bold text-slate-100">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payout projection */}
      <Card className="overflow-hidden border-slate-900 bg-slate-900/40">
        <CardHeader className="border-b border-slate-900/60 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Payout projection</CardTitle>
          <p className="mt-0.5 text-xs text-slate-400">What each member is due at the end of the cycle</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40">
                  <th className={thCls}>Member</th>
                  <th className={`${thCls} text-right`}>Opening</th>
                  <th className={`${thCls} text-right`}>Savings</th>
                  <th className={`${thCls} text-right`}>Interest</th>
                  <th className={`${thCls} text-right`}>Owed</th>
                  <th className={`${thCls} text-right`}>Net position</th>
                  <th className={`${thCls} text-right`}>Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {payoutRows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-bold text-slate-200">{m.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{money(m.opening)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{money(m.saved)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{money(m.interest)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{m.owed ? money(m.owed) : "–"}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">{money(m.net)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{money(m.payout)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-800 bg-slate-950/40 font-bold">
                  <td className="px-4 py-3 text-slate-300">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.opening)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.saved)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.interest)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{money(T.owed)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100">{money(T.net)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{money(T.payout)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Downloadable reports */}
      <div className="space-y-4 print:hidden">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
            <FileText size={14} className="text-amber-500" /> Report files
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Download any report as a CSV file for {periodName}. It opens in Excel.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="border-slate-900 bg-slate-900/40">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: r.color + "12", border: `1px solid ${r.color}25` }}>
                    <r.icon size={18} style={{ color: r.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-slate-200">{r.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                  <span className="text-[11px] font-bold" style={{ color: r.color }}>
                    {r.rows} {r.unit}
                  </span>
                  <button className={btnAdd} onClick={r.run} aria-label={`Download ${r.title}`}>
                    <Download size={12} /> Download CSV
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {settingsOpen ? (
        <Modal title="Report settings" onClose={() => setSettingsOpen(false)} wide>
          <SettingsForm initial={data.settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />
        </Modal>
      ) : null}
    </div>
  );
}
