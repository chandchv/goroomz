# PowerShell script to add text-gray-900 to all form inputs missing it

Write-Host "Fixing input text colors across the app..." -ForegroundColor Green

$filesFixed = 0
$inputsFixed = 0

# Get all TSX files
$files = Get-ChildItem -Path "./app" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern 1: Add text-gray-900 to inputs with px-3 py-2 border that don't have it
    $pattern1 = 'className="([^"]*px-3 py-2 border[^"]*)"'
    $matches = [regex]::Matches($content, $pattern1)
    
    foreach ($match in $matches) {
        $fullMatch = $match.Value
        $classContent = $match.Groups[1].Value
        
        # Only add if text-gray-900 is not already present and it's not a white text element
        if ($classContent -notmatch 'text-gray-900' -and $classContent -notmatch 'text-white') {
            $newClass = $classContent + ' text-gray-900'
            $newFullMatch = 'className="' + $newClass + '"'
            $content = $content.Replace($fullMatch, $newFullMatch)
            $inputsFixed++
        }
    }
    
    # Pattern 2: Add text-gray-900 to className with template literals
    $pattern2 = 'className=\{`([^`]*px-3 py-2 border[^`]*)`\}'
    $matches2 = [regex]::Matches($content, $pattern2)
    
    foreach ($match in $matches2) {
        $fullMatch = $match.Value
        $classContent = $match.Groups[1].Value
        
        if ($classContent -notmatch 'text-gray-900' -and $classContent -notmatch 'text-white') {
            $newClass = $classContent + ' text-gray-900'
            $newFullMatch = 'className={`' + $newClass + '`}'
            $content = $content.Replace($fullMatch, $newFullMatch)
            $inputsFixed++
        }
    }
    
    # Save if changes were made
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesFixed++
        Write-Host "  Fixed: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "`nComplete!" -ForegroundColor Green
Write-Host "Files fixed: $filesFixed" -ForegroundColor Cyan
Write-Host "Inputs fixed: $inputsFixed" -ForegroundColor Cyan
