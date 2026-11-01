@echo off
echo ===================================================
echo Starting CivicLens AI Full-Stack Application
echo ===================================================

echo [1/2] Starting Backend API on http://localhost:8000...
start "CivicLens AI Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend on http://localhost:5173...
start "CivicLens AI Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo CivicLens AI is booting up!
echo - Web UI:  http://localhost:5173
echo - API Docs: http://localhost:8000/api/docs
echo ===================================================
