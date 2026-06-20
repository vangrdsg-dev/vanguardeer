#!/usr/bin/env python3
path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"
with open(path, "r") as f:
    html = f.read()

old = '#footer{padding:56px 0 28px;border-top:1px solid var(--border)}'
new = '#footer{padding:56px 0 28px;border-top:1px solid var(--border);background:var(--bg2)}'

if old in html:
    html = html.replace(old, new, 1)
    print("✓  Footer background:var(--bg2) added")
else:
    # Show exact footer CSS context
    idx = html.find('#footer{')
    print(f"✗  Not matched. Exact string at #footer{{: {repr(html[idx:idx+80])}")

with open(path, "w") as f:
    f.write(html)
