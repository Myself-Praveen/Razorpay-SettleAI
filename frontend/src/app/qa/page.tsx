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
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">Settlement Q&A</h1>
      <p className="text-primary bg-primary/10 px-3 py-1 font-medium inline-block mb-10 rounded-full text-sm border border-primary/20">
        Ask natural language questions about your reconciliation data
      </p>

      <div className="space-y-6 mb-10">
        {messages.map((msg, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <p className="text-sm text-foreground mb-3 font-semibold">{msg.q}</p>
            {msg.a.blocked && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md font-semibold mb-3 inline-block uppercase tracking-wider">{msg.a.block_reason}</p>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap font-mono text-[13px] bg-muted/40 rounded-lg p-4 border border-border/60 shadow-inner">
              {msg.a.answer || JSON.stringify(msg.a, null, 2)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-4 font-mono font-medium bg-muted/20 border border-border/50 rounded px-2.5 py-1 inline-block">
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
          className="flex-1 px-4 py-3 bg-white border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm"
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg border border-transparent text-sm font-semibold tracking-wide disabled:opacity-50 shadow-sm transition-all"
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
            className="px-4 py-2 text-xs font-semibold bg-white text-foreground hover:bg-muted/50 border border-border shadow-sm hover:shadow-md transition-all rounded-full"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
