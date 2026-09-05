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
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <Toaster 
          toastOptions={{
            className: 'bg-white border border-border rounded-lg shadow-md font-sans text-foreground font-medium',
          }} />
      </body>
    </html>
  );
}
