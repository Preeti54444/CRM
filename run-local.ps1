param(
    [switch]$All,
    [switch]$Install,
    [switch]$Migrate,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Help
)

function Show-Help {
    Write-Host "Usage: .\run-local.ps1 [-All] [-Install] [-Migrate] [-Backend] [-Frontend] [-Help]" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -All       Install dependencies, run migrations, start backend and frontend servers."
    Write-Host "  -Install   Install backend Python dependencies."
    Write-Host "  -Migrate   Run Alembic migrations against backend/.env." 
    Write-Host "  -Backend   Start FastAPI backend on http://localhost:8085." 
    Write-Host "  -Frontend  Start static frontend server on http://localhost:3000." 
    Write-Host "  -Help      Show this help message." 
}

if ($Help -or -not ($All -or $Install -or $Migrate -or $Backend -or $Frontend)) {
    Show-Help
    exit 0
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $Root 'backend'
$FrontendPath = Join-Path $Root 'frontend'
$EnvSource = Join-Path $Root '.env.example'
$EnvTarget = Join-Path $BackendPath '.env'

if (-not (Test-Path $EnvTarget) -and (Test-Path $EnvSource)) {
    Copy-Item -Path $EnvSource -Destination $EnvTarget -Force
    Write-Host "Copied .env.example to backend/.env" -ForegroundColor Green
}

if ($Install -or $All) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $BackendPath
    python -m pip install -r requirements.txt
    Pop-Location
}

if ($Migrate -or $All) {
    Write-Host "Running Alembic migrations..." -ForegroundColor Yellow
    Push-Location $BackendPath
    python -m alembic upgrade head
    Pop-Location
}

if ($Backend -or $All) {
    Write-Host "Starting backend server on http://localhost:8085 ..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8085', '--log-level', 'info' -WorkingDirectory $BackendPath
    Start-Sleep -Milliseconds 500
}

if ($Frontend -or $All) {
    Write-Host "Starting frontend static server on 0.0.0.0:3000 (LAN accessible) ..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'http.server', '3000', '--bind', '0.0.0.0' -WorkingDirectory $FrontendPath
    Start-Sleep -Milliseconds 500
}

Write-Host "" -ForegroundColor Green
Write-Host "Run completed. Use http://localhost:3000 for frontend and http://localhost:8085/api/docs for backend docs." -ForegroundColor Green
