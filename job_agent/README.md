# Job Agent — Jordon & Alicia Wagner
## AI-Powered Job Discovery, Scoring & Application System

---

## Architecture

```
discover.py   →   tailor.py   →   apply.py
(find & score)    (customize)     (submit)
     ↓                                ↓
  SQLite DB                     SQLite DB
  (applications.db)             (status updates)
```

### Tier 1 — Discovery Engine (`discover.py`)
- Pulls jobs from LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter via JobSpy
- Filters by salary minimum ($130K Jordon / $145K Alicia) and remote
- Claude scores every job 0–100 against your YAML profile
- Only saves jobs scoring 60+ to the database
- Generates a daily digest text file

### Tier 2 — ATS Auto-Filler (`apply.py`)
- **Lane B (employer career pages):** Playwright navigates directly to ATS
- Detects ATS type: Workday, Greenhouse, Lever, iCIMS, generic
- Claude analyzes form structure and maps your profile to fields
- Human-paced typing + random delays to avoid bot detection
- Flags complex fields (essays, file uploads) for human review
- Browser stays VISIBLE so you can monitor and intervene
- Dry-run mode to review before any live submission

### Tier 3 — Resume Tailoring (`tailor.py`)
- Extracts ATS keywords from JD
- Rewrites your top bullets injecting JD language (no fabrication)
- Generates targeted cover letter (company-specific)
- Drafts LinkedIn recruiter outreach DM
- Saves complete package as a text file

---

## Setup

```bash
# 1. Install everything
python setup.py

# 2. Set your API key
export ANTHROPIC_API_KEY='sk-ant-your-key-here'
# Windows: set ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. Verify profiles
cat profiles/jordon.yaml
cat profiles/alicia.yaml
```

---

## Daily Workflow

### Morning (10 min)
```bash
# Pull fresh jobs and score them
python scripts/discover.py --profile both

# Review the digest files in output/
# e.g. output/digest_jordon_20260523.txt
```

### Per Job (15–20 min per application)
```bash
# Step 1: Tailor resume for a job you want to apply to
python scripts/tailor.py --profile jordon --url "https://company.com/jobs/123"

# Step 2: Review the output file, copy tailored bullets to your resume

# Step 3: Apply directly to employer career page
python scripts/apply.py --profile jordon --url "https://company.com/jobs/123" --dry-run
# Review the filled form in browser, then:
python scripts/apply.py --profile jordon --url "https://company.com/jobs/123"
```

### LinkedIn (semi-automated)
For LinkedIn Easy Apply, use the browser with apply.py in batch mode:
```bash
python scripts/apply.py --profile jordon --batch
# Prompts y/n for each queued job, applies via Playwright
```

---

## Profile Customization

Edit `profiles/jordon.yaml` or `profiles/alicia.yaml` to update:
- `search_criteria.job_types` — target role titles
- `search_criteria.salary_minimum` — filter threshold
- `search_criteria.target_companies` — priority list
- `form_defaults` — ATS auto-fill defaults
- `experience` — bullet points Claude uses for tailoring

---

## Database

SQLite at `logs/applications.db`

```sql
-- View all discovered jobs
SELECT title, company, fit_score, status, discovered_at
FROM jobs ORDER BY fit_score DESC;

-- View applied jobs
SELECT title, company, applied_at FROM jobs WHERE status='applied';

-- Check Jordon's pipeline
SELECT title, company, fit_score, status
FROM jobs WHERE profile='jordon' ORDER BY fit_score DESC;
```

---

## Salary Targets

| Person | Floor | Target |
|--------|-------|--------|
| Jordon | $130K | $150–$170K |
| Alicia | $145K | $165–$185K |
| Combined | $275K | $315–$355K |

---

## Target Companies

Waystar · Veradigm · Optum · Availity · Cotiviti · R1 RCM ·
Abridge · Innovaccer · Netsmart · Oracle Health · Inovalon · Epic

---

## Notes

- LinkedIn scraping is rate-limited. If you hit 429 errors, wait 30 min and retry.
- Workday ATS is the most complex — expect some manual steps.
- Always run `--dry-run` first on a new ATS platform.
- Screenshots of every session saved to `logs/`
- Never submit without reviewing flagged fields.
