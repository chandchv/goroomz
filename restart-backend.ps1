# Script to restart the backend server
Write-Host "🔄 Restarting backend server..."

# Kill any existing Node.js processes running on port 5000
$processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($processes) {
    foreach ($pid in $processes) {
        Write-Host "🛑 Stopping process $pid on port 5000..."
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Start the backend server
Write-Host "🚀 Starting backend server..."
Set-Location backend
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "start"
Write-Host "✅ Backend server restart initiated"
Write-Host "📍 Server should be available at http://localhost:5000"