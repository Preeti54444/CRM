@echo off
REM CRM Quick Start Script for Windows
REM This script starts the backend, frontend, and opens the browser

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              CRM Frontend-Backend Quick Start                   ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if running from correct directory
if not exist "backend" (
    echo Error: Please run this script from the project root directory
    echo Expected to find "backend" and "frontend" subdirectories
    pause
    exit /b 1
)

echo Checking prerequisites...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.8 or later.
    pause
    exit /b 1
)
echo ✓ Python found

REM Check if backend venv exists
if exist "backend\venv" (
    echo ✓ Backend virtual environment found
) else (
    echo ⚠ Backend virtual environment not found
    echo   Creating venv...
    cd backend
    python -m venv venv
    cd ..
    echo   ✓ venv created
)

echo.
echo Starting CRM services...
echo.

REM Start backend
echo [1/2] Starting Backend on port 8085...
start "CRM Backend" cmd /k "cd backend && venv\Scripts\python.exe -m alembic upgrade head && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8085"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend
echo [2/2] Starting Frontend on port 3000...
start "CRM Frontend" cmd /k "cd frontend && python simple_server.py"

REM Wait for frontend to start
timeout /t 2 /nobreak

REM Open browser
echo.
echo Opening browser...
timeout /t 2 /nobreak
start http://localhost:3000

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    CRM IS RUNNING!                             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8085
echo API Docs: http://localhost:8085/docs
echo.
echo The backend and frontend windows will stay open.
echo Close them to stop the services.
echo.
echo Press any key to continue...
pause >nul
