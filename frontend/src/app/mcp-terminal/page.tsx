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
    <div className="max-w-3xl h-[calc(100vh-4rem)] flex flex-col">
      <h1 className="text-3xl font-bold mb-2">MCP Terminal</h1>
      <p className="text-gray-400 mb-4">
        Live visualization of agentic tool calls via Model Context Protocol
      </p>

      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm text-gray-400">{connected ? "Connected" : "Disconnected"}</span>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 bg-gray-900 rounded-lg border border-gray-800 p-4 overflow-auto font-mono text-xs"
      >
        {messages.length === 0 ? (
          <p className="text-gray-600">Waiting for MCP tool calls...</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="mb-3 pb-3 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-yellow-400 font-semibold">TOOL CALL:</span>
                <span className="text-indigo-400">{msg.tool || msg.type || "unknown"}</span>
              </div>
              <div className="text-gray-400">
                <span className="text-gray-500">Input:</span> {JSON.stringify(msg.input || msg, null, 2)}
              </div>
              {msg.result && (
                <div className="text-green-400 mt-1">
                  <span className="text-gray-500">Result:</span> {JSON.stringify(msg.result)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a query to trigger MCP tool calls..."
          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={send}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
