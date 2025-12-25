# Simple check-out test
$baseUrl = "http://localhost:5000/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login successful"
} catch {
    Write-Host "Login failed: $($_.Exception.Message)"
    exit 1
}

# Create headers with token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test check-out with booking ID
$bookingId = "bef2fa8e-0d6e-437c-af80-1f6b1631ac95"
$checkoutData = @{
    notes = "Test check-out"
} | ConvertTo-Json

Write-Host "Testing check-out for booking: $bookingId"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/internal/bookings/$bookingId/checkout" -Method POST -Body $checkoutData -Headers $headers
    Write-Host "Check-out successful"
    Write-Host "Booking Status: $($response.data.status)"
    Write-Host "Room Status: $($response.data.room.currentStatus)"
    Write-Host "Check-out Time: $($response.data.actualCheckOutTime)"
    Write-Host "Checked Out By: $($response.data.checkedOutByUser.name)"
} catch {
    Write-Host "Check-out failed: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error body: '$responseBody'"
    }
}