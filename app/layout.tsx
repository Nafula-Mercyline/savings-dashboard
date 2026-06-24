"use client";

import Sidebar from "./components/Sidebar";
import "./globals.css";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950 text-zinc-100 antialiased">
      <body className="flex min-h-screen bg-zinc-900 selection:bg-amber-500/30">
        <QueryClientProvider client={queryClient}>
          {/* Sidebar container */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 min-h-screen p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </QueryClientProvider>
      </body>
    </html>
  );
}