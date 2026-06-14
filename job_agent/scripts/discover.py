"""
job_agent/scripts/discover.py
=============================
TIER 1: Job Discovery + Claude Fit Scoring Engine

Pulls jobs from LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter via JobSpy.
Scores each against a profile YAML using Claude.
Saves high-score matches to SQLite and outputs a daily digest.

Usage:
    python discover.py --profile jordon   # run for Jordon
    python discover.py --profile alicia   # run for Alicia
    python discover.py --profile both     # run for both
"""

import argparse
import json
import sqlite3
import os
import re
from datetime import datetime
from pathlib import Path

import yaml

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    from jobspy import scrape_jobs
except ImportError:
    print("Missing: pip install python-jobspy")
    exit(1)

try:
    import anthropic
except ImportError:
    print("Missing: pip install anthropic")
    exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
PROFILE_DIR = BASE_DIR / "profiles"
DB_PATH    = BASE_DIR / "logs" / "applications.db"
OUTPUT_DIR = BASE_DIR / "output"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
(BASE_DIR / "logs").mkdir(parents=True, exist_ok=True)

# ── DB Setup ──────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            profile       TEXT,
            job_id        TEXT UNIQUE,
            title         TEXT,
            company       TEXT,
            location      TEXT,
            salary_min    INTEGER,
            salary_max    INTEGER,
            job_type      TEXT,
            site          TEXT,
            job_url       TEXT,
            fit_score     INTEGER,
            fit_summary   TEXT,
            fit_keywords  TEXT,
            status        TEXT DEFAULT 'discovered',
            discovered_at TEXT,
            applied_at    TEXT
        )
    """)
    conn.commit()
    return conn


def job_already_seen(conn, job_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM jobs WHERE job_id = ?", (job_id,)
    ).fetchone()
    return row is not None


def save_job(conn, profile_name: str, job: dict, score: int,
             summary: str, keywords: list):
    try:
        conn.execute("""
            INSERT OR IGNORE INTO jobs
            (profile, job_id, title, company, location, salary_min, salary_max,
             job_type, site, job_url, fit_score, fit_summary, fit_keywords,
             status, discovered_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            profile_name,
            job.get("id", ""),
            job.get("title", ""),
            job.get("company", ""),
            job.get("location", ""),
            job.get("min_amount"),
            job.get("max_amount"),
            job.get("job_type", ""),
            job.get("site", ""),
            job.get("job_url", ""),
            score,
            summary,
            json.dumps(keywords),
            "discovered",
            datetime.now().isoformat()
        ))
        conn.commit()
    except Exception as e:
        print(f"  [DB] Save error: {e}")


# ── Profile Loader ─────────────────────────────────────────────────────────────
def load_profile(name: str) -> dict:
    path = PROFILE_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Profile not found: {path}")
    with open(path) as f:
        return yaml.safe_load(f)


# ── Job Scraper ───────────────────────────────────────────────────────────────
def fetch_jobs(profile: dict) -> list[dict]:
    """
    Scrapes jobs from multiple boards based on profile search criteria.
    Returns a list of job dicts.
    """
    criteria  = profile["search_criteria"]
    job_types = criteria.get("job_types", [])
    results   = []

    # Build search terms from target titles
    search_terms = job_types[:3]  # cap at 3 to avoid rate limits

    print(f"\n[DISCOVER] Searching {len(search_terms)} query terms across job boards...")

    for term in search_terms:
        print(f"  → Querying: '{term}'")
        try:
            df = scrape_jobs(
                site_name=["indeed"],
                search_term=term,
                location="United States",
                is_remote=True,
                results_wanted=15,
                country_indeed="usa",
            )

            if df is not None and not df.empty:
                jobs = df.to_dict(orient="records")
                print(f"     Found {len(jobs)} raw results")
                results.extend(jobs)

        except Exception as e:
            print(f"  [WARN] Scrape error for '{term}': {e}")

    # Deduplicate by job URL
    seen_urls = set()
    unique = []
    for job in results:
        url = job.get("job_url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique.append(job)

    print(f"\n[DISCOVER] {len(unique)} unique jobs after deduplication")
    return unique


# ── Salary Filter ─────────────────────────────────────────────────────────────
def passes_salary_filter(job: dict, min_salary: int) -> bool:
    """
    Returns True if job meets salary minimum OR has no salary listed.
    We don't want to filter out unlisted salaries — Claude will flag them.
    """
    max_amt = job.get("max_amount")
    min_amt = job.get("min_amount")

    # If salary is listed and clearly below minimum, skip
    if max_amt and isinstance(max_amt, (int, float)):
        if max_amt < min_salary * 0.85:  # 15% tolerance
            return False

    if min_amt and isinstance(min_amt, (int, float)):
        if min_amt < min_salary * 0.70:  # wider tolerance on min
            return False

    return True  # unlisted salary = keep for Claude to evaluate


# ── Claude Fit Scorer ─────────────────────────────────────────────────────────
def score_job_fit(client: anthropic.Anthropic, profile: dict,
                  job: dict) -> tuple[int, str, list]:
    """
    Sends job description + profile to Claude.
    Returns (score 0-100, summary string, keyword list).
    """
    profile_summary = f"""
Name: {profile['personal']['name']}
Target Salary: ${profile['search_criteria']['salary_minimum']:,}+
Target Roles: {', '.join(profile['search_criteria']['job_types'][:5])}
Certifications: {', '.join([c['name'] for c in profile.get('certifications', [])])}
Core Skills: {', '.join(profile.get('skills', {}).get('project_management', [])[:8])}
AI/Automation Skills: {', '.join(profile.get('skills', {}).get('ai_and_automation', [])[:5])}
Domain: {', '.join(profile.get('skills', {}).get('domain', [])[:6])}
Years Experience: {profile['form_defaults']['years_experience']}
Education: {profile['education'][0]['degree'] if profile.get('education') else 'Not listed'}
Summary: {profile.get('summary', '')}
    """.strip()

    job_text = f"""
Title: {job.get('title', 'Unknown')}
Company: {job.get('company', 'Unknown')}
Location: {job.get('location', 'Unknown')}
Salary: ${job.get('min_amount', 'Not listed')} – ${job.get('max_amount', 'Not listed')}
Job Type: {job.get('job_type', 'Unknown')}
Description:
{str(job.get('description', ''))[:3000]}
    """.strip()

    prompt = f"""You are a ruthlessly precise job-candidate fit analyst.

CANDIDATE PROFILE:
{profile_summary}

JOB POSTING:
{job_text}

Score this candidate's fit for this specific job on a scale of 0-100.

Scoring criteria:
- 80-100: Strong match. Apply immediately. Skills, seniority, domain all align.
- 60-79: Good match with minor gaps. Worth applying.
- 40-59: Partial match. Significant gaps but transferable skills exist.
- 0-39: Poor match. Do not apply.

Constraints that auto-lower score:
- Management/people leadership required (candidate wants IC only): -20 points
- Salary clearly below ${profile['search_criteria']['salary_minimum']:,}: -30 points
- Domain completely outside candidate's experience: -25 points

Respond ONLY in this exact JSON format, no other text:
{{
  "score": <integer 0-100>,
  "summary": "<2 sentences: why this is or isn't a strong match>",
  "matching_keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "red_flags": ["<any flags>"],
  "salary_assessment": "<meets target / below target / unlisted>"
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)

        return (
            int(data.get("score", 0)),
            data.get("summary", ""),
            data.get("matching_keywords", [])
        )

    except Exception as e:
        print(f"  [Claude] Scoring error: {e}")
        return (0, "Scoring failed", [])


# ── Digest Generator ──────────────────────────────────────────────────────────
def generate_digest(conn, profile_name: str) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    rows  = conn.execute("""
        SELECT title, company, location, salary_min, salary_max,
               fit_score, fit_summary, job_url, site
        FROM jobs
        WHERE profile = ?
          AND status = 'discovered'
          AND fit_score >= 60
          AND date(discovered_at) = date('now')
        ORDER BY fit_score DESC
    """, (profile_name,)).fetchall()

    if not rows:
        return f"[{today}] No high-fit jobs found today for {profile_name}.\n"

    lines = [
        f"{'='*60}",
        f"  JOB DIGEST — {profile_name.upper()} — {today}",
        f"{'='*60}",
        f"  {len(rows)} high-fit jobs found (score ≥ 60)\n"
    ]

    for r in rows:
        title, company, loc, sal_min, sal_max, score, summary, url, site = r
        sal_str = ""
        if sal_min and sal_max:
            sal_str = f"  ${sal_min:,} – ${sal_max:,}"
        elif sal_min:
            sal_str = f"  ${sal_min:,}+"
        else:
            sal_str = "  Salary: Not listed"

        lines += [
            f"┌─ [{score}/100] {title}",
            f"│  {company} | {loc} | {site.upper()}",
            sal_str,
            f"│  {summary}",
            f"│  {url}",
            f"└{'─'*58}",
            ""
        ]

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────
def run_for_profile(profile_name: str, conn: sqlite3.Connection,
                    client: anthropic.Anthropic):
    print(f"\n{'='*60}")
    print(f"  RUNNING JOB AGENT FOR: {profile_name.upper()}")
    print(f"{'='*60}")

    profile    = load_profile(profile_name)
    min_salary = profile["search_criteria"]["salary_minimum"]

    jobs = fetch_jobs(profile)

    scored     = 0
    saved      = 0
    skipped    = 0

    for job in jobs:
        job_id = job.get("id", job.get("job_url", ""))

        if job_already_seen(conn, job_id):
            skipped += 1
            continue

        if not passes_salary_filter(job, min_salary):
            skipped += 1
            continue

        print(f"  [SCORE] {job.get('title','?')} @ {job.get('company','?')}")
        score, summary, keywords = score_job_fit(client, profile, job)
        scored += 1

        if score >= 60:
            save_job(conn, profile_name, job, score, summary, keywords)
            saved += 1
            print(f"         ✓ Score: {score}/100 — SAVED")
        else:
            print(f"         ✗ Score: {score}/100 — skipped")

    print(f"\n[DONE] {profile_name}: {scored} scored, {saved} saved, {skipped} skipped")

    digest = generate_digest(conn, profile_name)
    digest_path = OUTPUT_DIR / f"digest_{profile_name}_{datetime.now().strftime('%Y%m%d')}.txt"
    with open(digest_path, "w") as f:
        f.write(digest)

    print(f"\n[DIGEST] Saved to: {digest_path}")
    print(digest)


def main():
    parser = argparse.ArgumentParser(description="Job Agent – Discovery & Scoring")
    parser.add_argument(
        "--profile",
        choices=["jordon", "alicia", "both"],
        default="both",
        help="Which profile to run"
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("ANTHROPIC_API_KEY"),
        help="Anthropic API key (or set ANTHROPIC_API_KEY env var)"
    )
    args = parser.parse_args()

    if not args.api_key:
        print("[ERROR] Set ANTHROPIC_API_KEY environment variable or pass --api-key")
        exit(1)

    client = anthropic.Anthropic(api_key=args.api_key)
    conn   = init_db()

    profiles = ["jordon", "alicia"] if args.profile == "both" else [args.profile]
    for name in profiles:
        run_for_profile(name, conn, client)

    conn.close()


if __name__ == "__main__":
    main()
