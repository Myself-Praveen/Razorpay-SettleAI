# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, React, TailwindCSS, Framer Motion, shadcn/ui

## Users

Finance operators and teams handling reconciliation, settlement, and forecasting across multiple payment gateways, bank statements, and tax systems.

## Product Purpose

SettleAI is an autonomous, zero-trust financial reconciliation engine powered by an AI reasoning layer. It autonomously closes the finance-ops loop across large volumes of data with measured accuracy, deterministic verification, honest exception handling, and full observability.

## Positioning

A hybrid architecture pairing a deterministic accounting engine (O(1) memory, O(N log N) matching) with an AI reasoning layer. AI is only used for complex exception classification and confidence debate, gated by a strict 6-invariant mathematical check and a Zero-Trust SQL firewall. It provides deterministic rigor required for accounting, unlike standard GenAI tools.

## Operating Context

Processing multi-source data (Razorpay settlements, internal orders, bank statements, GST records). Finance operators review AI hypotheses in an Exception Explorer UI, and their actions (Accept, Correct, Override) are written back to a few_shot_memory.json file to train the AI.

## Capabilities and Constraints

- High-Performance Reconciliation DAG (5-phase).
- AI Confidence Debate (Merchant Agent vs Auditor Agent).
- Zero-Trust SQL Firewall and read-only replicas to prevent injection.
- 6 mathematical invariant checks.
- Human-In-The-Loop (HITL) Memory for training.
- Write-Ahead Logging (WAL) SQLite checkpoints for crash resilience.

## Brand Commitments

"Verification capacity, not generation speed, is the bottleneck."
Autonomous, zero-trust, rigorous, deterministic.

## Evidence on Hand

Built for the Razorpay Buildathon 2026 - AI Finance Controller Track.

## Product Principles

1. Verification over generation speed.
2. Deterministic mathematical invariants gate all AI decisions.
3. Zero-trust security for all database interactions.
4. Human-in-the-loop actions must continuously improve the system.
