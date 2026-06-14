"""
job_agent/scripts/apply.py
===========================
TIER 2: Playwright ATS Auto-Filler

Navigates directly to employer career page job postings.
Claude reads the form structure, maps fields to your profile YAML,
fills and submits — flagging ambiguous fields for human review.

Supported ATS: Workday, Greenhouse, Lever, iCIMS, Taleo, BambooHR, generic forms.

Usage:
    python apply.py --profile jordon --url "https://company.wd1.myworkdayjobs.com/..."
    python apply.py --profile alicia --url "https://boards.greenhouse.io/company/jobs/123"
    python apply.py --profile jordon --batch  # pulls pending jobs from DB
"""

import argparse
import asyncio
import json
import os
import re
import sqlite3
import time
import random
from datetime import datetime
from pathlib import Path

import yaml

try:
    from playwright.async_api import async_playwright, Page
except ImportError:
    print("Missing: pip install playwright && playwright install chromium")
    exit(1)

try:
    import anthropic
except ImportError:
    print("Missing: pip install anthropic")
    exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
PROFILE_DIR = BASE_DIR / "profiles"
DB_PATH     = BASE_DIR / "logs" / "applications.db"
LOG_DIR     = BASE_DIR / "logs"

# ── Human-like delays ─────────────────────────────────────────────────────────
async def human_delay(min_ms: int = 800, max_ms: int = 2200):
    """Randomized delay to avoid bot detection."""
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


async def human_type(page: Page, selector: str, text: str):
    """Types text with randomized keystroke delays like a human."""
    await page.click(selector)
    await human_delay(200, 500)
    for char in text:
        await page.keyboard.type(char)
        await asyncio.sleep(random.uniform(0.04, 0.12))


# ── Profile Loader ─────────────────────────────────────────────────────────────
def load_profile(name: str) -> dict:
    path = PROFILE_DIR / f"{name}.yaml"
    with open(path) as f:
        return yaml.safe_load(f)


# ── ATS Detector ──────────────────────────────────────────────────────────────
def detect_ats(url: str) -> str:
    """Identifies ATS platform from URL patterns."""
    url_lower = url.lower()
    if "myworkdayjobs.com" in url_lower or "wd1.myworkday" in url_lower:
        return "workday"
    elif "greenhouse.io" in url_lower:
        return "greenhouse"
    elif "lever.co" in url_lower:
        return "lever"
    elif "icims.com" in url_lower:
        return "icims"
    elif "taleo.net" in url_lower or "taleo" in url_lower:
        return "taleo"
    elif "bamboohr.com" in url_lower:
        return "bamboohr"
    elif "ashbyhq.com" in url_lower:
        return "ashby"
    elif "smartrecruiters.com" in url_lower:
        return "smartrecruiters"
    else:
        return "generic"


# ── Claude Form Analyzer ───────────────────────────────────────────────────────
async def analyze_form_with_claude(
    client: anthropic.Anthropic,
    page: Page,
    profile: dict,
    ats_type: str
) -> dict:
    """
    Extracts the visible form HTML, sends to Claude with the profile.
    Claude returns a field-fill mapping as JSON.
    """
    # Get form HTML (first 8000 chars to stay within context)
    form_html = await page.evaluate("""
        () => {
            const form = document.querySelector('form') ||
                         document.querySelector('[data-automation-id="applicationForm"]') ||
                         document.querySelector('.application-form') ||
                         document.body;
            return form ? form.innerHTML.substring(0, 8000) : document.body.innerHTML.substring(0, 8000);
        }
    """)

    defaults  = profile["form_defaults"]
    personal  = profile["personal"]
    certs     = [c["name"] for c in profile.get("certifications", [])]
    skills    = []
    for skill_group in profile.get("skills", {}).values():
        skills.extend(skill_group[:3])

    prompt = f"""You are an expert ATS form-fill assistant. Analyze this job application form HTML
and return a JSON mapping of how to fill each field using the candidate's profile.

ATS TYPE: {ats_type}

CANDIDATE PROFILE:
Name: {personal['name']}
Email: {personal['email']}
Phone: {personal['phone']}
Location: {personal['location']}
LinkedIn: {personal['linkedin']}
Work Authorization: {defaults['work_authorization']}
Requires Sponsorship: {defaults['requires_sponsorship']}
Willing to Relocate: {defaults['willing_to_relocate']}
Notice Period: {defaults['notice_period']}
Salary Expectation: {defaults['preferred_salary']}
Years of Experience: {defaults['years_experience']}
Certifications: {', '.join(certs)}
Key Skills: {', '.join(skills[:10])}

FORM HTML:
{form_html}

Return ONLY valid JSON in this exact structure, no other text:
{{
  "fields": [
    {{
      "selector": "<CSS selector or label text to find the field>",
      "field_type": "<text|email|phone|select|checkbox|radio|textarea|file>",
      "label": "<human readable label>",
      "value": "<value to fill in>",
      "requires_human": false,
      "human_reason": ""
    }}
  ],
  "flags": ["<any concerning fields that need human review>"],
  "ats_notes": "<any ATS-specific notes for navigation>"
}}

Mark requires_human=true for: essay questions, complex work history sections,
salary negotiation fields, fields requiring uploaded documents not yet available,
or anything ambiguous. For file upload fields (resume, cover letter), 
set value to "UPLOAD_REQUIRED" and requires_human=true."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)

    except Exception as e:
        print(f"  [Claude] Form analysis error: {e}")
        return {"fields": [], "flags": [f"Analysis failed: {e}"], "ats_notes": ""}


# ── Greenhouse Specific ────────────────────────────────────────────────────────
async def fill_greenhouse(page: Page, profile: dict, client: anthropic.Anthropic) -> list:
    """Handles Greenhouse-specific form structure."""
    flags = []
    defaults = profile["form_defaults"]
    personal = profile["personal"]

    await human_delay(1000, 2000)

    # Standard Greenhouse fields
    field_map = {
        '#first_name': personal['name'].split()[0],
        '#last_name': personal['name'].split()[-1],
        '#email': personal['email'],
        '#phone': personal['phone'],
        '#job_application_resume': "UPLOAD_REQUIRED",
        'input[name*="linkedin"]': personal.get('linkedin', ''),
        'input[name*="website"]': personal.get('website', ''),
    }

    for selector, value in field_map.items():
        if value == "UPLOAD_REQUIRED":
            flags.append(f"Manual required: Upload resume at '{selector}'")
            continue
        try:
            el = page.locator(selector).first
            if await el.count() > 0:
                await human_type(page, selector, value)
                await human_delay(300, 700)
        except Exception:
            pass

    return flags


# ── Workday Specific ───────────────────────────────────────────────────────────
async def fill_workday(page: Page, profile: dict, client: anthropic.Anthropic) -> list:
    """Handles Workday ATS — uses Claude to analyze dynamic form."""
    flags = ["Workday requires multi-step navigation. Claude will guide each step."]

    # Workday: click Apply button
    try:
        apply_btn = page.locator('button:has-text("Apply"), a:has-text("Apply")')
        if await apply_btn.count() > 0:
            await apply_btn.first.click()
            await human_delay(2000, 4000)
    except Exception as e:
        flags.append(f"Could not find Apply button: {e}")

    return flags


# ── Generic Form Filler ────────────────────────────────────────────────────────
async def fill_generic(
    page: Page, profile: dict,
    field_mapping: dict, client: anthropic.Anthropic
) -> list:
    """
    Fills any ATS form using Claude's field mapping.
    Returns list of flags requiring human action.
    """
    flags = field_mapping.get("flags", [])
    fields = field_mapping.get("fields", [])

    for field in fields:
        if field.get("requires_human"):
            reason = field.get("human_reason", "Complex field")
            flags.append(f"[MANUAL] {field.get('label', 'Unknown field')}: {reason}")
            continue

        selector  = field.get("selector", "")
        value     = field.get("value", "")
        ftype     = field.get("field_type", "text")

        if not selector or not value:
            continue

        try:
            # Try to find by label text if selector looks like a label
            if not selector.startswith(("#", ".", "[", "input", "select", "textarea")):
                el = page.get_by_label(selector, exact=False)
            else:
                el = page.locator(selector).first

            if await el.count() == 0:
                continue

            await human_delay(400, 900)

            if ftype in ("text", "email", "phone", "number"):
                await el.fill("")
                await el.type(value, delay=random.randint(50, 120))

            elif ftype == "select":
                await el.select_option(label=value)

            elif ftype == "textarea":
                await el.fill(value)

            elif ftype == "checkbox":
                if value.lower() in ("true", "yes", "1"):
                    if not await el.is_checked():
                        await el.check()

            elif ftype == "radio":
                await page.locator(f'[value="{value}"]').first.check()

            print(f"  ✓ Filled: {field.get('label', selector)[:40]} = {str(value)[:30]}")

        except Exception as e:
            flags.append(f"[WARN] Could not fill '{field.get('label', selector)}': {e}")

    return flags


# ── Screenshot + Log ──────────────────────────────────────────────────────────
async def capture_state(page: Page, label: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = LOG_DIR / f"screenshot_{label}_{timestamp}.png"
    await page.screenshot(path=str(path), full_page=True)
    print(f"  [Screenshot] Saved: {path.name}")


# ── Main Application Flow ─────────────────────────────────────────────────────
async def apply_to_job(
    profile_name: str,
    job_url: str,
    client: anthropic.Anthropic,
    dry_run: bool = False
):
    """
    Full application flow for a single job URL.
    dry_run=True: fills form but does NOT submit.
    """
    profile  = load_profile(profile_name)
    ats_type = detect_ats(job_url)

    print(f"\n{'='*60}")
    print(f"  APPLYING: {profile['personal']['name']}")
    print(f"  URL: {job_url[:60]}...")
    print(f"  ATS: {ats_type.upper()}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"{'='*60}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,  # Visible so you can monitor + intervene
            args=["--disable-blink-features=AutomationControlled"]
        )

        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )

        # Mask automation fingerprint
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)

        page = await context.new_page()

        print("\n[NAV] Loading job page...")
        await page.goto(job_url, wait_until="networkidle", timeout=30000)
        await human_delay(2000, 4000)
        await capture_state(page, "initial")

        all_flags = []

        # Route to ATS-specific handler or generic
        if ats_type == "greenhouse":
            flags = await fill_greenhouse(page, profile, client)
            all_flags.extend(flags)

        elif ats_type == "workday":
            flags = await fill_workday(page, profile, client)
            all_flags.extend(flags)

        else:
            # Generic: use Claude to analyze and fill
            print("\n[CLAUDE] Analyzing form structure...")
            field_mapping = await analyze_form_with_claude(
                client, page, profile, ats_type
            )

            if field_mapping.get("ats_notes"):
                print(f"  [ATS Notes] {field_mapping['ats_notes']}")

            print(f"\n[FILL] Filling {len(field_mapping.get('fields', []))} fields...")
            flags = await fill_generic(page, profile, field_mapping, client)
            all_flags.extend(flags)

        await human_delay(1500, 3000)
        await capture_state(page, "filled")

        # Surface flags for human review
        if all_flags:
            print(f"\n{'!'*60}")
            print("  MANUAL ACTION REQUIRED:")
            for flag in all_flags:
                print(f"  → {flag}")
            print(f"{'!'*60}")
            print("\n  Review the browser window, complete flagged fields,")
            print("  then press ENTER here to submit (or Ctrl+C to cancel).")
            input()

        if not dry_run:
            print("\n[SUBMIT] Submitting application...")
            try:
                submit_btn = page.locator(
                    'button[type="submit"], input[type="submit"], '
                    'button:has-text("Submit"), button:has-text("Apply Now")'
                ).first

                if await submit_btn.count() > 0:
                    await human_delay(1000, 2000)
                    await submit_btn.click()
                    await human_delay(3000, 5000)
                    await capture_state(page, "submitted")

                    # Log to DB
                    conn = sqlite3.connect(DB_PATH)
                    conn.execute("""
                        UPDATE jobs SET status='applied', applied_at=?
                        WHERE job_url=? AND profile=?
                    """, (datetime.now().isoformat(), job_url, profile_name))
                    conn.commit()
                    conn.close()

                    print("  ✓ Application submitted and logged!")
                else:
                    print("  [WARN] Submit button not found — manual submit required")
                    input("  Press ENTER after manually submitting...")

            except Exception as e:
                print(f"  [ERROR] Submit failed: {e}")
                input("  Press ENTER after manually submitting...")
        else:
            print("\n[DRY RUN] Skipping submission. Review the filled form above.")
            input("  Press ENTER to close browser...")

        await browser.close()


# ── Batch Mode ────────────────────────────────────────────────────────────────
async def run_batch(profile_name: str, client: anthropic.Anthropic, dry_run: bool):
    """Pulls pending high-score jobs from DB and applies to each."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT job_url, title, company, fit_score
        FROM jobs
        WHERE profile = ?
          AND status = 'discovered'
          AND fit_score >= 70
        ORDER BY fit_score DESC
        LIMIT 10
    """, (profile_name,)).fetchall()
    conn.close()

    if not rows:
        print(f"No pending high-fit jobs in queue for {profile_name}")
        return

    print(f"\n[BATCH] {len(rows)} jobs queued for {profile_name}")
    for url, title, company, score in rows:
        print(f"\n→ [{score}/100] {title} @ {company}")
        confirm = input("  Apply to this job? (y/n/q to quit): ").strip().lower()
        if confirm == "q":
            break
        if confirm == "y":
            await apply_to_job(profile_name, url, client, dry_run)


# ── Entry Point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Job Agent – ATS Auto-Filler")
    parser.add_argument("--profile", choices=["jordon", "alicia"], required=True)
    parser.add_argument("--url", help="Direct job URL to apply to")
    parser.add_argument("--batch", action="store_true",
                        help="Process pending jobs from DB queue")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fill form but do NOT submit")
    parser.add_argument("--api-key", default=os.getenv("ANTHROPIC_API_KEY"))
    args = parser.parse_args()

    if not args.api_key:
        print("[ERROR] Set ANTHROPIC_API_KEY environment variable")
        exit(1)

    client = anthropic.Anthropic(api_key=args.api_key)

    if args.batch:
        asyncio.run(run_batch(args.profile, client, args.dry_run))
    elif args.url:
        asyncio.run(apply_to_job(args.profile, args.url, client, args.dry_run))
    else:
        print("Provide --url <job_url> or --batch")


if __name__ == "__main__":
    main()
