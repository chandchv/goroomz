#!/usr/bin/env pwsh

Write-Host "Fixing API paths in service files..." -ForegroundColor Green

# List of service files to fix
$serviceFiles = @(
    "internal-management/app/services/authService.ts",
    "internal-management/app/services/territoryService.ts",
    "internal-management/app/services/ticketService.ts",
    "internal-management/app/services/targetService.ts",
    "internal-management/app/services/superuserService.ts",
    "internal-management/app/services/subscriptionService.ts",
    "internal-management/app/services/roomService.ts",
    "internal-management/app/services/roleService.ts",
    "internal-management/app/services/reportService.ts",
    "internal-management/app/services/paymentService.ts",
    "internal-management/app/services/notificationService.ts",
    "internal-management/app/services/leadService.ts",
    "internal-management/app/services/maintenanceService.ts",
    "internal-management/app/services/housekeepingService.ts",
    "internal-management/app/services/internalUserService.ts",
    "internal-management/app/services/dashboardService.ts",
    "internal-management/app/services/depositService.ts",
    "internal-management/app/services/bookingService.ts",
    "internal-management/app/services/categoryService.ts",
    "internal-management/app/services/staffService.ts",
    "internal-management/app/services/auditService.ts",
    "internal-management/app/services/analyticsService.ts",
    "internal-management/app/services/announcementService.ts",
    "internal-management/app/services/commissionService.ts",
    "internal-management/app/services/configService.ts",
    "internal-management/app/services/documentService.ts",
    "internal-management/app/services/searchService.ts"
)

$fixedCount = 0

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        # Read the file content
        $content = Get-Content $file -Raw
        
        # Replace patterns like api.get('/internal/... with api.get('/api/internal/...
        $originalContent = $content
        $content = $content -replace "api\.(get|post|put|delete|patch)\((['""])/internal/", "api.`$1(`$2/api/internal/"
        
        # Check if any changes were made
        if ($content -ne $originalContent) {
            # Write the updated content back to the file
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "  ✅ Fixed API paths in $file" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  ⏭️ No changes needed in $file" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Fixed API paths in $fixedCount service files!" -ForegroundColor Green
Write-Host "All service files now use '/api/internal/...' paths for proper proxy routing." -ForegroundColor Cyan