import React from "react";

export function DebatePanel({ debateResult }: { debateResult: any }) {
  if (!debateResult) return null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mt-6">
      <div className="bg-indigo-900/20 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-semibold text-indigo-300"> AI Confidence Debate (Phase 3.5)</h3>
        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">
          {debateResult.match_id}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-start max-w-[85%]">
          <span className="text-xs text-gray-500 mb-1 ml-1">Merchant Agent</span>
          <div className="bg-gray-800 text-gray-300 p-3 rounded-2xl rounded-tl-sm text-sm border border-gray-700">
            {debateResult.merchant_argument}
          </div>
        </div>

        <div className="flex flex-col items-end max-w-[85%] ml-auto">
          <span className="text-xs text-gray-500 mb-1 mr-1">Auditor Agent</span>
          <div className="bg-blue-900/30 text-blue-200 p-3 rounded-2xl rounded-tr-sm text-sm border border-blue-800/50">
            {debateResult.auditor_argument}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800 flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Synthesis & Verdict</div>
          <p className="text-sm text-gray-300 text-center max-w-lg mb-3">
            {debateResult.synthesis_reasoning}
          </p>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Initial Confidence</div>
              <div className="font-mono text-yellow-400">{debateResult.initial_confidence.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Adjusted Confidence</div>
              <div className="font-mono text-green-400">{debateResult.adjusted_confidence.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Final Verdict</div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${debateResult.verdict === 'MATCH' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {debateResult.verdict}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
