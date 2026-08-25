@echo off
REM Run the FundingSathi CRM backend (Windows)
REM Ensure Python 3.10+ is installed and on PATH

echo Activating virtual environment (create one if needed)...
if exist .venv\Scripts\activate (
  call .venv\Scripts\activate
) else (
  echo No virtualenv found at .venv — creating one...
  py -3 -m venv .venv
  call .venv\Scripts\activate
  echo Installing requirements (this may take a few minutes)...
  pip install -r requirements.txt
)

echo Starting Uvicorn server on http://127.0.0.1:8000
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
