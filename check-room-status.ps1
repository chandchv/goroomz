# Check room status for booking
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

# Get booking details
$bookingId = "bef2fa8e-0d6e-437c-af80-1f6b1631ac95"

try {
    $bookings = Invoke-RestMethod -Uri "$baseUrl/internal/bookings" -Method GET -Headers $headers
    $booking = $bookings.data | Where-Object { $_.id -eq $bookingId }
    
    if ($booking) {
        Write-Host "Booking Details:"
        Write-Host "   ID: $($booking.id)"
        Write-Host "   Room: $($booking.room.roomNumber)"
        Write-Host "   Status: $($booking.status)"
        Write-Host "   Room Status: $($booking.room.currentStatus)"
        Write-Host "   Already Checked In: $($booking.actualCheckInTime -ne $null)"
        Write-Host "   Check-in Date: $($booking.checkIn)"
        Write-Host "   Check-out Date: $($booking.checkOut)"
    } else {
        Write-Host "Booking not found"
    }
} catch {
    Write-Host "Failed to get booking: $($_.Exception.Message)"
}