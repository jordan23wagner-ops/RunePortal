import json, urllib.request, urllib.error

URL = "https://api.pixellab.ai/mcp"
TOKEN = "7dbfc2b3-cbb6-4455-a8a5-c9ec7ca070ae"

def mcp(method, params=None):
    body = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params or {}}).encode()
    req = urllib.request.Request(URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode("utf-8", "replace")
    # parse SSE: find the data: line containing JSON
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            line = line[5:].strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except Exception:
                pass
    raise RuntimeError("no JSON in response: " + raw[:500])

def call_tool(name, args):
    return mcp("tools/call", {"name": name, "arguments": args})

def tool_text(resp):
    # extract concatenated text content from a tools/call result
    res = resp.get("result", {})
    parts = []
    for c in res.get("content", []):
        if c.get("type") == "text":
            parts.append(c.get("text",""))
    return "\n".join(parts)
