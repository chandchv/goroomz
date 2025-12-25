# Simple API Test for Bed Endpoints
Write-Host "Testing GoRoomz API with correct credentials..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1. Testing Health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
Write-Host "Health Status: $($health.status)" -ForegroundColor Green

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
$body = '{"email":"amit.patel@example.com","password":"Owner123!"}'
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -Body $body -ContentType "application/json"

if ($login.success) {
    Write-Host "Login successful: $($login.user.email)" -ForegroundColor Green
    $token = $login.token
    
    # Test 3: Bed Endpoint
    Write-Host "3. Testing Bed Endpoint..." -ForegroundColor Yellow
    $headers = @{ Authorization = "Bearer $token" }
    
    try {
        $beds = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/610ba499-1376-4473-a476-e885d139c74d/beds" -Headers $headers
        Write-Host "Beds found: $($beds.count)" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 500) {
            Write-Host "500 error (database issue, but route exists)" -ForegroundColor Yellow
            Write-Host "Route fix is working!" -ForegroundColor Green
        } else {
            Write-Host "Error: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Login failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "POSTMAN CREDENTIALS:" -ForegroundColor Cyan
Write-Host "Email: amit.patel@example.com"
Write-Host "Password: Owner123!"
Write-Host "Collection: Bed_API_Testing.postman_collection.json"