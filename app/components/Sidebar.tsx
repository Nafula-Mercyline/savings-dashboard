"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    PiggyBank,
    Wallet,
    Percent,
    Users,
    ArrowLeftRight,
    BarChart3,
    Settings,
    Building2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

type MenuItem = {
    name: string;
    icon: LucideIcon;
    path: string;
};

export default function Sidebar() {
    const pathname = usePathname();

    const menu: MenuItem[] = [
        // Changed path from "/" to "/dashboard" to match app/dashboard/page.tsx
        { name: "Dashboard", icon: Home, path: "/Dashboard" },
        { name: "My Savings", icon: PiggyBank, path: "/savings" },
        { name: "Loans", icon: Wallet, path: "/loans" },
        { name: "Interest Summary", icon: Percent, path: "/interest" },
        { name: "Members", icon: Users, path: "/members" },
        { name: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
        { name: "Reports", icon: BarChart3, path: "/reports" },
        { name: "Settings", icon: Settings, path: "/settings" },
    ];

    return (
        <div className="w-64 bg-slate-950 border-r border-slate-900 p-4 min-h-screen flex flex-col justify-between text-slate-200">
            <div className="space-y-6">
                {/* ── Brand Header ── */}
                <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-900 pb-4">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                        <Building2 size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 tracking-tight leading-none">Kampala SACCO</h2>
                        <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1 inline-block">Management Portal</span>
                    </div>
                </div>

                {/* ── Navigation Menu ── */}
                <nav>
                    <ul className="space-y-1">
                        {menu.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;

                            return (
                                <li key={index}>
                                    <Link
                                        href={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${isActive
                                                ? "bg-slate-900 text-amber-400 font-semibold shadow-sm border border-slate-800"
                                                : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                                            }`}
                                    >
                                        {/* Left Accent indicator line on active link */}
                                        {isActive && (
                                            <span className="absolute left-0 top-3 bottom-3 w-1 bg-amber-500 rounded-r-md" />
                                        )}

                                        <Icon
                                            className={`transition-colors duration-200 ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-400"
                                                }`}
                                            size={18}
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* ── Bottom Section ── */}
            <div className="pt-4 border-t border-slate-900 px-3 text-[11px] text-slate-600 flex justify-between items-center">
                <span>System Status: Online</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
        </div>
    );
}