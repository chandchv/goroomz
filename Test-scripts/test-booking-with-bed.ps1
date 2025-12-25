# Test booking with bed ID
Write-Host "Testing booking with bed ID..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Use room 302
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room302 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "302" }

# Get beds for room 302
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room302.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
$availableBed = $bedsResponse.data | Where-Object { $_.status -eq "vacant" } | Select-Object -First 1

if (-not $availableBed) {
    Write-Host "❌ No available beds in room 302"
    exit 1
}

Write-Host "Using bed $($availableBed.bedNumber) (ID: $($availableBed.id))"

# Create booking with bed
$futureDate1 = (Get-Date).AddDays(20).ToString("yyyy-MM-dd")
$futureDate2 = (Get-Date).AddDays(21).ToString("yyyy-MM-dd")

$bookingWithBed = @{
    roomId = $room302.id
    bedId = $availableBed.id
    guestName = "Bed Test"
    guestEmail = "bedtest@test.com"
    guestPhone = "8888888888"
    checkIn = $futureDate1
    checkOut = $futureDate2
    guests = 1
    totalAmount = 1000
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingWithBed
    Write-Host "✅ Booking with bed successful!"
    Write-Host "Booking ID: $($response.data.id)"
    Write-Host "Status: $($response.data.status)"
    
    # Check if bed status was updated
    Write-Host "Checking bed status after booking..."
    $bedsAfter = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room302.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
    $bookedBed = $bedsAfter.data | Where-Object { $_.id -eq $availableBed.id }
    Write-Host "Bed status after booking: $($bookedBed.status)"
    Write-Host "Bed booking ID: $($bookedBed.bookingId)"
    
} catch {
    Write-Host "❌ Booking with bed failed: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body: '$errorBody'"
    }
}