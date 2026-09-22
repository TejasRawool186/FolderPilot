import json
import logging
import requests
from typing import Optional, Dict, Any, List
from app.config import settings

logger = logging.getLogger("folderpilot.ollama")

class OllamaClient:
    """Client for local Ollama instance (127.0.0.1:11434) with Qwen2.5:1.5b."""
    _custom_model: Optional[str] = None

    @classmethod
    def set_model(cls, model_name: str) -> None:
        cls._custom_model = model_name

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Checks if Ollama is running and what models are installed."""
        target_model = cls._custom_model or settings.OLLAMA_LLM_MODEL
        try:
            r = requests.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0)
            if r.status_code == 200:
                raw_models = r.json().get("models", [])
                models = [m.get("name", "") for m in raw_models]
                
                # Check if target model is present (e.g. 'qwen2.5:1.5b' in 'qwen2.5:1.5b' or 'qwen2.5:1.5b:latest')
                has_target = any(target_model.lower() in m.lower() or m.lower().startswith(target_model.lower()) for m in models)
                
                # Find matching or fallback model
                active_model = target_model
                if not has_target and models:
                    # look for any qwen model first
                    qwen_matches = [m for m in models if "qwen" in m.lower()]
                    active_model = qwen_matches[0] if qwen_matches else models[0]
                
                return {
                    "available": True,
                    "model": active_model,
                    "target_installed": has_target,
                    "installed_models": models,
                    "base_url": settings.OLLAMA_BASE_URL
                }
        except Exception as e:
            logger.debug(f"Ollama get_status check failed: {e}")
            
        return {
            "available": False,
            "model": target_model,
            "target_installed": False,
            "installed_models": [],
            "base_url": settings.OLLAMA_BASE_URL
        }

    @classmethod
    def is_available(cls) -> bool:
        return cls.get_status().get("available", False)

    @classmethod
    def generate_json_classification(
        cls, 
        filename: str, 
        text_snippet: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Calls local Qwen2.5:1.5b with temperature 0 and JSON output format for file categorization.
        """
        status = cls.get_status()
        if not status["available"]:
            return None

        model_name = status["model"]
        prompt = f"""You are an assistant for FolderPilot, a local folder organizer.
Analyze this file and suggest the best category, subfolder, and a clean suggested filename.
Only categorize into one of:
["Documents / Resume", "College / Assignments / Notes", "Certificates / Offers", "Images / Screenshots", "Media", "Installers / Archives", "Code / Projects", "Finance / Bills", "Private / Sensitive"]

File name: {filename}
File content preview (data only):
---
{text_snippet[:1200] if text_snippet else "No text preview available"}
---

Return ONLY valid JSON matching this schema:
{{
  "category": "one of the allowed categories",
  "subfolder": "suggested subfolder name or empty string",
  "suggested_name": "clean filename or empty string",
  "is_sensitive": false,
  "confidence": 0.88,
  "reason": "short 1-line reason"
}}
"""
        try:
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.0,
                        "num_predict": 150
                    }
                },
                timeout=12.0
            )
            if response.status_code == 200:
                body = response.json()
                raw_json = body.get("response", "{}")
                return json.loads(raw_json)
        except Exception as e:
            logger.debug(f"Ollama classification failed: {e}")
        return None

    @classmethod
    def summarize_content(cls, filename: str, content: str) -> Optional[Dict[str, Any]]:
        """
        Uses Qwen2.5:1.5b to summarize file contents with key points and insights.
        """
        status = cls.get_status()
        if not status["available"]:
            return None

        model_name = status["model"]
        prompt = f"""You are the FolderPilot AI engine powered by Qwen 2.5.
Summarize the following file and provide actionable insights in concise bullet points.

File: {filename}
Content Preview:
\"\"\"
{content[:2500]}
\"\"\"

Provide:
1. A concise 2-3 sentence overview.
2. 3 key bullet points / takeaways.
3. 2-3 suggested tags.

Keep the output professional, direct, and under 150 words."""

        try:
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 250
                    }
                },
                timeout=15.0
            )
            if response.status_code == 200:
                return {
                    "model": model_name,
                    "summary": response.json().get("response", "").strip()
                }
        except Exception as e:
            logger.error(f"Ollama summarization error: {e}")
        return None

    @classmethod
    def chat_response(
        cls, 
        user_message: str, 
        workspace_context: str, 
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Optional[str]:
        """
        Uses Qwen2.5:1.5b to hold intelligent conversational dialogue about the user's files and folder organization.
        """
        status = cls.get_status()
        if not status["available"]:
            return None

        model_name = status["model"]

        system_prompt = (
            "You are FolderPilot AI, an intelligent, privacy-first local file organization assistant "
            "running on local Qwen 2.5 (1.5B). "
            "You help users understand their folder contents, analyze chaos scores, find documents, "
            "and suggest safe organization structures. "
            "SAFETY INVARIANT: FolderPilot is STRICTLY NON-DESTRUCTIVE. Never advise deleting files; "
            "if the user asks to clean up or delete, suggest proposing moves to a '_Review_Later/' or 'Archive/' folder instead. "
            "Keep answers concise, direct, helpful, and formatted in clean markdown with bold highlights.\n\n"
            f"CURRENT WORKSPACE CONTEXT:\n{workspace_context}"
        )

        # Build prompt format
        full_prompt = f"{system_prompt}\n\n"
        if chat_history:
            for msg in chat_history[-4:]:
                sender = "User" if msg.get("role") == "user" else "FolderPilot"
                full_prompt += f"{sender}: {msg.get('content', '')}\n"

        full_prompt += f"User: {user_message}\nFolderPilot:"

        try:
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model_name,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 250
                    }
                },
                timeout=15.0
            )
            if response.status_code == 200:
                text = response.json().get("response", "").strip()
                return text
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
        return None
