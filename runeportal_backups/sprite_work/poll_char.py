# -*- coding: utf-8 -*-
import json, time, base64, re, sys
from mcp import call_tool, tool_text

CID = json.load(open("char_id.json"))["id"]
deadline = time.time() + 420

while time.time() < deadline:
    r = call_tool("get_character", {"character_id": CID})
    res = r.get("result", {})
    txt = tool_text(r)
    status_line = txt.splitlines()[0] if txt else "(no text)"
    imgs = [c for c in res.get("content", []) if c.get("type") == "image" and c.get("data")]
    print(f"[{int(time.time())}] {status_line}  images={len(imgs)}", flush=True)

    if "status: completed" in txt or imgs:
        # Save full text (URLs / download link) + every image block
        open("char_result.txt", "w", encoding="utf-8").write(txt)
        for i, c in enumerate(imgs):
            data = base64.b64decode(c["data"])
            open(f"char_dir_{i}.png", "wb").write(data)
        print("FULL TEXT:\n" + txt, flush=True)
        print(f"SAVED {len(imgs)} image(s): " + ", ".join(f'char_dir_{i}.png' for i in range(len(imgs))), flush=True)
        sys.exit(0)
    time.sleep(15)

print("TIMEOUT — not completed within budget", flush=True)
sys.exit(1)
