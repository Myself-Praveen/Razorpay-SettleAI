import { Toaster } from "sonner";
import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SettleAI — Finance Reconciliation Agent",
  description: "Production-Grade AI Finance Reconciliation",
};

import { Sidebar } from "@/components/Sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans antialiased", GeistSans.variable, GeistMono.variable)}>
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <Toaster toastOptions={{
          className: 'bg-white border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono text-black font-bold',
        }} />
      </body>
    </html>
  );
}
