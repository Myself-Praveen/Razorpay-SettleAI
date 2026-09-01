"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Activity, ShieldCheck, Database, FileText, Cpu, Code } from "lucide-react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function FadeInSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
      <div className="absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
    </div>
  );
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

  const features = [
    {
      title: "Multi-Source Reconciliation",
      description: "Automatically matches records across settlement feeds, order ledgers, bank statements, and GST filings using a 5-phase concurrent pipeline.",
      href: "/pipeline",
      icon: <Database className="w-5 h-5" />,
    },
    {
      title: "Dynamic Tolerance Engine",
      description: "Adapts matching thresholds based on batch profile -- high-value transactions get tighter tolerances, while mixed batches use relaxed fuzzy matching.",
      href: "/exceptions",
      icon: <Layers className="w-5 h-5" />,
    },
    {
      title: "Multi-Agent Debate",
      description: "Two agents -- Merchant and Auditor -- debate low-confidence matches. The system records the reasoning and reaches consensus before classifying.",
      href: "/exceptions",
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      title: "Zero-Trust SQL Firewall",
      description: "Every natural-language query is sanitized through a regex firewall before execution. Destructive operations are blocked; read-only queries are allowed.",
      href: "/qa",
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      title: "Forward Cash Forecaster",
      description: "Projects your cash position 7, 14, or 30 days ahead from reconciled data. Each day carries a confidence score that degrades honestly over time.",
      href: "/forecast",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      title: "Full Observability",
      description: "OpenTelemetry traces for every pipeline phase, Jaeger integration, SQL audit log, and LangChain instrumentation -- all visible in a single pane.",
      href: "/observability",
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const steps = [
    { number: "01", title: "Ingest", description: "Connect Razorpay settlement feeds, order APIs, bank statements, or generate synthetic test data with adversarial edge cases." },
    { number: "02", title: "Normalize", description: "Streaming O(1) normalization converts all sources into a common schema with Decimal precision -- no floating-point drift." },
    { number: "03", title: "Match", description: "Hash-join for exact matches, two-pointer traversal for amount-close pairs, and feature-attributed fuzzy scoring for ambiguous records." },
    { number: "04", title: "Classify", description: "Exceptions are routed through multi-agent debate or deterministic rules. Each gets a hypothesis, suggested resolution, and confidence level." },
    { number: "05", title: "Verify", description: "Double-entry arithmetic gate rejects any match where amounts don't balance within tolerance. Every surviving match gets a SHA-256 audit hash." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="SettleAI Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              SettleAI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#metrics" className="hover:text-foreground transition-colors">Metrics</a>
          </div>
          <Link href="/pipeline" className="inline-flex items-center justify-center rounded-lg border border-border bg-background/50 hover:bg-muted h-7 px-2.5 text-[0.8rem] font-medium transition-all">
            Open Dashboard
          </Link>
        </div>
      </nav>

      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-20 px-6"
      >
        <GridBackground />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center justify-center mb-8"
          >
            <Badge variant="secondary" className="px-3 py-1.5 bg-black hover:bg-black text-white rounded-none border-2 border-black transition-colors font-bold uppercase tracking-wider text-xs">
              <span className="w-2 h-2 rounded-none bg-accent animate-pulse mr-2" />
              Razorpay Buildathon 2026 -- AI Finance Controller
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
          >
            Close the books
            <br />
            <span className="bg-accent text-black px-2 mt-2 inline-block">
              with confidence.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
          >
            A production-grade reconciliation agent that processes 300+ records
            across 4 data sources, classifies every exception with an AI
            hypothesis, and produces a machine-readable audit trail.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center justify-center gap-4"
          >
            <Link href="/pipeline" className="inline-flex items-center justify-center rounded-none border-2 border-black h-10 px-4 text-sm font-bold bg-black hover:bg-accent hover:text-black text-white transition-all">
              Launch Pipeline
            </Link>
            <a href="https://github.com/Myself-Praveen/Razorpay-SettleAI" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-none border-2 border-black bg-white hover:bg-gray-100 h-10 px-4 text-sm font-bold text-black transition-all gap-2">
              <Code className="w-4 h-4" />
              Source Code
            </a>
          </motion.div>
        </div>
      </motion.section>

      <section id="metrics" className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 325, suffix: "+", label: "Records Processed" },
            { value: 120, suffix: "", label: "Exact Matches" },
            { value: 85, suffix: "", label: "Exceptions Classified" },
            { value: 896, suffix: "", label: "Records / Second" },
          ].map((stat) => (
            <FadeInSection key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1 text-foreground">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[13px] text-muted-foreground">{stat.label}</div>
            </FadeInSection>
          ))}
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <p className="text-black bg-accent inline-block px-2 py-0.5 text-[13px] font-bold tracking-wide uppercase mb-3">
              Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for real finance ops
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-[15px] leading-relaxed">
              Every component is designed to handle the messiness of actual
              settlement data -- not just clean demos.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FadeInSection key={feature.title} delay={i * 0.08}>
                <Link href={feature.href} className="block group outline-none h-full">
                  <Card className="h-full bg-white border-2 border-black rounded-none hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 border-2 border-black bg-accent flex items-center justify-center text-black mb-4 group-hover:bg-black group-hover:text-white transition-all duration-200">
                        {feature.icon}
                      </div>
                      <h3 className="text-[15px] font-bold mb-2 text-black transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <p className="text-black bg-accent inline-block px-2 py-0.5 text-[13px] font-bold tracking-wide uppercase mb-3">
              Pipeline
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-card-foreground">
              Five phases, one pass
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-[15px] leading-relaxed">
              The reconciliation pipeline runs as a concurrent DAG with
              crash-recovery checkpoints at every phase boundary.
            </p>
          </FadeInSection>

          <div className="space-y-1">
            {steps.map((step, i) => (
              <FadeInSection key={step.number} delay={i * 0.1}>
                <div className="flex gap-6 p-6 border-b-2 border-transparent hover:border-black hover:bg-accent/10 transition-all duration-200">
                  <div className="text-2xl font-bold text-black font-mono shrink-0 w-12">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold mb-1.5 text-card-foreground">
                      {step.title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/logo.png" alt="SettleAI Logo" className="w-full h-full object-cover" />
            </div>
            SettleAI
          </div>
          <div>
            Razorpay Buildathon 2026 -- AI Finance Controller Track
          </div>
        </div>
      </footer>
    </div>
  );
}
