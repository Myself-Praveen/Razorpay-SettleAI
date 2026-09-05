"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/qa", label: "Q&A" },
  { href: "/mcp-terminal", label: "MCP Terminal" },
  { href: "/forecast", label: "Forecast" },
  { href: "/audit", label: "Audit" },
  { href: "/observability", label: "Observability" },
];

export function Sidebar() {
  const pathname = usePathname();

  // Don't show sidebar on the landing page, let it take full width
  if (pathname === "/") return null;

  return (
    <nav className="w-full md:w-64 shrink-0 bg-white border-b border-border md:border-b-0 md:border-r border-border flex flex-col md:h-screen md:sticky top-0 z-40">
      <div className="p-4 md:p-6 border-b border-border bg-white flex justify-between items-center md:block">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white flex items-center justify-center rounded-lg shadow-sm border border-border overflow-hidden">
             <img src="/logo.png" alt="SettleAI Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-widest text-black group-hover:underline decoration-4 underline-offset-4">SettleAI</h1>
            <p className="hidden md:block text-[10px] text-black font-bold uppercase tracking-widest mt-1">Recon Agent</p>
          </div>
        </Link>
      </div>

      <div className="flex-none md:flex-1 overflow-x-auto md:overflow-y-auto py-3 md:py-6 px-4 flex md:flex-col space-x-3 md:space-x-0 md:space-y-3 bg-white">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 md:py-3 text-xs md:text-sm font-semibold tracking-wide transition-all rounded-lg whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-transparent text-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block p-5 mt-auto border-t border-border bg-muted/30">
        <div className="bg-white rounded-lg border border-border p-3 shadow-sm text-center">
          <p className="text-[11px] text-foreground font-bold tracking-wide">Buildathon '26</p>
          <p className="text-[9px] text-muted-foreground font-semibold mt-1">AI Finance Controller</p>
        </div>
      </div>
    </nav>
  );
}
