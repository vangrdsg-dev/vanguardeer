#!/usr/bin/env python3
"""Fix homepage footer: background colour + contact spacing to match other pages"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changes = []

# ── 1. Footer background — add background:var(--bg2) ─────────────────────────
old_footer_style = '#footer{padding:48px 0 24px;border-top:1px solid var(--border)}'
new_footer_style = '#footer{padding:48px 0 24px;border-top:1px solid var(--border);background:var(--bg2)}'

if old_footer_style in html:
    html = html.replace(old_footer_style, new_footer_style, 1)
    changes.append("✓  Footer background set to var(--bg2)")
else:
    # Try alternate — might have different whitespace
    import re
    html, n = re.subn(
        r'#footer\{padding:48px 0 24px;border-top:1px solid var\(--border\)\}',
        '#footer{padding:48px 0 24px;border-top:1px solid var(--border);background:var(--bg2)}',
        html, count=1
    )
    if n:
        changes.append("✓  Footer background set (regex)")
    else:
        changes.append("✗  Footer CSS not matched")

# ── 2. fcontact spacing — match shared.css (margin-bottom:8px, gap:8px) ──────
old_fcontact = '.fcontact{display:flex;align-items:center;gap:8px;margin-bottom:9px;font-size:13px;color:var(--text2)'
new_fcontact = '.fcontact{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:var(--text2)'

if old_fcontact in html:
    html = html.replace(old_fcontact, new_fcontact, 1)
    changes.append("✓  fcontact margin-bottom: 9px → 8px")
else:
    changes.append("—  fcontact spacing already correct or different pattern")

# ── 3. footer-grid — match shared.css exactly ─────────────────────────────────
old_footer_grid = '.footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:32px;margin-bottom:32px}'
new_footer_grid = '.footer-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:44px;margin-bottom:32px}'

if old_footer_grid in html:
    html = html.replace(old_footer_grid, new_footer_grid, 1)
    changes.append("✓  footer-grid gap: 32px → 44px (matches shared.css)")
else:
    changes.append("—  footer-grid gap already correct or different pattern")

# ── 4. footer-brand-desc max-width — match shared.css ────────────────────────
old_desc = '.footer-brand-desc{font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:14px}'
new_desc = '.footer-brand-desc{font-size:13px;color:var(--text2);line-height:1.7;max-width:280px;margin-bottom:16px}'

if old_desc in html:
    html = html.replace(old_desc, new_desc, 1)
    changes.append("✓  footer-brand-desc: added max-width:280px, margin-bottom:16px")
else:
    changes.append("—  footer-brand-desc already correct or different")

# ── Verify ────────────────────────────────────────────────────────────────────
print("\nFooter fix results:")
for c in changes:
    print(f"  {c}")

checks = [
    ("bg2 in footer CSS", "background:var(--bg2)" in html[html.find('#footer'):html.find('#footer')+100]),
]
for label, ok in checks:
    print(f"  {'✓' if ok else '✗'}  {label}")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"\nDone. ({len(html):,} chars)")
