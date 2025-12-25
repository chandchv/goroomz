# Test if server is running
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/health" -Method GET
    Write-Host "✅ Server is running"
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ Server not responding: $($_.Exception.Message)"
}