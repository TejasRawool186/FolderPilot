import re
from typing import Dict, Any, List
from pathlib import Path

VERSION_REGEX = re.compile(r'(_v\d+|_final|_copy|\scopy|\(\d+\))', re.I)

def compute_chaos_score(
    files: List[Dict[str, Any]], 
    workspace_root: str,
    duplicates_count: int = 0
) -> Dict[str, Any]:
    """
    Computes 0-100 Chaos Score measuring disorganization of the folder.
    0 = Perfectly structured, 100 = Maximum chaos.
    """
    total_files = len(files)
    if total_files == 0:
        return {
            "score": 0,
            "projected_score": 0,
            "loose_files_count": 0,
            "duplicate_count": 0,
            "version_clutter_count": 0,
            "deep_nesting_count": 0,
            "factors": {
                "loose_files_ratio": 0.0,
                "duplicate_ratio": 0.0,
                "version_clutter_ratio": 0.0,
                "naming_irregularity_ratio": 0.0
            }
        }

    root_path = Path(workspace_root)
    loose_files = 0
    version_clutter = 0
    deep_nesting = 0
    naming_irregularities = 0

    for f in files:
        p = Path(f["path"])
        name = f["name"]
        
        # Loose files: sitting directly in workspace root
        if p.parent.resolve() == root_path.resolve():
            loose_files += 1
            
        # Version clutter: 'final', 'copy', etc.
        if VERSION_REGEX.search(name):
            version_clutter += 1
            
        # Depth > 3 levels deep
        try:
            rel = p.relative_to(root_path)
            if len(rel.parts) > 4:
                deep_nesting += 1
        except Exception:
            pass
            
        # Naming irregularity: strange characters, spaces, or mixed cases
        if " " in name or "%20" in name or "@" in name or "~" in name:
            naming_irregularities += 1

    loose_ratio = loose_files / total_files
    duplicate_ratio = min(1.0, duplicates_count / max(1, total_files))
    version_ratio = version_clutter / total_files
    naming_ratio = naming_irregularities / total_files

    # Weighted calculation
    raw_score = (
        (loose_ratio * 40.0) +
        (duplicate_ratio * 30.0) +
        (version_ratio * 15.0) +
        (naming_ratio * 15.0)
    )
    score = int(min(100, max(0, round(raw_score))))
    
    # Projected score after applying FolderPilot plan:
    # Most loose files grouped, duplicates moved to _Duplicates, organized by category
    projected = max(5, int(score * 0.20))

    return {
        "score": score,
        "projected_score": projected,
        "loose_files_count": loose_files,
        "duplicate_count": duplicates_count,
        "version_clutter_count": version_clutter,
        "deep_nesting_count": deep_nesting,
        "factors": {
            "loose_files_ratio": round(loose_ratio, 2),
            "duplicate_ratio": round(duplicate_ratio, 2),
            "version_clutter_ratio": round(version_ratio, 2),
            "naming_irregularity_ratio": round(naming_ratio, 2)
        }
    }
