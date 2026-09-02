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
      <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-3">MCP Terminal</h1>
      <p className="text-black bg-accent px-2 py-1 font-bold inline-block mb-6 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        Live visualization of agentic tool calls via Model Context Protocol
      </p>

      <div className="flex items-center gap-2 mb-6">
        <span className={`w-3 h-3 border-2 border-black ${connected ? "bg-green-400" : "bg-red-500"}`} />
        <span className="text-xs text-black font-bold uppercase tracking-wider">{connected ? "Connected" : "Disconnected"}</span>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 overflow-auto font-mono text-xs relative"
      >
        <div className="absolute top-0 right-0 border-b-4 border-l-4 border-black bg-accent px-3 py-1 font-bold text-xs uppercase tracking-widest text-black">Terminal</div>
        <div className="mt-6">
          {messages.length === 0 ? (
            <p className="text-black font-bold italic">Waiting for MCP tool calls...</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="mb-4 pb-4 border-b-2 border-dashed border-gray-300 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-black font-bold bg-gray-100 border border-black px-1 py-0.5">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-white bg-black px-2 py-0.5 font-black uppercase tracking-wider">TOOL CALL:</span>
                  <span className="text-black font-black uppercase tracking-widest border-b-2 border-black">{msg.tool || msg.type || "unknown"}</span>
                </div>
                <div className="text-black bg-gray-50 border-2 border-black p-2 shadow-inner">
                  <span className="text-black font-bold uppercase text-[10px] bg-accent px-1 border border-black mr-2">Input</span> 
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(msg.input || msg, null, 2)}</pre>
                </div>
                {msg.result && (
                  <div className="text-black bg-green-50 border-2 border-green-500 p-2 mt-2 shadow-inner">
                    <span className="text-white font-bold uppercase text-[10px] bg-green-500 px-1 border border-green-700 mr-2">Result</span> 
                    <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(msg.result)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a query to trigger MCP tool calls..."
          className="flex-1 px-4 py-3 bg-white border-4 border-black rounded-none text-sm font-bold font-mono focus:outline-none focus:ring-4 focus:ring-accent shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black placeholder:text-gray-400"
        />
        <button
          onClick={send}
          className="px-8 py-3 bg-black text-white hover:bg-accent hover:text-black rounded-none border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] text-sm font-black uppercase tracking-widest transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}
