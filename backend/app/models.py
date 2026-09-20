from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Pydantic Data Models ---

class WorkspaceBase(BaseModel):
    root_path: str
    read_only: bool = False
    settings_json: Optional[str] = "{}"

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceResponse(WorkspaceBase):
    id: str
    created_at: str

class FileMetadata(BaseModel):
    id: str
    workspace_id: str
    path: str
    name: str
    ext: str
    size: int
    mtime: float
    ctime: float
    mime: Optional[str] = None
    sha256: Optional[str] = None
    phash: Optional[str] = None
    text_snippet: Optional[str] = None
    status: str = "indexed"

class ClassificationData(BaseModel):
    file_id: str
    category: str
    subfolder: Optional[str] = None
    confidence: float
    tier: int
    reason: str
    is_sensitive: bool = False
    suggested_name: Optional[str] = None
    user_override: bool = False

class DuplicateGroupData(BaseModel):
    id: str
    workspace_id: str
    kind: str  # 'exact', 'near', 'image'
    keep_file_id: Optional[str] = None
    members: List[FileMetadata] = []

class OpData(BaseModel):
    id: str
    plan_id: str
    type: str  # 'MKDIR', 'MOVE', 'RENAME'
    src: str
    dst: str
    approved: bool = False
    status: str = "pending"  # 'pending', 'applied', 'skipped', 'failed'
    error: Optional[str] = None

class PlanData(BaseModel):
    id: str
    workspace_id: str
    created_at: str
    status: str = "draft"  # 'draft', 'approved', 'applied', 'undone'
    ops: List[OpData] = []

class JournalData(BaseModel):
    id: str
    op_id: str
    workspace_id: str
    type: str
    src: str
    dst: str
    hash_before: Optional[str] = None
    hash_after: Optional[str] = None
    ts: str
    undone_at: Optional[str] = None

class ChatMessageData(BaseModel):
    id: str
    workspace_id: str
    role: str  # 'user', 'assistant'
    content: str
    tool_calls_json: Optional[str] = None
    ts: str

class ChaosScoreResponse(BaseModel):
    score: int
    loose_files_count: int
    duplicate_count: int
    version_clutter_count: int
    deep_nesting_count: int
    projected_score: int
    factors: Dict[str, Any]

class DryRunResponse(BaseModel):
    plan_id: str
    total_ops: int
    approved_ops: int
    mkdir_count: int
    move_count: int
    rename_count: int
    total_bytes_affected: int
    conflicts: List[Dict[str, str]]
    locked_files: List[Dict[str, str]]
    requires_number_confirmation: bool
    affected_percentage: float

class BrowseItem(BaseModel):
    name: str
    path: str
    is_dir: bool
    is_protected: bool = False
    has_children: bool = False

class BrowseResponse(BaseModel):
    current_path: str
    parent_path: Optional[str] = None
    items: List[BrowseItem]
    drives: List[str]
