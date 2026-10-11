"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const PUBLIC_ROUTES = ["/login"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/")
  );

  // Login renders full-screen: no sidebar, no content padding
  if (isPublic) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  return (
    <>
      {/* Sidebar container */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen min-w-0 overflow-y-auto bg-slate-950">
        {children}
      </main>
    </>
  );
}