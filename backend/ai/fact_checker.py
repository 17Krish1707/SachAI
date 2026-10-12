import os
import json
import logging
import time
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

from models.verification_models import VerdictType, ClaimResult, EvidenceSource

load_dotenv()
logger = logging.getLogger(__name__)

# Trusted domain lists for heuristic credibility tiering
OFFICIAL_DOMAINS = {
    "gov.in", "nic.in", "gov", "who.int", "un.org", "pib.gov.in", "mohfw.gov.in",
    "rbi.org.in", "eci.gov.in", "isro.gov.in", "cdc.gov", "nih.gov", "fda.gov"
}

FACT_CHECK_DOMAINS = {
    "altnews.in", "boomlive.in", "vishvasnews.com", "snopes.com", "factcheck.org",
    "thip.media", "indiatoday.in", "thequint.com", "politifact.com", "afp.com", "reuters.com"
}

class InMemoryClaimCache:
    """Simple thread-safe in-memory cache with TTL (1 hour default)."""
    def __init__(self, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds

    def _normalize_key(self, text: str) -> str:
        return " ".join(text.lower().strip().split())

    def get(self, text: str) -> Optional[Dict[str, Any]]:
        key = self._normalize_key(text)
        item = self.cache.get(key)
        if item:
            if time.time() - item["timestamp"] < self.ttl:
                return item["data"]
            else:
                del self.cache[key]
        return None

    def set(self, text: str, data: Dict[str, Any]):
        key = self._normalize_key(text)
        self.cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

claim_cache = InMemoryClaimCache()

class FactCheckerEngine:
    def __init__(self, use_llm: bool = True):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.use_llm = use_llm
        self.tavily_client = None
        self.gemini_client = None
        self.model_candidates = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]
        self.model_name = "gemini-3.5-flash-lite"

        if self.tavily_api_key and self.tavily_api_key.startswith("tvly-"):
            try:
                from tavily import TavilyClient
                self.tavily_client = TavilyClient(api_key=self.tavily_api_key)
                logger.info("Tavily client initialized.")
            except Exception as e:
                logger.warning(f"Could not initialize TavilyClient: {e}")
        else:
            logger.warning("Valid TAVILY_API_KEY not configured.")

        if self.use_llm and self.gemini_api_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                logger.info("Gemini client initialized in FactCheckerEngine.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")
        else:
            logger.warning("GEMINI_API_KEY not configured or LLM disabled.")

    def search_evidence(self, claim_text: str, max_results: int = 5) -> List[EvidenceSource]:
        """
        Executes an evidence search on Tavily, preserving full metadata, URLs, domains, and snippets.
        Ranks sources by relevance and credibility tier.
        """
        if not self.tavily_client:
            logger.warning("Tavily search skipped: Tavily client not active.")
            return []

        try:
            # Query formulation: focus on the factual elements
            search_query = f"{claim_text} fact check verify"
            response = self.tavily_client.search(
                query=search_query,
                search_depth="advanced",
                max_results=max_results,
                include_raw_content=False
            )

            raw_results = response.get("results", [])
            sources: List[EvidenceSource] = []

            for r in raw_results:
                url = r.get("url", "").strip()
                title = r.get("title", "").strip() or "Source Document"
                content = r.get("content", "").strip()
                published_date = r.get("published_date") or None
                score = r.get("score", 0.7)

                if not url or not content:
                    continue

                domain = self._extract_domain(url)
                credibility_tier = self._classify_domain(domain)

                # Prioritize snippets up to 450 characters
                snippet = content[:450] + ("..." if len(content) > 450 else "")

                sources.append(EvidenceSource(
                    title=title,
                    url=url,
                    domain=domain,
                    snippet=snippet,
                    published_date=published_date,
                    relevance_score=round(float(score), 2) if score else 0.75,
                    credibility_tier=credibility_tier
                ))

            # Sort sources by credibility tier and score
            tier_weights = {
                "Official / Primary": 3,
                "Fact Check Organization": 2.5,
                "Established News": 2,
                "General Web": 1
            }
            sources.sort(key=lambda s: (tier_weights.get(s.credibility_tier, 1), s.relevance_score or 0), reverse=True)
            return sources

        except Exception as e:
            logger.error(f"Error during Tavily evidence retrieval: {e}")
            return []

    def verify_single_claim(
        self,
        claim_id: str,
        claim_text: str,
        original_quote: Optional[str] = None,
        category: str = "general",
        language: str = "English"
    ) -> ClaimResult:
        """
        Evaluates an individual claim: searches evidence, analyzes with Gemini,
        and constructs a validated ClaimResult with one of the 5 verdicts.
        """
        if not claim_text or not claim_text.strip():
            return ClaimResult(
                id=claim_id,
                claim_text="Unspecified statement",
                verdict=VerdictType.CANNOT_CONFIRM,
                verdict_display="Cannot Confirm",
                category=category,
                explanation="No actionable factual claim provided.",
                reason_for_verdict="Empty claim content.",
                confidence_assessment="Low",
                uncertainty_caveats="Claim statement is missing.",
                sources=[]
            )

        # Check in-memory cache
        cached = claim_cache.get(claim_text)
        if cached:
            logger.info(f"In-memory cache hit for claim: {claim_text[:40]}...")
            return ClaimResult(**{**cached, "id": claim_id, "original_quote": original_quote})

        # 1. Search live evidence
        sources = self.search_evidence(claim_text)

        # 2. Check if we have evidence to analyze
        if not sources:
            result = ClaimResult(
                id=claim_id,
                claim_text=claim_text,
                original_quote=original_quote,
                verdict=VerdictType.CANNOT_CONFIRM,
                verdict_display="Cannot Confirm",
                category=category,
                explanation="No verifiable live web sources or official reporting could be found for this claim at this time.",
                reason_for_verdict="Insufficient public evidence retrieved from search index.",
                confidence_assessment="Low - Absence of corroborating or refuting sources.",
                uncertainty_caveats="The claim may be very recent, hyperlocal, private, or not yet indexed by reputable fact-checkers.",
                sources=[]
            )
            return result

        # 3. Analyze claim with Gemini
        if self.gemini_client and self.use_llm:
            result = self._evaluate_with_gemini(claim_id, claim_text, original_quote, category, sources, language)
        else:
            result = self._evaluate_heuristic(claim_id, claim_text, original_quote, category, sources)

        # Cache result
        claim_cache.set(claim_text, result.model_dump())
        return result

    def _evaluate_with_gemini(
        self,
        claim_id: str,
        claim_text: str,
        original_quote: Optional[str],
        category: str,
        sources: List[EvidenceSource],
        language: str
    ) -> ClaimResult:
        """
        Sends retrieved sources and claim to Gemini to produce structured verdict.
        Strictly forbids fabricated URLs.
        """
        # Format sources for prompt
        sources_payload = []
        for idx, s in enumerate(sources, 1):
            sources_payload.append(
                f"[{idx}] Title: {s.title}\n"
                f"    URL: {s.url}\n"
                f"    Domain: {s.domain} ({s.credibility_tier})\n"
                f"    Snippet: {s.snippet}\n"
                f"    Date: {s.published_date or 'Unknown'}"
            )
        evidence_block = "\n\n".join(sources_payload)

        prompt = f"""
You are an impartial, rigorous fact-checking intelligence system adhering to IFCN (International Fact-Checking Network) standards.

CLAIM TO VERIFY:
"{claim_text}"

CATEGORY: {category}
TARGET LANGUAGE: {language}

RETRIEVED LIVE EVIDENCE SOURCES:
{evidence_block}

INSTRUCTIONS:
1. Compare the claim strictly against the retrieved evidence sources above.
2. Select EXACTLY ONE verdict from these 5 categories:
   - "VERIFIED": The claim is demonstrably accurate and directly corroborated by primary sources, official records, or trusted investigations.
   - "FALSE": The claim is demonstrably false, fabricated, a known hoax, or contradicted by credible reporting.
   - "PARTIALLY_SUPPORTED": The claim contains elements of truth or accurate background facts, but draws misleading conclusions, exaggerates numbers, or omits critical context.
   - "OUTDATED": The claim was true in the past (e.g., an old government scheme, expired order, or historic event), but is now recirculating falsely as current news.
   - "CANNOT_CONFIRM": The retrieved evidence is insufficient, ambiguous, contradictory, or inconclusive. PREFER THIS over guessing.
3. CRITICAL RULE FOR SOURCES: You MUST ONLY cite URLs that appear verbatim in the RETRIEVED LIVE EVIDENCE above. DO NOT invent, hallucinate, or extrapolate external URLs.
4. Classify each cited source as supporting (true) or contradicting (false) the claim.
5. Provide a clear, balanced plain-language explanation in English (2-4 sentences).
6. If target language is not English (e.g. Hindi, Tamil, Telugu), provide a regional translation of the explanation in `explanation_regional`.
7. Assess confidence based on evidence quality: "High", "Medium", or "Low" with brief rationale.
8. If verdict is FALSE or OUTDATED, draft a polite, WhatsApp-ready counter message (`counter_message`) that users can forward to debunk the claim.

RETURN ONLY VALID JSON matching this exact structure:
{{
  "verdict": "VERIFIED" | "FALSE" | "PARTIALLY_SUPPORTED" | "OUTDATED" | "CANNOT_CONFIRM",
  "verdict_display": "Human readable title e.g. Verified True / False Claim / Partially Supported / Outdated Context / Cannot Confirm",
  "explanation": "Clear plain-language explanation in English",
  "explanation_regional": "Explanation in {language} if non-English, else null",
  "reason_for_verdict": "Specific evidentiary reason why this verdict was reached",
  "confidence_assessment": "High (multiple official sources) | Medium | Low",
  "uncertainty_caveats": "Any limitations or unverified details, or null",
  "outdated_warning": "Warning about date recirculations if applicable, or null",
  "supporting_source_indices": [1, 2],
  "contradicting_source_indices": [3],
  "counter_message": "Friendly WhatsApp rebuttal or null"
}}
"""
        max_retries = 3
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                response = self.gemini_client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                raw_text = (response.text or "").strip()
                clean_text = self._clean_json(raw_text)
                parsed = json.loads(clean_text)

                raw_verdict = parsed.get("verdict", "CANNOT_CONFIRM").upper()
                try:
                    verdict_enum = VerdictType(raw_verdict)
                except ValueError:
                    verdict_enum = VerdictType.CANNOT_CONFIRM

                sup_indices = parsed.get("supporting_source_indices", [])
                con_indices = parsed.get("contradicting_source_indices", [])

                supporting_sources: List[EvidenceSource] = []
                contradicting_sources: List[EvidenceSource] = []

                for idx in sup_indices:
                    if isinstance(idx, int) and 1 <= idx <= len(sources):
                        src = sources[idx - 1].model_copy()
                        src.is_supporting = True
                        supporting_sources.append(src)

                for idx in con_indices:
                    if isinstance(idx, int) and 1 <= idx <= len(sources):
                        src = sources[idx - 1].model_copy()
                        src.is_supporting = False
                        contradicting_sources.append(src)

                return ClaimResult(
                    id=claim_id,
                    claim_text=claim_text,
                    original_quote=original_quote,
                    verdict=verdict_enum,
                    verdict_display=parsed.get("verdict_display") or self._default_display(verdict_enum),
                    category=category,
                    explanation=parsed.get("explanation") or "Evidence reviewed against live search records.",
                    explanation_regional=parsed.get("explanation_regional"),
                    reason_for_verdict=parsed.get("reason_for_verdict") or "Based on corroborating web reporting.",
                    confidence_assessment=parsed.get("confidence_assessment") or "Medium - Based on retrieved live reporting.",
                    uncertainty_caveats=parsed.get("uncertainty_caveats"),
                    outdated_warning=parsed.get("outdated_warning"),
                    sources=sources,
                    supporting_sources=supporting_sources,
                    contradicting_sources=contradicting_sources,
                    counter_message=parsed.get("counter_message")
                )

            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_retries - 1:
                    logger.warning(f"Gemini quota hit in fact checker. Retrying in {retry_delay}s... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    logger.error(f"Error evaluating claim with Gemini: {e}")
                    break

        # Fallback on LLM failure: NEVER DEFAULT TO FALSE! Return CANNOT_CONFIRM with sources
        return ClaimResult(
            id=claim_id,
            claim_text=claim_text,
            original_quote=original_quote,
            verdict=VerdictType.CANNOT_CONFIRM,
            verdict_display="Cannot Confirm (Analysis Offline)",
            category=category,
            explanation=f"Live search retrieved {len(sources)} related sources, but AI verdict synthesis was temporarily unavailable.",
            reason_for_verdict="API rate limit or connection timeout during LLM evaluation.",
            confidence_assessment="Low - Incomplete automated synthesis.",
            uncertainty_caveats="Please review the linked external sources directly.",
            sources=sources,
            supporting_sources=[],
            contradicting_sources=[]
        )

    def _evaluate_heuristic(
        self,
        claim_id: str,
        claim_text: str,
        original_quote: Optional[str],
        category: str,
        sources: List[EvidenceSource]
    ) -> ClaimResult:
        """
        Lightweight heuristic fallback when LLM is completely disabled.
        Marks CANNOT_CONFIRM while providing retrieved sources for manual inspection.
        """
        return ClaimResult(
            id=claim_id,
            claim_text=claim_text,
            original_quote=original_quote,
            verdict=VerdictType.CANNOT_CONFIRM,
            verdict_display="Cannot Confirm (Sources Available)",
            category=category,
            explanation=f"Retrieved {len(sources)} public web references. Automated LLM verification is currently not enabled.",
            reason_for_verdict="Manual source verification required.",
            confidence_assessment="Low - Automated assessment offline.",
            uncertainty_caveats="Please inspect the primary source links below to verify accuracy.",
            sources=sources,
            supporting_sources=[],
            contradicting_sources=[]
        )

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return "web"

    def _classify_domain(self, domain: str) -> str:
        for d in OFFICIAL_DOMAINS:
            if domain == d or domain.endswith("." + d):
                return "Official / Primary"
        for d in FACT_CHECK_DOMAINS:
            if domain == d or domain.endswith("." + d):
                return "Fact Check Organization"
        news_indicators = ["news", "times", "express", "hindu", "tribune", "today", "post", "wire"]
        if any(ind in domain for ind in news_indicators):
            return "Established News"
        return "General Web"

    def _default_display(self, verdict: VerdictType) -> str:
        mapping = {
            VerdictType.VERIFIED: "Verified True",
            VerdictType.FALSE: "False / Debunked",
            VerdictType.PARTIALLY_SUPPORTED: "Partially Supported",
            VerdictType.OUTDATED: "Outdated Context",
            VerdictType.CANNOT_CONFIRM: "Cannot Confirm"
        }
        return mapping.get(verdict, "Cannot Confirm")

    def _clean_json(self, raw: str) -> str:
        s = raw.strip()
        if s.startswith("```json"):
            s = s[7:]
        elif s.startswith("```"):
            s = s[3:]
        if s.endswith("```"):
            s = s[:-3]
        return s.strip()

    def check_claim(self, claim: str, language: str = "English") -> Dict[str, Any]:
        """
        Backward-compatible dictionary-based method for existing legacy callers.
        """
        res = self.verify_single_claim("legacy-1", claim, language=language)
        return {
            "verdict": res.verdict.value,
            "verdict_reg": res.verdict_display,
            "category": res.category,
            "explanation_en": res.explanation,
            "explanation_reg": res.explanation_regional or res.explanation,
            "virality_score": 5,
            "virality_reason_en": res.reason_for_verdict,
            "virality_reason_reg": res.reason_for_verdict,
            "counter_message_en": res.counter_message,
            "counter_message_reg": res.counter_message,
            "sources": [s.model_dump() for s in res.sources]
        }
