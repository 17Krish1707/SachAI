import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class ClaimExtractor:
    """
    Extracts independently checkable factual claims from multimodal text, transcripts,
    or forwarded messages using Google Gemini.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = None
        self.model_candidates = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]
        self.model_name = "gemini-3.5-flash-lite"

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("ClaimExtractor initialized with Gemini client.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")
                self.client = None
        else:
            logger.warning("No GEMINI_API_KEY provided. ClaimExtractor will use rule-based fallback.")

    def extract_claims(self, text: str, max_claims: int = 5) -> Dict[str, Any]:
        """
        Extracts all verifiable factual claims from text.
        Returns a dict:
        {
            "language": "Hindi" | "English" | etc.,
            "language_code": "hi" | "en" | etc.,
            "original_text": str,
            "claims": [
                {
                    "id": "claim-1",
                    "claim_text": "...",
                    "original_quote": "...",
                    "entities": ["..."],
                    "category": "health"
                }
            ],
            "truncated": bool,
            "warning": Optional[str]
        }
        """
        cleaned_text = (text or "").strip()
        if not cleaned_text:
            return {
                "language": "English",
                "language_code": "en",
                "original_text": "",
                "claims": [],
                "truncated": False,
                "warning": "Input text is empty."
            }

        # Truncate extremely long inputs to ~12,000 characters for safety
        is_truncated = False
        warning = None
        if len(cleaned_text) > 12000:
            cleaned_text = cleaned_text[:12000]
            is_truncated = True
            warning = "Input text was truncated to 12,000 characters for processing."

        if self.client:
            return self._extract_with_gemini(cleaned_text, max_claims, is_truncated, warning)
        else:
            return self._extract_fallback(cleaned_text, max_claims, is_truncated, warning)

    def extract_claim(self, transcription: str) -> Dict[str, Any]:
        """
        Backward-compatible method returning singular 'claim' alongside 'claims'.
        """
        result = self.extract_claims(transcription, max_claims=5)
        claims = result.get("claims", [])
        primary_claim = claims[0]["claim_text"] if claims else transcription[:200]
        return {
            "claim": primary_claim,
            "claims": claims,
            "language": result.get("language", "English"),
            "language_code": result.get("language_code", "en")
        }

    def _extract_with_gemini(self, text: str, max_claims: int, is_truncated: bool, warning: Optional[str]) -> Dict[str, Any]:
        prompt = f"""
You are an expert misinformation analyst and fact-checking intelligence engine.
Analyze the following text (which may be a forwarded message, transcript, news snippet, or social media post).

YOUR TASKS:
1. Detect the original language of the text (e.g., 'English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', etc.) and its ISO 2-letter code ('en', 'hi', 'ta', 'te', 'bn', 'mr', etc.).
2. Extract up to {max_claims} INDEPENDENT, CHECKABLE FACTUAL CLAIMS made in the text.
   - Ignore subjective opinions, greetings, pleasantries, emotional rants, or conversational filler.
   - Each claim must be a standalone, verifiable assertion of fact (e.g. historical, scientific, medical, statistical, legislative, or news event).
   - If the original text is in a regional Indian language, translate the `claim_text` into clear, neutral English, while keeping `original_quote` in the original language.
   - Identify key entities mentioned (people, places, organizations, numbers, dates).
   - Assign a domain category for each claim: 'health', 'election', 'governance', 'finance', 'science', or 'general'.
   - If the text is purely conversational or contains no factual claims, return an empty claims array.

RETURN ONLY A VALID JSON OBJECT with this exact schema (no markdown, no backticks):
{{
  "language": "Detected Language Name",
  "language_code": "en",
  "claims": [
    {{
      "id": "claim-1",
      "claim_text": "Precise, verifiable factual claim statement in English",
      "original_quote": "Exact excerpt from input text",
      "entities": ["Entity 1", "Date or Number"],
      "category": "health"
    }}
  ]
}}

Input Text:
\"\"\"{text}\"\"\"
"""
        import time
        max_retries = 3
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                content = (response.text or "").strip()
                content = self._clean_json_markdown(content)
                parsed = json.loads(content)

                claims = parsed.get("claims", [])
                # Ensure each claim has proper fields and id
                formatted_claims = []
                for idx, c in enumerate(claims[:max_claims], start=1):
                    if not isinstance(c, dict):
                        continue
                    claim_text = (c.get("claim_text") or c.get("claim") or "").strip()
                    if not claim_text:
                        continue
                    formatted_claims.append({
                        "id": f"claim-{idx}",
                        "claim_text": claim_text,
                        "original_quote": (c.get("original_quote") or "").strip() or None,
                        "entities": c.get("entities", []) if isinstance(c.get("entities"), list) else [],
                        "category": (c.get("category") or "general").lower()
                    })

                return {
                    "language": parsed.get("language", "English"),
                    "language_code": parsed.get("language_code", "en"),
                    "original_text": text,
                    "claims": formatted_claims,
                    "truncated": is_truncated,
                    "warning": warning
                }

            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_retries - 1:
                    logger.warning(f"Gemini quota hit in ClaimExtractor. Backing off {retry_delay}s... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    logger.error(f"Error calling Gemini for claim extraction: {e}")
                    break

        # Fallback if Gemini fails or quota exhausted
        return self._extract_fallback(text, max_claims, is_truncated, warning or "LLM extraction unavailable; using sentence-based extraction.")

    def _extract_fallback(self, text: str, max_claims: int, is_truncated: bool, warning: Optional[str]) -> Dict[str, Any]:
        """
        Lightweight rule-based fallback that splits text into factual candidate statements.
        """
        # Simple sentence splitter respecting punctuation
        sentences = re.split(r'[.!?\n।]+', text)
        filtered = [s.strip() for s in sentences if len(s.strip()) > 15]

        # Exclude common conversational greetings
        conversational = [
            "hello", "hi", "good morning", "good evening", "please forward",
            "forwarded as received", "share this", "urgent news", "must read", "namaste"
        ]
        candidates = []
        for s in filtered:
            lower_s = s.lower()
            if any(lower_s.startswith(c) for c in conversational) and len(s.split()) < 4:
                continue
            candidates.append(s)

        if not candidates and text.strip():
            candidates = [text.strip()[:200]]

        claims = []
        for idx, sentence in enumerate(candidates[:max_claims], start=1):
            claims.append({
                "id": f"claim-{idx}",
                "claim_text": sentence,
                "original_quote": sentence,
                "entities": [],
                "category": "general"
            })

        return {
            "language": "English",
            "language_code": "en",
            "original_text": text,
            "claims": claims,
            "truncated": is_truncated,
            "warning": warning or "Extracted using fallback heuristics (Gemini API key not configured or rate-limited)."
        }

    def _clean_json_markdown(self, raw: str) -> str:
        s = raw.strip()
        if s.startswith("```json"):
            s = s[7:]
        elif s.startswith("```"):
            s = s[3:]
        if s.endswith("```"):
            s = s[:-3]
        return s.strip()
