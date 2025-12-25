# Test booking creation with detailed error logging
$baseUrl = "http://localhost:5000/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
    exit 1
}

# Create headers with token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Simple booking data
$bookingData = @{
    roomId = "f62b9dcf-117c-4311-bdec-5691338ea616"
    guestName = "Debug Test"
    guestEmail = "debug@test.com"
    guestPhone = "9999999999"
    checkIn = "2026-01-04"
    checkOut = "2026-01-05"
    guests = 1
    totalAmount = 1000
} | ConvertTo-Json

Write-Host "Booking data:"
Write-Host $bookingData

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/internal/bookings" -Method POST -Body $bookingData -Headers $headers
    Write-Host "✅ Booking created successfully"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Booking failed: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error body: '$responseBody'"
    }
}