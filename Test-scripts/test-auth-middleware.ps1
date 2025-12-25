# Test if auth middleware is working
Write-Host "Testing auth middleware..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

Write-Host "Token received: $($token.Substring(0, 20))..."

# Test a simple authenticated endpoint first
try {
    $userResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✅ Auth working - User: $($userResponse.user.email)"
} catch {
    Write-Host "❌ Auth failed: $($_.Exception.Message)"
}

# Test bookings GET endpoint (should work)
try {
    $bookingsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✅ Bookings GET working - Found $($bookingsResponse.count) bookings"
} catch {
    Write-Host "❌ Bookings GET failed: $($_.Exception.Message)"
}

# Test with minimal POST data
Write-Host "Testing minimal POST data..."
$minimalData = @{
    roomId = "3e7adbfe-0526-44d7-9b4b-be7486bfbd52"
    guestName = "Test"
    guestEmail = "test@test.com"
    guestPhone = "1234567890"
    checkIn = "2025-12-30"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $minimalData
    Write-Host "✅ Minimal POST worked"
} catch {
    Write-Host "❌ Minimal POST failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body: $errorBody"
    }
}