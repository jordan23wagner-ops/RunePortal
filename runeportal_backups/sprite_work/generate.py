import json, time, sys
from mcp import call_tool, tool_text

STYLE = "dark fantasy, gritty, detailed pixel art"

# key, description, width, height, view
JOBS = [
    ("playerBase",    f"dark fantasy humanoid adventurer, front view, neutral standing stance, no armor, simple cloth tunic, {STYLE}, transparent background", 48, 64, "side"),
    ("sword",         f"dark fantasy longsword, silver blade, gold crossguard, dark leather grip, vertical, {STYLE}, game item, transparent background", 48, 64, "side"),
    ("bow",           f"dark fantasy shortbow, dark wood, taut bowstring, nocked arrow, {STYLE}, game item, transparent background", 48, 64, "side"),
    ("staff",         f"dark fantasy mage staff, dark wood shaft, glowing purple crystal orb on top, vertical, {STYLE}, game item, transparent background", 48, 64, "side"),
    ("hollowHunter",  f"dark fantasy skeletal werewolf, hunched quadruped body, bone claws, glowing eyes, {STYLE}, transparent background", 64, 64, "side"),
    ("wraithStalker", f"dark fantasy wraith spirit, no legs, legless spectral form tapering to a wisp, long drooping arms, hollow head, {STYLE}, transparent background", 48, 64, "side"),
    ("ironConstruct", f"dark fantasy iron golem, boxy mechanical torso, thick rectangular limbs, rivets, glowing red eye slots, {STYLE}, transparent background", 64, 64, "side"),
]

COMMON = dict(view=None, outline="single color outline", shading="detailed shading", detail="high detail")

ids = {}
for key, desc, w, h, view in JOBS:
    args = {"description": desc, "width": w, "height": h, "view": view,
            "outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}
    resp = call_tool("create_map_object", args)
    txt = tool_text(resp)
    if resp.get("result", {}).get("isError"):
        print(f"[ERR] {key}: {txt[:300]}", file=sys.stderr)
        ids[key] = {"error": txt}
        continue
    print(f"[{key}] -> {txt[:200]}")
    ids[key] = {"raw": txt}

with open("sprite_ids.json","w",encoding="utf-8") as f:
    json.dump(ids, f, indent=1)
print("SAVED sprite_ids.json")
