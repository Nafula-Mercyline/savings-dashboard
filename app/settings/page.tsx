"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import settingsService from "@/lib/api/settingsService"; 

import {
  Building2, Bell, Shield, Database, Percent,
  Users, Save, ChevronRight, Check, AlertTriangle,
  Eye, EyeOff, Upload, RefreshCw, Trash2, Plus,
  Globe, Mail, Phone, MapPin, Hash, Calendar, Download, Loader2
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────
type SectionId = "organisation" | "rates" | "notifications" | "security" | "users" | "data";

// ── Sub-components ───────────────────────────────────────────
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button 
      onClick={onToggle} 
      type="button"
      aria-pressed={on}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${on ? "bg-amber-500" : "bg-gray-200"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function FormField({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        <div className={Icon ? "[&>input]:pl-9 [&>select]:pl-9" : ""}>{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition placeholder-gray-400 disabled:opacity-60";
const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-amber-400 transition disabled:opacity-60";

// ── Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>("organisation");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Consolidated Form State matching API fields
  const [orgSettings, setOrgSettings] = useState({
    name: "Kampala Savings & Credit Co-op",
    registrationNumber: "SACCO-UG-20180042",
    email: "admin@kampala-sacco.ug",
    phone: "+256 414 000 000",
    website: "https://kampala-sacco.ug",
    address: "Plot 14, Kampala Road, Kampala",
    financialYearEnd: "December 31",
    currency: "UGX — Ugandan Shilling",
    minShareCapital: "50000",
    maxLoanMultiplier: "3",
    loanProcessingFee: "1.5"
  });

  const [notifs, setNotifs] = useState({
    loanOverdue: true,
    newMember: true,
    largeWithdrawal: false,
    monthlyReport: true,
    failedTxn: true,
    dailySummary: false,
    loanApproval: true,
    memberBirthday: false,
    notifyEmail: "admin@kampala-sacco.ug",
    notifyPhone: "+256 414 000 000"
  });

  const [rates, setRates] = useState({
    regularSavings: "5.0", fixedDeposit: "9.0",
    holidaySavings: "4.0", juniorSavings: "3.0",
    personalLoan: "18.0", businessLoan: "15.5",
    emergencyLoan: "12.0", educationLoan: "10.0",
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: "1 hour",
    maxFailedLogins: "5",
    ipAllowlist: ""
  });

  const [showPass, setShowPass] = useState(false);

  // Fetch settings parameters dynamically on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const [allData, publicData, financialData] = await Promise.all([
          settingsService.getAllSettings("all"),
          settingsService.getPublicSettings(),
          settingsService.getFinancialSettings()
        ]);

        if (allData) {
          if (allData.organisation) setOrgSettings(prev => ({ ...prev, ...allData.organisation }));
          if (allData.rates) setRates(prev => ({ ...prev, ...allData.rates }));
          if (allData.notifications) setNotifs(prev => ({ ...prev, ...allData.notifications }));
          if (allData.security) setSecuritySettings(prev => ({ ...prev, ...allData.security }));
        }
      } catch (err: any) {
        setError(err?.message || "Failed to download system configurations.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Centralized Mutation Handler
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updates = {
        organisation: orgSettings,
        rates,
        notifications: notifs,
        security: securitySettings
      };

      await settingsService.updateSettings(updates);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || "Changes could not be updated successfully.");
    } finally {
      setSaving(false);
    }
  };

  const navSections = [
    { id: "organisation" as SectionId, icon: Building2, label: "Organisation",      desc: "Name, address & currency" },
    { id: "rates"        as SectionId, icon: Percent,   label: "Interest Rates",      desc: "Savings & loan rates" },
    { id: "notifications" as SectionId, icon: Bell,      label: "Notifications",      desc: "Alerts & email preferences" },
    { id: "security"     as SectionId, icon: Shield,    label: "Security & Access",  desc: "Passwords, 2FA & sessions" },
    { id: "users"        as SectionId, icon: Users,     label: "Users & Roles",      desc: "Staff accounts & permissions" },
    { id: "data"         as SectionId, icon: Database,  label: "Data & Backup",      desc: "Backup schedule & exports" },
  ];

  // ── Section content views ──────────────────────────────────
  const sectionContent: Record<SectionId, React.ReactNode> = {
    organisation: (
      <div className="space-y-6">
        <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xl flex-shrink-0">
            KSC
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Organisation Logo</p>
            <p className="text-xs text-gray-400 mt-0.5">PNG or JPG, max 2MB. Appears on reports and receipts.</p>
            <button type="button" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
              <Upload size={12} /> Upload Logo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Organisation Name" icon={Building2}>
            <input className={inputCls} value={orgSettings.name} onChange={e => setOrgSettings({ ...orgSettings, name: e.target.value })} />
          </FormField>
          <FormField label="Registration Number" icon={Hash}>
            <input className={inputCls} value={orgSettings.registrationNumber} onChange={e => setOrgSettings({ ...orgSettings, registrationNumber: e.target.value })} />
          </FormField>
          <FormField label="Email Address" icon={Mail}>
            <input className={inputCls} type="email" value={orgSettings.email} onChange={e => setOrgSettings({ ...orgSettings, email: e.target.value })} />
          </FormField>
          <FormField label="Phone Number" icon={Phone}>
            <input className={inputCls} type="tel" value={orgSettings.phone} onChange={e => setOrgSettings({ ...orgSettings, phone: e.target.value })} />
          </FormField>
          <FormField label="Website" icon={Globe}>
            <input className={inputCls} type="url" value={orgSettings.website} onChange={e => setOrgSettings({ ...orgSettings, website: e.target.value })} />
          </FormField>
          <FormField label="Physical Address" icon={MapPin}>
            <input className={inputCls} value={orgSettings.address} onChange={e => setOrgSettings({ ...orgSettings, address: e.target.value })} />
          </FormField>
          <FormField label="Financial Year End" icon={Calendar}>
            <select className={selectCls} value={orgSettings.financialYearEnd} onChange={e => setOrgSettings({ ...orgSettings, financialYearEnd: e.target.value })}>
              <option>December 31</option>
              <option>March 31</option>
              <option>June 30</option>
              <option>September 30</option>
            </select>
          </FormField>
          <FormField label="Currency">
            <select className={selectCls} value={orgSettings.currency} onChange={e => setOrgSettings({ ...orgSettings, currency: e.target.value })}>
              <option>UGX — Ugandan Shilling</option>
              <option>USD — US Dollar</option>
              <option>KES — Kenyan Shilling</option>
              <option>TZS — Tanzanian Shilling</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField label="Minimum Share Capital (UGX)">
            <input className={inputCls} type="number" value={orgSettings.minShareCapital} onChange={e => setOrgSettings({ ...orgSettings, minShareCapital: e.target.value })} />
          </FormField>
          <FormField label="Maximum Loan Multiplier">
            <input className={inputCls} type="number" value={orgSettings.maxLoanMultiplier} onChange={e => setOrgSettings({ ...orgSettings, maxLoanMultiplier: e.target.value })} />
          </FormField>
          <FormField label="Loan Processing Fee (%)">
            <input className={inputCls} type="number" step="0.1" value={orgSettings.loanProcessingFee} onChange={e => setOrgSettings({ ...orgSettings, loanProcessingFee: e.target.value })} />
          </FormField>
        </div>
      </div>
    ),

    rates: (
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-amber-400 rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Savings Products</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Regular Savings", key: "regularSavings" as const },
              { label: "Fixed Deposit",   key: "fixedDeposit"  as const },
              { label: "Holiday Savings", key: "holidaySavings" as const },
              { label: "Junior Savings",  key: "juniorSavings" as const },
            ].map((f) => (
              <div key={f.key} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">{f.label}</p>
                <div className="flex items-center gap-1">
                  <input
                    className="w-20 bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-lg font-bold text-amber-700 outline-none focus:border-amber-400 text-center font-mono"
                    value={rates[f.key]}
                    onChange={(e) => setRates(r => ({ ...r, [f.key]: e.target.value }))}
                  />
                  <span className="text-lg font-bold text-amber-600">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">per annum</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-blue-400 rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Loan Products</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Personal Loan",  key: "personalLoan"  as const },
              { label: "Business Loan",  key: "businessLoan"  as const },
              { label: "Emergency Loan", key: "emergencyLoan" as const },
              { label: "Education Loan", key: "educationLoan" as const },
            ].map((f) => (
              <div key={f.key} className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">{f.label}</p>
                <div className="flex items-center gap-1">
                  <input
                    className="w-20 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-lg font-bold text-blue-700 outline-none focus:border-blue-400 text-center font-mono"
                    value={rates[f.key]}
                    onChange={(e) => setRates(r => ({ ...r, [f.key]: e.target.value }))}
                  />
                  <span className="text-lg font-bold text-blue-600">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">per annum</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Rate changes take effect on the next billing cycle. Existing loan agreements are not retroactively affected. Contact your regulator if required by your licence terms.
          </p>
        </div>
      </div>
    ),

    notifications: (
      <div className="space-y-1">
        {[
          { key: "loanOverdue"     as const, label: "Loan Overdue Alerts",      desc: "Notify when a repayment is more than 3 days past due",        badge: "Critical" },
          { key: "failedTxn"       as const, label: "Failed Transaction Alerts",  desc: "Alert on every failed or reversed transaction",                badge: "Critical" },
          { key: "newMember"       as const, label: "New Member Registration",    desc: "Notify when a new member application is submitted",            badge: null },
          { key: "loanApproval"    as const, label: "Loan Approval Required",     desc: "Alert when a loan application is awaiting approval",           badge: null },
          { key: "largeWithdrawal" as const, label: "Large Withdrawal Warning",   desc: "Alert when a single withdrawal exceeds UGX 5,000,000",         badge: null },
          { key: "monthlyReport"   as const, label: "Monthly Report Ready",       desc: "Notify when the monthly financial statement is generated",      badge: null },
          { key: "dailySummary"    as const, label: "Daily Summary Email",        desc: "Receive a daily summary of all transactions at 6:00 PM",       badge: null },
          { key: "memberBirthday"  as const, label: "Member Birthday Reminders",  desc: "Send birthday greetings to members on their special day",      badge: null },
        ].map((n) => (
          <div key={n.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{n.label}</p>
                {n.badge && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">{n.badge}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.desc}</p>
            </div>
            <Toggle on={notifs[n.key]} onToggle={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))} />
          </div>
        ))}

        <div className="pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notification Delivery</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Notify Email">
              <input className={inputCls} type="email" value={notifs.notifyEmail} onChange={e => setNotifs({ ...notifs, notifyEmail: e.target.value })} />
            </FormField>
            <FormField label="Notify Phone (SMS)">
              <input className={inputCls} type="tel" value={notifs.notifyPhone} onChange={e => setNotifs({ ...notifs, notifyPhone: e.target.value })} />
            </FormField>
          </div>
        </div>
      </div>
    ),

    security: (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Change Password</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Current Password">
              <div className="relative">
                <input className={inputCls} type={showPass ? "text" : "password"} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormField>
            <FormField label="New Password">
              <input className={inputCls} type="password" placeholder="••••••••" />
            </FormField>
            <FormField label="Confirm New Password">
              <input className={inputCls} type="password" placeholder="••••••••" />
            </FormField>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Two-Factor Authentication</p>
              <p className="text-xs text-emerald-600 mt-0.5">2FA is currently enabled for all admin accounts via SMS OTP.</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Check size={12} /> Enabled
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Session & Access Controls</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Session Timeout">
              <select className={selectCls} value={securitySettings.sessionTimeout} onChange={e => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </FormField>
            <FormField label="Max Failed Login Attempts">
              <input className={inputCls} type="number" value={securitySettings.maxFailedLogins} onChange={e => setSecuritySettings({ ...securitySettings, maxFailedLogins: e.target.value })} />
            </FormField>
            <FormField label="IP Allowlist (optional)">
              <input className={inputCls} placeholder="e.g. 192.168.1.0/24" value={securitySettings.ipAllowlist} onChange={e => setSecuritySettings({ ...securitySettings, ipAllowlist: e.target.value })} />
            </FormField>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Admin Activity</p>
          <div className="space-y-2">
            {[
              { action: "Login",             user: "James Doe",   time: "Today 09:14",    ip: "197.220.14.8" },
              { action: "Rate Updated",      user: "James Doe",   time: "Yesterday 16:30",   ip: "197.220.14.8" },
              { action: "Report Downloaded", user: "Sarah Kato",  time: "Dec 28, 11:05",     ip: "41.210.8.92" },
              { action: "Member Suspended",  user: "James Doe",   time: "Dec 27, 14:22",     ip: "197.220.14.8" },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="font-medium text-gray-800">{log.action}</span>
                  <span className="text-gray-400">by {log.user}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{log.ip}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    users: (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff Accounts</p>
          <button type="button" className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-500 px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
            <Plus size={13} /> Add User
          </button>
        </div>

        <div className="space-y-2">
          {[
            { name: "James Doe",    email: "james@kampala-sacco.ug",  role: "Super Admin",   status: "Active",   color: "#c9a84c" },
            { name: "Sarah Kato",   email: "sarah@kampala-sacco.ug",  role: "Loan Officer",  status: "Active",   color: "#3ecf8e" },
            { name: "Moses Waiswa", email: "moses@kampala-sacco.ug",  role: "Teller",        status: "Active",   color: "#63b3ed" },
            { name: "Ruth Namuli",  email: "ruth@kampala-sacco.ug",   role: "Accountant",    status: "Active",   color: "#a78bfa" },
            { name: "Peter Onen",   email: "peter@kampala-sacco.ug",  role: "Loan Officer",  status: "Inactive", color: "#9ca3af" },
          ].map((u, i) => {
            const initials = u.name.split(" ").map(n => n[0]).join("");
            return (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: u.color + "22", color: u.color, border: `1.5px solid ${u.color}40` }}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">{u.role}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    u.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>{u.status}</span>
                  <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                    <RefreshCw size={13} />
                  </button>
                  <button type="button" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Role Permissions</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Permission</th>
                  {["Super Admin","Loan Officer","Accountant","Teller"].map(r => (
                    <th key={r} className="py-3 px-4 font-semibold text-gray-500 text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { perm: "View Reports",      vals: [true,  true,  true,  false] },
                  { perm: "Approve Loans",     vals: [true,  true,  false, false] },
                  { perm: "Process Deposits",  vals: [true,  false, false, true ] },
                  { perm: "Edit Rates",        vals: [true,  false, false, false] },
                  { perm: "Manage Users",      vals: [true,  false, false, false] },
                  { perm: "Export Data",       vals: [true,  true,  true,  false] },
                ].map((row) => (
                  <tr key={row.perm} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-700">{row.perm}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {v
                          ? <Check size={14} className="text-emerald-500 mx-auto" />
                          : <span className="text-gray-200 text-lg leading-none mx-auto block text-center">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),

    data: (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Last Backup",       value: "Jan 1, 2025",   sub: "02:00 AM",  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Backup Frequency",  value: "Daily",         sub: "at 2:00 AM", color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-100" },
            { label: "Storage Location",  value: "AWS S3",        sub: "af-south-1", color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-100" },
            { label: "Retention Period",  value: "90 days",       sub: "auto-delete",color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100" },
          ].map((c) => (
            <div key={c.label} className={`p-4 ${c.bg} border ${c.border} rounded-2xl`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Backups</p>
          <div className="space-y-2">
            {[
              { date: "Jan 1, 2025 — 02:00 AM",  size: "48.2 MB", status: "Success" },
              { date: "Dec 31, 2024 — 02:00 AM", size: "47.8 MB", status: "Success" },
              { date: "Dec 30, 2024 — 02:00 AM", size: "47.6 MB", status: "Success" },
              { date: "Dec 29, 2024 — 02:00 AM", size: "—",        status: "Failed"  },
              { date: "Dec 28, 2024 — 02:00 AM", size: "47.1 MB", status: "Success" },
            ].map((b, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Database size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{b.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{b.size}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    b.status === "Success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}>{b.status}</span>
                  {b.status === "Success" && (
                    <button 
                      type="button"
                      onClick={() => settingsService.resetSetting("backup-restore-key")}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <Download size={12} /> Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Export</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Export Members CSV",    desc: "All member records"        },
              { label: "Export Transactions",   desc: "Full ledger as Excel"     },
              { label: "Export Loan Register",  desc: "All loans as CSV"         },
            ].map((ex) => (
              <button key={ex.label} type="button" className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 hover:border-gray-300 transition-colors text-left">
                <Download size={16} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">{ex.label}</p>
                  <p className="text-xs text-gray-400">{ex.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Danger Zone</p>
            <p className="text-xs text-red-500 mt-0.5 mb-3">These actions are irreversible. Please proceed with caution.</p>
            <button type="button" className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={12} /> Purge Archived Data
            </button>
          </div>
        </div>
      </div>
    ),
  };

  const activeSection = navSections.find(s => s.id === active)!;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-gray-500">Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Bar notifications and alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center gap-3">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="px-3 mb-4">
            <h1 className="text-xl font-bold text-gray-800">System Settings</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage dashboard rules, interest rates, and access access levels.</p>
          </div>
          {navSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = active === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActive(sec.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition border ${
                  isSelected 
                    ? "bg-white border-gray-200 shadow-sm ring-1 ring-black/5" 
                    : "border-transparent hover:bg-gray-100 text-gray-500"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-xl transition ${isSelected ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? "text-gray-800" : "text-gray-600"}`}>{sec.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-normal leading-none">{sec.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className={`text-gray-300 transition-transform ${isSelected ? "translate-x-0.5 text-gray-400" : ""}`} />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8">
          <Card className="border border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-gray-100 px-6 py-5 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold text-gray-800">{activeSection.label}</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5 font-normal">{activeSection.desc}</p>
              </div>
              
              {/* Show safe buttons only for dynamic mutation sheets */}
              {["organisation", "rates", "notifications", "security"].includes(active) && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white font-medium text-xs rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : saved ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Save size={13} />
                  )}
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {sectionContent[active]}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}