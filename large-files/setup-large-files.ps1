# Setup Large Files Script
# This script copies large files from the large-files directory to their proper locations

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LifeOS Large Files Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Function to copy files with progress
function Copy-WithProgress {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Description
    )
    
    Write-Host "📁 $Description" -ForegroundColor Yellow
    
    if (Test-Path $Source) {
        $files = Get-ChildItem -Path $Source -File
        $fileCount = $files.Count
        
        if ($fileCount -eq 0) {
            Write-Host "   ⚠️  No files found in $Source" -ForegroundColor Red
            return $false
        }
        
        Write-Host "   Found $fileCount files" -ForegroundColor Gray
        
        # Create destination directory if it doesn't exist
        $destDir = Split-Path -Parent $Destination
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Copy files
        Copy-Item -Path $Source -Destination $Destination -Force -ErrorAction Stop
        Write-Host "   ✅ Copied successfully!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "   ⚠️  Source not found: $Source" -ForegroundColor Red
        return $false
    }
}

# 1. Copy Quran Audio Files
Write-Host ""
Write-Host "1️⃣  Copying Quran Audio Files..." -ForegroundColor Cyan
$audioSource = Join-Path $scriptDir "audio\quran\dhivehi\*.mp3"
$audioDest = Join-Path $projectRoot "public\audio\quran\dhivehi\"
$audioSuccess = Copy-WithProgress -Source $audioSource -Destination $audioDest -Description "Quran MP3 files (114 Surahs)"

# 2. Copy Islamic Data Files
Write-Host ""
Write-Host "2️⃣  Copying Islamic Data Files..." -ForegroundColor Cyan

$dataFiles = @(
    @{
        Name = "prayer_times.json"
        Description = "Prayer times for Maldivian islands"
    },
    @{
        Name = "islands.json"
        Description = "Maldivian islands data"
    },
    @{
        Name = "atolls.json"
        Description = "Maldivian atolls data"
    }
)

$dataSuccess = $true
foreach ($file in $dataFiles) {
    $dataSource = Join-Path $scriptDir "data\islamic\$($file.Name)"
    $dataDest = Join-Path $projectRoot "data\islamic\$($file.Name)"
    
    if (Test-Path $dataSource) {
        Copy-Item -Path $dataSource -Destination $dataDest -Force
        Write-Host "   ✅ $($file.Description)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $($file.Name) not found" -ForegroundColor Red
        $dataSuccess = $false
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($audioSuccess) {
    Write-Host "✅ Quran audio files copied" -ForegroundColor Green
} else {
    Write-Host "⚠️  Quran audio files not copied (files may not be in large-files directory)" -ForegroundColor Yellow
}

if ($dataSuccess) {
    Write-Host "✅ Islamic data files copied" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some Islamic data files not copied" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Note: If files are missing, place them in the large-files directory first:" -ForegroundColor Cyan
Write-Host "   - Audio: large-files/audio/quran/dhivehi/" -ForegroundColor Gray
Write-Host "   - Data:  large-files/data/islamic/" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

