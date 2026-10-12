import pytest
import asyncio
from fastapi.testclient import TestClient
from main import app
from services.content_extractor import is_safe_public_url, content_extractor
from models.verification_models import VerdictType, ClaimResult, VerificationResponse
from ai.claim_extractor import ClaimExtractor
from ai.fact_checker import FactCheckerEngine

client = TestClient(app)

def test_health_endpoint():
    """Verify /api/health returns valid schema and status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "capabilities" in data
    assert set(data["capabilities"]["supported_verdicts"]) == {
        "VERIFIED", "FALSE", "PARTIALLY_SUPPORTED", "OUTDATED", "CANNOT_CONFIRM"
    }

def test_url_ssrf_safeguards():
    """Test URL safety check blocks loopback, private ranges, and non-http schemes."""
    # Loopback
    safe, err = is_safe_public_url("http://localhost:8000/admin")
    assert not safe
    assert "localhost" in err.lower() or "loopback" in err.lower()

    safe, err = is_safe_public_url("http://127.0.0.1:5000")
    assert not safe

    # Private network
    safe, err = is_safe_public_url("http://192.168.1.1/router")
    assert not safe
    assert "private" in err.lower() or "blocked" in err.lower()

    safe, err = is_safe_public_url("http://10.0.0.5/internal")
    assert not safe

    # Invalid scheme
    safe, err = is_safe_public_url("file:///etc/passwd")
    assert not safe
    assert "protocol" in err.lower() or "http" in err.lower()

    # Valid public URL
    safe, err = is_safe_public_url("https://pib.gov.in")
    assert safe
    assert err is None

def test_claim_extractor_schema_and_fallback():
    """Test multi-claim extractor handles text and returns properly structured claims."""
    extractor = ClaimExtractor(api_key=None) # Test rule-based fallback
    sample_text = (
        "Breaking: The Ministry of Health announced a new vaccination drive starting October 25th. "
        "Also, the government has declared a 50% discount on electricity bills across the state."
    )
    result = extractor.extract_claims(sample_text, max_claims=5)
    assert "claims" in result
    assert isinstance(result["claims"], list)
    assert len(result["claims"]) >= 1
    for c in result["claims"]:
        assert "id" in c
        assert "claim_text" in c
        assert "category" in c

def test_verdict_categories_and_never_default_false_on_missing_evidence():
    """Ensure that missing evidence or empty search returns CANNOT_CONFIRM, never FALSE."""
    engine = FactCheckerEngine(use_llm=False)
    result = engine.verify_single_claim(
        claim_id="test-1",
        claim_text="Alien spaceships landed in New Delhi yesterday.",
        category="general"
    )
    # With no Tavily key/live evidence in test env, verdict must be CANNOT_CONFIRM, never FALSE
    assert result.verdict in [VerdictType.CANNOT_CONFIRM, VerdictType.PARTIALLY_SUPPORTED]
    assert result.verdict != VerdictType.FALSE

def test_text_verification_api_endpoint():
    """Test /api/verify/text produces typed structured verification report."""
    payload = {
        "text": "The Reserve Bank of India announced a new monetary policy update yesterday.",
        "language": "auto"
    }
    response = client.post("/api/verify/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["input_type"] == "text"
    assert "claims" in data
    assert len(data["claims"]) >= 1
    assert "overall_summary" in data

    # Verify report is retrievable via /api/result/{id}
    res_id = data["id"]
    get_res = client.get(f"/api/result/{res_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == res_id

def test_feedback_endpoint():
    """Test /api/feedback saves user feedback."""
    payload = {
        "result_id": "test-res-123",
        "helpful": True,
        "feedback_text": "Accurate fact check on local news."
    }
    response = client.post("/api/feedback", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
