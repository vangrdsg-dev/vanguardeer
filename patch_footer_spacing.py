#!/usr/bin/env python3
path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"
with open(path, "r") as f:
    html = f.read()

# The homepage footer-brand-desc has no margin-bottom — add it
old = '.footer-brand-desc{font-size:13px;color:var(--text2);line-height:1.7;max-width:260px}'
new = '.footer-brand-desc{font-size:13px;color:var(--text2);line-height:1.7;max-width:260px;margin-bottom:16px}'

if old in html:
    html = html.replace(old, new, 1)
    print("✓  footer-brand-desc margin-bottom:16px added")
else:
    # Find what's there
    idx = html.find('footer-brand-desc{')
    if idx != -1:
        print(f"Found at {idx}: {repr(html[idx:idx+100])}")
    else:
        print("✗  footer-brand-desc not found")

with open(path, "w") as f:
    f.write(html)
