#!/usr/bin/env python3
"""Fix W2-H + W2-I: scope card extraction strictly to the SEO panel"""
import subprocess, sys

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

subprocess.run(["chmod", "644", path], check=True)

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# ── Isolate the SEO panel only ────────────────────────────────────────────────
panel_open  = 'id="panel-seo">'
panel_close = '<!-- CRO PANEL -->'

ps = html.find(panel_open) + len(panel_open)
pe = html.find(panel_close)

if ps == -1 or pe == -1:
    print("  ✗  Could not find panel-seo boundaries"); sys.exit(1)

panel = html[ps:pe]

# ── Extract a card by its unique price string inside the panel ────────────────
def get_card(panel_str, price_str):
    p = panel_str.find(price_str)
    if p == -1:
        return None, -1, -1
    # Walk back to nearest <div class="svc-card
    start = panel_str.rfind('<div class="svc-card', 0, p)
    if start == -1:
        return None, -1, -1
    # Count nested divs forward to find card close
    depth, pos = 0, start
    while pos < len(panel_str):
        if panel_str[pos:pos+4] == '<div':
            depth += 1; pos += 4
        elif panel_str[pos:pos+6] == '</div>':
            depth -= 1; pos += 6
            if depth == 0:
                return panel_str[start:pos], start, pos
        else:
            pos += 1
    return None, -1, -1

foundation, f0, f1 = get_card(panel, 'S$1,200<span>/mo</span>')
growth,     g0, g1 = get_card(panel, 'S$2,400<span>/mo</span>')
dominance,  d0, d1 = get_card(panel, 'S$4,200<span>/mo</span>')

for name, card in [("Foundation", foundation), ("Growth", growth), ("Dominance", dominance)]:
    print(f"  {'✓' if card else '✗'}  {name} card {'extracted' if card else 'MISSING'}")

if not all([foundation, growth, dominance]):
    sys.exit(1)

# Verify order before reorder
print(f"  Current order by position: f0={f0} g0={g0} d0={d0}")
print(f"  Current order: {'Foundation→Growth→Dominance' if f0<g0<d0 else 'unexpected'}")

# Rename Foundation → Essentials
essentials = foundation.replace('>Foundation</div>', '>Essentials</div>', 1)

# Rebuild panel: replace everything from first to last card with new order
first = min(f0, g0, d0)
last  = max(f1, g1, d1)

# Preserve any whitespace/newlines before first card
new_cards = dominance + "\n\n" + growth + "\n\n" + essentials

new_panel = panel[:first] + new_cards + panel[last:]

# Reconstruct full html
html = html[:ps] + new_panel + html[pe:]

# ── Verify using panel-scoped positions ──────────────────────────────────────
new_ps = html.find(panel_open) + len(panel_open)
new_pe = html.find(panel_close)
new_panel_check = html[new_ps:new_pe]

d_pos = new_panel_check.find('S$4,200')
g_pos = new_panel_check.find('S$2,400')
e_pos = new_panel_check.find('S$1,200')

checks = [
    ("W2-H Dominance first (panel-scoped)", d_pos != -1 and g_pos != -1 and e_pos != -1 and d_pos < g_pos < e_pos),
    ("W2-I Essentials label",               '>Essentials</div>' in new_panel_check),
    ("Foundation label gone from panel",    '>Foundation</div>' not in new_panel_check),
    ("Growth card intact",                  'color:var(--amber);margin-bottom:0">Growth</div>' in new_panel_check),
]

all_ok = True
for label, ok in checks:
    print(f"  {'✓' if ok else '✗ FAILED'}  {label}")
    if not ok:
        all_ok = False

if not all_ok:
    print(f"\n  Debug: d_pos={d_pos} g_pos={g_pos} e_pos={e_pos}")
    print("Aborting — file not written.")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
