import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FOLDERPILOT_", extra="ignore")
    
    APP_NAME: str = "FolderPilot"
    VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Base storage directory for local database & app runtime
    DATA_DIR: Path = Path(os.environ.get("FOLDERPILOT_DATA_DIR", Path.home() / ".folderpilot"))
    DB_NAME: str = "folderpilot.db"
    
    # Ollama settings
    OLLAMA_BASE_URL: str = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_EMBED_MODEL: str = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    OLLAMA_LLM_MODEL: str = os.environ.get("OLLAMA_LLM_MODEL", "qwen2.5:1.5b")
    
    # Scan & Safety limits
    MAX_FILE_SIZE_EXTRACT: int = 50 * 1024 * 1024  # 50MB max for text extraction
    MAX_TEXT_SNIPPET_CHARS: int = 2500             # ~500 tokens
    LARGE_PLAN_THRESHOLD_RATIO: float = 0.30       # 30% of total files requires explicit number confirm
    LARGE_PLAN_THRESHOLD_COUNT: int = 50           # Or more than 50 files
    
    # Session API Token
    SESSION_TOKEN: str = os.environ.get("FOLDERPILOT_TOKEN", "fp-local-session-secret-2026")

    @property
    def db_path(self) -> Path:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return self.DATA_DIR / self.DB_NAME

settings = Settings()
