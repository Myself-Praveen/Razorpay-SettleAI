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
      <div className="w-96 shrink-0 flex flex-col bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="border-b border-border p-5 bg-muted/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Honest Exception List</h2>
            <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border border-primary/20">Action Required</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {activeExceptions.length} unresolved exceptions passed through the AI pipeline
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
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 outline-none ${
                    selected?.exception_id === exc.exception_id
                      ? "border-primary bg-primary/5 shadow-sm -translate-y-0.5"
                      : "border-transparent bg-white hover:border-border hover:bg-muted/30 hover:shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-foreground truncate max-w-[180px]">
                      {exc.exception_id}
                    </span>
                    <span className="inline-block px-2 py-0.5 bg-muted text-[10px] uppercase font-semibold tracking-wider rounded-md border border-border">
                      {exc.confidence_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-semibold tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">{exc.exception_code}</span>
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
              <div className="h-full flex flex-col bg-white border border-border shadow-sm rounded-2xl overflow-hidden">
                <div className="border-b border-border p-5 bg-white">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Exception Detail</h2>
                    <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground border border-border">{selected.record_id}</span>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 min-h-0 p-6">
                  <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="bg-white rounded-xl p-6 border border-border shadow-sm relative overflow-hidden">
                        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                          <DatabaseIcon className="w-4 h-4 text-primary" />
                          Source Data
                        </h3>
                        <div className="space-y-4 text-sm">
                          <div className="flex justify-between items-center py-3 border-b border-border/60">
                            <span className="text-muted-foreground font-medium text-xs">Record ID</span>
                            <span className="font-mono font-medium text-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">{selected.record_id}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-border/60">
                            <span className="text-muted-foreground font-medium text-xs">Exception Code</span>
                            <span className="font-semibold text-primary bg-primary/10 rounded-md px-2.5 py-1 text-xs">
                              {selected.exception_code}
                            </span>
                          </div>
                          <div className="pt-4">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Raw Context</p>
                            <pre className="bg-muted/30 p-4 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto border border-border/50">
                              {JSON.stringify(selected, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="bg-white rounded-xl p-6 border border-border shadow-sm relative overflow-hidden">
                        
                        <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                          <CpuIcon className="w-4 h-4 text-primary" />
                          AI Auditor Hypothesis
                        </h3>
                        
                        <div className="space-y-6 text-sm relative z-10">
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-2 font-medium">Detected Discrepancy</p>
                            <div className="bg-white border border-border border-l-4 border-l-orange-400 text-foreground p-4 rounded-r-xl leading-relaxed shadow-sm">
                              {selected.hypothesis}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-2 font-medium">Suggested Resolution</p>
                            <div className="bg-white border border-border border-l-4 border-l-green-400 text-foreground p-4 rounded-r-xl leading-relaxed shadow-sm">
                              {selected.suggested_resolution}
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border/60 relative z-10">
                          <p className="text-xs text-muted-foreground mb-4 font-medium">Human-In-The-Loop Action</p>
                          <div className="flex gap-4">
                            <Button
                              onClick={() => handleResolve("accepted_as_is")}
                              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-sm hover:shadow-md transition-all gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept Hypothesis
                            </Button>
                            <Button
                              onClick={() => handleResolve("manual_override")}
                              variant="outline"
                              className="flex-1 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject & Override
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-5 text-center">
                            Actions update <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">few_shot_memory.json</code> to train future runs.
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
              className="h-full flex items-center justify-center border border-border border-dashed rounded-2xl bg-muted/10"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No Exception Selected</h3>
                <p className="text-sm text-muted-foreground">Select an honest exception from the queue to view its analysis.</p>
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
