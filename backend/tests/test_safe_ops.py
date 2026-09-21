import pytest
import os
from pathlib import Path
from app.safe_ops import (
    safe_move, 
    safe_rename, 
    safe_mkdir, 
    get_non_colliding_destination, 
    ensure_safe_path, 
    SafetyViolationError
)

def test_ensure_safe_path_valid(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    child = root / "folder" / "file.txt"
    resolved = ensure_safe_path(child, root)
    assert resolved == child.resolve()

def test_ensure_safe_path_traversal_blocked(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    outside = tmp_path / "outside_file.txt"
    outside.write_text("evil")
    with pytest.raises(SafetyViolationError):
        ensure_safe_path(outside, root)

def test_auto_suffix_collision_handling(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    target = root / "document.pdf"
    target.write_text("first")
    
    # Destination already exists
    non_colliding = get_non_colliding_destination(target)
    assert non_colliding.name == "document (1).pdf"
    
    # If document (1).pdf also exists
    non_colliding.write_text("second")
    non_colliding_2 = get_non_colliding_destination(target)
    assert non_colliding_2.name == "document (2).pdf"

def test_safe_move_and_integrity(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    src = root / "source.txt"
    src.write_text("hello folderpilot")
    dst = root / "subfolder" / "dest.txt"
    
    actual_dst, hash_before, hash_after = safe_move(src, dst, root)
    
    assert actual_dst == dst
    assert not src.exists()
    assert dst.exists()
    assert dst.read_text() == "hello folderpilot"
    assert hash_before == hash_after
