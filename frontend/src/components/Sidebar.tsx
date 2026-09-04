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
    <nav className="w-full md:w-64 shrink-0 bg-white border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col md:h-screen md:sticky top-0 z-40">
      <div className="p-4 md:p-6 border-b-4 border-black bg-accent flex justify-between items-center md:block">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white flex items-center justify-center border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
              className={`block px-4 py-2 md:py-3 text-xs md:text-sm font-black uppercase tracking-wider transition-all border-2 whitespace-nowrap ${
                isActive
                  ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] md:translate-x-2 translate-y-1 md:translate-y-0"
                  : "bg-white text-black border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block p-5 border-t-4 border-black bg-accent">
        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center transform -rotate-1 hover:rotate-0 transition-transform cursor-default">
          <p className="text-[11px] text-black font-black uppercase tracking-widest">Buildathon '26</p>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">AI Finance Controller</p>
        </div>
      </div>
    </nav>
  );
}
