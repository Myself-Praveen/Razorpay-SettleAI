"""
SettleAI — Pydantic schemas for the reconciliation pipeline.

All amount fields use string representation for Decimal precision.
The API layer converts to/from Decimal as needed.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, computed_field



class RecordSource(str, Enum):
    SETTLEMENT = "settlement"
    ORDER = "order"
    BANK = "bank"
    GST = "gst"
    ADVERSARIAL = "adversarial"


class TransactionType(str, Enum):
    PAYMENT = "payment"
    REFUND = "refund"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class ExceptionCode(str, Enum):
    FEE_DEDUCTION = "FEE_DEDUCTION"
    TAX_DEDUCTION = "TAX_DEDUCTION"
    ROUNDING = "ROUNDING"
    PARTIAL_PAYMENT = "PARTIAL_PAYMENT"
    UNEXPLAINED = "UNEXPLAINED"
    DUPLICATE = "DUPLICATE"
    TIMING_DRIFT = "TIMING_DRIFT"
    FRACTIONAL_PENNY = "FRACTIONAL_PENNY"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    UNCLASSIFIED_REVIEW_NEEDED = "UNCLASSIFIED_REVIEW_NEEDED"
    SYSTEM_INTEGRITY_ERROR = "SYSTEM_INTEGRITY_ERROR"


class MatchStatus(str, Enum):
    EXACT = "exact"
    FUZZY = "fuzzy"
    DEBATE_ACCEPTED = "debate_accepted"
    DEBATE_REJECTED = "debate_rejected"
    REJECTED = "rejected"


class PipelinePhase(str, Enum):
    NORMALIZE = "normalize"
    EXACT_MATCH = "exact_match"
    FUZZY_MATCH = "fuzzy_match"
    CLASSIFY = "classify"
    VERIFY = "verify"


class BatchProfile(str, Enum):
    MICRO = "micro"
    STANDARD = "standard"
    HIGH_VALUE = "high_value"
    MIXED = "mixed"


class HitlAction(str, Enum):
    ACCEPTED_AS_IS = "accepted_as_is"
    CORRECTED_MATCH = "corrected_match"
    MANUAL_OVERRIDE = "manual_override"



class NormalizedRecord(BaseModel):
    """A record normalized from any of the 4 data sources."""
    id: str
    source: RecordSource
    amount: str  # Decimal as string for JSON safety
    type: TransactionType
    debit: str = "0"
    credit: str = "0"
    fee: str = "0"
    tax: str = "0"
    settlement_id: Optional[str] = None
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    settled_at: Optional[datetime] = None
    method: Optional[str] = None
    card_network: Optional[str] = None
    currency: str = "INR"
    description: Optional[str] = None
    bank_utr: Optional[str] = None
    narration: Optional[str] = None
    is_adversarial: bool = False
    adversarial_tag: Optional[str] = None

    @property
    def amount_decimal(self) -> Decimal:
        return Decimal(self.amount)

    def to_context_dict(self) -> dict:
        """Context for LLM prompts and HITL memory."""
        return {
            "id": self.id,
            "source": self.source.value,
            "amount": self.amount,
            "type": self.type.value,
            "settlement_id": self.settlement_id,
            "order_id": self.order_id,
            "payment_id": self.payment_id,
            "method": self.method,
            "settled_at": self.settled_at.isoformat() if self.settled_at else None,
            "is_adversarial": self.is_adversarial,
            "adversarial_tag": self.adversarial_tag,
        }


class FeatureWeight(BaseModel):
    """A single feature weight in the attribution vector."""
    name: str
    weight: float
    raw_score: float
    justification: str

    @property
    def contribution(self) -> float:
        return self.weight * self.raw_score


class FeatureAttribution(BaseModel):
    """Explainable feature importance vector for a proposed match."""
    features: list[FeatureWeight]
    confidence: float
    decision_boundary: str
    alternative_candidates: list[dict] = []

    @property
    def total_confidence(self) -> float:
        return sum(f.contribution for f in self.features)


class ProposedMatch(BaseModel):
    """A match proposed by Phase 2 (exact) or Phase 3 (fuzzy)."""
    match_id: str
    record_a_id: str
    record_b_id: str
    match_status: MatchStatus
    confidence: float
    feature_attribution: Optional[FeatureAttribution] = None
    phase: PipelinePhase
    settlement_batch: Optional[str] = None
    proposed_at: datetime = Field(default_factory=datetime.utcnow)


class VerifiedMatch(BaseModel):
    """A match that passed the Phase 5 verification gate."""
    match_id: str
    record_a_id: str
    record_b_id: str
    match_status: MatchStatus
    confidence: float
    feature_attribution: Optional[FeatureAttribution] = None
    verification_proof: str  # Human-readable arithmetic proof
    audit_hash: str


class ExceptionRecord(BaseModel):
    """An unresolved record with AI-generated classification."""
    exception_id: str
    record_id: str
    exception_code: ExceptionCode
    hypothesis: str
    suggested_resolution: str
    confidence_level: str  # "high" | "medium" | "low"
    llm_raw_response: Optional[str] = None
    classified_at: datetime = Field(default_factory=datetime.utcnow)


class DebateResult(BaseModel):
    """Result of a Merchant vs Auditor agent debate."""
    match_id: str
    record_a_id: str
    record_b_id: str
    initial_confidence: float
    verdict: str  # "MATCH" | "EXCEPTION"
    adjusted_confidence: float
    merchant_argument: str
    auditor_argument: str
    synthesis_reasoning: str
    debated_at: datetime = Field(default_factory=datetime.utcnow)


class VerificationRejection(BaseModel):
    """A match rejected by the verification gate."""
    match_id: str
    record_a_id: str
    record_b_id: str
    reason: str
    detail: str
    rejected_at: datetime = Field(default_factory=datetime.utcnow)



class ToleranceConfig(BaseModel):
    """Dynamic tolerance parameters computed per batch."""
    amount_tolerance: str  # Decimal as string
    confidence_threshold: str  # Decimal as string
    date_tolerance_days: int = 3
    fuzzy_reference_threshold: float = 0.5
    debate_lower: float = 0.60
    debate_upper: float = 0.85
    profile_type: BatchProfile = BatchProfile.STANDARD
    cv: str = "0"  # Coefficient of variation


class BatchProfileAnalysis(BaseModel):
    """Result of analyzing a batch's characteristics."""
    avg_amount: str
    median_amount: str
    std_dev: str
    cv: str
    transaction_count: int
    profile_type: BatchProfile
    tolerance_config: ToleranceConfig


class CheckpointData(BaseModel):
    """A pipeline checkpoint for crash recovery."""
    phase: PipelinePhase
    records_processed: int
    matches_found: int
    exceptions_found: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    state_json: str = "{}"


class PipelineProgress(BaseModel):
    """Real-time pipeline progress for SSE streaming."""
    phase: PipelinePhase
    phase_name: str
    progress: float  # 0.0 to 1.0
    records_processed: int
    total_records: int
    matches_found: int
    exceptions_found: int
    current_step: str
    memory_mb: float
    elapsed_ms: float



class ReconciliationReport(BaseModel):
    """The final machine-readable output."""
    report_id: str
    generated_at: datetime
    batch_profile: BatchProfileAnalysis
    total_records: int
    total_sources: int
    matched_count: int
    exception_count: int
    rejected_count: int
    match_rate: float
    throughput_records_per_sec: float
    pipeline_duration_ms: float
    tolerance_config: ToleranceConfig
    matches: list[VerifiedMatch]
    exceptions: list[ExceptionRecord]
    rejections: list[VerificationRejection]
    debates: list[DebateResult]
    audit_hash: str
    adversarial_results: Optional[dict] = None

    def compute_audit_hash(self) -> str:
        """SHA-256 of the match table for tamper-evidence."""
        data = json.dumps(
            [m.model_dump() for m in self.matches],
            sort_keys=True, default=str
        )
        return hashlib.sha256(data.encode()).hexdigest()



class GenerateDataRequest(BaseModel):
    mode: str = "synthetic"  # "synthetic" | "live"
    record_count: int = 200
    include_adversarial: bool = True


class GenerateDataResponse(BaseModel):
    total_records: int
    settlement_count: int
    order_count: int
    bank_count: int
    gst_count: int
    adversarial_count: int
    batch_profile: BatchProfileAnalysis


class QARequest(BaseModel):
    question: str


class QAResponse(BaseModel):
    answer: str
    sql_query: str
    blocked: bool = False
    block_reason: Optional[str] = None


class ResolveExceptionRequest(BaseModel):
    exception_id: str
    action: HitlAction
    resolution_text: str
    corrected_match_id: Optional[str] = None


class ResolveExceptionResponse(BaseModel):
    success: bool
    hitl_entry_id: str
    message: str


class ForecastResponse(BaseModel):
    days: list[dict]
    confidence_level: str
    risk_explanation: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    phases: dict
    uptime_seconds: float
    memory_mb: float


class MetricsResponse(BaseModel):
    match_rate: float
    total_matches: int
    total_exceptions: int
    total_rejected: int
    throughput_rps: float
    phase_timings: dict
    exception_breakdown: dict
    debate_stats: dict
    hitl_memory_size: int
    llm_cache_hits: int
    llm_cache_misses: int
