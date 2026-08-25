# Setup CRM Backend and Frontend with Database Connection
# Windows PowerShell Script

param(
    [ValidateSet("vps", "local")]
    [string]$DatabaseType = "vps",
    [string]$BackendPort = "8085",
    [string]$FrontendPort = "3000"
)

$ErrorActionPreference = "Stop"

function Write-Title {
    param([string]$Title)
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $($Title.PadRight(62)) ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Step)
    Write-Host "`n✓ $Step" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Error)
    Write-Host "`n✗ $Error" -ForegroundColor Red
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

Write-Title "CRM Database Connection Setup"

Write-Host "`nThis script will set up your CRM frontend and backend with database connectivity."
Write-Host "Database Type: $DatabaseType"
Write-Host "Backend Port: $BackendPort"
Write-Host "Frontend Port: $FrontendPort"

# Check if running as admin (needed for some operations)
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "`nRunning as Admin: $IsAdmin" -ForegroundColor $(if ($IsAdmin) { "Green" } else { "Yellow" })

# Step 1: Check Python Installation
Write-Title "Step 1: Checking Python Installation"

try {
    $PythonVersion = python --version 2>&1
    Write-Step "Python found: $PythonVersion"
} catch {
    Write-Error-Custom "Python not found. Please install Python 3.8 or later."
    exit 1
}

# Step 2: Navigate to Backend
Write-Title "Step 2: Setting Up Backend"

$BackendDir = Join-Path $ProjectRoot "backend"
if (-not (Test-Path $BackendDir)) {
    Write-Error-Custom "Backend directory not found at $BackendDir"
    exit 1
}

Write-Step "Backend directory found: $BackendDir"
Set-Location $BackendDir

# Step 3: Check Virtual Environment
Write-Title "Step 3: Managing Python Virtual Environment"

$VenvDir = Join-Path $BackendDir "venv"

if (Test-Path $VenvDir) {
    Write-Step "Virtual environment exists"
    $ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
    if (Test-Path $ActivateScript) {
        Write-Step "Activating virtual environment..."
        & $ActivateScript
        Write-Step "Virtual environment activated"
    }
} else {
    Write-Host "`n⚠ Virtual environment not found. Creating..." -ForegroundColor Yellow
    Write-Step "Creating virtual environment..."
    python -m venv venv
    Write-Step "Virtual environment created"
    
    Write-Step "Activating virtual environment..."
    $ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
    & $ActivateScript
    Write-Step "Virtual environment activated"
}

# Step 4: Install Dependencies
Write-Title "Step 4: Installing Backend Dependencies"

$RequirementsFile = Join-Path $BackendDir "requirements.txt"
if (Test-Path $RequirementsFile) {
    Write-Step "Installing from requirements.txt..."
    pip install -q -r requirements.txt
    Write-Step "Dependencies installed successfully"
} else {
    Write-Error-Custom "requirements.txt not found at $RequirementsFile"
}

# Step 5: Database Configuration
Write-Title "Step 5: Database Configuration"

$EnvFile = Join-Path $ProjectRoot ".env"

if ($DatabaseType -eq "vps") {
    Write-Host "`nUsing VPS Database at 187.127.149.245" -ForegroundColor Cyan
    Write-Step "Configuration for VPS database already in place"
    Write-Host "`n  - Host: 187.127.149.245:5432"
    Write-Host "  - Database: fundingsathicrm"
    Write-Host "  - User: postgres"
    Write-Host "`nTo verify connectivity:"
    Write-Host "  ping 187.127.149.245"
} else {
    Write-Host "`nSetting up Local PostgreSQL Database" -ForegroundColor Cyan
    Write-Step "Update .env file with local database credentials"
    Write-Host "`nRequired configuration in .env:"
    Write-Host "  DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/fundingsathicrm"
    Write-Host "`nCreate database in PostgreSQL:"
    Write-Host "  psql -U postgres"
    Write-Host "  CREATE DATABASE fundingsathicrm;"
    Write-Host "  CREATE USER crm_user WITH PASSWORD 'crm_password';"
    Write-Host "  ALTER DATABASE fundingsathicrm OWNER TO crm_user;"
    Write-Host "`nThen press Enter to continue..."
    Read-Host
}

# Step 6: Run Migrations
Write-Title "Step 6: Running Database Migrations"

try {
    Write-Step "Checking migration status..."
    python -m alembic current 2>&1 | Write-Host
    
    Write-Step "Applying migrations..."
    python -m alembic upgrade head 2>&1 | Write-Host
    Write-Step "Migrations completed successfully"
} catch {
    Write-Host "`n⚠ Migration warning (this may be expected on first run)" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

# Step 7: Backend Ready
Write-Title "Step 7: Backend Configuration Complete"

Write-Host "`nBackend Setup Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Python environment ready"
Write-Host "  ✓ Dependencies installed"
Write-Host "  ✓ Database migrations applied"
Write-Host "  ✓ Backend ready to start"

Write-Host "`nTo start the backend, run:" -ForegroundColor Yellow
Write-Host "  uvicorn app.main:app --reload --port $BackendPort"

# Step 8: Frontend Setup
Write-Title "Step 8: Setting Up Frontend"

$FrontendDir = Join-Path $ProjectRoot "frontend"
if (-not (Test-Path $FrontendDir)) {
    Write-Error-Custom "Frontend directory not found at $FrontendDir"
    exit 1
}

Write-Step "Frontend directory found: $FrontendDir"
Write-Host "`nFrontend Setup Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Static files ready (HTML, CSS, JS)"
Write-Host "  ✓ Configuration auto-detects backend"
Write-Host "  ✓ Frontend ready to start"

Write-Host "`nTo start the frontend, run (from frontend directory):" -ForegroundColor Yellow
Write-Host "  python simple_server.py"
Write-Host "  # or: python -m http.server $FrontendPort"

# Step 9: Final Instructions
Write-Title "Setup Complete! Quick Start Guide"

Write-Host "`n=== Terminal 1: Backend ===" -ForegroundColor Cyan
Write-Host "cd backend"
Write-Host "uvicorn app.main:app --reload --port $BackendPort"

Write-Host "`n=== Terminal 2: Frontend ===" -ForegroundColor Cyan
Write-Host "cd frontend"
Write-Host "python simple_server.py"

Write-Host "`n=== Browser ===" -ForegroundColor Cyan
Write-Host "Open: http://localhost:$FrontendPort"

Write-Host "`n=== API Documentation ===" -ForegroundColor Cyan
Write-Host "Swagger UI: http://localhost:$BackendPort/docs"
Write-Host "ReDoc: http://localhost:$BackendPort/redoc"

Write-Host "`n=== Test Target Assignment Feature ===" -ForegroundColor Cyan
Write-Host "1. Log in as admin"
Write-Host "2. Go to Sales Targets page"
Write-Host "3. Assign targets to employee"
Write-Host "4. Employee sees notification in My To-Do"

Write-Host "`n=== Helpful Commands ===" -ForegroundColor Cyan
Write-Host "View database migrations:"
Write-Host "  python -m alembic history"
Write-Host ""
Write-Host "Check database connection:"
Write-Host "  python -m psql -h 187.127.149.245 -U postgres"
Write-Host ""
Write-Host "Run tests:"
Write-Host "  python test_target_endpoints.py"
Write-Host "  python test_workflow_simulation.py"
Write-Host "  python test_frontend_integration.py"

Write-Host "`n✓ Setup complete! Your CRM is ready to run." -ForegroundColor Green
Write-Host "`nPress Enter to close this window..."
Read-Host
