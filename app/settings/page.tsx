"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  Database,
  Users,
  Download,
  Upload,
  RotateCcw,
  Save,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  clearSavedData,
  cloneSeed,
  computeDashboard,
  loadData,
  money,
  monthLabel,
  normalizeData,
  saveData,
  type SaccoData,
  type SaccoSettings,
} from "@/lib/saccoData";

/* ------------------------------------------------------------------ */
/*  Look & feel (same as the dashboard page)                           */
/* ------------------------------------------------------------------ */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-amber-500 px-3.5 py-2 text-slate-950 hover:bg-amber-400`;
const btnGhost = `${btnBase} border border-slate-700 bg-slate-900 px-3.5 py-2 text-slate-300 hover:bg-slate-800`;
const btnDanger = `${btnBase} border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-rose-400 hover:bg-rose-500/20`;
const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none";

const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(/,/g, "")));
const fmtShares = (n: number) => (Number.isInteger(n) ? money(n) : n.toFixed(1));

type SectionId = "rules" | "overview" | "data";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

function saveFile(name: string, text: string, mime: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: mime }));
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const csvCell = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replace(/"/g, '""')}"`);
const toCsv = (header: string[], rows: (string | number)[][]) =>
  [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [data, setData] = useState<SaccoData | null>(null);
  const [active, setActive] = useState<SectionId>("rules");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // the form is kept as text while it is being typed
  const [form, setForm] = useState({ shareValue: "", opening: "", payout: "", start: "", months: "" });
  const [formErr, setFormErr] = useState("");

  const fillForm = (s: SaccoSettings) =>
    setForm({
      shareValue: String(s.shareValue),
      opening: String(s.openingBalance),
      payout: String(+(s.payoutRate * 100).toFixed(2)),
      start: s.cycleStart,
      months: String(s.cycleMonths),
    });

  useEffect(() => {
    const d = loadData();
    setData(d);
    fillForm(d.settings);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const dash = useMemo(() => (data ? computeDashboard(data, "all") : null), [data]);

  if (!data || !dash) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const apply = (next: SaccoData, text: string) => {
    setData(next);
    fillForm(next.settings);
    setSaveFailed(!saveData(next));
    setNotice({ ok: true, text });
  };

  const submitRules = (e: FormEvent) => {
    e.preventDefault();
    const sv = num(form.shareValue);
    const op = num(form.opening);
    const pr = num(form.payout);
    const cm = num(form.months);
    if (!Number.isFinite(sv) || sv <= 0) return setFormErr("A share must be worth more than 0.");
    if (!Number.isFinite(op) || op < 0) return setFormErr("Opening balance must be 0 or more.");
    if (!Number.isFinite(pr) || pr <= 0 || pr > 100) return setFormErr("Payout rate must be between 1% and 100%.");
    if (!/^\d{4}-\d{2}$/.test(form.start)) return setFormErr("Choose the month the saving cycle starts.");
    if (!Number.isInteger(cm) || cm < 1 || cm > 60) return setFormErr("The cycle must be between 1 and 60 months.");
    setFormErr("");
    apply(
      {
        ...data,
        settings: { ...data.settings, shareValue: Math.round(sv), openingBalance: Math.round(op), payoutRate: pr / 100, cycleStart: form.start, cycleMonths: cm },
      },
      "Settings saved. Every page now uses them."
    );
  };

  const s = data.settings;
  const changed =
    form.shareValue !== String(s.shareValue) ||
    form.opening !== String(s.openingBalance) ||
    form.payout !== String(+(s.payoutRate * 100).toFixed(2)) ||
    form.start !== s.cycleStart ||
    form.months !== String(s.cycleMonths);

  const today = new Date().toISOString().slice(0, 10);
  const months = dash.chart.map((p) => p.month);

  const downloadBackup = () => saveFile(`savings-group-backup-${today}.json`, JSON.stringify(data, null, 2), "application/json");

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = normalizeData(JSON.parse(await file.text()));
      if (!parsed) return setNotice({ ok: false, text: "That file isn't a backup from this dashboard." });
      if (!window.confirm("Replace everything with the figures in this backup?")) return;
      apply(parsed, "Backup restored.");
    } catch {
      setNotice({ ok: false, text: "Couldn't read that file." });
    }
  };

  const reset = () => {
    if (!window.confirm("Throw away all changes and go back to the figures from the savings workbook?")) return;
    clearSavedData();
    const fresh = cloneSeed();
    setData(fresh);
    fillForm(fresh.settings);
    setSaveFailed(false);
    setNotice({ ok: true, text: "Back to the workbook figures." });
  };

  const exportMembers = () =>
    saveFile(
      `members-${today}.csv`,
      toCsv(
        ["Member", "Phone", "Date joined", "Opening balance (UGX)", "Shares", "Savings (UGX)", "Owed (UGX)"],
        dash.members.map((m) => [m.name, m.phone, data.members.find((x) => x.id === m.id)?.joined ?? "", m.opening, m.shares, m.saved, m.owed])
      ),
      "text/csv;charset=utf-8;"
    );

  const exportSavings = () =>
    saveFile(
      `savings-by-month-${today}.csv`,
      toCsv(
        ["Member", ...months.map(monthLabel)],
        data.members.map((m) => [m.name, ...months.map((mo) => data.savings[m.id]?.[mo] ?? 0)])
      ),
      "text/csv;charset=utf-8;"
    );

  const exportLoans = () =>
    saveFile(
      `loans-${today}.csv`,
      toCsv(
        ["Member", "Month", "Lent (UGX)", "Monthly rate (%)", "Interest (UGX)", "To repay (UGX)", "Repaid (UGX)", "Still owed (UGX)"],
        dash.loans.map((l) => [l.memberName, l.month ? monthLabel(l.month) : "Not set", l.principal, +(l.rate * 100).toFixed(2), l.interest, l.repayable, l.repaid, l.balance])
      ),
      "text/csv;charset=utf-8;"
    );

  const exportInterest = () =>
    saveFile(
      `interest-${today}.csv`,
      toCsv(
        ["Month", "Interest collected (UGX)"],
        months.map((mo) => [monthLabel(mo), data.interest[mo] ?? 0])
      ),
      "text/csv;charset=utf-8;"
    );

  const monthsWithSavings = new Set(Object.values(data.savings).flatMap((row) => Object.entries(row).filter(([, v]) => v > 0).map(([m]) => m))).size;
  const monthsWithInterest = Object.values(data.interest).filter((v) => v > 0).length;

  const nav: { id: SectionId; icon: typeof Wallet; label: string; desc: string }[] = [
    { id: "rules", icon: Wallet, label: "Savings rules", desc: "Share value, payout and cycle" },
    { id: "overview", icon: Users, label: "Group overview", desc: "What is recorded so far" },
    { id: "data", icon: Database, label: "Data & backup", desc: "Backup, restore and exports" },
  ];
  const current = nav.find((n) => n.id === active)!;

  const content: Record<SectionId, ReactNode> = {
    rules: (
      <form onSubmit={submitRules} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Value of 1 share (UGX)" hint="Changing this changes the value of every share already bought">
            <input className={inputCls} inputMode="numeric" value={form.shareValue} onChange={(e) => setForm({ ...form, shareValue: e.target.value })} />
          </Field>
          <Field label="Opening balance (UGX)" hint="Pre-filled when you add a new member">
            <input className={inputCls} inputMode="numeric" value={form.opening} onChange={(e) => setForm({ ...form, opening: e.target.value })} />
          </Field>
          <Field label="Payout rate (%)" hint="Share of each member's net position paid out at the end">
            <input className={inputCls} inputMode="decimal" value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cycle starts">
              <input className={inputCls} type="month" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Length (months)">
              <input className={inputCls} inputMode="numeric" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-400">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            Loans in this group are charged a flat <span className="font-semibold text-slate-200">4% or 6% a month</span>. You choose the rate on each loan
            when you add it, so there is no single loan rate to set here. Interest collected is shared between members by the shares they hold.
          </p>
        </div>

        {formErr ? <p className="text-xs font-semibold text-rose-400">{formErr}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={!changed}>
            <Save size={13} /> Save changes
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={!changed}
            onClick={() => {
              fillForm(data.settings);
              setFormErr("");
            }}
          >
            Undo
          </button>
        </div>
      </form>
    ),

    overview: (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["Group", "Nurses Quartres Savings Group"],
            ["Members", money(data.members.length)],
            ["Shares held", fmtShares(dash.kpi.shares)],
            ["Months with savings", money(monthsWithSavings)],
            ["Months with interest", money(monthsWithInterest)],
            ["Loans recorded", money(data.loans.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k}</p>
              <p className="mt-1 break-words font-mono text-sm font-bold text-slate-100">{v}</p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-900 rounded-xl border border-slate-800 text-xs">
          {[
            ["Value of 1 share", `UGX ${money(s.shareValue)}`],
            ["Opening balance", `UGX ${money(s.openingBalance)}`],
            ["Payout rate", `${+(s.payoutRate * 100).toFixed(2)}%`],
            ["Saving cycle", `${monthLabel(s.cycleStart)} for ${s.cycleMonths} months`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <span className="text-slate-400">{k}</span>
              <span className="font-mono font-bold text-slate-100">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Edit members, savings, loans and interest on their own pages. Change the rules above in Savings rules.</p>
      </div>
    ),

    data: (
      <div className="space-y-6">
        <p className="text-xs leading-relaxed text-slate-400">
          Everything added or changed is saved in <span className="font-semibold text-slate-200">this browser</span>. It isn&apos;t shared with other
          devices, so download a backup now and then.
        </p>
        {saveFailed ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-400">
            This browser is not saving changes (private window or storage full). Download a backup before closing the page.
          </p>
        ) : null}

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Backup</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={downloadBackup}>
              <Download size={12} /> Download backup
            </button>
            <label className={`${btnGhost} cursor-pointer`}>
              <Upload size={12} /> Restore from backup
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Export to Excel (CSV)</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { label: "Members", desc: `${data.members.length} members with shares and savings`, run: exportMembers },
              { label: "Savings by month", desc: "Shares each member bought, month by month", run: exportSavings },
              { label: "Loans", desc: `${data.loans.length} loans with repayments`, run: exportLoans },
              { label: "Interest by month", desc: "Interest collected each month", run: exportInterest },
            ].map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={ex.run}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
              >
                <FileText size={16} className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">{ex.label}</p>
                  <p className="text-xs text-slate-500">{ex.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Start again</p>
            <p className="mb-3 mt-0.5 text-xs text-slate-400">Throws away everything added or changed and goes back to the figures from the savings workbook.</p>
            <button type="button" className={btnDanger} onClick={reset}>
              <RotateCcw size={12} /> Reset to the workbook figures
            </button>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-slate-950 p-4 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950 md:p-8">
      {notice ? (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold ${notice.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
        >
          {notice.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {notice.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Navigation */}
        <div className="space-y-2 lg:col-span-4">
          <div className="mb-4 px-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Nurses Quartres Savings Group</p>
            <h1 className="text-2xl font-black tracking-tight text-white">Settings</h1>
            <p className="mt-1 text-xs text-slate-400">The rules your savings, loans and reports are worked out from.</p>
          </div>
          {nav.map((sec) => {
            const Icon = sec.icon;
            const on = active === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActive(sec.id)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${on ? "border-slate-700 bg-slate-900" : "border-transparent text-slate-400 hover:bg-slate-900/60"
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`rounded-xl p-2 ${on ? "bg-amber-500 text-slate-950" : "bg-slate-900 text-slate-500"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${on ? "text-white" : "text-slate-300"}`}>{sec.label}</p>
                    <p className="mt-0.5 text-xs leading-none text-slate-500">{sec.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className={on ? "text-slate-400" : "text-slate-700"} />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden rounded-2xl border-slate-900 bg-slate-900/40">
            <CardHeader className="border-b border-slate-900/60 px-6 py-5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">{current.label}</CardTitle>
              <p className="mt-0.5 text-xs text-slate-400">{current.desc}</p>
            </CardHeader>
            <CardContent className="p-6">{content[active]}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
