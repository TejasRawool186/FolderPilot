import sqlite3
import json
import logging
from contextlib import contextmanager
from typing import Generator, Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("folderpilot.database")

SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    root_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_only INTEGER DEFAULT 0,
    settings_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    ext TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime REAL NOT NULL,
    ctime REAL NOT NULL,
    mime TEXT,
    sha256 TEXT,
    phash TEXT,
    text_snippet TEXT,
    embedding_blob BLOB,
    status TEXT DEFAULT 'indexed',
    UNIQUE(workspace_id, path)
);

CREATE TABLE IF NOT EXISTS classifications (
    file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subfolder TEXT,
    confidence REAL NOT NULL,
    tier INTEGER NOT NULL,
    reason TEXT NOT NULL,
    is_sensitive INTEGER DEFAULT 0,
    suggested_name TEXT,
    user_override INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dup_groups (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    keep_file_id TEXT REFERENCES files(id)
);

CREATE TABLE IF NOT EXISTS dup_members (
    group_id TEXT NOT NULL REFERENCES dup_groups(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, file_id)
);

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS ops (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error TEXT
);

CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    op_id TEXT NOT NULL REFERENCES ops(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    type TEXT NOT NULL,
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    hash_before TEXT,
    hash_after TEXT,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    undone_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    file_id TEXT NOT NULL,
    from_category TEXT NOT NULL,
    to_category TEXT NOT NULL,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    pattern TEXT NOT NULL,
    target_folder TEXT NOT NULL,
    priority INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls_json TEXT,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_workspace ON files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX IF NOT EXISTS idx_files_sha256 ON files(sha256);
CREATE INDEX IF NOT EXISTS idx_classifications_cat ON classifications(category);
CREATE INDEX IF NOT EXISTS idx_ops_plan ON ops(plan_id);
CREATE INDEX IF NOT EXISTS idx_journal_ws ON journal(workspace_id);
"""

def init_db():
    db_file = settings.db_path
    logger.info(f"Initializing database at: {db_file}")
    with sqlite3.connect(db_file) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(settings.db_path, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def query_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def query_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def execute_stmt(stmt: str, params: tuple = ()) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(stmt, params)
        return cursor.rowcount
