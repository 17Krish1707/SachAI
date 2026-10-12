import io
import os
import re
import socket
import logging
from urllib.parse import urlparse
import ipaddress
from typing import Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Private/Reserved IP networks to block for SSRF prevention
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"), # Link-local
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),      # Unique local
    ipaddress.ip_network("fe80::/10"),     # Link-local IPv6
]

def is_safe_public_url(url: str) -> tuple[bool, Optional[str]]:
    """
    Validates URL safety, protocol, and verifies destination IP does not resolve
    to loopback, private, or internal network (SSRF protection).
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are permitted."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: missing hostname."

        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return False, "Access to localhost and loopback addresses is prohibited."

        # Resolve host to IP
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                for net in BLOCKED_IP_NETWORKS:
                    if ip_obj in net:
                        return False, f"Access to private/internal network IP ({ip_str}) is blocked."
        except socket.gaierror:
            return False, f"Could not resolve domain name '{hostname}'."

        return True, None
    except Exception as e:
        return False, f"Invalid URL format: {str(e)}"

class ContentExtractor:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.gemini_client = None
        if self.gemini_api_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            except Exception as e:
                logger.warning(f"Gemini client not initialized in ContentExtractor: {e}")

    def extract_text(self, text: str) -> str:
        """Normalizes and cleans input text."""
        if not text:
            return ""
        # Remove repeated carriage returns and excess whitespace
        cleaned = re.sub(r'\r\n|\r', '\n', text)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()

    def extract_from_image(self, file_bytes: bytes, filename: str = "image.png") -> str:
        """
        Extracts text from an image using Tesseract first, and Gemini Vision as fallback or enhancer.
        """
        extracted = ""
        # 1. Attempt Tesseract OCR if available
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(io.BytesIO(file_bytes))
            # Try eng + hin if available, or basic eng
            raw_ocr = pytesseract.image_to_string(img)
            if raw_ocr and len(raw_ocr.strip()) > 15:
                extracted = raw_ocr.strip()
                logger.info(f"Successfully extracted {len(extracted)} chars via Tesseract OCR.")
        except Exception as e:
            logger.info(f"Tesseract OCR unavailable or failed ({e}); attempting Gemini Vision fallback.")

        # 2. If Tesseract didn't yield solid text and Gemini client is configured, use Gemini Vision
        if len(extracted) < 20 and self.gemini_client:
            try:
                from google.genai import types
                logger.info("Extracting text from image using Gemini Vision...")
                # Determine mime type
                mime = "image/png"
                lower_name = filename.lower()
                if lower_name.endswith(".jpg") or lower_name.endswith(".jpeg"):
                    mime = "image/jpeg"
                elif lower_name.endswith(".webp"):
                    mime = "image/webp"

                response = self.gemini_client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type=mime),
                        "Extract and transcribe all text, forwarded messages, screenshots, headlines, and claims visible in this image verbatim. If the text is in an Indian regional language (Hindi, Tamil, Telugu, etc.), preserve the original script accurately. Do not summarize; transcribe the visible text."
                    ]
                )
                if response and response.text:
                    extracted = response.text.strip()
                    logger.info(f"Extracted {len(extracted)} chars via Gemini Vision.")
            except Exception as e:
                logger.error(f"Gemini Vision extraction error: {e}")

        if not extracted:
            raise ValueError("Could not extract legible text from the uploaded image. Please ensure the image contains clear text or type the claim manually.")

        return self.extract_text(extracted)

    def extract_from_pdf(self, file_bytes: bytes, filename: str = "document.pdf") -> str:
        """
        Extracts text across all pages of a PDF document using PyMuPDF or pypdf.
        """
        extracted_pages = []

        # 1. Try PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if text and text.strip():
                    extracted_pages.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
            doc.close()
        except Exception as e:
            logger.info(f"PyMuPDF not available or failed ({e}); trying pypdf fallback.")

        # 2. Fallback to pypdf if PyMuPDF didn't yield text
        if not extracted_pages:
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        extracted_pages.append(f"--- Page {idx + 1} ---\n{text.strip()}")
            except Exception as e:
                logger.error(f"pypdf extraction error: {e}")

        combined = "\n\n".join(extracted_pages).strip()

        # 3. If PDF was scanned and yielded no raw text, try Gemini Vision OCR on first few pages
        if len(combined) < 20 and self.gemini_client:
            try:
                from google.genai import types
                logger.info("Attempting Gemini document extraction for scanned PDF...")
                response = self.gemini_client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"),
                        "Extract and transcribe the key textual claims, statements, circulars, or news reports contained in this PDF document."
                    ]
                )
                if response and response.text:
                    combined = response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini PDF document extraction failed: {e}")

        if not combined:
            raise ValueError("No extractable text found in this PDF. It may be an empty or password-protected document.")

        return self.extract_text(combined)

    def extract_from_audio(self, file_bytes: bytes, filename: str = "audio.mp3") -> Dict[str, Any]:
        """
        Transcribes audio note using local Whisper if installed, or Gemini Audio API as fallback.
        """
        temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_files")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"upload_{filename}")

        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        transcript = ""
        detected_language = "English"

        # 1. Try local Whisper if available
        try:
            from ai.transcription import transcribe_audio
            res = transcribe_audio(temp_path)
            if res and res.get("text"):
                transcript = res["text"].strip()
                detected_language = res.get("language", "English")
                logger.info(f"Audio transcribed via local Whisper ({detected_language}).")
        except Exception as e:
            logger.info(f"Local Whisper not available or failed ({e}); trying Gemini Audio transcription.")

        # 2. Try Gemini Audio transcription fallback
        if not transcript and self.gemini_client:
            try:
                from google.genai import types
                lower_name = filename.lower()
                mime = "audio/mp3"
                if lower_name.endswith(".wav"):
                    mime = "audio/wav"
                elif lower_name.endswith(".ogg") or lower_name.endswith(".opus"):
                    mime = "audio/ogg"
                elif lower_name.endswith(".m4a"):
                    mime = "audio/mp4"

                logger.info("Transcribing audio via Gemini Audio...")
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type=mime),
                        "Transcribe this voice note / audio accurately. If it is in Hindi, Tamil, Telugu, or another Indian language, transcribe the spoken words accurately in the original script. Return ONLY the transcription text."
                    ]
                )
                if response and response.text:
                    transcript = response.text.strip()
                    logger.info("Transcribed audio via Gemini Audio.")
            except Exception as e:
                logger.error(f"Gemini Audio transcription error: {e}")

        # Clean up temp file
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass

        if not transcript:
            raise ValueError("Audio transcription failed. Please check microphone clarity, format, or configure Whisper / Gemini API key.")

        return {
            "text": transcript,
            "language": detected_language
        }

    async def extract_from_url(self, url: str) -> str:
        """
        Safely fetches web page content with strict SSRF controls, timeout, and size limits.
        Extracts clean readable article text.
        """
        safe, err = is_safe_public_url(url)
        if not safe:
            raise ValueError(f"URL Validation Failed: {err}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (SachAI-Bot)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, max_redirects=3) as client:
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    raise ValueError(f"Target web server returned HTTP status {response.status_code}.")

                # Max content limit: 5MB
                if len(response.content) > 5 * 1024 * 1024:
                    raise ValueError("Target webpage exceeds maximum allowed size (5MB).")

                html = response.text
                soup = BeautifulSoup(html, "html.parser")

                # Remove non-content elements
                for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg", "button", "iframe"]):
                    element.decompose()

                # Prefer article or main content if available
                article_node = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"article|content|post|story", re.I)) or soup.body
                if not article_node:
                    raise ValueError("No readable body content could be located on this webpage.")

                paragraphs = [p.get_text().strip() for p in article_node.find_all(["p", "h1", "h2", "h3"])]
                text_content = "\n\n".join(p for p in paragraphs if len(p) > 25)

                if len(text_content) < 50:
                    # Fallback to general get_text
                    text_content = article_node.get_text(separator="\n", strip=True)

                if len(text_content) < 40:
                    raise ValueError("Could not extract sufficient readable article text from the webpage.")

                # Limit article length to ~10,000 chars
                if len(text_content) > 10000:
                    text_content = text_content[:10000] + "..."

                return text_content

        except httpx.TimeoutException:
            raise ValueError("Connection to web server timed out after 8 seconds.")
        except httpx.RequestError as e:
            raise ValueError(f"Could not connect to URL: {str(e)}")

content_extractor = ContentExtractor()
