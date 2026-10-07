@echo off
TITLE FolderPilot Launcher
echo ========================================================
echo         FolderPilot - Local Privacy-First Organizer
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python and Node environments...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH!
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo [2/3] Starting FolderPilot Backend on 127.0.0.1:8000...
start "FolderPilot Backend" cmd /k "cd backend && python -X utf8 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting FolderPilot Next.js Frontend on 127.0.0.1:3000...
start "FolderPilot Frontend" cmd /k "cd frontend && npm run dev -- -p 3000"

echo.
echo ========================================================
echo FolderPilot is running!
echo Next.js Frontend: http://127.0.0.1:3000
echo FastAPI Backend and Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
