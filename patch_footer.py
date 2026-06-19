#!/usr/bin/env python3
"""Fix homepage footer — exact strings from line 1210+ of index.html"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changes = []

# ── Footer brand desc (line 1215) ────────────────────────────────────────────
old_brand = '<div class="footer-brand-desc">CRO consultancy and AI-powered Local SEO for Singapore and ASEAN SMEs. We fix why customers can\'t find you — and why they don\'t convert when they do.</div>'
new_brand = '''<div class="footer-brand-desc">Local SEO and CRO for Singapore SMEs. We fix why customers can't find you — and why they don't convert when they do.</div>
      <div class="fcontact"><span class="fcontact-icon">📞</span><a href="tel:+6596960063" style="color:var(--text2)">+65 9696 0063</a></div>
      <div class="fcontact"><span class="fcontact-icon">✉️</span><a href="mailto:enquiries@vanguardeer.com" style="color:var(--text2)">enquiries@vanguardeer.com</a></div>'''

if old_brand in html:
    html = html.replace(old_brand, new_brand, 1)
    changes.append("✓  Footer brand desc + phone/email added")
else:
    changes.append("✗  Footer brand desc — not matched")

# ── Footer services column (line 1218–1219+) ─────────────────────────────────
old_svc = '''fcol-title">Services</div>
      <a href="#services" class="flink">Local SEO — Foundation</a>'''

new_svc = '''fcol-title">Services</div>
      <a href="/pricing.html" class="flink">Local SEO</a>'''

if old_svc in html:
    html = html.replace(old_svc, new_svc, 1)
    changes.append("✓  Footer services first link fixed")
else:
    changes.append("✗  Footer services first link — not matched")

# Fix remaining footer service links
old_svc2 = '''      <a href="#services" class="flink">Local SEO — Growth</a>
      <a href="#services" class="flink">CRO — Audit</a>
      <a href="#services" class="flink">CRO — Retainer</a>
      <a href="#audit" class="flink">Free Audit</a>'''
new_svc2 = '''      <a href="/pricing.html" class="flink">CRO</a>
      <a href="/pricing.html#full-growth-system" class="flink">Full Growth System</a>
      <a href="/audit.html" class="flink">Free Audit</a>'''

if old_svc2 in html:
    html = html.replace(old_svc2, new_svc2, 1)
    changes.append("✓  Footer services remaining links fixed")
else:
    # Try alternate — just find and replace any remaining #services flinks
    import re
    # Count how many we need to fix
    old_svc2b = '      <a href="#services" class="flink">'
    count = html.count(old_svc2b)
    if count > 0:
        html = html.replace(old_svc2b, '      <a href="/pricing.html" class="flink">', count)
        changes.append(f"✓  Footer services links fixed ({count} replaced)")
    else:
        changes.append("✗  Footer services remaining links — not matched")

# ── Footer company column ─────────────────────────────────────────────────────
old_company = '''fcol-title">Company</div>
      <a href="#about" class="flink">About Azam</a>
      <a href="#articles" class="flink">Insights</a>
      <a href="#faq" class="flink">FAQ</a>'''
new_company = '''fcol-title">Company</div>
      <a href="/about.html" class="flink">About</a>
      <a href="/insights/" class="flink">Insights</a>
      <a href="/pricing.html" class="flink">Pricing</a>
      <a href="/privacy.html" class="flink">Privacy Policy</a>
      <a href="/terms.html" class="flink">Terms of Service</a>'''

if old_company in html:
    html = html.replace(old_company, new_company, 1)
    changes.append("✓  Footer company links updated")
else:
    changes.append("✗  Footer company links — not matched")

# ── Footer bottom copyright ───────────────────────────────────────────────────
old_bottom = '      <div class="footer-bottom">'
new_bottom_check = 'Privacy' in html[html.find('footer-bottom'):]

# Add privacy/terms links if not already there
if 'footer-bottom' in html:
    old_fb = html[html.find('<div class="footer-bottom">'):html.find('</div>', html.find('<div class="footer-bottom">')) + 6]
    if 'Privacy' not in old_fb:
        new_fb = '''<div class="footer-bottom">
      <span>© 2026 Vanguardeer. All rights reserved.</span>
      <span><a href="/privacy.html" style="color:var(--text3)">Privacy</a> · <a href="/terms.html" style="color:var(--text3)">Terms</a></span>
    </div>'''
        html = html.replace(old_fb, new_fb, 1)
        changes.append("✓  Footer bottom copyright/privacy links updated")
    else:
        changes.append("✓  Footer bottom already has privacy links")

# ── Verify ────────────────────────────────────────────────────────────────────
print("\nFooter patch results:")
all_ok = True
for c in changes:
    print(f"  {c}")
    if c.startswith("  ✗"):
        all_ok = False

# Quick sanity checks
footer_idx = html.find('<footer') if '<footer' in html else html.find('id="footer"')
footer_section = html[footer_idx:footer_idx+2000] if footer_idx != -1 else ""

checks = [
    ("Phone in footer", "+65 9696 0063" in footer_section),
    ("Pricing link in footer", "/pricing.html" in footer_section),
    ("Privacy link in footer", "/privacy.html" in footer_section),
    ("About.html in footer", "/about.html" in footer_section),
]
print("\n  Verification:")
for label, ok in checks:
    print(f"  {'✓' if ok else '✗'}  {label}")
    if not ok:
        all_ok = False

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
