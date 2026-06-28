param(
    [switch]$Help
)

function Show-Help {
    Write-Host "Alternative LAN Access Script - Uses Different Ports" -ForegroundColor Cyan
    Write-Host "" 
    Write-Host "This script uses ports 8000 (frontend) and 8001 (backend)" -ForegroundColor Yellow
    Write-Host "These ports are often less restricted by firewalls" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage: .\run-lan-alt.ps1" -ForegroundColor Cyan
}

if ($Help) {
    Show-Help
    exit 0
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $Root 'backend'
$FrontendPath = Join-Path $Root 'frontend'

# Get local IP address
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

Write-Host "========================================" -ForegroundColor Green
Write-Host "ALTERNATIVE LAN ACCESS SETUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Using ports 8000 (frontend) and 8001 (backend)" -ForegroundColor Yellow
Write-Host "These ports are often less restricted by firewalls" -ForegroundColor Yellow
Write-Host ""

# Stop any existing processes on these ports
Write-Host "Stopping any existing processes on ports 8000 and 8001..." -ForegroundColor Yellow
try {
    Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {
    # Ignore errors
}

Write-Host "Starting backend server on 0.0.0.0:8001 ..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8001', '--log-level', 'info' -WorkingDirectory $BackendPath
Start-Sleep -Milliseconds 1000

Write-Host "Starting frontend static server on 0.0.0.0:8000 ..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath python -ArgumentList '-m', 'http.server', '8000', '--bind', '0.0.0.0' -WorkingDirectory $FrontendPath
Start-Sleep -Milliseconds 1000

Write-Host "" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "ALTERNATIVE LAN ACCESS CONFIGURED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Local Access:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8001/api/docs" -ForegroundColor White
Write-Host "" -ForegroundColor Green
Write-Host "LAN Access (from other devices on WiFi):" -ForegroundColor Cyan
Write-Host "  Frontend: http://$LocalIP`:8000" -ForegroundColor Yellow
Write-Host "  Backend:  http://$LocalIP`:8001/api/docs" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Green
Write-Host "If still not working, try these steps:" -ForegroundColor Yellow
Write-Host "1. Temporarily disable Windows Firewall (for testing)" -ForegroundColor White
Write-Host "2. Check if both devices are on the same network" -ForegroundColor White
Write-Host "3. Try using the computer's hostname instead of IP" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
