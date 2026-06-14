# token_tracker.ps1 — Real-time Groq TPM Monitor (Header-Based)
# Reads from Groq response headers logged by llm_router.py

param(
    [string]$LogDir = "$env:USERPROFILE\runeportal_dev\logs",
    [int]$RefreshSeconds = 10
)

# Session state
$sessionStart = Get-Date
$dailyRequestCount = 0
$dailyTokenCount = 0
$sessionTokenCount = 0
$lastRequestTime = $null

# Free tier limits (verify at console.groq.com/settings/limits)
$limits = @{
    RPM = 30
    TPM = 6000
    RPD = 1000
}

Write-Host "📊 Token Tracker Started (reads from llm_router.py logs)" -ForegroundColor Cyan
Write-Host "Log directory: $LogDir`n" -ForegroundColor Gray

function Parse-GroqHeaders {
    param([string]$logFile)
    
    if (-not (Test-Path $logFile)) { return $null }
    
    $lastLine = Get-Content $logFile -Tail 1 -ErrorAction SilentlyContinue
    if (-not $lastLine) { return $null }
    
    try {
        $json = $lastLine | ConvertFrom-Json
        return @{
            remaining_tokens = [int]$json.headers.'x-ratelimit-remaining-tokens'
            remaining_requests = [int]$json.headers.'x-ratelimit-remaining-requests'
            tokens_used = [int]$json.headers.'x-ratelimit-limit-tokens' - [int]$json.headers.'x-ratelimit-remaining-tokens'
            timestamp = [datetime]$json.timestamp
        }
    } catch {
        return $null
    }
}

while ($true) {
    try {
        # Find most recent groq_headers.log
        $headerLog = Get-ChildItem "$LogDir\*groq*" -Filter "*header*" -File | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 1 -ExpandProperty FullName
        
        if (-not $headerLog) {
            Write-Host "⏳ Waiting for first API call..." -ForegroundColor Yellow
            Start-Sleep -Seconds $RefreshSeconds
            continue
        }
        
        $stats = Parse-GroqHeaders $headerLog
        if (-not $stats) {
            Start-Sleep -Seconds $RefreshSeconds
            continue
        }
        
        # Calculate state
        $remainingTPM = $stats.remaining_tokens
        $remainingRPM = $stats.remaining_requests
        $percentTPMUsed = [math]::Max(0, [math]::Round((($limits.TPM - $remainingTPM) / $limits.TPM) * 100, 1))
        $percentRPMUsed = [math]::Round((($limits.RPM - $remainingRPM) / $limits.RPM) * 100, 1)
        
        # Estimate daily burn (rough)
        $sessionElapsed = ((Get-Date) - $sessionStart).TotalMinutes
        if ($sessionElapsed -gt 0.5) {
            $estimatedDailyBurn = [math]::Round(($dailyRequestCount / $sessionElapsed) * 1440)
        } else {
            $estimatedDailyBurn = 0
        }
        
        # Display
        Clear-Host
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  GROQ RATE LIMIT DASHBOARD" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        # TPM bar
        $barLength = 30
        $tpmFilled = [math]::Round(($percentTPMUsed / 100) * $barLength)
        $tpmBar = "█" * $tpmFilled + "░" * ($barLength - $tpmFilled)
        Write-Host "  TPM (Tokens/Min):   $($limits.TPM - $remainingTPM) / $($limits.TPM)" -ForegroundColor Yellow
        Write-Host "  [$tpmBar] $percentTPMUsed%" -ForegroundColor $(if ($percentTPMUsed -gt 80) { "Red" } else { "Green" })
        Write-Host ""
        
        # RPM bar
        $rpmFilled = [math]::Round(($percentRPMUsed / 100) * $barLength)
        $rpmBar = "█" * $rpmFilled + "░" * ($barLength - $rpmFilled)
        Write-Host "  RPM (Requests/Min): $($limits.RPM - $remainingRPM) / $($limits.RPM)" -ForegroundColor Yellow
        Write-Host "  [$rpmBar] $percentRPMUsed%" -ForegroundColor $(if ($percentRPMUsed -gt 80) { "Red" } else { "Green" })
        Write-Host ""
        
        Write-Host "  Session Duration:   $([int]$sessionElapsed)m" -ForegroundColor Gray
        Write-Host "  Est. Daily Burn:    ~$estimatedDailyBurn RPD" -ForegroundColor Gray
        Write-Host "  Last Update:        $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
        
    } catch {
        Write-Host "⚠️  Error: $_" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds $RefreshSeconds
}
