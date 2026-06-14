import json, time, re, sys
from mcp import call_tool, tool_text

STYLE = "dark fantasy, gritty, detailed pixel art"
REMAIN = [
    ("hollowHunter",  f"dark fantasy skeletal werewolf, hunched quadruped body, bone claws, glowing eyes, {STYLE}, transparent background", 64, 64, "side"),
    ("wraithStalker", f"dark fantasy wraith spirit, no legs, legless spectral form tapering to a wisp, long drooping arms, hollow head, {STYLE}, transparent background", 48, 64, "side"),
    ("ironConstruct", f"dark fantasy iron golem, boxy mechanical torso, thick rectangular limbs, rivets, glowing red eye slots, {STYLE}, transparent background", 64, 64, "side"),
]

def extract_id(txt):
    m = re.search(r"id:\s*([0-9a-f-]{36})", txt)
    return m.group(1) if m else None

# 1. existing ids
ids = {}
data = json.load(open("sprite_ids.json", encoding="utf-8"))
for k,v in data.items():
    if "raw" in v:
        oid = extract_id(v["raw"])
        if oid: ids[k] = oid

print("Existing IDs:", ids)

# 2. submit remaining 3 with rate-limit retry
def submit(key, desc, w, h, view):
    for attempt in range(12):
        resp = call_tool("create_map_object", {"description": desc, "width": w, "height": h,
            "view": view, "outline":"single color outline", "shading":"detailed shading", "detail":"high detail"})
        txt = tool_text(resp)
        if resp.get("result",{}).get("isError") or "rate limit" in txt.lower():
            print(f"  {key} rate-limited, wait 20s (attempt {attempt+1})")
            time.sleep(20); continue
        oid = extract_id(txt)
        if oid:
            print(f"  {key} -> {oid}")
            return oid
        print(f"  {key} unexpected: {txt[:150]}"); time.sleep(20)
    return None

for key, desc, w, h, view in REMAIN:
    if key in ids: continue
    oid = submit(key, desc, w, h, view)
    if oid: ids[key] = oid

# 3. poll all to completion, collect base64
sprites = {}
pending = dict(ids)
deadline = time.time() + 600
while pending and time.time() < deadline:
    for key, oid in list(pending.items()):
        r = call_tool("get_map_object", {"object_id": oid})
        res = r.get("result", {})
        txt = tool_text(r)
        status = "completed" if "status: completed" in txt else ("processing" if "process" in txt.lower() else "?")
        if status == "completed":
            b64 = None
            for c in res.get("content", []):
                if c.get("type") == "image" and c.get("data"):
                    b64 = c["data"]; mime = c.get("mimeType","image/png")
            if b64:
                sprites[key] = f"data:{mime};base64,{b64}"
                print(f"  [done] {key} ({len(b64)} b64 chars)")
                del pending[key]
            else:
                print(f"  [done-no-img] {key}: {txt[:120]}")
                del pending[key]
        else:
            print(f"  [{status}] {key}")
    if pending:
        time.sleep(15)

json.dump(sprites, open("sprites_b64.json","w",encoding="utf-8"))
print(f"\nSAVED sprites_b64.json with {len(sprites)} sprites: {sorted(sprites)}")
missing = [k for k in ["playerBase","sword","bow","staff","hollowHunter","wraithStalker","ironConstruct"] if k not in sprites]
if missing: print("MISSING:", missing)
