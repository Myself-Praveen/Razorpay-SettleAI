import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, User, Scale } from "lucide-react";

export function DebatePanel({ debateResult }: { debateResult: any }) {
  if (!debateResult) return null;

  return (
    <Card className="mt-6 bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader className="bg-black px-4 py-3 border-b-2 border-black flex flex-row justify-between items-center space-y-0">
        <CardTitle className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
          <Scale className="w-4 h-4" />
          AI Confidence Debate (Phase 3.5)
        </CardTitle>
        <Badge variant="secondary" className="font-mono text-xs text-black bg-accent rounded-none border-0 hover:bg-accent">
          {debateResult.match_id}
        </Badge>
      </CardHeader>
      
      <CardContent className="p-5 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-start max-w-[85%]"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 ml-1">
            <User className="w-3.5 h-3.5" />
            Merchant Agent
          </div>
          <div className="bg-white text-black p-3.5 rounded-none text-[13px] leading-relaxed border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {debateResult.merchant_argument}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col items-end max-w-[85%] ml-auto"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 mr-1">
            Auditor Agent
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="bg-gray-100 text-black p-3.5 rounded-none text-[13px] leading-relaxed border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {debateResult.auditor_argument}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 pt-5 border-t border-border flex flex-col items-center"
        >
          <div className="text-[11px] text-muted-foreground mb-3 uppercase tracking-widest font-semibold flex items-center gap-2">
            <span className="w-8 h-px bg-border" />
            Synthesis & Verdict
            <span className="w-8 h-px bg-border" />
          </div>
          <p className="text-[13px] text-muted-foreground text-center max-w-lg mb-5 leading-relaxed">
            {debateResult.synthesis_reasoning}
          </p>
          
          <div className="flex gap-6 items-center p-3 rounded-none bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Initial</div>
              <div className="font-mono text-sm text-yellow-500">{debateResult.initial_confidence.toFixed(2)}</div>
            </div>
            
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Adjusted</div>
              <div className="font-mono text-sm text-black font-bold">{debateResult.adjusted_confidence.toFixed(2)}</div>
            </div>
            
            <div className="w-px h-8 bg-border mx-2" />
            
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Verdict</div>
              <Badge variant="outline" className={`text-xs font-bold rounded-none border-2 ${debateResult.verdict === 'MATCH' ? 'bg-green-500 text-white border-black' : 'bg-red-500 text-white border-black'}`}>
                {debateResult.verdict}
              </Badge>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
