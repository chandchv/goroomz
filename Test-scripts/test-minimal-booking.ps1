# Test minimal booking creation
Write-Host "Testing minimal booking creation..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Use room 302 (which should be available)
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room302 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "302" }

Write-Host "Using room 302: $($room302.id)"

# Create minimal booking data with future dates to avoid conflicts
$futureDate1 = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
$futureDate2 = (Get-Date).AddDays(16).ToString("yyyy-MM-dd")

$minimalBooking = @{
    roomId = $room302.id
    guestName = "Minimal Test"
    guestEmail = "minimal@test.com"
    guestPhone = "9999999999"
    checkIn = $futureDate1
    checkOut = $futureDate2
    guests = 1
    totalAmount = 1000
} | ConvertTo-Json

Write-Host "Booking data:"
Write-Host $minimalBooking

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $minimalBooking
    Write-Host "✅ Minimal booking successful!"
    Write-Host "Booking ID: $($response.data.id)"
    Write-Host "Status: $($response.data.status)"
} catch {
    Write-Host "❌ Minimal booking failed: $($_.Exception.Message)"
    
    # Get detailed error
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error body: '$errorBody'"
            
            # Try to parse as JSON
            if ($errorBody) {
                try {
                    $errorJson = $errorBody | ConvertFrom-Json
                    Write-Host "Error message: $($errorJson.message)"
                    if ($errorJson.error) {
                        Write-Host "Error details: $($errorJson.error)"
                    }
                } catch {
                    Write-Host "Could not parse error as JSON"
                }
            }
        } catch {
            Write-Host "Could not read error stream"
        }
    }
}