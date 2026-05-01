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
        { name: "Dashboard", icon: Home, path: "/" },
        { name: "My Savings", icon: PiggyBank, path: "/savings" },
        { name: "Loans", icon: Wallet, path: "/loans" },
        { name: "Interest Summary", icon: Percent, path: "/interest" },
        { name: "Members", icon: Users, path: "/members" },
        { name: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
        { name: "Reports", icon: BarChart3, path: "/reports" },
        { name: "Settings", icon: Settings, path: "/settings" },
    ];

    return (
        <div className="w-60 bg-white border-r p-4 min-h-screen">
            <ul className="space-y-3">
                {menu.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;

                    return (
                        <li key={index}>
                            <Link
                                href={item.path}
                                className={`flex items-center gap-3 p-2 rounded-lg transition ${isActive
                                    ? "bg-green-100 text-green-700"
                                    : "hover:bg-green-100 text-gray-700"
                                    }`}
                            >
                                <Icon
                                    className={isActive ? "text-green-700" : "text-green-600"}
                                    size={20}
                                />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}