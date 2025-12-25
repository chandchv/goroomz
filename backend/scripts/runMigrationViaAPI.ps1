# PowerShell script to run migration via API endpoint
# You need to be logged in as superuser first

Write-Host "🔧 Running database migration via API..." -ForegroundColor Cyan
Write-Host ""

# Get auth token (you need to login first)
$email = Read-Host "Enter superuser email"
$password = Read-Host "Enter superuser password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "`n🔐 Logging in..." -ForegroundColor Yellow

# Login to get token
$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -SessionVariable session

    $token = $loginResponse.token
    Write-Host "✅ Login successful" -ForegroundColor Green

    # Run migration
    Write-Host "`n🚀 Running migration..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $migrationResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/migrate/add-columns" `
        -Method Post `
        -Headers $headers

    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host "`n📊 Results:" -ForegroundColor Cyan
    $migrationResponse.results | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
    
    Write-Host "`n📋 New columns added:" -ForegroundColor Cyan
    $migrationResponse.newColumns | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
    
    Write-Host "`n✅ Total columns in rooms table: $($migrationResponse.totalColumns)" -ForegroundColor Green

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
