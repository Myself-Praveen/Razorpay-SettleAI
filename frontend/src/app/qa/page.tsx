"use client";
import { useState } from "react";
import { qaQuery } from "@/lib/api";
import { toast } from "sonner";

export default function QAPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (q?: string) => {
    const text = q || question;
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await qaQuery(text);
      setMessages((prev) => [...prev, { q: text, a: result }]);
      setQuestion("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to query QA backend. Is it running?");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-3">Settlement Q&A</h1>
      <p className="text-black bg-accent px-2 py-1 font-bold inline-block mb-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        Ask natural language questions about your reconciliation data
      </p>

      <div className="space-y-6 mb-10">
        {messages.map((msg, i) => (
          <div key={i} className="bg-white rounded-none border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm text-black mb-3 font-bold uppercase tracking-wider">{msg.q}</p>
            {msg.a.blocked && (
              <p className="text-xs text-white bg-red-500 border-2 border-black p-2 font-bold mb-3 inline-block uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{msg.a.block_reason}</p>
            )}
            <p className="text-sm text-black whitespace-pre-wrap font-mono text-xs bg-gray-100 p-4 border-2 border-black">
              {msg.a.answer || JSON.stringify(msg.a, null, 2)}
            </p>
            <p className="text-[11px] text-gray-600 mt-3 font-mono font-bold bg-white border border-gray-300 px-2 py-1 inline-block">
              SQL: {msg.a.sql_query}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder='e.g. "Why is settlement setl_003 short?"'
          className="flex-1 px-4 py-3 bg-white border-2 border-black rounded-none text-sm font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder:text-gray-400"
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          className="px-8 py-3 bg-black hover:bg-accent hover:text-black text-white rounded-none border-2 border-black text-sm font-bold uppercase tracking-wider disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          "Show me all exceptions",
          "What's the total MDR this week?",
          "How many matches were exact vs fuzzy?",
          "DELETE FROM matches",
        ].map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); ask(q); }}
            className="px-3 py-2 text-xs font-bold bg-white text-black hover:bg-accent border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all rounded-none uppercase tracking-wide"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
