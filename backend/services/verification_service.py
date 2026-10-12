import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from models.verification_models import (
    VerificationResponse, ClaimResult, VerdictType, EvidenceSource
)
from ai.claim_extractor import ClaimExtractor
from ai.fact_checker import FactCheckerEngine

logger = logging.getLogger(__name__)

class VerificationStore:
    """
    Lightweight in-memory result repository with optional local persistence.
    Allows /api/result/:id to retrieve previously completed verifications.
    Does not leak global data or WhatsApp numbers.
    """
    def __init__(self, max_items: int = 500):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._feedback: List[Dict[str, Any]] = []
        self._max_items = max_items

    def save(self, result: VerificationResponse):
        # Evict oldest if limit exceeded
        if len(self._store) >= self._max_items:
            oldest_key = next(iter(self._store))
            del self._store[oldest_key]
        self._store[result.id] = result.model_dump()

    def get(self, result_id: str) -> Optional[Dict[str, Any]]:
        return self._store.get(result_id)

    def save_feedback(self, feedback: Dict[str, Any]):
        self._feedback.append({**feedback, "timestamp": datetime.now(timezone.utc).isoformat()})

verification_store = VerificationStore()

class VerificationOrchestrator:
    def __init__(self):
        self.claim_extractor = ClaimExtractor()
        self.fact_checker = FactCheckerEngine()

    async def verify_text_content(
        self,
        extracted_text: str,
        input_type: str = "text",
        language_hint: Optional[str] = "auto"
    ) -> VerificationResponse:
        """
        End-to-end multi-claim verification workflow:
        1. Extract verifiable factual claims
        2. Evaluate each claim against live Tavily evidence using Gemini
        3. Formulate overall objective summary and return structured Pydantic response
        """
        start_time = time.time()
        job_id = f"sach-{uuid.uuid4().hex[:10]}"
        warnings = []

        if not extracted_text or not extracted_text.strip():
            raise ValueError("Input content is empty. Please provide text, document, image, or URL.")

        # Step 1: Claim Extraction
        logger.info(f"Extracting claims for job {job_id} ({input_type})...")
        extraction_res = self.claim_extractor.extract_claims(extracted_text, max_claims=5)
        detected_language = extraction_res.get("language", "English")
        language_code = extraction_res.get("language_code", "en")
        raw_claims = extraction_res.get("claims", [])
        is_truncated = extraction_res.get("truncated", False)

        if extraction_res.get("warning"):
            warnings.append(extraction_res["warning"])

        if not raw_claims:
            # If no independent factual claims found, produce a single CANNOT_CONFIRM result explaining why
            logger.info("No factual claims extracted; returning neutral response.")
            empty_claim = ClaimResult(
                id="claim-1",
                claim_text=extracted_text[:200] + ("..." if len(extracted_text) > 200 else ""),
                verdict=VerdictType.CANNOT_CONFIRM,
                verdict_display="No Testable Claims Found",
                category="general",
                explanation="The analyzed message consists primarily of opinions, greetings, questions, or personal sentiments rather than checkable empirical statements.",
                reason_for_verdict="Absence of specific testable facts, dates, numbers, or verifiable events.",
                confidence_assessment="High - Content lacks empirical factual claims.",
                uncertainty_caveats="Fact-checking is designed for empirical statements of fact.",
                sources=[]
            )
            resp = VerificationResponse(
                id=job_id,
                input_type=input_type,
                extracted_text=extracted_text,
                detected_language=detected_language,
                language_code=language_code,
                created_at=datetime.now(timezone.utc).isoformat() + "Z",
                claims_count=1,
                claims=[empty_claim],
                overall_summary="No checkable factual claims detected in the provided submission.",
                verdict_distribution={VerdictType.CANNOT_CONFIRM.value: 1},
                truncated=is_truncated,
                processing_time_sec=round(time.time() - start_time, 2),
                warnings=warnings
            )
            verification_store.save(resp)
            return resp

        # Step 2: Verify each claim independently
        verified_claims: List[ClaimResult] = []
        distribution: Dict[str, int] = {v.value: 0 for v in VerdictType}

        for idx, item in enumerate(raw_claims, 1):
            claim_id = item.get("id") or f"claim-{idx}"
            claim_text = item.get("claim_text", "")
            original_quote = item.get("original_quote")
            category = item.get("category", "general")

            logger.info(f"Fact-checking [{claim_id}]: {claim_text[:50]}...")
            claim_res = self.fact_checker.verify_single_claim(
                claim_id=claim_id,
                claim_text=claim_text,
                original_quote=original_quote,
                category=category,
                language=detected_language
            )

            verified_claims.append(claim_res)
            v_val = claim_res.verdict.value
            distribution[v_val] = distribution.get(v_val, 0) + 1

        # Step 3: Compute overall summary narrative
        total_claims = len(verified_claims)
        verified_count = distribution.get(VerdictType.VERIFIED.value, 0)
        false_count = distribution.get(VerdictType.FALSE.value, 0)
        partial_count = distribution.get(VerdictType.PARTIALLY_SUPPORTED.value, 0)
        outdated_count = distribution.get(VerdictType.OUTDATED.value, 0)
        unconfirmed_count = distribution.get(VerdictType.CANNOT_CONFIRM.value, 0)

        summary_parts = []
        if false_count > 0:
            summary_parts.append(f"{false_count} claim{'s' if false_count > 1 else ''} found to be false or fabricated")
        if verified_count > 0:
            summary_parts.append(f"{verified_count} claim{'s' if verified_count > 1 else ''} verified as accurate")
        if partial_count > 0:
            summary_parts.append(f"{partial_count} partially supported claim{'s' if partial_count > 1 else ''}")
        if outdated_count > 0:
            summary_parts.append(f"{outdated_count} outdated or recirculated claim{'s' if outdated_count > 1 else ''}")
        if unconfirmed_count > 0:
            summary_parts.append(f"{unconfirmed_count} unconfirmed due to limited public evidence")

        overall_summary = f"Analysis of {total_claims} factual claim{'s' if total_claims > 1 else ''}: " + ", ".join(summary_parts) + "."

        total_time = round(time.time() - start_time, 2)
        response = VerificationResponse(
            id=job_id,
            input_type=input_type,
            extracted_text=extracted_text,
            detected_language=detected_language,
            language_code=language_code,
            created_at=datetime.now(timezone.utc).isoformat() + "Z",
            claims_count=total_claims,
            claims=verified_claims,
            overall_summary=overall_summary,
            verdict_distribution={k: v for k, v in distribution.items() if v > 0},
            truncated=is_truncated,
            processing_time_sec=total_time,
            warnings=warnings
        )

        verification_store.save(response)
        return response

verification_orchestrator = VerificationOrchestrator()
