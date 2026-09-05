"use client";
import { useState, useEffect, useRef } from "react";
import { connectMcpTerminal } from "@/lib/api";

export default function McpTerminalPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const wsRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = connectMcpTerminal((data) => {
      setMessages((prev) => [...prev, data]);
    });
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    if (!input.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "query", text: input }));
    setInput("");
  };

  return (
    <div className="max-w-3xl h-[calc(100vh-4rem)] flex flex-col pb-8">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">MCP Terminal</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-6 rounded-full text-sm border border-primary/20">
        Live visualization of agentic tool calls via Model Context Protocol
      </p>

      <div className="flex items-center gap-2 mb-6">
        <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{connected ? "Connected" : "Disconnected"}</span>
      </div>

      <div className="flex-1 flex flex-col bg-[#1c1c1e] border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="h-10 bg-[#2d2d2f] flex items-center px-4 border-b border-zinc-800/50 flex-shrink-0 relative">
          <div className="flex gap-2 z-10">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-semibold text-zinc-400 font-sans tracking-wide">mcp-terminal — zsh</span>
          </div>
        </div>

        <div
          ref={terminalRef}
          className="flex-1 p-6 overflow-auto font-mono text-xs bg-[#1c1c1e]"
        >
          <div className="mt-0">
          {messages.length === 0 ? (
            <p className="text-zinc-500 italic">Waiting for MCP tool calls...</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="mb-6 pb-6 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-zinc-500 font-medium">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-primary-foreground bg-primary px-2 py-0.5 font-semibold text-[10px] rounded uppercase tracking-wider">TOOL CALL</span>
                  <span className="text-zinc-200 font-semibold">{msg.tool || msg.type || "unknown"}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                  <span className="text-zinc-400 font-medium uppercase text-[10px] mr-2">Input</span> 
                  <pre className="mt-2 text-zinc-300 whitespace-pre-wrap">{JSON.stringify(msg.input || msg, null, 2)}</pre>
                </div>
                {msg.result && (
                  <div className="bg-green-950/30 border border-green-900/50 rounded-lg p-3 mt-3">
                    <span className="text-green-500 font-medium uppercase text-[10px] mr-2">Result</span> 
                    <pre className="mt-2 text-green-400 whitespace-pre-wrap">{JSON.stringify(msg.result)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </div>

      <div className="flex gap-4 mt-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a query to trigger MCP tool calls..."
          className="flex-1 px-4 py-3 bg-white border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm font-sans"
        />
        <button
          onClick={send}
          className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg border border-transparent shadow-sm hover:shadow-md text-sm font-semibold transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}
