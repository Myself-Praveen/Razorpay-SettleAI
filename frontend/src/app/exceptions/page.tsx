"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getExceptions, resolveException } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getExceptions()
      .then((data) => {
        setExceptions(data || []);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load exceptions. Is the backend running?");
        setIsLoading(false);
      });
  }, []);

  const handleResolve = async (action: string) => {
    if (!selected) return;
    try {
      await resolveException(selected.exception_id, action, `${action} by user`);
      setResolved((prev) => { const next = new Set(prev); next.add(selected.exception_id); return next; });
      setSelected(null);
      setExceptions((prev) => prev.filter((e) => e.exception_id !== selected.exception_id));
      toast.success(`Exception ${selected.exception_id} resolved!`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to resolve exception.");
    }
  };

  const activeExceptions = exceptions.filter((e) => !resolved.has(e.exception_id));

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)] p-6 bg-background">
      <div className="w-96 shrink-0 flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <div className="border-b-2 border-black p-4 bg-accent">
          <h2 className="text-2xl font-black uppercase tracking-wide text-black">Exception Explorer</h2>
          <p className="text-xs text-black font-bold mt-1 uppercase tracking-wider">
            {activeExceptions.length} exceptions requiring human review
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="space-y-3 pr-4">
            <AnimatePresence>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                </div>
              ) : activeExceptions.map((exc) => (
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
                    <span className="inline-block px-1 bg-gray-100 text-[10px] uppercase font-bold tracking-wider rounded-none border-2 border-black">
                      {exc.confidence_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-black" />
                    <span className="text-xs font-black uppercase tracking-wider text-black bg-accent px-1 border border-black">{exc.exception_code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {exc.hypothesis}
                  </p>
                </motion.button>
              ))}
            </AnimatePresence>
            {!isLoading && activeExceptions.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-500 opacity-50" />
                No pending exceptions
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.exception_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              <div className="h-full flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
                <div className="border-b-2 border-black p-4 bg-accent">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black uppercase tracking-wide text-black">Exception Detail</h2>
                    <span className="font-mono text-xs font-bold bg-white border-2 border-black px-2 py-0.5 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{selected.record_id}</span>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 min-h-0 p-6">
                  <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="bg-white rounded-none p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        <h3 className="text-sm font-black text-black mb-4 flex items-center gap-2 uppercase tracking-wide">
                          <DatabaseIcon className="w-4 h-4 text-black" />
                          Source Data
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center py-2 border-b-2 border-dotted border-gray-300">
                            <span className="text-black font-bold uppercase tracking-wider text-xs">Record ID</span>
                            <span className="font-mono font-bold text-black bg-gray-100 px-1 border border-black">{selected.record_id}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b-2 border-dotted border-gray-300">
                            <span className="text-black font-bold uppercase tracking-wider text-xs">Exception Code</span>
                            <span className="font-bold text-black border-2 border-black bg-accent rounded-none px-2 py-0.5 text-xs uppercase tracking-wider">
                              {selected.exception_code}
                            </span>
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

                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="bg-white rounded-none p-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        
                        <h3 className="text-sm font-bold text-black mb-5 flex items-center gap-2 uppercase tracking-wide">
                          <CpuIcon className="w-4 h-4" />
                          AI Auditor Hypothesis
                        </h3>
                        
                        <div className="space-y-5 text-sm relative z-10">
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Detected Discrepancy</p>
                            <div className="bg-white border-2 border-black border-t-4 border-t-red-500 text-black p-3.5 rounded-none leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {selected.hypothesis}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Suggested Resolution</p>
                            <div className="bg-white border-2 border-black border-t-4 border-t-green-500 text-black p-3.5 rounded-none leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center border-4 border-black rounded-none bg-gray-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
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
