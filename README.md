<div align="center">
  <img src="./frontend/public/logo.png" alt="SettleAI Logo" width="100"/>
  <h1>SettleAI</h1>
  <p><strong>Production-Grade AI Finance Reconciliation Agent</strong></p>
  <p><i>"Verification capacity, not generation speed, is the bottleneck."</i></p>
  <p>Built for the <strong>Razorpay Buildathon 2026 - AI Finance Controller Track</strong></p>
</div>

---

## 🛑 The Problem: The Reconciliation Bottleneck
In modern finance operations, reconciliation, settlement, and forecasting are still largely done by hand. As transaction volumes grow across multiple payment gateways, bank statements, and tax systems, finance teams are overwhelmed by edge cases, rounding errors, and split payments. Current Generative AI tools are fast at generating text but fail at the deterministic rigor required for accounting.

## 💡 The Solution: SettleAI
SettleAI introduces a hybrid architecture: a deterministic accounting engine paired with an AI reasoning layer. It processes records in O(1) memory, matches them using O(N log N) algorithms, and only delegates to Large Language Models (LLMs) for complex exception classification and confidence debate. 

Every AI decision is gated by a rigorous **double-entry verification check** and a **Zero-Trust SQL firewall**.

---

## 🚀 Key Features & Architecture

### 1. High-Performance Reconciliation DAG
The system operates on a 5-phase Directed Acyclic Graph (DAG) for processing, streamed in real-time to the frontend via Server-Sent Events (SSE).
* **Phase 1: Streaming Normalization** - Uses lazy parsing to normalize multi-source data (Razorpay settlements, internal orders, bank statements, GST records).
* **Phase 2: Exact Match** - Employs a sort and two-pointer traversal algorithm for O(N log N) deterministic matching.
* **Phase 3: Fuzzy Match** - Uses feature attribution heuristics (e.g., tax-line split logic, date proximity) to identify partial matches.
* **Phase 3.5: AI Confidence Debate** - A "Merchant Agent" and an "Auditor Agent" debate the validity of a match, synthesizing a final confidence score.
* **Phase 4: Exception Classification** - AI classifies remaining exceptions (e.g., rounding errors, missing tax, ghost credits) and suggests resolutions.
* **Phase 5: Verification Gate** - A deterministic gate ensuring mathematical invariants hold true before marking anything as settled.

### 2. Multi-Tier AI Reasoning (Gemini + Ollama Fallback)
The reasoning layer utilizes Google's **Gemini 1.5 Flash** (via the OpenAI-compatible endpoint) for lightning-fast exception classification and multi-agent debate. 
* **Resilience Built-In**: If the Gemini API hits a rate limit or times out, the system automatically fails over to a **local Ollama instance** (`llama3`) to ensure finance operations never halt. If both fail, it degrades gracefully to deterministic rule-based handling.

### 3. Zero-Trust SQL & Security
* **SQL Firewall**: All AI-generated natural language SQL queries pass through a strict regex firewall before execution.
* **Read-Only Enforcement**: The LLM is restricted to querying read-only database connections (`?mode=ro`), entirely eliminating SQL injection and destructive AI actions.
* **API Key Auth & CORS**: The entire backend is secured with strict cross-origin policies and `X-API-Key` authentication.

### 4. Human-In-The-Loop (HITL) Memory
The system features an Exception Explorer UI where finance operators can review AI hypotheses. Operator actions (Accept, Correct, Override) are written back to a `few_shot_memory.json` file, continuously training and improving the AI's future classification accuracy.

### 5. Resiliency & Crash Recovery
SettleAI uses Write-Ahead Logging (WAL) SQLite checkpoints after every DAG phase with synchronous background flushes. If the system crashes or the cloud container restarts mid-reconciliation, it resumes exactly from the last valid checkpoint with zero data loss.

---

## ⚙️ Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+
* Ollama (Optional, for local LLM failover testing)

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
   
   # Set your Gemini API key
   export GEMINI_API_KEY="your_api_key_here"
   export SETTLEAI_API_KEY="settleai_hackathon_secret"
   
   python -m uvicorn backend.main:app --reload --port 8000
   ```

3. **Start the Frontend (Next.js)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Dashboard**
   Open `http://localhost:3000` in your browser.

---

## 📊 Live Deployment
SettleAI is fully deployed for demonstration:
* **Frontend UI**: [Vercel Deployment](https://razorpay-settle-ai.vercel.app/)
* **Backend API**: Render (FastAPI + SQLite WAL)

## 🛠️ Technologies Used
* **Backend**: Python, FastAPI, SQLite (WAL mode), Pydantic, asyncio, httpx
* **Frontend**: Next.js, React, TailwindCSS, Framer Motion, Recharts
* **AI/LLMs**: Google Gemini 1.5 Flash, Ollama (Llama3 Failover)
* **Observability**: OpenTelemetry, Jaeger

---

<div align="center">
  <p>Built with ❤️ by Praveen for the Razorpay Buildathon 2026.</p>
</div>
