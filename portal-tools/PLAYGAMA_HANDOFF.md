# Handoff — submitting RIFTFALL to Playgama via the Playgama MCP

Paste the block at the bottom into a NEW session after connecting the
connector. Connectors are read when a session starts, so connecting it to a
session already running does nothing.

## Setup (one time, on your side)

1. Go to https://claude.ai/customize/connectors
2. Add a custom connector with URL `https://developer.playgama.com/api/mcp`
   — this is the endpoint named on Playgama's own wiki.
3. Authorize it. Auth is OAuth: the Developer Cabinet opens in your browser
   and you click Allow there. A legacy `pgm_mcp_` bearer token still works but
   Playgama's wiki says to drop it and reconnect via OAuth.
4. Start a NEW Claude Code session on this repo.

Do not use third-party publishing skills that ask for your Playgama email and
password. The official route is OAuth against the endpoint above; anything
asking for the password itself is a worse trade for no extra capability.

## What is already done

Everything except the upload. Build, assets and copy are committed:

| | |
|---|---|
| Upload archive | regenerate with `cd playgama && zip -X ../riftfall_playgama.zip index.html playgama-bridge-config.json` |
| Build generator | `portal-tools/make_playgama.py zonelooter3d.html playgama` |
| Every form field, paste-ready | `portal-tools/PLAYGAMA_SUBMISSION.md` |
| Covers | `portal-tools/media/cover_{landscape_1920x1080,portrait_800x1200,square_800x800}.png` |
| Build string | `2026.10.27-6 soundtrack` |

Measured, not assumed: 1 external request (the Bridge script, nothing else) ·
0 occurrences of "crazygames" in the build · index.html at archive root ·
1.28 MB uncompressed against a 300 MB cap · playable in 3.2-4.1s across four
viewports · 0 JS errors · Bridge shim 21/21 against a mock.

## Paste this into the new session

```
Submit RIFTFALL to Playgama using the Playgama Developer Cabinet MCP
connector, which is now connected.

The repo is RunePortal, branch claude/zone-looter-game-nh51bj (== main).
Everything except the upload is done and committed.

1. Read portal-tools/PLAYGAMA_SUBMISSION.md. It has every mandatory field
   written out paste-ready: title, engine (Other/Custom, NOT Unity),
   description, how-to-play, supported devices (select all four - Playgama
   filters the catalog on this), languages (English), orientation (both).
2. Build the archive: cd playgama && zip -X ../riftfall_playgama.zip
   index.html playgama-bridge-config.json
   Do NOT hand-edit playgama/index.html - regenerate it with
   portal-tools/make_playgama.py zonelooter3d.html playgama
3. Create the application via the MCP, upload the archive, set the fields,
   attach the three covers from portal-tools/media/.
4. Report back what the Playgama QA Tool flags BEFORE submitting for
   moderation. Do not submit for moderation until I have seen the QA output.

Project conventions: patches are Python str.replace against unique anchors,
no CapsuleGeometry, comments explain why. Measure, don't infer - screenshot
and assert. Scope git add to specific paths; the repo root holds personal
files. Commit and push to claude/zone-looter-game-nh51bj.

Known open items, not blockers: tablet portrait leaves background bars down
both sides (#app{max-width:560px}). Bridge behaviour is verified only against
a mock - the real async storage.get() and interstitial pacing can only be
exercised in the QA Tool.
```
