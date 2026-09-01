"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getExceptions, resolveException } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    getExceptions().then(setExceptions).catch(() => {});
  }, []);

  const handleResolve = async (action: string) => {
    if (!selected) return;
    try {
      await resolveException(selected.exception_id, action, `${action} by user`);
      setResolved((prev) => { const next = new Set(prev); next.add(selected.exception_id); return next; });
      setSelected(null);
      setExceptions((prev) => prev.filter((e) => e.exception_id !== selected.exception_id));
    } catch (e) {
      console.error(e);
    }
  };

  const activeExceptions = exceptions.filter((e) => !resolved.has(e.exception_id));

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)] p-6 bg-background">
      <Card className="w-96 flex flex-col border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-2xl font-bold">Exception Explorer</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {activeExceptions.length} exceptions requiring human review
          </p>
        </CardHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 pr-4">
            <AnimatePresence>
              {activeExceptions.map((exc) => (
                <motion.button
                  key={exc.exception_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelected(exc)}
                  className={`w-full text-left p-4 rounded-none border-2 transition-all duration-200 outline-none ${
                    selected?.exception_id === exc.exception_id
                      ? "border-black bg-accent text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                      : "border-black bg-white hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-foreground truncate max-w-[180px]">
                      {exc.exception_id}
                    </span>
                    <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wider rounded-none border-2 border-black ${
                      exc.confidence_level === "high"
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-accent text-black hover:bg-accent"
                    }`}>
                      {exc.confidence_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-500">{exc.exception_code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {exc.hypothesis}
                  </p>
                </motion.button>
              ))}
            </AnimatePresence>
            {activeExceptions.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-500 opacity-50" />
                No pending exceptions
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.exception_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              <Card className="h-full flex flex-col bg-card border-border shadow-sm">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl font-bold">Exception Detail</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">{selected.record_id}</Badge>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-6">
                  <div className="flex gap-6">
                    <div className="flex-1 space-y-6">
                      <div className="bg-background rounded-xl p-5 border border-border shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                          <DatabaseIcon className="w-4 h-4 text-muted-foreground" />
                          Source Data
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Record ID</span>
                            <span className="font-mono font-medium text-foreground">{selected.record_id}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">Exception Code</span>
                            <Badge variant="outline" className="font-bold text-black border-2 border-black bg-accent rounded-none">
                              {selected.exception_code}
                            </Badge>
                          </div>
                          <div className="pt-3">
                            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Raw Context</p>
                            <pre className="bg-gray-100 p-4 rounded-none text-xs font-mono text-black overflow-x-auto border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {JSON.stringify(selected, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="bg-white rounded-none p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        
                        <h3 className="text-sm font-bold text-black mb-5 flex items-center gap-2 uppercase tracking-wide">
                          <CpuIcon className="w-4 h-4" />
                          AI Auditor Hypothesis
                        </h3>
                        
                        <div className="space-y-5 text-sm relative z-10">
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Detected Discrepancy</p>
                            <div className="bg-white border-2 border-black border-l-8 border-l-red-500 text-black p-3.5 rounded-none leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {selected.hypothesis}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Suggested Resolution</p>
                            <div className="bg-white border-2 border-black border-l-8 border-l-green-500 text-black p-3.5 rounded-none leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {selected.suggested_resolution}
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-5 border-t-2 border-black relative z-10">
                          <p className="text-xs bg-accent text-black inline-block px-1 py-0.5 mb-3 font-bold uppercase">Human-In-The-Loop Action</p>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleResolve("accepted_as_is")}
                              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept Hypothesis
                            </Button>
                            <Button
                              onClick={() => handleResolve("manual_override")}
                              variant="destructive"
                              className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject & Override
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-4 text-center font-medium">
                            Actions update <code className="font-mono text-black bg-gray-200 px-1 border border-black py-0.5">few_shot_memory.json</code> to train future runs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center border-2 border-dashed border-black rounded-none bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-accent rounded-none flex items-center justify-center mx-auto mb-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <AlertCircle className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No Exception Selected</h3>
                <p className="text-sm text-muted-foreground">Select an exception from the explorer to view its analysis.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Temporary icon components to avoid missing imports if not imported above
function DatabaseIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
}
function CpuIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
}
