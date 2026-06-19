#!/usr/bin/env python3
"""Fix W2-H: reorder SEO pricing cards — Dominance first, Growth second, Essentials last"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# The cards as they currently exist in the file (Foundation already renamed to Essentials)
essentials_card = '''      <div class="svc-card">
        <div class="svc-top">
          <div class="svc-name" style="color:var(--teal)">Essentials</div>
          <div class="svc-price">S$1,200<span>/mo</span></div>
          
          <div class="svc-desc">Google Maps dominance for single-location trades. Maps is 90% of their inbound — done right.</div>
        </div>
        <div class="svc-body">
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>Full 12-week GBP workflow</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>99-service list + descriptions</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>Title tag, H1/H2, schema, NAP</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>Core citations (Bing, Apple, Foursquare)</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>Weekly GBP post copy</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--teal)">✓</span>Monthly ranking report</div>
        </div>
        <div class="svc-foot"><a href="#audit" class="svc-cta">Start with Free Audit →</a></div>
      </div>'''

growth_card = '''      <div class="svc-card featured">
        <div class="svc-top" style="background:rgba(232,160,32,0.04)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div class="svc-name" style="color:var(--amber);margin-bottom:0">Growth</div>
            <span class="badge badge-amber" style="font-size:9px">Most Popular</span>
          </div>
          <div class="svc-price">S$2,400<span>/mo</span></div>
          
          <div class="svc-desc">Full local dominance — Maps, Carousell, Facebook Groups, reputation, and 11 content pages.</div>
        </div>
        <div class="svc-body">
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span><strong>Everything in Foundation</strong>, plus:</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>Carousell management</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>Facebook Groups monitoring</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>HWZ &amp; Reddit brand monitoring</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>Vertical platform profile</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>6 service + 5 area pages written</div>
          <div class="svc-feat"><span class="svc-check" style="color:var(--amber)">✓</span>Citation expansion</div>
        </div>
        <div class="svc-foot"><a href="#audit" class="svc-cta pri">Start with Free Audit →</a></div>
      </div>'''

dominance_card = '''      <div class="svc-card">
        <div class="svc-top">
          <div class="svc-name" style="color:#A78BFA">Dominance</div>
          <div class="svc-price">S$4,200<span>/mo</span></div>
          
          <div class="svc-desc">Full multi-channel stack: Instagram, Lemon8, Telegram, social content, and competitive intelligence.</div>
        </div>
        <div class="svc-body">
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span><strong>Everything in Growth</strong>, plus:</div>
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span>Instagram + Lemon8 content (20/mo)</div>
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span>12 service + 10 area pages</div>
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span>Telegram retention channel</div>
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span>Weekly competitive intelligence</div>
          <div class="svc-feat"><span class="svc-check" style="color:#A78BFA">✓</span>Quarterly strategy call</div>
        </div>
        <div class="svc-foot"><a href="#audit" class="svc-cta">Start with Free Audit →</a></div>
      </div>'''

old_panel = f'''    <!-- SEO PANEL -->
    <div class="svc-panel active" id="panel-seo">
{essentials_card}

{growth_card}

{dominance_card}
    </div>'''

new_panel = f'''    <!-- SEO PANEL -->
    <div class="svc-panel active" id="panel-seo">
{dominance_card}

{growth_card}

{essentials_card}
    </div>'''

if old_panel in html:
    html = html.replace(old_panel, new_panel)
    print("  ✓  Panel matched and replaced")
else:
    # Fallback: confirm what's at the panel position
    idx = html.find('id="panel-seo"')
    print(f"  ✗  Panel not matched. 'panel-seo' found at index {idx}")
    print("  Showing 200 chars from that position:")
    print(repr(html[idx:idx+200]))
    exit(1)

# Verify
check = html.index('S$4,200') < html.index('S$2,400') < html.index('S$1,200')
print(f"  {'✓' if check else '✗'}  W2-H: Dominance (S$4,200) → Growth (S$2,400) → Essentials (S$1,200)")

if not check:
    print("Aborting.")
    exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
