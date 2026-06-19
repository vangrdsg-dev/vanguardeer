#!/usr/bin/env python3
"""Update about.html + index.html to use nor-azam-ahmad.jpeg"""
import os, re

base = "/Users/azamahmad/Claude/Projects/Vanguardeer"
photo_dst = os.path.join(base, "images/nor-azam-ahmad.jpeg")

if not os.path.exists(photo_dst):
    print(f"  ✗  Photo not found at {photo_dst}")
    print("  Copy it there first, then re-run this script.")
    exit(1)

print(f"  ✓  Photo found ({os.path.getsize(photo_dst):,} bytes)")

# ── about.html ────────────────────────────────────────────────────────────────
about_path = os.path.join(base, "about.html")
with open(about_path, "r", encoding="utf-8") as f:
    about = f.read()

# Replace any existing photo reference or placeholder
old_photo = '''        <div class="img-placeholder about-photo" style="background:rgba(255,255,255,0.06);border:2px dashed rgba(255,255,255,0.15);border-radius:16px;height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <div style="font-size:48px;opacity:0.4">👤</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.4);font-family:var(--mono);text-align:center">Photo of Nor Azam Ahmad<br>Recommended: 680×900px portrait</div>
        </div>'''

new_photo = '        <img src="/images/nor-azam-ahmad.jpeg" alt="Nor Azam Ahmad — Founder, Vanguardeer" width="340" height="340" style="border-radius:16px;width:100%;height:auto;object-fit:cover;object-position:center top;display:block">'

if old_photo in about:
    about = about.replace(old_photo, new_photo, 1)
    print("  ✓  about.html photo placeholder replaced")
elif 'azam-ahmad.jpeg' in about:
    about = about.replace('azam-ahmad.jpeg', 'nor-azam-ahmad.jpeg')
    print("  ✓  about.html photo filename updated")
else:
    print("  ✗  about.html — no placeholder or old filename found")

with open(about_path, "w", encoding="utf-8") as f:
    f.write(about)

# ── index.html ────────────────────────────────────────────────────────────────
index_path = os.path.join(base, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    index = f.read()

# Replace old filename if present
updated = index.replace('azam-ahmad.jpeg', 'nor-azam-ahmad.jpeg')

# Also update via regex for about-img class
updated = re.sub(
    r'(<img[^>]+class="about-img"[^>]*src=")[^"]*(")',
    r'\1/images/nor-azam-ahmad.jpeg\2',
    updated
)
updated = re.sub(
    r'(<img[^>]+src=")[^"]*("[^>]+class="about-img")',
    r'\1/images/nor-azam-ahmad.jpeg\2',
    updated
)

if updated != index:
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("  ✓  index.html photo reference updated")
else:
    idx = index.find('about-img')
    if idx != -1:
        print(f"  —  index.html about-img context: {repr(index[idx:idx+150])}")
    else:
        print("  —  index.html: no about-img found")

print("\n✅ Done.")
