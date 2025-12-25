# Restart Frontend Script
# This clears Vite cache and restarts the dev server

Write-Host "Clearing Vite cache..." -ForegroundColor Yellow

# Remove Vite cache
if (Test-Path "internal-management/node_modules/.vite") {
    Remove-Item -Recurse -Force "internal-management/node_modules/.vite"
    Write-Host "Vite cache cleared" -ForegroundColor Green
} else {
    Write-Host "No Vite cache found" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Instructions:" -ForegroundColor Cyan
Write-Host "1. Stop the current frontend dev server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Run: cd internal-management" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "This will start a fresh dev server without cached modules" -ForegroundColor Green
