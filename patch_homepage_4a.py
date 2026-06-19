#!/usr/bin/env python3
"""Homepage Phase 4A patch — nav, article cards, footer, services view-all link"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

changes = []

# ── 1. Desktop nav — add Pricing, update Insights link ───────────────────────
old_nav = '''      <a href="#results" class="nav-link">Results</a>
      <a href="#articles" class="nav-link">Insights</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#faq" class="nav-link">FAQ</a>
      <a href="#audit" class="btn btn-teal btn-sm" style="margin-left:10px">Free Audit →</a>'''

new_nav = '''      <a href="#results" class="nav-link">Results</a>
      <a href="/insights/" class="nav-link">Insights</a>
      <a href="/about.html" class="nav-link">About</a>
      <a href="/pricing.html" class="nav-link">Pricing</a>
      <a href="/audit.html" class="btn btn-teal btn-sm" style="margin-left:10px">Free Audit →</a>'''

if old_nav in html:
    html = html.replace(old_nav, new_nav, 1)
    changes.append("✓  Nav desktop links updated")
else:
    changes.append("✗  Nav desktop — not matched")

# ── 2. Mobile drawer — add Pricing, update Insights + CTA links ──────────────
old_drawer = '''  <a href="#results" class="nav-link">Results</a>
  <a href="#articles" class="nav-link">Insights</a>
  <a href="#about" class="nav-link">About Azam</a>
  <a href="#faq" class="nav-link">FAQ</a>
  <a href="#audit" class="btn btn-teal btn-lg">Get Free Audit (S$299 value)</a>'''

new_drawer = '''  <a href="#results" class="nav-link">Results</a>
  <a href="/insights/" class="nav-link">Insights</a>
  <a href="/about.html" class="nav-link">About</a>
  <a href="/pricing.html" class="nav-link">Pricing</a>
  <a href="/audit.html" class="btn btn-teal btn-lg">Get Free Audit (S$299 value)</a>'''

if old_drawer in html:
    html = html.replace(old_drawer, new_drawer, 1)
    changes.append("✓  Mobile drawer updated")
else:
    changes.append("✗  Mobile drawer — not matched")

# ── 3. Hero CTA — point to /audit.html ───────────────────────────────────────
old_hero_cta = '          <a href="#audit" class="btn btn-teal btn-lg">Get Your Free Audit →</a>'
new_hero_cta = '          <a href="/audit.html" class="btn btn-teal btn-lg">Get Your Free Audit →</a>'

if old_hero_cta in html:
    html = html.replace(old_hero_cta, new_hero_cta, 1)
    changes.append("✓  Hero CTA updated to /audit.html")
else:
    changes.append("✗  Hero CTA — not matched")

# ── 4. Add "View all pricing →" link below services section ──────────────────
old_view_all = '''    
  </div>
</section>

<!-- FREE AUDIT SECTION -->'''

new_view_all = '''    <div class="view-all-row">
      <a href="/pricing.html" class="btn btn-outline" style="font-size:13px">View full pricing &amp; all packages →</a>
    </div>
  </div>
</section>

<!-- FREE AUDIT SECTION -->'''

if old_view_all in html:
    html = html.replace(old_view_all, new_view_all, 1)
    changes.append("✓  Services view-all pricing link added")
else:
    changes.append("✗  Services view-all — not matched")

# ── 5. Article cards — replace all 3 with real article links ─────────────────
old_articles = '''<section id="articles" class="section alt">
  <div class="container">
    <div class="sh">
      <span class="badge badge-ghost">Fresh thinking</span>
      <h2>What we're seeing in<br>Singapore right now.</h2>
      <p>Practical insights on local SEO, conversion optimisation, and AI-driven growth — updated monthly.</p>
    </div>
    <div class="articles-grid">'''

new_articles = '''<section id="articles" class="section alt">
  <div class="container">
    <div class="sh">
      <span class="badge badge-ghost">Fresh thinking</span>
      <h2>What we're seeing in<br>Singapore right now.</h2>
      <p>Practical guides on local SEO, conversion optimisation, and Google Maps ranking — written for Singapore business owners.</p>
    </div>
    <div class="articles-grid">'''

if old_articles in html:
    html = html.replace(old_articles, new_articles, 1)
    changes.append("✓  Articles section header updated")
else:
    changes.append("✗  Articles section header — not matched, checking alternate")

# Find and replace the three article cards
old_cards = '''      <a class="article-card" href="/insights/google-maps-ranking-singapore.html">
        <div class="article-cat" style="color:#C8A44D">LOCAL SEO · GOOGLE MAPS</div>
        <div class="article-body">
          <div class="article-title">Why your Google Maps rank is costing you S$3,000+ a month — and 5 fixes you can do this week</div>
          <div class="article-excerpt">94% of local searches happen on Google. If you're not in the top 3 on Maps for your primary keyword, you're paying competitors' marketing budget. Here's exactly what's holding you back and how to fix each gap.</div>
        </div>
        <div class="article-meta"><span class="article-date">June 2026 · 8 min read</span><span class="article-read">Read →</span></div>
      </a>

      <a class="article-card" href="/insights/conversion-leaks-singapore-sme.html">
        <div class="article-cat" style="color:#22C55E">CRO · CONVERSION</div>
        <div class="article-body">
          <div class="article-title">The 7 conversion leaks I find on every Singapore SME website (and how to plug them without a redesign)</div>
          <div class="article-excerpt">After auditing dozens of Singapore business websites, the same seven problems appear almost every time. None of them require an expensive redesign. Most take under an hour to fix once you know where to look.</div>
        </div>
        <div class="article-meta"><span class="article-date">May 2026 · 11 min read</span><span class="article-read">Read →</span></div>
      </a>

      <a class="article-card" href="/insights/google-reviews-singapore.html">
        <div class="article-cat" style="color:#A78BFA">REPUTATION · REVIEWS</div>
        <div class="article-body">
          <div class="article-title">Why Google reviews are worth more than ads — and how Singapore SMEs can get 3x more of them without asking awkwardly</div>
          <div class="article-excerpt">A business with 80 reviews and a 4.8 rating gets more clicks than one with 12 reviews and a 5.0. Here is the exact review acquisition system we use with clients — automated, compliant, and effective from week one.</div>
        </div>
        <div class="article-meta"><span class="article-date">May 2026 · 6 min read</span><span class="article-read">Read →</span></div>
      </a>'''

# Check what's actually in the file for article cards
if old_cards in html:
    html = html.replace(old_cards, old_cards, 1)  # no-op, already correct
    changes.append("✓  Article cards already correct")
else:
    # Find whatever article card block exists and replace it
    import re
    # Find the articles-grid div content
    grid_start = html.find('<div class="articles-grid">')
    grid_end = html.find('</div>', html.find('articles-cta', grid_start))
    
    if grid_start != -1:
        new_cards_block = '''<div class="articles-grid">
      <a class="article-card" href="/insights/google-maps-rank-cost-singapore.html">
        <div class="article-cat" style="color:#C8A44D">LOCAL SEO · GOOGLE MAPS</div>
        <div class="article-body">
          <div class="article-title">Why your Google Maps rank is costing you S$3,000+ a month — and 5 fixes you can do this week</div>
          <div class="article-excerpt">94% of local searches happen on Google. If you're not in the top 3 on Maps for your primary keyword, you're paying competitors' marketing budget. Here's exactly what's holding you back and how to fix each gap.</div>
        </div>
        <div class="article-meta"><span class="article-date">June 2026 · 8 min read</span><span class="article-read">Read →</span></div>
      </a>

      <a class="article-card" href="/insights/conversion-leaks-singapore-sme.html">
        <div class="article-cat" style="color:#22C55E">CRO · CONVERSION</div>
        <div class="article-body">
          <div class="article-title">The 7 conversion leaks I find on every Singapore SME website (and how to plug them without a redesign)</div>
          <div class="article-excerpt">After auditing dozens of Singapore business websites, the same seven problems appear almost every time. None of them require an expensive redesign. Most take under an hour to fix once you know where to look.</div>
        </div>
        <div class="article-meta"><span class="article-date">May 2026 · 11 min read</span><span class="article-read">Read →</span></div>
      </a>

      <a class="article-card" href="/insights/google-reviews-singapore.html">
        <div class="article-cat" style="color:#A78BFA">REPUTATION · REVIEWS</div>
        <div class="article-body">
          <div class="article-title">Why Google reviews are worth more than ads — and how Singapore SMEs can get 3x more of them without asking awkwardly</div>
          <div class="article-excerpt">A business with 80 reviews and a 4.8 rating gets more clicks than one with 12 reviews and a 5.0. Here is the exact review acquisition system we use — automated, compliant, and effective from week one.</div>
        </div>
        <div class="article-meta"><span class="article-date">May 2026 · 6 min read</span><span class="article-read">Read →</span></div>
      </a>
    </div>
    <div class="articles-cta">
      <a href="/insights/" class="btn btn-outline">See all 7 articles →</a>
    </div>'''

        # Find the full grid block to replace
        grid_block_start = html.rfind('\n', 0, grid_start) + 1
        # Find end of articles-cta div
        cta_end = html.find('</div>', html.find('articles-cta'))
        cta_end = html.find('</div>', cta_end + 1)  # closing the section inner div
        
        # Just replace from grid_start to after articles-cta
        articles_cta_start = html.find('<div class="articles-cta">', grid_start)
        articles_cta_end = html.find('</div>', articles_cta_start) + 6
        
        old_block = html[grid_start:articles_cta_end]
        html = html[:grid_start] + new_cards_block + html[articles_cta_end:]
        changes.append("✓  Article cards replaced with real links + view all")
    else:
        changes.append("✗  Article cards grid — could not locate")

# ── 6. Footer — add Pricing link + phone number ───────────────────────────────
old_footer_links = '''      <div class="fcol-title">Services</div>
      <a class="flink" href="#services">Local SEO</a>
      <a class="flink" href="#services">CRO</a>
      <a class="flink" href="#audit">Free Audit</a>'''

new_footer_links = '''      <div class="fcol-title">Services</div>
      <a class="flink" href="/pricing.html">Local SEO</a>
      <a class="flink" href="/pricing.html">CRO</a>
      <a class="flink" href="/pricing.html#full-growth-system">Full Growth System</a>
      <a class="flink" href="/audit.html">Free Audit</a>'''

if old_footer_links in html:
    html = html.replace(old_footer_links, new_footer_links, 1)
    changes.append("✓  Footer services links updated")
else:
    changes.append("✗  Footer services links — not matched")

old_footer_nav = '''      <div class="fcol-title">Company</div>
      <a class="flink" href="#about">About Azam</a>
      <a class="flink" href="#articles">Insights</a>
      <a class="flink" href="#faq">FAQ</a>'''

new_footer_nav = '''      <div class="fcol-title">Company</div>
      <a class="flink" href="/about.html">About</a>
      <a class="flink" href="/insights/">Insights</a>
      <a class="flink" href="/pricing.html">Pricing</a>
      <a class="flink" href="/privacy.html">Privacy Policy</a>
      <a class="flink" href="/terms.html">Terms of Service</a>'''

if old_footer_nav in html:
    html = html.replace(old_footer_nav, new_footer_nav, 1)
    changes.append("✓  Footer nav links updated")
else:
    changes.append("✗  Footer nav links — not matched")

# Add phone number to footer brand column
old_footer_brand = '''      <div class="footer-brand-desc">Local SEO and CRO for Singapore and ASEAN SMEs. We fix why customers can't find you — and why they don't convert when they do.</div>'''
new_footer_brand = '''      <div class="footer-brand-desc">Local SEO and CRO for Singapore SMEs. We fix why customers can't find you — and why they don't convert when they do.</div>
      <div class="fcontact"><span class="fcontact-icon">📞</span><a href="tel:+6596960063" style="color:var(--text2)">+65 9696 0063</a></div>
      <div class="fcontact"><span class="fcontact-icon">✉️</span><a href="mailto:enquiries@vanguardeer.com" style="color:var(--text2)">enquiries@vanguardeer.com</a></div>'''

if old_footer_brand in html:
    html = html.replace(old_footer_brand, new_footer_brand, 1)
    changes.append("✓  Footer phone + email added")
else:
    changes.append("✗  Footer brand desc — not matched")

# ── 7. Announcement bar CTA → /audit.html ─────────────────────────────────────
old_bar = '''  <span class="bar-full">⚡&nbsp; Currently accepting 3 new clients for July 2026 —&nbsp;<a href="#audit">Claim your free Digital Footprint Audit (worth S$299) →</a></span>
  <span class="bar-mobile"><a href="#audit">⚡ Free Audit · S$299 value — Claim →</a></span>'''

new_bar = '''  <span class="bar-full">⚡&nbsp; Currently accepting 3 new clients for July 2026 —&nbsp;<a href="/audit.html">Claim your free Digital Footprint Audit (worth S$299) →</a></span>
  <span class="bar-mobile"><a href="/audit.html">⚡ Free Audit · S$299 value — Claim →</a></span>'''

if old_bar in html:
    html = html.replace(old_bar, new_bar, 1)
    changes.append("✓  Announcement bar CTA updated")
else:
    changes.append("✗  Announcement bar — not matched")

# ── Report ────────────────────────────────────────────────────────────────────
print("\nHomepage patch results:")
all_ok = True
for c in changes:
    print(f"  {c}")
    if c.startswith("  ✗"):
        all_ok = False

if not all_ok:
    print("\n⚠  Some changes did not match — file written with partial changes.")
else:
    print("\n✓  All changes applied.")

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
