# PowerShell Script to Copy Files to Ubuntu Server (Excluding Unnecessary Files)
# Usage: .\copy-to-server.ps1

$LOCAL_PATH = "C:\Coding\goroomz\goroomz"
$SERVER_USER = "ubuntu"
$SERVER_IP = "13.202.196.225"
$SERVER_PATH = "home/ubuntu/goroomz1"
$SSH_KEY = "C:\Coding\AWS-Project-Rx\goroomz\GoRoomz-ap-south-1.ppk"

Write-Host "🚀 Copying GoRoomz to Ubuntu Server..." -ForegroundColor Green
Write-Host ""

# Exclude patterns
$EXCLUDE_PATTERNS = @(
    "node_modules",
    ".env*",
    "dist",
    ".git",
    "*.log",
    ".vscode",
    ".idea",
    "*.csv",
    "*.json",
    "uploads",
    ".DS_Store",
    "Thumbs.db",
    "*.tmp",
    "*.bak"
)

Write-Host "📋 Excluding:" -ForegroundColor Yellow
foreach ($pattern in $EXCLUDE_PATTERNS) {
    Write-Host "  - $pattern" -ForegroundColor Gray
}
Write-Host ""

# Check if WinSCP is available (alternative method)
if (Get-Command winscp -ErrorAction SilentlyContinue) {
    Write-Host "Using WinSCP..." -ForegroundColor Cyan
    # WinSCP command would go here
} else {
    Write-Host "⚠️  SCP with exclude patterns requires rsync or manual file selection" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommended methods:" -ForegroundColor Cyan
    Write-Host '1. Use Git (if repository is set up):' -ForegroundColor White
    Write-Host ('   ssh -i "' + $SSH_KEY + '" ' + $SERVER_USER + '@' + $SERVER_IP + ' "cd ' + $SERVER_PATH + ' ; git pull"') -ForegroundColor Gray
    Write-Host ""
    Write-Host '2. Use WinSCP or FileZilla (Graphical Interface):' -ForegroundColor White
    Write-Host "   - Connect via SFTP" -ForegroundColor Gray
    Write-Host "   - Navigate to $SERVER_PATH" -ForegroundColor Gray
    Write-Host "   - Upload files manually (excluding patterns above)" -ForegroundColor Gray
    Write-Host ""
    Write-Host '3. Use rsync (if available on Windows via WSL or Git Bash):' -ForegroundColor White
    Write-Host "   See EXCLUDE_FILES.md for rsync command" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Manual copy with selective exclusion:" -ForegroundColor White
    Write-Host "   Copy files one by one, skipping the excluded patterns" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ After copying, run these commands on the server:" -ForegroundColor Green
Write-Host "   cd $SERVER_PATH" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm install --production" -ForegroundColor Gray
Write-Host "   cd .." -ForegroundColor Gray
Write-Host "   cp backend/env.example backend/.env" -ForegroundColor Gray
Write-Host "   cp env.production.example .env.production" -ForegroundColor Gray
Write-Host "   # Edit .env files with production values" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray

