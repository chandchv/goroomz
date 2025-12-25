# Database Migration Instructions

## Run the migration to add missing columns to rooms table

Your backend server is now configured with a migration endpoint. Follow these steps:

### Step 1: Make sure your backend server is running
The server should be running on `http://localhost:5000`

### Step 2: Login as superuser to get auth token

Open your browser or Postman and login:
- URL: `http://localhost:5000/api/internal/auth/login`
- Method: POST
- Body (JSON):
```json
{
  "email": "your-superuser-email@example.com",
  "password": "your-password"
}
```

Copy the `token` from the response.

### Step 3: Run the migration

Use the token from step 2:

**Using curl (PowerShell):**
```powershell
$token = "YOUR_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/internal/migrate/add-columns" -Method Post -Headers $headers
```

**Using curl (CMD):**
```cmd
curl -X POST http://localhost:5000/api/internal/migrate/add-columns -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json"
```

**Or use Postman:**
- URL: `http://localhost:5000/api/internal/migrate/add-columns`
- Method: POST
- Headers:
  - Authorization: `Bearer YOUR_TOKEN_HERE`
  - Content-Type: `application/json`

### Step 4: Verify

The response will show:
- List of columns added
- Total columns in rooms table
- Names of new internal management columns

### Step 5: Restart your backend server

After the migration completes successfully, restart your backend server to ensure all changes are loaded.

## What this migration does

Adds the following columns to the `rooms` table:
- `custom_category_id` - Link to custom room categories
- `floor_number` - Floor location
- `room_number` - Room identifier
- `sharing_type` - Type of room sharing (single, 2_sharing, etc.)
- `total_beds` - Number of beds
- `current_status` - Occupancy status (occupied, vacant_clean, vacant_dirty)
- `last_cleaned_at` - Last cleaning timestamp
- `last_maintenance_at` - Last maintenance timestamp

## Troubleshooting

If you get authentication errors:
1. Make sure you're using a superuser account
2. Check that the token hasn't expired
3. Verify the token is correctly copied (no extra spaces)

If you get "column already exists" errors:
- This is normal if you've run the migration before
- The migration will skip existing columns
