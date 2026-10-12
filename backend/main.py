import sys
import os
import asyncio
import logging
import time
from typing import Optional
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, Response, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from models.verification_models import (
    VerificationResponse, TextVerificationRequest, UrlVerificationRequest, FeedbackRequest
)
from services.content_extractor import content_extractor, is_safe_public_url
from services.verification_service import verification_orchestrator, verification_store

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sachai-backend")

app = FastAPI(
    title="SachAI - Misinformation Verification Engine",
    description="Multimodal, evidence-backed fact-checking intelligence API for forwarded messages, audio notes, screenshots, PDFs, and web articles.",
    version="2.0.0"
)

# CORS Middleware configured to support standard dev and local setups
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# STARTUP EVENT (No forced Firestore seeding or blocking calls)
# -------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """
    Starts up the public verification API gracefully.
    External services (Firebase, WhatsApp, ElevenLabs) are strictly optional
    and will not block or abort server startup.
    """
    logger.info("SachAI Verification Engine started successfully.")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    logger.info(f"Services configured: Gemini={'YES' if gemini_key else 'NO'}, Tavily={'YES' if tavily_key else 'NO'}")

# -------------------------------------------------------------
# HEALTH & SERVICE STATUS ENDPOINT
# -------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    """
    Reports configured services and operational status without leaking any secrets.
    """
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    whatsapp_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_KEY_PATH")

    return {
        "status": "healthy",
        "service": "SachAI Misinformation Verification API",
        "version": "2.0.0",
        "timestamp": time.time(),
        "capabilities": {
            "gemini_configured": bool(gemini_key and len(gemini_key) > 5),
            "tavily_configured": bool(tavily_key and tavily_key.startswith("tvly-")),
            "whatsapp_configured": bool(whatsapp_token and whatsapp_token != "your_whatsapp_token_here"),
            "firebase_configured": bool(firebase_json and os.path.exists(str(firebase_json))),
            "multimodal_inputs": ["text", "image", "pdf", "audio", "url"],
            "supported_verdicts": ["VERIFIED", "FALSE", "PARTIALLY_SUPPORTED", "OUTDATED", "CANNOT_CONFIRM"]
        }
    }

# -------------------------------------------------------------
# CORE PUBLIC WEB VERIFICATION ENDPOINTS
# -------------------------------------------------------------

@app.post("/api/verify/text", response_model=VerificationResponse)
async def verify_text_endpoint(payload: TextVerificationRequest):
    """
    Verifies plain text message or social media forward containing single or multiple factual claims.
    """
    try:
        clean_text = content_extractor.extract_text(payload.text)
        if not clean_text or len(clean_text) < 3:
            raise HTTPException(status_code=400, detail="Text must be at least 3 characters long.")
        
        result = await verification_orchestrator.verify_text_content(
            extracted_text=clean_text,
            input_type="text",
            language_hint=payload.language
        )
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Text verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.post("/api/verify/url", response_model=VerificationResponse)
async def verify_url_endpoint(payload: UrlVerificationRequest):
    """
    Safely retrieves public web page / article text (with SSRF protection) and verifies its claims.
    """
    try:
        extracted_text = await content_extractor.extract_from_url(payload.url)
        result = await verification_orchestrator.verify_text_content(
            extracted_text=extracted_text,
            input_type="url",
            language_hint=payload.language
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"URL verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Web page analysis failed: {str(e)}")

@app.post("/api/verify", response_model=VerificationResponse)
async def verify_multimodal_endpoint(
    type: str = Form(...),
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    language: Optional[str] = Form("auto"),
    file: Optional[UploadFile] = File(None)
):
    """
    Unified multimodal verification endpoint accepting text, image, pdf, audio, or url.
    """
    input_type = type.lower().strip()
    try:
        extracted_content = ""

        if input_type == "text":
            if not text:
                raise HTTPException(status_code=400, detail="Text parameter is required for type 'text'.")
            extracted_content = content_extractor.extract_text(text)

        elif input_type == "url":
            if not url:
                raise HTTPException(status_code=400, detail="URL parameter is required for type 'url'.")
            extracted_content = await content_extractor.extract_from_url(url)

        elif input_type == "image":
            if not file:
                raise HTTPException(status_code=400, detail="Image file is required for type 'image'.")
            content_bytes = await file.read()
            if len(content_bytes) > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Image file exceeds maximum limit of 15MB.")
            extracted_content = content_extractor.extract_from_image(content_bytes, file.filename or "image.png")

        elif input_type == "pdf":
            if not file:
                raise HTTPException(status_code=400, detail="PDF file is required for type 'pdf'.")
            content_bytes = await file.read()
            if len(content_bytes) > 20 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="PDF file exceeds maximum limit of 20MB.")
            extracted_content = content_extractor.extract_from_pdf(content_bytes, file.filename or "document.pdf")

        elif input_type == "audio":
            if not file:
                raise HTTPException(status_code=400, detail="Audio file is required for type 'audio'.")
            content_bytes = await file.read()
            if len(content_bytes) > 25 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Audio file exceeds maximum limit of 25MB.")
            audio_res = content_extractor.extract_from_audio(content_bytes, file.filename or "audio.mp3")
            extracted_content = audio_res.get("text", "")

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported input type '{input_type}'. Choose from text, image, pdf, audio, url.")

        if not extracted_content or len(extracted_content.strip()) < 3:
            raise HTTPException(status_code=400, detail="No readable content could be extracted from the provided input.")

        result = await verification_orchestrator.verify_text_content(
            extracted_text=extracted_content,
            input_type=input_type,
            language_hint=language
        )
        return result

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Multimodal verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.get("/api/result/{result_id}", response_model=VerificationResponse)
async def get_result_endpoint(result_id: str):
    """
    Retrieves a stored verification report by its random, unguessable result ID.
    """
    res = verification_store.get(result_id)
    if not res:
        raise HTTPException(status_code=404, detail="Verification report not found or has expired.")
    return res

@app.post("/api/feedback")
async def save_feedback_endpoint(feedback: FeedbackRequest):
    """
    Saves user feedback on verification accuracy.
    """
    verification_store.save_feedback(feedback.model_dump())
    return {"status": "success", "message": "Feedback recorded. Thank you for helping refine SachAI."}

# -------------------------------------------------------------
# OPTIONAL WHATSAPP WEBHOOK INTEGRATION (Kept decoupled)
# -------------------------------------------------------------
@app.get("/webhook")
async def verify_webhook(request: Request):
    """
    Webhook verification endpoint for Meta WhatsApp API (Optional).
    """
    params = request.query_params
    mode = params.get("hub.mode") or params.get("hub_mode")
    token = params.get("hub.verify_token") or params.get("hub_verify_token")
    challenge = params.get("hub.challenge") or params.get("hub_challenge")

    if not mode or not token or not challenge:
        raise HTTPException(status_code=400, detail="Missing parameters")

    if mode == "subscribe" and token.strip() == settings.VERIFY_TOKEN.strip():
        logger.info("WEBHOOK_VERIFIED")
        return Response(content=challenge, media_type="text/plain", status_code=200)

    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/webhook")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Meta WhatsApp message webhook (Optional).
    """
    try:
        body = await request.json()
        # Safe background handling if WhatsApp service is configured
        if os.getenv("WHATSAPP_ACCESS_TOKEN") and os.getenv("WHATSAPP_ACCESS_TOKEN") != "your_whatsapp_token_here":
            from api.webhook import process_webhook_payload
            background_tasks.add_task(process_webhook_payload, body)
        return Response(content="EVENT_RECEIVED", status_code=200)
    except Exception as e:
        logger.error(f"Webhook ingestion error: {e}")
        return Response(content="OK", status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
