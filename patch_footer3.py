#!/usr/bin/env python3
"""Add /about.html to footer company column"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Insert About link before Insights in the company column
old = '<a href="/insights/" class="flink">Insights</a>'
new = '<a href="/about.html" class="flink">About</a>\n      <a href="/insights/" class="flink">Insights</a>'

footer_start = html.find('<footer id="footer">')
footer_end = html.find('</footer>') + 9
footer = html[footer_start:footer_end]

if old in footer:
    footer = footer.replace(old, new, 1)
    html = html[:footer_start] + footer + html[footer_end:]
    print("  ✓  /about.html added to footer")
else:
    print("  ✗  Insights flink not found in footer")
    exit(1)

# Verify
footer_check = html[html.find('<footer id="footer">'):html.find('</footer>') + 9]
for item in ["/about.html", "/insights/", "/pricing.html", "/privacy.html", "/terms.html", "+65 9696 0063"]:
    ok = item in footer_check
    print(f"  {'✓' if ok else '✗'}  {item}")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. ({len(html):,} chars)")
