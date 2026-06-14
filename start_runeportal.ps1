# RunePortal Dev Startup — syncs repo, runs studio

$repoPath = "C:\Users\Jordon\OneDrive\Desktop"
$studioScript = "$repoPath\runeportal_studio.py"

Set-Location $repoPath

Write-Host "🔄 Syncing repo from GitHub..." -ForegroundColor Cyan
git pull origin main 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Repo synced" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git pull failed — proceeding locally" -ForegroundColor Yellow
}

Write-Host "`n📖 Reading SESSION_STATE (CONTEXT.md)..." -ForegroundColor Cyan
if (Test-Path "CONTEXT.md") {
    Write-Host "✅ CONTEXT loaded" -ForegroundColor Green
} else {
    Write-Host "⚠️  CONTEXT.md not found" -ForegroundColor Yellow
}

Write-Host "`n🤖 Starting RunePortal Studio (v4.0)..." -ForegroundColor Cyan
Write-Host "────────────────────────────────────────" -ForegroundColor Gray

python $studioScript

Write-Host "`n────────────────────────────────────────" -ForegroundColor Gray
Write-Host "💾 Syncing to GitHub..." -ForegroundColor Cyan
git add -A
$msg = "[$((Get-Date).ToString('yyyy-MM-dd HH:mm'))] Studio session end"
git commit -m $msg 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed" -ForegroundColor Green
    git push origin main 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "✅ Pushed to GitHub" -ForegroundColor Green }
}

Write-Host "`n✨ Repo synced. Session end." -ForegroundColor Green
