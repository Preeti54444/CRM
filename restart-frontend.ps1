$frontendDir = 'C:\Users\admin\Downloads\crm-final (6) (3)\crm-final (7)\crm-final (6)\crm-final\clean-project\frontend'
$listen = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listen) {
    $pids = $listen | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Host "Stopping existing port 3000 processes: $($pids -join ', ')"
    $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
} else {
    Write-Host 'No existing listener on port 3000'
}
Write-Host "Starting server from $frontendDir"
$proc = Start-Process -FilePath python -ArgumentList @('-m','http.server','3000') -WorkingDirectory $frontendDir -NoNewWindow -PassThru
Start-Sleep -Seconds 3
Write-Host "Started pid $($proc.Id) path $($proc.Path)"
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table
Write-Host 'Directory contents:'
Get-ChildItem $frontendDir | Select-Object Name | Format-Table
