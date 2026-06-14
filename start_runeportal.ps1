# RunePortal Dev Startup — syncs repo, runs studio + token tracker
$repoPath = "C:\Users\Jordon\OneDrive\Desktop"
$studioScript = "C:\Users\Jordon\runeportal_studio.py"
$trackerScript = "C:\Users\Jordon\token_tracker.ps1"

Set-Location $repoPath

Write-Host "Syncing repo from GitHub..." -ForegroundColor Cyan
git pull origin main 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Repo synced" -ForegroundColor Green
} else {
    Write-Host "Git pull failed — proceeding locally" -ForegroundColor Yellow
}

Write-Host "`nReading SESSION_STATE (CONTEXT.md)..." -ForegroundColor Cyan
if (Test-Path "CONTEXT.md") {
    Write-Host "CONTEXT loaded" -ForegroundColor Green
} else {
    Write-Host "CONTEXT.md not found" -ForegroundColor Yellow
}

# Start token tracker in separate window
Write-Host "`nStarting Token Tracker..." -ForegroundColor Cyan
$trackerJob = Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -File `"$trackerScript`"" -PassThru
Write-Host "Tracker running (PID: $($trackerJob.Id))" -ForegroundColor Green

Write-Host "`nStarting RunePortal Studio (v4.0)..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

python $studioScript

Write-Host "`n----------------------------------------" -ForegroundColor Gray

# Stop tracker when studio exits
Write-Host "`nStopping Token Tracker..." -ForegroundColor Cyan
Stop-Process -Id $trackerJob.Id -ErrorAction SilentlyContinue
Write-Host "Tracker stopped" -ForegroundColor Green

Write-Host "`nSyncing to GitHub..." -ForegroundColor Cyan
git add -A
$msg = "[$((Get-Date).ToString('yyyy-MM-dd HH:mm'))] Studio session end"
git commit -m $msg 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed" -ForegroundColor Green
    git push origin main 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "Pushed to GitHub" -ForegroundColor Green }
}

Write-Host "`nRepo synced. Session end." -ForegroundColor Green
