# Fix room status for testing
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

# Update room 302 status to vacant_clean
$roomId = "f62b9dcf-117c-4311-bdec-5691338ea616"  # Room 302
$updateData = @{
    currentStatus = "vacant_clean"
} | ConvertTo-Json

Write-Host "Updating room 302 status to vacant_clean..."

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/internal/rooms/$roomId" -Method PUT -Body $updateData -Headers $headers
    Write-Host "Room status updated successfully"
} catch {
    Write-Host "Failed to update room status: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error body: '$responseBody'"
    }
}