import os
import sys
import string
from pathlib import Path
from typing import List, Dict, Any, Optional

PROTECTED_NAMES = {
    "windows",
    "system32",
    "syswow64",
    "program files",
    "program files (x86)",
    "programdata",
    "system volume information",
    "$recycle.bin",
    "recovery",
    "appdata"
}

def get_available_drives() -> List[str]:
    """Detects active Windows drives or root for Unix."""
    drives = []
    if sys.platform == "win32":
        for letter in string.ascii_uppercase:
            drive_str = f"{letter}:\\"
            if os.path.exists(drive_str):
                drives.append(drive_str)
    else:
        drives.append("/")
    return drives

def is_path_protected(path: Path) -> bool:
    """Checks if path is a forbidden system-critical folder."""
    try:
        resolved = path.resolve()
        
        # Check if it's directly a drive root
        if sys.platform == "win32":
            if resolved.parent == resolved: # Drive root e.g. C:\
                return True
        elif resolved == Path("/"):
            return True
            
        # Check if it matches user profile root directly
        home = Path.home().resolve()
        if resolved == home:
            return True
            
        # Check parts against protected directory names
        for part in resolved.parts:
            if part.lower() in PROTECTED_NAMES:
                return True
                
        return False
    except Exception:
        return True

def browse_directory(target_path_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns folder contents, drive roots, and navigation breadcrumbs.
    """
    drives = get_available_drives()
    
    if not target_path_str or target_path_str.strip() == "":
        # Default to user Documents or Desktop or first drive
        default_dir = Path.home() / "Downloads"
        if not default_dir.exists():
            default_dir = Path.home()
        current_path = default_dir.resolve()
    else:
        current_path = Path(target_path_str).resolve()
        
    if not current_path.exists() or not current_path.is_dir():
        current_path = Path.home().resolve()
        
    parent_path = None
    if current_path.parent != current_path:
        parent_path = str(current_path.parent)
        
    items = []
    try:
        with os.scandir(str(current_path)) as entries:
            for entry in entries:
                try:
                    if entry.is_dir(follow_symlinks=False):
                        entry_path = Path(entry.path)
                        # Skip hidden system folders starting with '.' or '$'
                        if entry.name.startswith(('.', '$')):
                            continue
                        protected = is_path_protected(entry_path)
                        has_children = False
                        try:
                            with os.scandir(entry.path) as sub:
                                has_children = any(s.is_dir(follow_symlinks=False) for s in sub)
                        except Exception:
                            has_children = False
                            
                        items.append({
                            "name": entry.name,
                            "path": str(entry_path),
                            "is_dir": True,
                            "is_protected": protected,
                            "has_children": has_children
                        })
                except (PermissionError, OSError):
                    continue
    except (PermissionError, OSError):
        pass
        
    items.sort(key=lambda x: x["name"].lower())
    
    return {
        "current_path": str(current_path),
        "parent_path": parent_path,
        "is_protected": is_path_protected(current_path),
        "items": items,
        "drives": drives
    }

def open_native_folder_dialog(initial_dir: Optional[str] = None) -> Optional[str]:
    """
    Opens the native Windows File Explorer 'Select Folder' dialog (similar to VS Code)
    and returns the selected folder path, or None if cancelled.
    """
    import subprocess

    # 1. On Windows, use PowerShell with FolderBrowserDialog (AutoUpgradeEnabled = true for modern File Explorer UI)
    if sys.platform == "win32":
        safe_init = (initial_dir or "").replace("'", "''")
        ps_script = f"""
[System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select Workspace Folder - FolderPilot"
$dialog.ShowNewFolderButton = $true
$dialog.AutoUpgradeEnabled = $true
$init = '{safe_init}'
if ($init -and (Test-Path $init)) {{
    $dialog.SelectedPath = $init
}}
$dummyForm = New-Object System.Windows.Forms.Form
$dummyForm.TopMost = $true
$result = $dialog.ShowDialog($dummyForm)
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::WriteLine($dialog.SelectedPath)
}}
"""
        try:
            res = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=180
            )
            out = res.stdout.strip()
            if out and os.path.isdir(out):
                return out
        except Exception:
            pass

    # 2. Tkinter fallback
    try:
        py_code = """
import sys, os
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.attributes('-topmost', True)
init_dir = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else None
folder = filedialog.askdirectory(title="Select Workspace Folder - FolderPilot", initialdir=init_dir)
root.destroy()
if folder:
    print(folder, end='')
"""
        res = subprocess.run(
            [sys.executable, "-c", py_code, initial_dir or ""],
            capture_output=True,
            text=True,
            timeout=180
        )
        out = res.stdout.strip()
        if out and os.path.isdir(out):
            return out
    except Exception:
        pass

    return None

