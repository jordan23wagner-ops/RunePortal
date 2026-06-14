"""
job_agent/scripts/tailor.py
============================
TIER 3: Resume + Cover Letter Tailoring

Given a job URL or job description text, Claude:
1. Extracts key requirements and ATS keywords from the JD
2. Maps them against your profile YAML
3. Rewrites your top 3-5 resume bullet points to match
4. Generates a targeted cover letter (if needed)
5. Drafts a LinkedIn recruiter outreach message

Usage:
    python tailor.py --profile jordon --url "https://company.com/jobs/123"
    python tailor.py --profile alicia --text "paste job description here"
    python tailor.py --profile jordon --job-id 42  # pull from DB by ID
"""

import argparse
import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path

import yaml

try:
    import anthropic
except ImportError:
    print("Missing: pip install anthropic")
    exit(1)

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent
PROFILE_DIR = BASE_DIR / "profiles"
DB_PATH     = BASE_DIR / "logs" / "applications.db"
OUTPUT_DIR  = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_profile(name: str) -> dict:
    with open(PROFILE_DIR / f"{name}.yaml") as f:
        return yaml.safe_load(f)


# ── JD Fetcher ────────────────────────────────────────────────────────────────
def fetch_jd_from_url(url: str) -> str:
    """Fetches and extracts job description text from a URL using Playwright."""
    if not PLAYWRIGHT_AVAILABLE:
        return ""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page    = browser.new_page()
        page.goto(url, wait_until="networkidle", timeout=20000)
        text = page.evaluate("() => document.body.innerText")
        browser.close()
        return text[:6000]


# ── Core Tailoring Engine ─────────────────────────────────────────────────────
def tailor_for_job(
    client: anthropic.Anthropic,
    profile: dict,
    jd_text: str,
    profile_name: str
) -> dict:
    """
    Sends JD + profile to Claude.
    Returns tailored bullets, cover letter, recruiter DM, and keyword list.
    """
    personal = profile["personal"]
    certs    = [c["name"] for c in profile.get("certifications", [])]
    exp_list = profile.get("experience", [])

    # Build compact experience block
    exp_block = ""
    for exp in exp_list[:4]:
        bullets = "\n".join(f"  - {b}" for b in exp.get("highlights", [])[:4])
        exp_block += f"\n{exp['title']} @ {exp['company']} ({exp['start']} – {exp['end']})\n{bullets}\n"

    prompt = f"""You are a world-class resume and career coach specializing in healthcare tech
and enterprise SaaS project management. Your job is ruthlessly precise ATS optimization
without fabricating experience.

CANDIDATE: {personal['name']}
CERTIFICATIONS: {', '.join(certs)}
YEARS EXPERIENCE: {profile['form_defaults']['years_experience']}
SALARY TARGET: ${profile['search_criteria']['salary_minimum']:,}+

CURRENT EXPERIENCE:
{exp_block}

JOB DESCRIPTION:
{jd_text[:4000]}

Perform all four tasks below. Return ONLY valid JSON, no other text:

{{
  "job_title": "<extracted job title>",
  "company": "<extracted company name>",
  "ats_keywords": ["<top 10 ATS keywords from JD>"],
  "keyword_gaps": ["<keywords in JD NOT in candidate profile — be honest>"],
  "tailored_bullets": [
    {{
      "original": "<original bullet from profile>",
      "tailored": "<rewritten bullet injecting relevant JD keywords naturally>",
      "role": "<which experience entry this is from>"
    }}
  ],
  "cover_letter": "<3 paragraph cover letter, 200 words max, specific to this JD and company>",
  "recruiter_dm": "<LinkedIn DM, 75 words max, conversational, not salesy, references specific role>",
  "fit_notes": "<1-2 sentences: honest assessment of fit strength and any real gaps>"
}}

Rules:
- NEVER fabricate experience. Only reframe real experience using JD language.
- Tailored bullets must remain truthful — keyword injection only where genuinely relevant.
- Cover letter must mention the company by name and reference 1-2 specific JD requirements.
- Recruiter DM should feel human, not templated.
- Provide 4-6 tailored bullets from the top 2-3 most relevant roles."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)

    except Exception as e:
        print(f"[Claude] Tailoring error: {e}")
        return {}


# ── Output Formatter ──────────────────────────────────────────────────────────
def format_output(result: dict, profile_name: str) -> str:
    if not result:
        return "Tailoring failed."

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"{'='*60}",
        f"  TAILORED APPLICATION PACKAGE",
        f"  {profile_name.upper()} → {result.get('job_title','?')} @ {result.get('company','?')}",
        f"  Generated: {timestamp}",
        f"{'='*60}",
        "",
        "── ATS KEYWORDS FROM JD ──────────────────────────────────",
        "  " + " | ".join(result.get("ats_keywords", [])),
        "",
    ]

    gaps = result.get("keyword_gaps", [])
    if gaps:
        lines += [
            "── GAPS (honest — don't bluff these) ─────────────────────",
            "  " + " | ".join(gaps),
            "",
        ]

    lines += ["── TAILORED RESUME BULLETS ───────────────────────────────", ""]
    for b in result.get("tailored_bullets", []):
        lines += [
            f"  [{b.get('role', '')}]",
            f"  BEFORE: {b.get('original', '')}",
            f"  AFTER:  {b.get('tailored', '')}",
            "",
        ]

    lines += [
        "── COVER LETTER ──────────────────────────────────────────",
        "",
        result.get("cover_letter", ""),
        "",
        "── LINKEDIN RECRUITER DM ─────────────────────────────────",
        "",
        result.get("recruiter_dm", ""),
        "",
        "── FIT ASSESSMENT ────────────────────────────────────────",
        result.get("fit_notes", ""),
        "",
        "="*60,
    ]

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Job Agent – Resume Tailoring")
    parser.add_argument("--profile", choices=["jordon", "alicia"], required=True)
    parser.add_argument("--url",    help="Job posting URL")
    parser.add_argument("--text",   help="Paste job description text directly")
    parser.add_argument("--job-id", type=int, help="DB job ID to tailor for")
    parser.add_argument("--api-key", default=os.getenv("ANTHROPIC_API_KEY"))
    args = parser.parse_args()

    if not args.api_key:
        print("[ERROR] Set ANTHROPIC_API_KEY")
        exit(1)

    client  = anthropic.Anthropic(api_key=args.api_key)
    profile = load_profile(args.profile)

    # Get JD text
    jd_text = ""
    if args.text:
        jd_text = args.text
    elif args.url:
        print(f"[FETCH] Fetching JD from: {args.url}")
        jd_text = fetch_jd_from_url(args.url)
        if not jd_text:
            print("[WARN] Could not fetch URL. Paste JD text instead:")
            jd_text = "\n".join(iter(input, "END"))
    elif args.job_id:
        conn = sqlite3.connect(DB_PATH)
        row  = conn.execute(
            "SELECT job_url, title, company FROM jobs WHERE id=?", (args.job_id,)
        ).fetchone()
        conn.close()
        if row:
            url, title, company = row
            print(f"[DB] Tailoring for: {title} @ {company}")
            jd_text = fetch_jd_from_url(url) if url else ""
        else:
            print(f"[ERROR] Job ID {args.job_id} not found in DB")
            exit(1)
    else:
        print("Provide --url, --text, or --job-id")
        exit(1)

    if not jd_text.strip():
        print("[ERROR] No job description text available")
        exit(1)

    print(f"\n[TAILOR] Generating tailored package for {args.profile}...")
    result = tailor_for_job(client, profile, jd_text, args.profile)

    output = format_output(result, args.profile)
    print("\n" + output)

    # Save to file
    safe_company = re.sub(r"[^a-z0-9]", "_", result.get("company", "unknown").lower())
    out_path = OUTPUT_DIR / f"tailored_{args.profile}_{safe_company}_{datetime.now().strftime('%Y%m%d_%H%M')}.txt"
    with open(out_path, "w") as f:
        f.write(output)
    print(f"\n[SAVED] {out_path}")


if __name__ == "__main__":
    main()
