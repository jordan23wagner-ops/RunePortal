# ============================================================
# OpsCalé Digital - Passive Income Stack Setup
# Jordon Wagner | June 2026
# Run as Administrator in PowerShell
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "  -> $Text" -ForegroundColor Yellow
}

function Write-Done {
    param([string]$Text)
    Write-Host "  [DONE] $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor Magenta
}

function Prompt-Credential {
    param([string]$Label, [string]$Hint = "")
    if ($Hint) { Write-Host "    ($Hint)" -ForegroundColor DarkGray }
    $val = Read-Host "    Enter $Label"
    return $val.Trim()
}

Clear-Host
Write-Host ""
Write-Host "  OpsCalé Digital - Passive Income Stack" -ForegroundColor Cyan
Write-Host "  Automated Setup v1.0 | 2026" -ForegroundColor Cyan
Write-Host ""
Write-Warn "Run this script as Administrator for best results."
Write-Host ""
Read-Host "  Press Enter to begin..."

# ============================================================
# STEP 1 - PREREQUISITES
# ============================================================
Write-Header "STEP 1 - Installing Prerequisites"

# Check winget
Write-Step "Checking winget..."
try {
    winget --version | Out-Null
    Write-Done "winget available"
} catch {
    Write-Host "  [ERROR] winget not found. Install App Installer from the Microsoft Store first." -ForegroundColor Red
    exit 1
}

# Install Git
Write-Step "Checking Git..."
$gitInstalled = $false
try {
    git --version | Out-Null
    Write-Done "Git already installed"
    $gitInstalled = $true
} catch {
    $gitInstalled = $false
}
if (-not $gitInstalled) {
    Write-Step "Installing Git..."
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $env:PATH += ";C:\Program Files\Git\cmd"
    Write-Done "Git installed"
}

# Install Node.js
Write-Step "Checking Node.js..."
$nodeInstalled = $false
try {
    node --version | Out-Null
    Write-Done "Node.js already installed"
    $nodeInstalled = $true
} catch {
    $nodeInstalled = $false
}
if (-not $nodeInstalled) {
    Write-Step "Installing Node.js LTS..."
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    Write-Done "Node.js installed"
    Write-Warn "Restart PowerShell after this script if npm commands fail."
}

# Check Docker
Write-Step "Checking Docker Desktop..."
$dockerInstalled = $false
try {
    docker --version | Out-Null
    Write-Done "Docker already installed"
    $dockerInstalled = $true
} catch {
    $dockerInstalled = $false
}
if (-not $dockerInstalled) {
    Write-Step "Installing Docker Desktop..."
    winget install --id Docker.DockerDesktop -e --source winget --accept-package-agreements --accept-source-agreements
    Write-Done "Docker Desktop installed"
    Write-Warn "Docker requires a restart. Rerun this script after restarting."
    Write-Warn "Also enable: Docker Desktop -> Settings -> General -> Start Docker Desktop when you log in"
    Read-Host "  Press Enter to continue (or Ctrl+C to restart now)..."
}

# ============================================================
# STEP 2 - CLONE PASSIVEMACHINE
# ============================================================
Write-Header "STEP 2 - Setting Up passiveMachine"

$installPath = Join-Path $env:USERPROFILE "OneDrive\Desktop\passiveMachine"

if (Test-Path $installPath) {
    Write-Done "passiveMachine already exists at $installPath"
} else {
    Write-Step "Cloning passiveMachine to Desktop..."
    git clone https://github.com/Xpl0itU/passiveMachine.git $installPath
    Write-Done "Cloned to $installPath"
}

Set-Location $installPath

# ============================================================
# STEP 3 - BUILD .ENV FILE
# ============================================================
Write-Header "STEP 3 - Configure Your Credentials"

Write-Host ""
Write-Host "  Opening all signup pages in your browser now..." -ForegroundColor White
Write-Host ""

$signupUrls = @(
    "https://r.honeygain.me",
    "https://earnapp.com/signup",
    "https://pawns.app",
    "https://packetstream.io",
    "https://peer2profit.com",
    "https://app.grass.io",
    "https://repocket.co"
)

foreach ($url in $signupUrls) {
    Start-Process $url
    Start-Sleep -Milliseconds 500
}

Write-Warn "All signup pages opened. Create accounts, then come back here."
Write-Host ""
Read-Host "  Press Enter when all accounts are ready..."

Write-Host ""
Write-Host "  Enter credentials for each app. Press Enter to skip any app." -ForegroundColor White
Write-Host ""

Write-Host "  [ HoneyGain ]" -ForegroundColor Cyan
$honeygainEmail    = Prompt-Credential "HoneyGain Email"
$honeygainPassword = Prompt-Credential "HoneyGain Password"

Write-Host ""
Write-Host "  [ EarnApp ]" -ForegroundColor Cyan
$earnappUuid = Prompt-Credential "EarnApp SDK UUID" "Found in EarnApp dashboard after signup"

Write-Host ""
Write-Host "  [ PawnsApp ]" -ForegroundColor Cyan
$pawnsEmail    = Prompt-Credential "PawnsApp Email"
$pawnsPassword = Prompt-Credential "PawnsApp Password"

Write-Host ""
Write-Host "  [ PacketStream ]" -ForegroundColor Cyan
$packetstreamCid = Prompt-Credential "PacketStream CID" "Found in PacketStream dashboard"

Write-Host ""
Write-Host "  [ Peer2Profit ]" -ForegroundColor Cyan
$p2pEmail = Prompt-Credential "Peer2Profit Email"

Write-Host ""
Write-Host "  [ Grass ]" -ForegroundColor Cyan
$grassUser = Prompt-Credential "Grass Email"
$grassPass = Prompt-Credential "Grass Password"

Write-Host ""
Write-Host "  [ Repocket ]" -ForegroundColor Cyan
$repocketApiKey = Prompt-Credential "Repocket API Key" "Found in Repocket dashboard under API"

# Write .env file
Write-Step "Writing .env file..."

$envPath = Join-Path $installPath ".env"
$lines = @(
    "# OpsCalé Digital - passiveMachine config",
    ("# Generated " + (Get-Date -Format "yyyy-MM-dd HH:mm")),
    "",
    "# HoneyGain",
    ("HONEYGAIN_EMAIL=" + $honeygainEmail),
    ("HONEYGAIN_PASSWORD=" + $honeygainPassword),
    "",
    "# EarnApp",
    ("EARNAPP_UUID=" + $earnappUuid),
    "",
    "# PawnsApp",
    ("PAWNS_EMAIL=" + $pawnsEmail),
    ("PAWNS_PASSWORD=" + $pawnsPassword),
    "",
    "# PacketStream",
    ("PACKETSTREAM_CID=" + $packetstreamCid),
    "",
    "# Peer2Profit",
    ("P2P_EMAIL=" + $p2pEmail),
    "",
    "# Grass",
    ("GRASS_USER=" + $grassUser),
    ("GRASS_PASS=" + $grassPass),
    "",
    "# Repocket",
    ("REPOCKET_API_KEY=" + $repocketApiKey)
)
$lines | Out-File -FilePath $envPath -Encoding UTF8 -Force
Write-Done ".env file written"

# ============================================================
# STEP 4 - LAUNCH DOCKER STACK
# ============================================================
Write-Header "STEP 4 - Launching passiveMachine"

Write-Step "Starting Docker containers..."
try {
    docker-compose up -d
    Write-Done "All containers launched"
    Write-Host ""
    Write-Step "Container status:"
    docker-compose ps
} catch {
    Write-Host "  [ERROR] Docker error: $_" -ForegroundColor Red
    Write-Warn "Make sure Docker Desktop is running and WSL2 is enabled."
}

# ============================================================
# STEP 5 - INSTALL MCPC
# ============================================================
Write-Header "STEP 5 - Installing mcpc (MCP CLI Tool)"

Write-Step "Installing mcpc globally via npm..."
try {
    npm install -g @apify/mcpc
    Write-Done "mcpc installed"
} catch {
    Write-Warn "npm install failed. Try restarting PowerShell and running: npm install -g @apify/mcpc"
}

# ============================================================
# STEP 6 - OPEN SUBMISSION FORMS
# ============================================================
Write-Header "STEP 6 - Opening MCP Directory Submission Forms"

Write-Host ""
Write-Host "  Use this info for all submission forms:" -ForegroundColor White
Write-Host ""
Write-Host "  Name:        FlagCheck Job Analyzer" -ForegroundColor Yellow
Write-Host "  Description: Analyzes job descriptions for red flags," -ForegroundColor Yellow
Write-Host "               ATS compatibility, and salary benchmarks." -ForegroundColor Yellow
Write-Host "  Endpoint:    https://y-delta-lake.vercel.app/api/analyze" -ForegroundColor Yellow
Write-Host "  Price:       0.01 USDC per call" -ForegroundColor Yellow
Write-Host ""
Read-Host "  Press Enter to open all submission tabs..."

$submissionUrls = @(
    "https://smithery.ai/submit",
    "https://glama.ai/mcp/servers/submit",
    "https://mcp.so/submit",
    "https://github.com/punkpeye/awesome-mcp-servers",
    "https://agents.circle.com"
)

foreach ($url in $submissionUrls) {
    Start-Process $url
    Start-Sleep -Milliseconds 500
}

Write-Done "All submission tabs opened in browser"

# ============================================================
# SUMMARY
# ============================================================
Write-Header "SETUP COMPLETE - Summary"

Write-Host ""
Write-Host "  AUTOMATED (done):" -ForegroundColor Green
Write-Done "Prerequisites installed (Git, Node.js, Docker)"
Write-Done "passiveMachine cloned and configured"
Write-Done "Docker containers launched"
Write-Done "mcpc installed"
Write-Done "Submission forms opened"
Write-Host ""
Write-Host "  MANUAL (do these next):" -ForegroundColor Yellow
Write-Warn "Complete MCP directory forms in open browser tabs"
Write-Warn "Submit Circle Agent Marketplace form"
Write-Warn "Set up Pionex account + Grid Bot + DCA Bot"
Write-Warn "Set up Coinbase Wallet on Base network"
Write-Warn "Supply USDC to Aave once you have balance"
Write-Host ""
Write-Host "  MONITOR COMMANDS:" -ForegroundColor Cyan
Write-Host "  docker-compose ps         - check container health" -ForegroundColor White
Write-Host "  docker-compose logs -f    - view live logs" -ForegroundColor White
Write-Host "  docker-compose down       - stop all containers" -ForegroundColor White
Write-Host "  docker-compose restart    - restart all containers" -ForegroundColor White
Write-Host ""
Write-Host "  Stack is live. Go play OSRS." -ForegroundColor Cyan
Write-Host ""
