#!/usr/bin/env pwsh

Write-Host "Testing Booking Endpoint..." -ForegroundColor Green

$apiUrl = "http://localhost:5000/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful: $($loginResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test getting bookings
Write-Host "`nTesting GET /api/internal/bookings..." -ForegroundColor Yellow
try {
    $bookingsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/bookings?page=1&limit=20" -Method GET -Headers $headers
    Write-Host "✅ Bookings retrieved successfully" -ForegroundColor Green
    Write-Host "   Total bookings: $($bookingsResponse.total)" -ForegroundColor Cyan
    Write-Host "   Current page: $($bookingsResponse.page)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Get bookings failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Try to get more details about the error
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $responseBody" -ForegroundColor Red
    }
}

# Test creating a booking
Write-Host "`nTesting POST /api/internal/bookings..." -ForegroundColor Yellow

# First get a room ID
try {
    $roomsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/status" -Method GET -Headers $headers
    $doubleRooms = $roomsResponse.data | Where-Object { $_.sharingType -eq "double" }
    
    if ($doubleRooms.Count -gt 0) {
        $testRoom = $doubleRooms[0]
        Write-Host "   Using room: $($testRoom.roomNumber) (ID: $($testRoom.id))" -ForegroundColor Cyan
        
        # Get beds for this room
        $bedsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/$($testRoom.id)/beds" -Method GET -Headers $headers
        $vacantBeds = $bedsResponse.data | Where-Object { $_.status -eq "vacant" }
        
        if ($vacantBeds.Count -gt 0) {
            $testBed = $vacantBeds[0]
            Write-Host "   Using bed: $($testBed.bedNumber) (ID: $($testBed.id))" -ForegroundColor Cyan
            
            # Create test booking
            $bookingData = @{
                roomId = $testRoom.id
                bedId = $testBed.id
                guestName = "Test Guest"
                guestEmail = "test@example.com"
                guestPhone = "+91 9876543210"
                checkIn = (Get-Date).ToString("yyyy-MM-dd")
                checkOut = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
                guests = 1
                totalAmount = 1500
                paymentStatus = "pending"
            } | ConvertTo-Json
            
            $createResponse = Invoke-RestMethod -Uri "$apiUrl/internal/bookings" -Method POST -Body $bookingData -Headers $headers
            Write-Host "✅ Booking created successfully" -ForegroundColor Green
            Write-Host "   Booking ID: $($createResponse.data.id)" -ForegroundColor Cyan
        } else {
            Write-Host "   ⚠️ No vacant beds available for testing" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️ No double rooms available for testing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Create booking failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Booking endpoint test complete!" -ForegroundColor Green