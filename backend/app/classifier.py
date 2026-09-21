import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.sensitive import check_sensitive_document
from app.ollama_client import OllamaClient
from app.database import query_all

# Default Taxonomy & Extensions
EXTENSION_RULES = {
    # Installers / Archives
    ".exe": ("Installers / Archives", "Installers", 0.95, "Executable binary"),
    ".msi": ("Installers / Archives", "Installers", 0.95, "Windows Installer Package"),
    ".zip": ("Installers / Archives", "Archives", 0.90, "ZIP compressed archive"),
    ".rar": ("Installers / Archives", "Archives", 0.90, "RAR compressed archive"),
    ".7z": ("Installers / Archives", "Archives", 0.90, "7-Zip compressed archive"),
    ".tar": ("Installers / Archives", "Archives", 0.90, "TAR archive"),
    ".gz": ("Installers / Archives", "Archives", 0.90, "GZip compressed archive"),
    ".iso": ("Installers / Archives", "Disk Images", 0.95, "ISO disk image"),
    
    # Images / Screenshots
    ".png": ("Images / Screenshots", "Images", 0.85, "Image file"),
    ".jpg": ("Images / Screenshots", "Images", 0.85, "JPEG image"),
    ".jpeg": ("Images / Screenshots", "Images", 0.85, "JPEG image"),
    ".webp": ("Images / Screenshots", "Images", 0.85, "WebP image"),
    ".gif": ("Images / Screenshots", "GIFs", 0.90, "GIF animation/image"),
    ".svg": ("Images / Screenshots", "Vector", 0.90, "SVG vector graphic"),
    ".ico": ("Images / Screenshots", "Icons", 0.90, "Icon file"),
    
    # Media
    ".mp4": ("Media", "Videos", 0.95, "MPEG-4 video"),
    ".mkv": ("Media", "Videos", 0.95, "Matroska video"),
    ".avi": ("Media", "Videos", 0.90, "AVI video"),
    ".mov": ("Media", "Videos", 0.90, "QuickTime video"),
    ".mp3": ("Media", "Audio", 0.95, "MP3 audio track"),
    ".wav": ("Media", "Audio", 0.95, "WAV audio recording"),
    ".flac": ("Media", "Audio", 0.95, "FLAC lossless audio"),
    
    # Code / Projects
    ".py": ("Code / Projects", "Python", 0.95, "Python source code"),
    ".js": ("Code / Projects", "JavaScript", 0.95, "JavaScript file"),
    ".jsx": ("Code / Projects", "React", 0.95, "React JSX component"),
    ".ts": ("Code / Projects", "TypeScript", 0.95, "TypeScript file"),
    ".tsx": ("Code / Projects", "React", 0.95, "React TSX component"),
    ".html": ("Code / Projects", "Web", 0.90, "HTML markup"),
    ".css": ("Code / Projects", "Web", 0.90, "CSS stylesheet"),
    ".cpp": ("Code / Projects", "C++", 0.95, "C++ source code"),
    ".c": ("Code / Projects", "C", 0.95, "C source code"),
    ".java": ("Code / Projects", "Java", 0.95, "Java source file"),
    ".sql": ("Code / Projects", "Database", 0.95, "SQL database script"),
    ".json": ("Code / Projects", "Config", 0.85, "JSON data/config"),
}

# Filename Keyword Rules
FILENAME_KEYWORD_RULES = [
    (re.compile(r'screenshot|screen_shot|capture', re.I), "Images / Screenshots", "Screenshots", 0.95, "Filename indicates screen capture"),
    (re.compile(r'resume|curriculum_vitae|\bcv\b', re.I), "Documents / Resume", "Resumes", 0.95, "Filename indicates resume/CV"),
    (re.compile(r'assignment|homework|syllabus|lecture|lab_manual|sem\s?\d|unit\s?\d', re.I), "College / Assignments / Notes", "College", 0.90, "Academic or coursework keywords in filename"),
    (re.compile(r'certificate|cert_|completion_cert|offer_letter|internship_letter', re.I), "Certificates / Offers", "Certificates", 0.92, "Certification or offer letter keywords"),
    (re.compile(r'invoice|bill|receipt|tax|challan|payment_slip', re.I), "Finance / Bills", "Bills & Invoices", 0.92, "Financial transaction keywords in filename"),
]

# Content Keywords for Tier 3
CONTENT_PROTOTYPES = [
    ("Finance / Bills", "Bills & Invoices", [
        "invoice", "total amount", "tax invoice", "billing address", "payment receipt", "gstin", "subtotal", "balance due"
    ]),
    ("College / Assignments / Notes", "Assignments", [
        "assignment", "submitted by", "roll number", "department of computer", "semester", "academic year", "professor", "course code"
    ]),
    ("Documents / Resume", "Resumes", [
        "work experience", "education", "technical skills", "projects", "curriculum vitae", "professional summary", "bachelor of"
    ]),
    ("Certificates / Offers", "Certificates", [
        "this is to certify", "certificate of completion", "has successfully completed", "letter of appointment", "we are pleased to offer"
    ]),
]

def classify_file(
    filename: str,
    filesize: int,
    workspace_id: str,
    text_snippet: Optional[str] = None,
    allow_llm: bool = True
) -> Dict[str, Any]:
    """
    Executes the 4-tier classification pipeline.
    """
    ext = Path(filename).suffix.lower()

    # 1. Check for Active Learning User Corrections (FR-27)
    try:
        corrections = query_all(
            "SELECT to_category FROM corrections WHERE workspace_id = ? AND from_category = ? ORDER BY ts DESC LIMIT 1",
            (workspace_id, filename)
        )
        if corrections:
            return {
                "category": corrections[0]["to_category"],
                "subfolder": None,
                "confidence": 0.98,
                "tier": 1,
                "reason": "Applied learned user correction",
                "is_sensitive": False,
                "suggested_name": None
            }
    except Exception:
        pass

    # 2. Check for Sensitive Identity / Financial Data (FR-26) -> Routes to 'Private / Sensitive'
    is_sensitive, sensitive_reason = check_sensitive_document(filename, text_snippet)
    if is_sensitive:
        return {
            "category": "Private / Sensitive",
            "subfolder": "Private",
            "confidence": 0.98,
            "tier": 3,
            "reason": f"Sensitive data detected: {sensitive_reason}",
            "is_sensitive": True,
            "suggested_name": None
        }

    # 3. Tier 1: Filename Keyword Rules
    for pattern, cat, subf, conf, reason in FILENAME_KEYWORD_RULES:
        if pattern.search(filename):
            return {
                "category": cat,
                "subfolder": subf,
                "confidence": conf,
                "tier": 1,
                "reason": reason,
                "is_sensitive": False,
                "suggested_name": None
            }

    # 4. Tier 1: Extension Rules
    if ext in EXTENSION_RULES:
        cat, subf, conf, reason = EXTENSION_RULES[ext]
        return {
            "category": cat,
            "subfolder": subf,
            "confidence": conf,
            "tier": 1,
            "reason": reason,
            "is_sensitive": False,
            "suggested_name": None
        }

    # Documents fallback for generic office formats
    if ext in {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".odt", ".rtf"}:
        default_cat = "Documents / Resume"
        default_sub = "Documents"
    else:
        default_cat = "Others"
        default_sub = "General"

    # 5. Tier 3: Content Prototypes (from extracted text snippet)
    if text_snippet and len(text_snippet) > 20:
        snippet_lower = text_snippet.lower()
        for cat, subf, keywords in CONTENT_PROTOTYPES:
            matched = [kw for kw in keywords if kw in snippet_lower]
            if len(matched) >= 2:
                return {
                    "category": cat,
                    "subfolder": subf,
                    "confidence": 0.88,
                    "tier": 3,
                    "reason": f"Content matches keywords: {', '.join(matched[:2])}",
                    "is_sensitive": False,
                    "suggested_name": None
                }

    # 6. Tier 4: Small Local LLM Fallback (FR-23)
    if allow_llm and OllamaClient.is_available():
        llm_res = OllamaClient.generate_json_classification(filename, text_snippet)
        if llm_res and "category" in llm_res and float(llm_res.get("confidence", 0)) >= 0.60:
            return {
                "category": llm_res.get("category", default_cat),
                "subfolder": llm_res.get("subfolder") or default_sub,
                "confidence": float(llm_res.get("confidence", 0.75)),
                "tier": 4,
                "reason": llm_res.get("reason", "Classified by local AI model"),
                "is_sensitive": bool(llm_res.get("is_sensitive", False)),
                "suggested_name": llm_res.get("suggested_name")
            }

    # Fallback Tier 1 default
    return {
        "category": default_cat,
        "subfolder": default_sub,
        "confidence": 0.50,
        "tier": 1,
        "reason": f"Categorized by file extension '{ext}'",
        "is_sensitive": False,
        "suggested_name": None
    }
