# SachAI (सच AI)
> **Verify before you forward.**
> AI-powered multimodal misinformation verification engine for forwarded messages, screenshots, circulars, voice notes, and web articles.

[![Status](https://img.shields.io/badge/Status-Hackathon--Ready-emerald)]()
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)]()
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB)]()
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4)]()
[![Tavily](https://img.shields.io/badge/Search-Tavily_Live_Index-FF6F00)]()

---

## 🌟 Overview

**SachAI** (सच AI) is an evidence-backed misinformation verification web application designed specifically for high-velocity digital ecosystems where viral forwarded messages, audio notes, screenshots, and circulars circulate across Indian languages.

### Key Capabilities
- **Zero Login Required**: Instant public verification workspace above the fold.
- **Multimodal Ingestion**:
  - 📝 **Text & Forwards**: Paste WhatsApp/Telegram forwards with clipboard integration.
  - 🖼️ **Screenshots & Images**: OCR extraction via Tesseract with Gemini Vision fallback.
  - 📄 **PDFs & Circulars**: Multi-page document text extraction via PyMuPDF/pypdf.
  - 🎙️ **Voice Notes**: Browser microphone recording and audio file uploads (MP3, WAV, M4A, OGG).
  - 🔗 **Web URLs**: SSRF-protected server-side article scraping with private network blocking.
- **Multi-Claim Decomposition**: Gemini breaks down complex forwards into independent testable claims.
- **Live Evidence Retrieval**: Tavily queries primary records, official portals (`pib.gov.in`, `rbi.org.in`), and verified fact-checking desks.
- **5-Verdict Standard**:
  - ✅ **Verified True**
  - ❌ **False / Debunked**
  - ⚠️ **Partially Supported**
  - ⏳ **Outdated Context**
  - ❓ **Cannot Confirm** (never falsely assumes FALSE on missing evidence)
- **Shareable Fact Cards**: Generates high-resolution PNG fact cards on the client via HTML5 Canvas.
- **WhatsApp Counter-Messages**: Pre-composed polite rebuttals ready to copy and forward back.
- **Browser-Local History**: Private session history stored in `localStorage` with zero cross-user exposure.

---

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Git

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=tvly-your_tavily_api_key_here
```

Start the backend:
```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
In a new terminal:
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application at: `http://127.0.0.1:5173/`

---

## 🧪 Testing

Run the automated backend test suite:
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_verification_pipeline.py -v
```

Test coverage includes:
- Health status and capabilities reporting
- SSRF safeguards blocking private networks and loopback IPs
- Multi-claim extraction schema and fallback heuristics
- 5-verdict normalization and missing evidence safety
- End-to-end text verification and feedback endpoints

---

## 📐 Architecture

```
[User Input: Text / Image / PDF / Voice Note / URL]
                      │
                      ▼
            [FastAPI Backend (/api/verify)]
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
[PyMuPDF / pypdf]  [OCR / Vision]  [Whisper / Audio]
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
     [Claim Decomposer (Google Gemini)]
                      │
                      ▼
      [Live Search & Retrieval (Tavily)]
                      │
                      ▼
     [Evidence Synthesis (Google Gemini)]
                      │
                      ▼
    [Structured 5-Verdict Pydantic Report]
                      │
                      ▼
[React Result View + Shareable Fact Card PNG]
```

---

## 🔒 Privacy & Safety
- **No Sign-In**: Open, public fact-checking for maximum accessibility.
- **Zero Data Leakage**: Browser-local history persists only on the client.
- **No Fabricated Sources**: The AI only cites URLs returned by the live search index.

---

© 2026 SachAI. Built for community defense against misinformation.
