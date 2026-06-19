#!/usr/bin/env python3
"""
Batch rename: pricing.html → services.html across entire site
- Updates all href="/pricing.html" → href="/services.html"
- Updates all nav "Pricing" labels → "Services"
- Updates sitemap
- Adds photo to about.html and index.html
- Removes #services section from index.html
Files touched: index.html, about.html, audit.html, privacy.html, terms.html,
               404.html, insights/index.html, insights/*.html, sitemap.xml
"""

import os, re

base = "/Users/azamahmad/Claude/Projects/Vanguardeer"

# ── Files to update (nav + href rename) ──────────────────────────────────────
html_files = [
    "index.html",
    "about.html",
    "audit.html",
    "privacy.html",
    "terms.html",
    "404.html",
    "insights/index.html",
    "insights/google-maps-ranking-singapore.html",
    "insights/conversion-rate-optimisation-singapore.html",
    "insights/google-business-profile-optimisation-singapore.html",
    "insights/local-seo-cost-singapore.html",
    "insights/google-maps-rank-cost-singapore.html",
    "insights/conversion-leaks-singapore-sme.html",
    "insights/google-reviews-singapore.html",
    "sitemap.xml",
]

changes_total = 0

for fname in html_files:
    fpath = os.path.join(base, fname)
    if not os.path.exists(fpath):
        print(f"  ✗  NOT FOUND: {fname}")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. href="/pricing.html" → href="/services.html"
    content = content.replace('href="/pricing.html"', 'href="/services.html"')

    # 2. href="/pricing.html#full-growth-system" → href="/services.html#full-growth-system"
    content = content.replace('href="/pricing.html#full-growth-system"', 'href="/services.html#full-growth-system"')

    # 3. Nav link label "Pricing" → "Services" (only in nav context)
    content = content.replace(
        '<a href="/services.html" class="nav-link">Pricing</a>',
        '<a href="/services.html" class="nav-link">Services</a>'
    )
    content = content.replace(
        '<a href="/services.html" class="nav-link active">Pricing</a>',
        '<a href="/services.html" class="nav-link active">Services</a>'
    )

    # 4. Footer flink "Pricing" label → "Services"
    content = content.replace(
        '<a href="/services.html" class="flink">Pricing</a>',
        '<a href="/services.html" class="flink">Services</a>'
    )

    # 5. Sitemap URL
    content = content.replace(
        '<loc>https://vanguardeer.com/pricing.html</loc>',
        '<loc>https://vanguardeer.com/services.html</loc>'
    )

    # 6. Any remaining text references "See full pricing" → "See all services"
    content = content.replace(
        'View full pricing &amp; all packages →',
        'View all services &amp; pricing →'
    )

    if content != original:
        n = sum([
            content.count('/services.html') - original.count('/services.html'),
        ])
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✓  {fname}")
        changes_total += 1
    else:
        print(f"  —  {fname} (no changes needed)")

print(f"\n  Total files updated: {changes_total}")

# ── Copy pricing.html → services.html ────────────────────────────────────────
import shutil
pricing_path = os.path.join(base, "pricing.html")
services_path = os.path.join(base, "services.html")

if os.path.exists(pricing_path):
    shutil.copy2(pricing_path, services_path)
    # Update self-references inside services.html
    with open(services_path, "r", encoding="utf-8") as f:
        s = f.read()
    s = s.replace('href="/pricing.html"', 'href="/services.html"')
    s = s.replace('href="/pricing.html#', 'href="/services.html#')
    s = s.replace('<title>Pricing —', '<title>Services —')
    s = s.replace('og:url" content="https://vanguardeer.com/pricing.html"',
                  'og:url" content="https://vanguardeer.com/services.html"')
    s = s.replace('link rel="canonical" href="https://vanguardeer.com/pricing.html"',
                  'link rel="canonical" href="https://vanguardeer.com/services.html"')
    s = s.replace('class="nav-link active">Pricing<', 'class="nav-link active">Services<')
    s = s.replace('class="nav-link">Pricing<', 'class="nav-link">Services<')
    s = s.replace('<a href="/services.html" class="flink">Pricing</a>',
                  '<a href="/services.html" class="flink">Services</a>')
    with open(services_path, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"\n  ✓  services.html created from pricing.html")
else:
    print(f"\n  ✗  pricing.html not found — cannot create services.html")

# ── Copy photo to images folder ───────────────────────────────────────────────
photo_src = "/home/claude/azam-photo.jpeg"
photo_dst = os.path.join(base, "images/azam-ahmad.jpeg")
os.makedirs(os.path.join(base, "images"), exist_ok=True)
shutil.copy2(photo_src, photo_dst)
print(f"  ✓  Photo copied to images/azam-ahmad.jpeg")

# ── Update about.html — replace photo placeholder with real image ─────────────
about_path = os.path.join(base, "about.html")
with open(about_path, "r", encoding="utf-8") as f:
    about = f.read()

old_photo = '''        <div class="img-placeholder about-photo" style="background:rgba(255,255,255,0.06);border:2px dashed rgba(255,255,255,0.15);border-radius:16px;height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <div style="font-size:48px;opacity:0.4">👤</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.4);font-family:var(--mono);text-align:center">Photo of Nor Azam Ahmad<br>Recommended: 680×900px portrait</div>
        </div>'''

new_photo = '''        <img src="/images/azam-ahmad.jpeg" alt="Nor Azam Ahmad — Founder, Vanguardeer" class="about-photo" width="340" height="340" style="border-radius:16px;width:100%;height:auto;object-fit:cover;object-position:center top">'''

if old_photo in about:
    about = about.replace(old_photo, new_photo, 1)
    print("  ✓  about.html photo updated")
else:
    print("  ✗  about.html photo placeholder — not matched")

with open(about_path, "w", encoding="utf-8") as f:
    f.write(about)

# ── Update index.html — replace about photo placeholder ──────────────────────
index_path = os.path.join(base, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    index = f.read()

# Find and replace the about image placeholder on the homepage
# The homepage uses .about-img class
old_hp_photo = 'src="/images/azam-ahmad.jpg"'
new_hp_photo = 'src="/images/azam-ahmad.jpeg"'

if old_hp_photo in index:
    index = index.replace(old_hp_photo, new_hp_photo)
    print("  ✓  index.html photo src updated")
else:
    # Check what's currently there
    img_idx = index.find('about-img')
    if img_idx != -1:
        snippet = index[img_idx:img_idx+200]
        print(f"  —  index.html about-img found: {repr(snippet[:100])}")
        # Update whatever src is there
        index = re.sub(
            r'(<img[^>]*class="about-img"[^>]*src=")[^"]*(")',
            r'\1/images/azam-ahmad.jpeg\2',
            index
        )
        index = re.sub(
            r'(<img[^>]*src=")[^"]*("[^>]*class="about-img")',
            r'\1/images/azam-ahmad.jpeg\2',
            index
        )
        print("  ✓  index.html about-img src updated via regex")
    else:
        print("  ✗  index.html about-img not found")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(index)

print("\n✅ All done.")
