#!/usr/bin/env python3
"""Patch: fix title tag + remove duplicate FAQPage schema"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# ── TITLE TAG ─────────────────────────────────────────────────────────────────
html = html.replace(
    "<title>CRO &amp; Local SEO Agency Singapore | Vanguardeer</title>",
    "<title>Conversion Rate Optimisation &amp; Local SEO Agency Singapore | Vanguardeer</title>"
)
# Handle unescaped version too (belt and braces)
html = html.replace(
    "<title>CRO & Local SEO Agency Singapore | Vanguardeer</title>",
    "<title>Conversion Rate Optimisation &amp; Local SEO Agency Singapore | Vanguardeer</title>"
)

# ── REMOVE DUPLICATE FAQPage SCHEMA ───────────────────────────────────────────
# The file now has two identical <script type="application/ld+json"> FAQPage blocks.
# Strategy: find the second occurrence and remove it entirely.
marker = '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage"'
first  = html.find(marker)
second = html.find(marker, first + 1)

if second != -1:
    # Find the closing </script> of the second block
    close_tag = "</script>"
    end = html.find(close_tag, second) + len(close_tag)
    # Remove the duplicate block (plus any leading newline)
    html = html[:second].rstrip("\n") + "\n" + html[end:].lstrip("\n")
    print("  ✓  Duplicate FAQPage schema removed")
else:
    print("  ℹ  No duplicate FAQPage schema found (already clean)")

# ── VERIFY ────────────────────────────────────────────────────────────────────
checks = [
    ("Title updated",            "Conversion Rate Optimisation &amp; Local SEO Agency Singapore" in html),
    ("Old title gone",           "CRO &amp; Local SEO Agency Singapore" not in html and "CRO & Local SEO Agency Singapore" not in html),
    ("FAQPage present once",     html.count('"@type": "FAQPage"') == 1),
    ("LocalBusiness still there",'"@type": "LocalBusiness"' in html),
]

all_ok = True
for label, ok in checks:
    status = "✓" if ok else "✗ FAILED"
    print(f"  {status}  {label}")
    if not ok:
        all_ok = False

if not all_ok:
    print("\nAborting — file not written.")
    exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
