# token_tracker.ps1 — Real-time Groq TPM Monitor
# STARTER CODE (paste into next session, full 190K budget)

param(
    [string]$GroqApiKey = $env:GROQ_API_KEY,
    [int]$RefreshSeconds = 15
)

if (-not $GroqApiKey) {
    Write-Host "❌ GROQ_API_KEY not set. Set it: `$env:GROQ_API_KEY = 'your-key'" -ForegroundColor Red
    exit
}

$baseUrl = "https://api.groq.com/usage"  # Groq usage endpoint (verify actual URL)
$sessionStart = Get-Date
$lastUsage = 0

Write-Host "📊 Token Tracker Started (refresh every ${RefreshSeconds}s)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

while ($true) {
    try {
        # Fetch current usage from Groq
        $response = Invoke-WebRequest -Uri $baseUrl `
            -Headers @{"Authorization" = "Bearer $GroqApiKey"} `
            -Method GET -ErrorAction Stop
        
        $data = $response.Content | ConvertFrom-Json
        $currentUsage = $data.usage.tokens_used  # Adjust property path per actual API
        $limit = 6000  # Free tier limit
        $percentUsed = [math]::Round(($currentUsage / $limit) * 100, 1)
        $remaining = $limit - $currentUsage
        
        # Display dashboard
        Clear-Host
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  GROQ TOKEN USAGE — Session Dashboard" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Current Usage:  $currentUsage / $limit TPM" -ForegroundColor Yellow
        Write-Host "  Remaining:      $remaining TPM" -ForegroundColor Green
        Write-Host "  Percent Used:   $percentUsed%" -ForegroundColor White
        Write-Host ""
        
        # Visual bar
        $barLength = 30
        $filled = [math]::Round(($percentUsed / 100) * $barLength)
        $empty = $barLength - $filled
        $bar = "█" * $filled + "░" * $empty
        Write-Host "  Progress: [$bar]" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Session Time: $((Get-Date) - $sessionStart)" -ForegroundColor Gray
        Write-Host "  Last Update: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        
    } catch {
        Write-Host "⚠️  Error fetching usage: $_" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds $RefreshSeconds
}
