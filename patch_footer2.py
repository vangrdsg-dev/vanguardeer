#!/usr/bin/env python3
"""Final footer fix — replace company column and add privacy/terms links"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Find the footer section
footer_start = html.find('<footer id="footer">')
if footer_start == -1:
    print("✗ Could not find footer"); exit(1)

footer_html = html[footer_start:]

# ── Fix company column ────────────────────────────────────────────────────────
# The company column has anchor links to #about, #articles, #faq
# Find and replace those specific hrefs within the footer only

replacements = [
    ('href="#about"', 'href="/about.html"'),
    ('href="#articles"', 'href="/insights/"'),
    ('href="#faq"', 'href="/pricing.html"'),
]

for old, new in replacements:
    if old in footer_html:
        footer_html = footer_html.replace(old, new)
        print(f"  ✓  {old} → {new}")
    else:
        print(f"  ✗  {old} — not found in footer")

# ── Add Privacy / Terms to company column ─────────────────────────────────────
# Find the last flink in the company column and add after it
# The company column ends with the #faq link (now /pricing.html)
# We'll find the FAQ/pricing flink and add privacy/terms after it

old_last_flink = '<a href="/pricing.html" class="flink">FAQ</a>'
new_last_flinks = '''<a href="/pricing.html" class="flink">FAQ</a>
      <a href="/privacy.html" class="flink">Privacy Policy</a>
      <a href="/terms.html" class="flink">Terms of Service</a>'''

if old_last_flink in footer_html:
    footer_html = footer_html.replace(old_last_flink, new_last_flinks, 1)
    print("  ✓  Privacy + Terms links added to company column")
else:
    # Try without FAQ label - maybe it was already changed to something else
    # Just find the pattern of the third column's closing div
    print("  ✗  FAQ flink not found — trying alternate approach")
    # Find any remaining #about href references
    remaining = [h for h in ['#about', '#articles', '#faq'] if h in footer_html]
    print(f"  Remaining anchor links in footer: {remaining}")

# Reconstruct full html
html = html[:footer_start] + footer_html

# ── Verify ────────────────────────────────────────────────────────────────────
footer_check = html[html.find('<footer id="footer">'):html.find('</footer>') + 9]
checks = [
    ("Phone", "+65 9696 0063" in footer_check),
    ("/pricing.html", "/pricing.html" in footer_check),
    ("/about.html", "/about.html" in footer_check),
    ("/insights/", "/insights/" in footer_check),
    ("/privacy.html", "/privacy.html" in footer_check),
    ("/terms.html", "/terms.html" in footer_check),
    ("No #about left", "#about" not in footer_check),
    ("No #articles left", "#articles" not in footer_check),
]

print("\n  Verification:")
all_ok = True
for label, ok in checks:
    print(f"  {'✓' if ok else '✗'}  {label}")
    if not ok:
        all_ok = False

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
