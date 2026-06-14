# -*- coding: utf-8 -*-
import json, time, sys, re
from mcp import call_tool, tool_text

DESC = ("3D pixel art RPG character, front-facing, chunky heroic proportions, "
        "dark gothic survival fantasy, beginner starting state, torn tattered grey cloth "
        "tunic, rough cloth trousers, bare feet wrapped in rags, no weapon, no armor, "
        "gaunt hollow face, dark sunken eyes, short dark unkempt hair, pale desaturated "
        "skin, visible collar bones, dark muted color palette, transparent background, "
        "game sprite style, detailed chunky limbs, readable silhouette")

args = {"description": DESC, "n_directions": 4, "size": 64, "name": "Beginner Survivor"}
resp = call_tool("create_character", args)
txt = tool_text(resp)
print("CREATE RESPONSE:\n", txt[:800])
if resp.get("result", {}).get("isError"):
    sys.exit("create_character error")

m = re.search(r"id:\s*([0-9a-f-]{36})", txt) or re.search(r"([0-9a-f]{8}-[0-9a-f-]{27})", txt)
cid = m.group(1) if m else None
print("CHARACTER_ID:", cid)
if not cid:
    sys.exit("no character id parsed")

json.dump({"id": cid}, open("char_id.json", "w"))
print("saved char_id.json")
