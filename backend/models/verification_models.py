from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class InputType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    PDF = "pdf"
    AUDIO = "audio"
    URL = "url"

class VerdictType(str, Enum):
    VERIFIED = "VERIFIED"
    FALSE = "FALSE"
    PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED"
    OUTDATED = "OUTDATED"
    CANNOT_CONFIRM = "CANNOT_CONFIRM"

class EvidenceSource(BaseModel):
    title: str = Field(..., description="Title of the source publication or webpage")
    url: str = Field(..., description="Direct link to source evidence")
    domain: str = Field(..., description="Domain name (e.g. pib.gov.in, who.int, reuters.com)")
    snippet: str = Field(..., description="Concise relevant excerpt directly speaking to claim")
    published_date: Optional[str] = Field(None, description="Reported publication or update date if found")
    relevance_score: Optional[float] = Field(None, description="Heuristic relevance score 0-1")
    is_supporting: Optional[bool] = Field(None, description="True if evidence supports claim, False if refutes")
    credibility_tier: Optional[str] = Field(None, description="e.g. Official / Primary, Fact Check Org, Established Press, Web")

class ClaimResult(BaseModel):
    id: str = Field(..., description="Unique claim identifier, e.g. claim-1")
    claim_text: str = Field(..., description="Clear normalized factual statement evaluated")
    original_quote: Optional[str] = Field(None, description="Excerpt in the original text corresponding to this claim")
    verdict: VerdictType = Field(..., description="One of VERIFIED, FALSE, PARTIALLY_SUPPORTED, OUTDATED, CANNOT_CONFIRM")
    verdict_display: str = Field(..., description="User-friendly verdict badge label")
    category: str = Field(default="general", description="Category like health, election/politics, governance, finance, science, social")
    explanation: str = Field(..., description="Plain-language explanation of findings in English")
    explanation_regional: Optional[str] = Field(None, description="Explanation in detected regional language if available")
    reason_for_verdict: str = Field(..., description="Concrete reason based on available evidence")
    confidence_assessment: str = Field(default="Medium", description="Qualitative confidence assessment (High / Medium / Low) with rationale")
    uncertainty_caveats: Optional[str] = Field(None, description="Limitations, missing context, or conditions")
    outdated_warning: Optional[str] = Field(None, description="Clarification if claim was true in the past but false now")
    sources: List[EvidenceSource] = Field(default_factory=list, description="All retrieved sources considered")
    supporting_sources: List[EvidenceSource] = Field(default_factory=list, description="Sources that support the claim")
    contradicting_sources: List[EvidenceSource] = Field(default_factory=list, description="Sources that refute or debunk the claim")
    counter_message: Optional[str] = Field(None, description="Pre-composed respectful WhatsApp rebuttal ready to copy")

class VerificationResponse(BaseModel):
    id: str = Field(..., description="Unique verification job / result ID")
    input_type: str = Field(default="text")
    extracted_text: str = Field(..., description="Full input or OCR/audio/URL extracted text")
    detected_language: str = Field(default="English")
    language_code: str = Field(default="en")
    created_at: str = Field(...)
    claims_count: int = Field(default=0)
    claims: List[ClaimResult] = Field(default_factory=list)
    overall_summary: str = Field(..., description="High-level narrative of all findings across claims")
    verdict_distribution: Dict[str, int] = Field(default_factory=dict)
    truncated: bool = Field(default=False)
    processing_time_sec: float = Field(default=0.0)
    warnings: List[str] = Field(default_factory=list)

class TextVerificationRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=20000, description="Text to analyze")
    language: Optional[str] = Field(default="auto")

class UrlVerificationRequest(BaseModel):
    url: str = Field(..., description="Web URL to verify content from")
    language: Optional[str] = Field(default="auto")

class FeedbackRequest(BaseModel):
    result_id: str
    claim_id: Optional[str] = None
    helpful: bool
    feedback_text: Optional[str] = None
    user_verdict_suggestion: Optional[str] = None
