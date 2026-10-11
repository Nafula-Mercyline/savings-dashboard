"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Save } from "lucide-react";

export default function NewLoanPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect handle mutate function for TanStack Query
    router.push("/loans");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 antialiased">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <button 
            onClick={() => router.push("/loans")}
            className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Portfolio
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Disburse New Capital Facility</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Initialize a new loan ledger entry</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Member Entity Name</label>
            <input required type="text" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none" placeholder="e.g. John Doe" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Facility Type</label>
              <select className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none">
                <option>Commercial Loan</option>
                <option>Emergency Capital</option>
                <option>Development Asset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Principal Amount (UGX)</label>
              <input required type="number" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none font-mono" placeholder="5000000" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60 mt-6">
            <button 
              type="button" 
              onClick={() => router.push("/loans")}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm hover:bg-amber-500 transition-colors"
            >
              <Save size={15} /> Commit Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}