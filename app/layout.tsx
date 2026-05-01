"use client";

import Sidebar from "./components/Sidebar";
import "./globals.css";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex bg-gray-50">
        <QueryClientProvider client={queryClient}>
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </QueryClientProvider>
      </body>
    </html>
  );
}