#!/usr/bin/env python3
"""Replace footer Get In Touch column with Company nav column — exact indentation"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

old_col = '''      <div>
        <div class="fcol-title">Get In Touch</div>
        <div class="fcontact"><span class="fcontact-icon">✉</span><span id="footer-email">—</span></div>
        <div class="fcontact"><span class="fcontact-icon">📍</span><span>Singapore · ASEAN</span></div>'''

new_col = '''      <div>
        <div class="fcol-title">Company</div>
        <a href="/about.html" class="flink">About</a>
        <a href="/insights/" class="flink">Insights</a>
        <a href="/pricing.html" class="flink">Pricing</a>
        <a href="/privacy.html" class="flink">Privacy Policy</a>
        <a href="/terms.html" class="flink">Terms of Service</a>'''

if old_col in html:
    html = html.replace(old_col, new_col, 1)
    print("  ✓  Footer company column replaced")
else:
    print("  ✗  Still not matching — raw bytes:")
    idx = html.find('Get In Touch')
    print(repr(html[idx-100:idx+300]))
    exit(1)

# Verify
footer = html[html.find('<footer id="footer">'):html.find('</footer>')+9]
for label, ok in [
    ("/about.html in footer", "/about.html" in footer),
    ("/insights/ in footer", "/insights/" in footer),
    ("/privacy.html in footer", "/privacy.html" in footer),
    ("/terms.html in footer", "/terms.html" in footer),
    ("+65 9696 0063 in footer", "+65 9696 0063" in footer),
    ("Get In Touch gone", "Get In Touch" not in footer),
]:
    print(f"  {'✓' if ok else '✗'}  {label}")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"\nDone. ({len(html):,} chars)")
