param(
    [switch]$All,
    [switch]$Install,
    [switch]$Migrate,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Help
)

function Show-Help {
    Write-Host "Usage: .\run-lan.ps1 [-All] [-Install] [-Migrate] [-Backend] [-Frontend] [-Help]" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -All       Install dependencies, run migrations, start backend and frontend servers for LAN access."
    Write-Host "  -Install   Install backend Python dependencies."
    Write-Host "  -Migrate   Run Alembic migrations against backend/.env." 
    Write-Host "  -Backend   Start FastAPI backend on 0.0.0.0:8085 (accessible from LAN)." 
    Write-Host "  -Frontend  Start static frontend server on 0.0.0.0:3000 (accessible from LAN)." 
    Write-Host "  -Help      Show this help message." 
    Write-Host ""
    Write-Host "LAN Access:" -ForegroundColor Yellow
    Write-Host "  This script configures the servers to be accessible from other devices on your WiFi network."
    Write-Host "  Other devices can access using: http://YOUR_IP:3000 (frontend) and http://YOUR_IP:8085 (backend API)"
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

# Get local IP address for LAN access
function Get-LocalIPAddress {
    $ipconfig = ipconfig
    foreach ($line in $ipconfig) {
        if ($line -match "IPv4 Address.*: (\d+\.\d+\.\d+\.\d+)") {
            $ip = $matches[1]
            if ($ip -notmatch "^127\.") {
                return $ip
            }
        }
    }
    return "localhost"
}

$LocalIP = Get-LocalIPAddress

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
    Write-Host "Starting backend server on 0.0.0.0:8085 (LAN accessible) ..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8085', '--log-level', 'info' -WorkingDirectory $BackendPath
    Start-Sleep -Milliseconds 500
}

if ($Frontend -or $All) {
    Write-Host "Starting frontend static server on 0.0.0.0:3000 (LAN accessible) ..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'http.server', '3000', '--bind', '0.0.0.0' -WorkingDirectory $FrontendPath
    Start-Sleep -Milliseconds 500
}

Write-Host "" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "LAN ACCESS CONFIGURED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Local Access:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8085/api/docs" -ForegroundColor White
Write-Host "" -ForegroundColor Green
Write-Host "LAN Access (from other devices on WiFi):" -ForegroundColor Cyan
Write-Host "  Frontend: http://$LocalIP`:3000" -ForegroundColor Yellow
Write-Host "  Backend:  http://$LocalIP`:8085/api/docs" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Green
Write-Host "Make sure your firewall allows connections on ports 3000 and 8085" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
