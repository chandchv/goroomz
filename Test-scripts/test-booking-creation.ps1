# Test booking creation with the fix
Write-Host "Testing booking creation..."

# Step 1: Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'

if (-not $loginResponse.success) {
    Write-Host "Login failed: $($loginResponse.message)"
    exit 1
}

$token = $loginResponse.token
Write-Host "✅ Login successful"

# Step 2: Get room 307 details
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room307 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "307" }

if (-not $room307) {
    Write-Host "❌ Room 307 not found"
    exit 1
}

Write-Host "✅ Found room 307: $($room307.id)"

# Step 3: Get beds for room 307
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
$vacantBed = $bedsResponse.data | Where-Object { $_.status -eq "vacant" } | Select-Object -First 1

if (-not $vacantBed) {
    Write-Host "❌ No vacant beds in room 307"
    exit 1
}

Write-Host "✅ Found vacant bed: $($vacantBed.bedNumber) (ID: $($vacantBed.id))"

# Step 4: Create booking
$bookingData = @{
    roomId = $room307.id
    bedId = $vacantBed.id
    guestName = "Test Guest"
    guestEmail = "test@example.com"
    guestPhone = "+91 9876543210"
    checkIn = (Get-Date).ToString("yyyy-MM-dd")
    checkOut = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    guests = 1
    totalAmount = 1500
    paymentStatus = "pending"
} | ConvertTo-Json

Write-Host "Creating booking..."
try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingData
    Write-Host "✅ Booking created successfully!"
    Write-Host "   Booking ID: $($bookingResponse.data.id)"
    Write-Host "   Room: $($bookingResponse.data.room.roomNumber)"
    Write-Host "   Guest: $($bookingResponse.data.user.name)"
    Write-Host "   Status: $($bookingResponse.data.status)"
} catch {
    Write-Host "❌ Booking creation failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody"
    }
}