"use client";
import { useState } from "react";
import { qaQuery } from "@/lib/api";

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
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Settlement Q&A</h1>
      <p className="text-gray-400 mb-8">
        Ask natural language questions about your reconciliation data
      </p>

      <div className="space-y-4 mb-8">
        {messages.map((msg, i) => (
          <div key={i} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <p className="text-sm text-indigo-400 mb-2 font-medium">{msg.q}</p>
            {msg.a.blocked && (
              <p className="text-xs text-red-400 mb-1">{msg.a.block_reason}</p>
            )}
            <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono text-xs">
              {msg.a.answer || JSON.stringify(msg.a, null, 2)}
            </p>
            <p className="text-[11px] text-gray-600 mt-2 font-mono">
              SQL: {msg.a.sql_query}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder='e.g. "Why is settlement setl_003 short?"'
          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          "Show me all exceptions",
          "What's the total MDR this week?",
          "How many matches were exact vs fuzzy?",
          "DELETE FROM matches",
        ].map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); ask(q); }}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
