# SettleAI - Production-Grade AI Finance Reconciliation Agent

**"Verification capacity, not generation speed, is the bottleneck."**

SettleAI is an autonomous, zero-trust financial reconciliation engine powered by an AI reasoning layer. It autonomously closes the finance-ops loop across large volumes of data with measured accuracy, deterministic verification, honest exception handling, and full observability.

Built for the **Razorpay Buildathon 2026 - AI Finance Controller Track**.

---

## The Problem: The Reconciliation Bottleneck
In modern finance operations, reconciliation, settlement, and forecasting are still largely done by hand. As transaction volumes grow across multiple payment gateways, bank statements, and tax systems, finance teams are overwhelmed by edge cases, rounding errors, and split payments. Current Generative AI tools are fast at generating text but fail at the deterministic rigor required for accounting.

## The Solution: SettleAI
SettleAI introduces a hybrid architecture: a deterministic accounting engine paired with an AI reasoning layer. It processes records in O(1) memory, matches them using O(N log N) algorithms, and only delegates to Large Language Models (LLMs) for complex exception classification and confidence debate. 

Every AI decision is gated by a rigorous 6-invariant mathematical check and a Zero-Trust SQL firewall.

---

## Key Features & Architecture

### 1. High-Performance Reconciliation DAG
The system operates on a 5-phase Directed Acyclic Graph (DAG) for processing:
* **Phase 1: Streaming Normalization** - Uses lazy parsing to normalize multi-source data (Razorpay settlements, internal orders, bank statements, GST records) with an O(1) memory footprint.
* **Phase 2: Exact Match** - Employs a sort and two-pointer traversal algorithm for O(N log N) deterministic matching.
* **Phase 3: Fuzzy Match** - Uses feature attribution heuristics (e.g., tax-line split logic, date proximity) combined with local LLMs (Ollama) to identify partial matches.
* **Phase 3.5: AI Confidence Debate** - A "Merchant Agent" and an "Auditor Agent" debate the validity of a match, synthesizing a final confidence score.
* **Phase 4: Exception Classification** - AI classifies remaining exceptions (e.g., rounding errors, missing tax, ghost credits) and suggests resolutions.
* **Phase 5: Verification Gate** - A deterministic gate ensuring mathematical invariants hold true before marking anything as settled.

### 2. Zero-Trust SQL & Security
* **SQL Firewall**: All AI-generated SQL queries pass through a strict regex firewall before execution.
* **Read-Only Replicas**: The LLM is restricted to querying read-only database replicas, entirely eliminating SQL injection risks.
* **Invariant Checks**: The system enforces 6 mathematical invariants (e.g., total debits == total credits, no duplicate keys).

### 3. Human-In-The-Loop (HITL) Memory
The system features an Exception Explorer UI where finance operators can review AI hypotheses. Operator actions (Accept, Correct, Override) are written back to a `few_shot_memory.json` file, continuously training and improving the AI's future classification accuracy.

### 4. Resiliency & Chaos Monkey
SettleAI uses Write-Ahead Logging (WAL) SQLite checkpoints after every phase. If the system crashes mid-reconciliation, it resumes exactly from the last valid checkpoint with zero data loss.

---

## Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+
* Docker (Optional, for Jaeger Tracing)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Myself-Praveen/Razorpay-SettleAI.git
   cd Razorpay-SettleAI
   ```

2. **Start the Backend (FastAPI)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload --port 8000
   ```

3. **Start the Frontend (Next.js)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Dashboard**
   Open http://localhost:3000 in your browser.

---

## Running Benchmarks & Tests

To prove the O(1) memory and O(N log N) scalability claims, run the included 10,000-record benchmark script:

```bash
python backend/benchmark.py
```
This generates 10,000 synthetic records with complex tax scenarios and processes them through the reconciliation DAG, outputting throughput and peak memory usage.

---

## Technologies Used
* **Backend**: Python, FastAPI, SQLite (WAL mode), Pydantic, asyncio
* **Frontend**: Next.js, React, TailwindCSS, Framer Motion
* **AI/LLMs**: OpenAI (GPT-4o-mini), Ollama (Local reasoning)
* **Observability**: OpenTelemetry, Jaeger

---

## License
This project is licensed under the MIT License.
