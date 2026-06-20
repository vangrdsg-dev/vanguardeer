#!/usr/bin/env python3
path = "/Users/azamahmad/Claude/Projects/Vanguardeer/chat.js"
with open(path, "r") as f:
    js = f.read()

old = '\n    <span class="chat-badge">1</span>'
new = ''

if old in js:
    js = js.replace(old, new, 1)
    print("✓  Badge removed from chat.js")
else:
    # Try alternate
    old2 = '<span class="chat-badge">1</span>'
    if old2 in js:
        js = js.replace(old2, '', 1)
        print("✓  Badge removed (alternate match)")
    else:
        print("✗  Badge not found")

with open(path, "w") as f:
    f.write(js)
