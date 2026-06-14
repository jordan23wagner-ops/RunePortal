"""
job_agent/setup.py
==================
One-time setup script. Run this first.
"""
import subprocess
import sys
import os

print("="*60)
print("  JOB AGENT SETUP")
print("="*60)

# ── Install dependencies ──────────────────────────────────────────────────────
packages = [
    "python-jobspy",
    "anthropic",
    "playwright",
    "pyyaml",
    "pandas",
]

print("\n[1/3] Installing Python packages...")
for pkg in packages:
    print(f"  → {pkg}")
    subprocess.run([sys.executable, "-m", "pip", "install", pkg, "-q"], check=True)

# ── Install Playwright browsers ───────────────────────────────────────────────
print("\n[2/3] Installing Playwright Chromium browser...")
subprocess.run(["playwright", "install", "chromium"], check=True)

# ── Check for API key ─────────────────────────────────────────────────────────
print("\n[3/3] Checking environment...")
api_key = os.getenv("ANTHROPIC_API_KEY")
if api_key:
    print("  ✓ ANTHROPIC_API_KEY is set")
else:
    print("  ✗ ANTHROPIC_API_KEY not set!")
    print("  Set it with: export ANTHROPIC_API_KEY='your-key-here'")
    print("  Or add it to your .env file / system environment variables")

print("\n" + "="*60)
print("  SETUP COMPLETE")
print("="*60)
print("""
QUICKSTART:
  export ANTHROPIC_API_KEY='sk-ant-...'

  # Step 1: Discover and score new jobs (run daily)
  python scripts/discover.py --profile both

  # Step 2: Tailor resume for a specific job
  python scripts/tailor.py --profile jordon --url "https://company.com/job/123"
  python scripts/tailor.py --profile alicia --url "https://company.com/job/456"

  # Step 3: Auto-apply via career page (dry run first!)
  python scripts/apply.py --profile jordon --url "https://boards.greenhouse.io/..." --dry-run
  python scripts/apply.py --profile jordon --url "https://boards.greenhouse.io/..." # live

  # Step 4: Process batch of queued high-score jobs
  python scripts/apply.py --profile jordon --batch
  python scripts/apply.py --profile alicia --batch

WORKFLOW:
  discover.py  →  tailor.py  →  apply.py
  (find jobs)    (customize)    (submit)
""")
