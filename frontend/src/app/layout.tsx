import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SettleAI — Finance Reconciliation Agent",
  description: "Production-Grade AI Finance Reconciliation",
};

const NAV_ITEMS = [
  { href: "/", label: "Landing" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/qa", label: "Q&A" },
  { href: "/mcp-terminal", label: "MCP Terminal" },
  { href: "/forecast", label: "Forecast" },
  { href: "/audit", label: "Audit" },
  { href: "/observability", label: "Observability" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">
        <div className="flex min-h-screen">
          <nav className="w-56 bg-[#0c0c12] border-r border-white/[0.06] p-4 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold">
                  S
                </div>
                <h1 className="text-[15px] font-semibold tracking-tight">SettleAI</h1>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 ml-8">Reconciliation Agent</p>
            </div>
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-1.5 rounded-md text-[13px] text-gray-400 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] text-gray-600">Razorpay Buildathon 2026</p>
              <p className="text-[11px] text-gray-600">AI Finance Controller</p>
            </div>
          </nav>

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
