# Test booking with existing user email
Write-Host "Testing booking with existing user email..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Use the same email as the logged-in user
$bookingData = @{
    roomId = "3e7adbfe-0526-44d7-9b4b-be7486bfbd52"
    guestName = "Amit Patel"
    guestEmail = "amit.patel@example.com"  # Same as logged-in user
    guestPhone = "9876543210"
    checkIn = "2025-12-30"
    checkOut = "2025-12-31"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingData
    Write-Host "✅ Booking with existing user worked!"
    Write-Host "Booking ID: $($response.data.id)"
} catch {
    Write-Host "❌ Booking with existing user failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body: $errorBody"
    }
}