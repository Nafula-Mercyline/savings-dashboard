"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  Plus,
  X,
  Building2,
  Database,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import {
  STORAGE_KEY,
  clearSavedData,
  cloneSeed,
  computeDashboard,
  cycleYears,
  loadData,
  money,
  monthLabel,
  normalizeData,
  saveData,
  setMonthEntries,
  type Dashboard,
  type SaccoData,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel                                                        */
/* ------------------------------------------------------------------ */

// Chart colours: the first three slots of a palette checked for colour-blind safety
// and contrast on this dark card. They keep the same job everywhere on the page.
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
const btnAdd = `${btnBase} border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400 hover:bg-amber-500/20`;
const iconBtn = "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200";
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";
const thCls = "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500";

const axisFmt = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);

const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));
const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));

type ModalState = { kind: "month" } | { kind: "data" } | null;

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

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof PiggyBank;
  tint: string;
}) {
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
          <span className="mr-1.5 text-xs font-semibold text-slate-500">UGX</span>
          {money(value)}
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

/* ------------------------------------------------------------------ */
/*  Forms                                                              */
/* ------------------------------------------------------------------ */

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

function DataPanel({
  data,
  saveFailed,
  onImport,
  onReset,
  onClose,
}: {
  data: SaccoData;
  saveFailed: boolean;
  onImport: (d: SaccoData) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [err, setErr] = useState("");

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `village-savings-sacco-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = normalizeData(JSON.parse(await file.text()));
      if (!parsed) return setErr("That file isn't a backup from this dashboard.");
      if (!window.confirm("Replace everything on the dashboard with the figures in this backup?")) return;
      onImport(parsed);
    } catch {
      setErr("Couldn't read that file.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-400">
        Everything added or changed here is saved in <span className="font-semibold text-slate-200">this browser</span>. It
        isn&apos;t shared with other devices, so download a backup now and then.
      </p>
      {saveFailed ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-400">
          This browser is not saving changes (private window or storage full). Download a backup before closing the page.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={download}>
          <Download size={12} /> Download backup
        </button>
        <label className={`${btnGhost} cursor-pointer`}>
          <Upload size={12} /> Restore from backup
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => restore(e.target.files?.[0])} />
        </label>
      </div>
      <div className="border-t border-slate-800 pt-4">
        <button
          type="button"
          className={btnDanger}
          onClick={() => {
            if (window.confirm("Throw away all changes and go back to the figures from the savings workbook?")) onReset();
          }}
        >
          <RotateCcw size={12} /> Reset to the workbook figures
        </button>
      </div>
      {err ? <p className="text-xs font-semibold text-rose-400">{err}</p> : null}
      <div className="flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function DashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SaccoData | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState("");

  // Load the saved figures in the browser (or the workbook figures the first time)
  useEffect(() => {
    setData(loadData());
    setToday(new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setData(loadData());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const years = useMemo(() => (data ? cycleYears(data) : []), [data]);
  const requested = searchParams.get("year");
  const period = requested && (requested === "all" || years.includes(requested)) ? requested : "all";
  const dash = useMemo(() => (data ? computeDashboard(data, period) : null), [data, period]);

  const changePeriod = (p: string) => router.push(`${pathname}?year=${p}`, { scroll: false });

  const commit = (next: SaccoData, message: string) => {
    setData(next);
    setSaveFailed(!saveData(next));
    setModal(null);
    setNotice(message);
  };

  if (!data || !dash) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  const { kpi, chart } = dash;
  const periodLabel = period === "all" ? "All time" : period;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-900 pb-6 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">
              <Building2 size={12} />
              <span>Nurses Quatres Savings Group</span>
            </div>
            <h1 className="font-sans text-2xl font-black tracking-tight text-white">Executive Core Console</h1>
            <p className="mt-1 text-xs font-medium text-slate-400">System Identity: James · Operational Date: {today}</p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
              {["all", ...years].map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  aria-pressed={period === p}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${period === p ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {p === "all" ? "All time" : p}
                </button>
              ))}
            </div>
            <button type="button" className={btnGhost} onClick={() => setModal({ kind: "data" })}>
              <Database size={12} /> Data
            </button>
          </div>
        </div>

        {saveFailed ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-400">
            This browser could not save your last change. Open “Data” and download a backup before you close the page.
          </div>
        ) : null}

        {/* Headline figures */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Savings"
            value={kpi.savings}
            icon={PiggyBank}
            tint="bg-blue-500/10 text-blue-400 border border-blue-500/20"
            sub={
              period === "all"
                ? `${fmtShares(kpi.shares)} shares · plus UGX ${money(kpi.opening)} opening balances`
                : `${fmtShares(kpi.shares)} shares bought in ${periodLabel}`
            }
          />
          <Kpi
            label="Loans given"
            value={kpi.loansGiven}
            icon={CreditCard}
            tint="bg-orange-500/10 text-orange-400 border border-orange-500/20"
            sub={`${kpi.loanCount} ${kpi.loanCount === 1 ? "loan" : "loans"}${period === "all" ? "" : " dated " + periodLabel
              }`}
          />
          <Kpi
            label="Still owed"
            value={kpi.owed}
            icon={Wallet}
            tint="bg-rose-500/10 text-rose-400 border border-rose-500/20"
            sub={`${kpi.openLoans} ${kpi.openLoans === 1 ? "loan" : "loans"} not yet cleared`}
          />
          <Kpi
            label="Interest collected"
            value={kpi.interest}
            icon={TrendingUp}
            tint="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            sub="Shared between members by their savings"
          />
        </div>

        {/* Month by month */}
        <Card className="border-slate-900 bg-slate-900/40">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Month by month · {periodLabel}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                  {(["chart", "table"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize transition-colors ${view === v ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button type="button" className={btnAdd} onClick={() => setModal({ kind: "month" })}>
                  <Plus size={12} /> Record month
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chart.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-xs text-slate-500">
                Nothing recorded for {periodLabel} yet. Use “Record month” to add it.
              </div>
            ) : view === "chart" ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chart} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: TEXT_SECONDARY }} axisLine={{ stroke: GRID }} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => axisFmt(Number(v))}
                    tick={{ fontSize: 11, fill: TEXT_SECONDARY }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(v: string) => <span style={{ color: TEXT_SECONDARY }}>{v}</span>}
                  />
                  <Bar dataKey="savings" name="Savings" fill={C_SAVINGS} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="loans" name="Loans given" fill={C_LOANS} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Line
                    type="monotone"
                    dataKey="interest"
                    name="Interest collected"
                    stroke={C_INTEREST}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C_INTEREST, stroke: SURFACE, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="border-b border-slate-800">
                      <th className={thCls}>Month</th>
                      <th className={`${thCls} text-right`}>Savings</th>
                      <th className={`${thCls} text-right`}>Loans given</th>
                      <th className={`${thCls} text-right`}>Interest collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {chart.map((p) => (
                      <tr key={p.month} className="hover:bg-slate-900/40">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-200">{monthLabel(p.month)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-slate-300">{money(p.savings)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-slate-300">{p.loans ? money(p.loans) : "—"}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-slate-300">{p.interest ? money(p.interest) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {modal?.kind === "month" && (
        <Modal title="Record month" onClose={() => setModal(null)} wide>
          <MonthForm
            data={data}
            dash={dash}
            onSave={(month, shares, interest) => commit(setMonthEntries(data, month, shares, interest), `${monthLabel(month)} saved`)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.kind === "data" && (
        <Modal title="Data" onClose={() => setModal(null)}>
          <DataPanel
            data={data}
            saveFailed={saveFailed}
            onImport={(d) => commit(d, "Backup restored")}
            onReset={() => {
              clearSavedData();
              setData(cloneSeed());
              setSaveFailed(false);
              setModal(null);
              setNotice("Back to the workbook figures");
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {notice && (
        <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-emerald-500/30 bg-slate-900 px-4 py-3 text-xs font-semibold text-emerald-400 shadow-2xl">
          {notice}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
