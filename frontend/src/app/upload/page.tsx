"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, ArrowRight, Brain, AlertCircle, Database } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingResult, setMappingResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("http://localhost:8000/api/upload-csv", {
        method: "POST",
        body: formData,
        // Remove Content-Type header to allow browser to set boundary
      });
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setMappingResult(data);
    } catch (error) {
      console.error(error);
      alert("Failed to infer mapping from CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!file || !mappingResult) return;
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping_json", JSON.stringify(mappingResult.mapping));
    
    try {
      const res = await fetch("http://localhost:8000/api/process-csv", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Processing failed");
      // Redirect to pipeline
      router.push("/pipeline");
    } catch (error) {
      console.error(error);
      alert("Failed to process CSV");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-h-screen overflow-hidden bg-background">
      <header className="flex-none p-4 md:p-6 border-b border-border bg-white flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            Upload Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Ingest raw CSV bank statements with AI-powered schema mapping.</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {!mappingResult ? (
          <div className="max-w-2xl mx-auto mt-8">
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging ? "border-primary bg-primary/5 scale-105" : "border-border bg-white hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {file ? file.name : "Drag & Drop CSV"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {file ? `${(file.size / 1024).toFixed(2)} KB` : "Supports any standard bank statement format"}
              </p>
              
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              
              <div className="flex justify-center gap-4">
                <button 
                  className="px-6 py-2.5 bg-muted text-foreground font-semibold rounded-lg text-sm transition-colors hover:bg-muted-foreground hover:text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </button>
                <button 
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg text-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-primary/20"
                  disabled={!file || isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? "Inferring Schema..." : "Analyze with AI"}
                  {!isUploading && <Brain className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Inferred Mapping
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 border border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  High Confidence
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Target Schema</h4>
                  <div className="space-y-3">
                    {Object.keys(mappingResult.mapping).map((key) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="font-mono text-sm font-semibold">{key}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                          {mappingResult.mapping[key] || <span className="text-red-500 text-xs">Unmapped</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Data Preview</h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          {mappingResult.header.slice(0, 4).map((h: string, i: number) => (
                            <th key={i} className="px-3 py-2 font-semibold text-foreground truncate max-w-[100px]">{h}</th>
                          ))}
                          {mappingResult.header.length > 4 && <th className="px-3 py-2">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {mappingResult.sample.slice(0, 4).map((row: string[], i: number) => (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                            {row.slice(0, 4).map((cell: string, j: number) => (
                              <td key={j} className="px-3 py-2 truncate max-w-[100px] text-muted-foreground" title={cell}>{cell}</td>
                            ))}
                            {row.length > 4 && <td className="px-3 py-2 text-muted-foreground">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Note: Since this is a demo, synthesizing matching settlement records will be automatically handled behind the scenes so the DAG has something to reconcile against.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button 
                  className="px-4 py-2 bg-transparent text-foreground hover:bg-muted rounded-lg text-sm font-semibold transition-colors"
                  onClick={() => setMappingResult(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  className="px-6 py-2 bg-black text-white font-bold rounded-lg text-sm transition-colors hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Confirm & Run DAG"}
                  {!isProcessing && <Database className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
