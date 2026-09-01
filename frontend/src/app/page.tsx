"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

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
      description:
        "Automatically matches records across settlement feeds, order ledgers, bank statements, and GST filings using a 5-phase concurrent pipeline.",
      href: "/pipeline",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />
        </svg>
      ),
    },
    {
      title: "Dynamic Tolerance Engine",
      description:
        "Adapts matching thresholds based on batch profile -- high-value transactions get tighter tolerances, while mixed batches use relaxed fuzzy matching.",
      href: "/exceptions",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      title: "Multi-Agent Debate",
      description:
        "Two agents -- Merchant and Auditor -- debate low-confidence matches. The system records the reasoning and reaches consensus before classifying.",
      href: "/exceptions",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      title: "Zero-Trust SQL Firewall",
      description:
        "Every natural-language query is sanitized through a regex firewall before execution. Destructive operations are blocked; read-only queries are allowed.",
      href: "/qa",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      title: "Forward Cash Forecaster",
      description:
        "Projects your cash position 7, 14, or 30 days ahead from reconciled data. Each day carries a confidence score that degrades honestly over time.",
      href: "/forecast",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      title: "Full Observability",
      description:
        "OpenTelemetry traces for every pipeline phase, Jaeger integration, SQL audit log, and LangChain instrumentation -- all visible in a single pane.",
      href: "/observability",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Ingest",
      description:
        "Connect Razorpay settlement feeds, order APIs, bank statements, or generate synthetic test data with adversarial edge cases.",
    },
    {
      number: "02",
      title: "Normalize",
      description:
        "Streaming O(1) normalization converts all sources into a common schema with Decimal precision -- no floating-point drift.",
    },
    {
      number: "03",
      title: "Match",
      description:
        "Hash-join for exact matches, two-pointer traversal for amount-close pairs, and feature-attributed fuzzy scoring for ambiguous records.",
    },
    {
      number: "04",
      title: "Classify",
      description:
        "Exceptions are routed through multi-agent debate or deterministic rules. Each gets a hypothesis, suggested resolution, and confidence level.",
    },
    {
      number: "05",
      title: "Verify",
      description:
        "Double-entry arithmetic gate rejects any match where amounts don't balance within tolerance. Every surviving match gets a SHA-256 audit hash.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-indigo-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold">
              S
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              SettleAI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#metrics" className="hover:text-white transition-colors">Metrics</a>
          </div>
          <Link
            href="/pipeline"
            className="px-4 py-2 text-[13px] font-medium bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors border border-white/[0.06]"
          >
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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[12px] font-medium mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Razorpay Buildathon 2026 -- AI Finance Controller
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
          >
            Close the books
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
              with confidence.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10"
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
            <Link
              href="/pipeline"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[14px] font-medium transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
            >
              Launch Pipeline
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-[14px] font-medium transition-colors border border-white/[0.08]"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </motion.section>

      <section id="metrics" className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 325, suffix: "+", label: "Records Processed" },
            { value: 120, suffix: "", label: "Exact Matches" },
            { value: 85, suffix: "", label: "Exceptions Classified" },
            { value: 896, suffix: "", label: "Records / Second" },
          ].map((stat) => (
            <FadeInSection key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[13px] text-gray-500">{stat.label}</div>
            </FadeInSection>
          ))}
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <p className="text-indigo-400 text-[13px] font-medium tracking-wide uppercase mb-3">
              Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for real finance ops
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-[15px] leading-relaxed">
              Every component is designed to handle the messiness of actual
              settlement data -- not just clean demos.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FadeInSection key={feature.title} delay={i * 0.08}>
                <Link
                  href={feature.href}
                  className="group block p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/15 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[12px] text-indigo-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </span>
                </Link>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <p className="text-indigo-400 text-[13px] font-medium tracking-wide uppercase mb-3">
              Pipeline
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Five phases, one pass
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-[15px] leading-relaxed">
              The reconciliation pipeline runs as a concurrent DAG with
              crash-recovery checkpoints at every phase boundary.
            </p>
          </FadeInSection>

          <div className="space-y-1">
            {steps.map((step, i) => (
              <FadeInSection key={step.number} delay={i * 0.1}>
                <div className="flex gap-6 p-6 rounded-xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02] transition-all duration-300">
                  <div className="text-2xl font-bold text-indigo-500/40 font-mono shrink-0 w-12">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-[13px] text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-indigo-400 text-[13px] font-medium tracking-wide uppercase mb-3">
                  Architecture
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Honest by design
                </h2>
                <p className="text-gray-400 text-[15px] leading-relaxed mb-6">
                  SettleAI doesn&apos;t cherry-pick matches. It processes every
                  record, classifies every exception, and reports its exact
                  match rate -- even when that number is uncomfortable.
                </p>
                <div className="space-y-3">
                  {[
                    "O(N log N) sort-merge for scalable matching",
                    "Decimal precision -- no floating-point drift",
                    "SHA-256 audit hash on every verified match",
                    "Streaming normalization via ijson for O(1) memory",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 text-[13px] text-gray-300"
                    >
                      <svg
                        className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.78 5.22a.75.75 0 0 0-1.06 0L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06z" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#111118] rounded-xl border border-white/[0.06] p-6 font-mono text-[12px] leading-relaxed">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-gray-500 text-[11px]">
                    pipeline.py
                  </span>
                </div>
                <pre className="text-gray-400 overflow-x-auto">
{`class ReconciliationDAG:
  """5-phase concurrent DAG with crash recovery"""

  async def run(self, data_dir):
    # Phase 1: Normalize (streaming O(1))
    records = await self._normalize(data_dir)

    # Phase 2: Exact Match (O(N log N))
    matches, unmatched = await self._exact_match(records)

    # Phase 3: Fuzzy Match (feature attribution)
    fuzzy, still_unmatched = await self._fuzzy_match(unmatched)

    # Phase 4: Classify (multi-agent debate)
    exceptions = await self._classify(still_unmatched)

    # Phase 5: Verify (Decimal gate)
    verified = await self._verify(matches + fuzzy)

    return ReconciliationReport(
      matches=verified,
      exceptions=exceptions,
      audit_hash=report_hash(verified),
    )`}
                </pre>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/[0.06]">
        <FadeInSection className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to reconcile?
          </h2>
          <p className="text-gray-400 text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
            Generate 300+ synthetic records across 4 data sources, run the
            full pipeline, and see the match rate, exception breakdown, and
            audit trail in real time.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/pipeline"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[14px] font-medium transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
            >
              Open Dashboard
            </Link>
            <Link
              href="/observability"
              className="px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-[14px] font-medium transition-colors border border-white/[0.08]"
            >
              View Observability
            </Link>
          </div>
        </FadeInSection>
      </section>

      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[12px] text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">
              S
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
