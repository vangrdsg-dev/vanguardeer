#!/usr/bin/env python3
"""Week 2 CRO/SEO patch — W2-A through W2-K"""

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# ── W2-A: Hero H1 — lead with prospect pain ───────────────────────────────────
html = html.replace(
    '''        <h1 class="hero-h1">
          Most Singapore<br>businesses are losing<br>revenue in
          <span class="hl-amber">two places</span><br>at once.<br>
          <span class="hl-teal">We fix both.</span>
        </h1>
        <p class="hero-sub">Your website isn't converting enough visitors. And Google Maps isn't sending you enough of them. Vanguardeer closes both gaps — with AI systems built to run without you.</p>''',
    '''        <h1 class="hero-h1">
          Your website isn't<br>converting. Google Maps<br>isn't
          <span class="hl-amber">sending traffic.</span><br>
          <span class="hl-teal">One system fixes both.</span>
        </h1>
        <p class="hero-sub">Singapore SMEs lose thousands every month to invisible Maps rankings and leaking funnels. Vanguardeer closes both gaps simultaneously — using AI automation that runs without you.</p>'''
)

# ── W2-B: Reduce above-fold CTAs to 1 primary + 1 ghost text link ─────────────
html = html.replace(
    '''        <div class="hero-ctas">
          <a href="#audit" class="btn btn-teal btn-lg">Get Your Free Audit →</a>
          <a href="#how" class="btn btn-outline">See how it works</a>
        </div>''',
    '''        <div class="hero-ctas">
          <a href="#audit" class="btn btn-teal btn-lg">Get Your Free Audit →</a>
          <a href="#how" style="font-size:13px;color:rgba(255,255,255,0.55);text-decoration:underline;text-underline-offset:3px;align-self:center;padding:4px 0">See how it works</a>
        </div>'''
)

# ── W2-F: Add concrete AI example to hero subtext (already updated in W2-A) ───
# Covered — the new hero-sub now references "AI automation that runs without you"
# For the Google segment subtext, update similarly:
html = html.replace(
    '''        <p class="hero-sub">We ranked on Page 1 for competitive Singapore terms. We'll build the same system for your business — starting with a free audit.</p>''',
    '''        <p class="hero-sub">We ranked on Page 1 for competitive Singapore terms using the same AI system we build for clients — weekly GBP posts, review monitoring, and competitor alerts, all automated. Starting with a free audit.</p>'''
)

# ── W2-J: OG title alignment ───────────────────────────────────────────────────
html = html.replace(
    '<meta property="og:title" content="Vanguardeer — Local Market Dominance for Singapore SMEs">',
    '<meta property="og:title" content="Conversion Rate Optimisation &amp; Local SEO Agency Singapore | Vanguardeer">'
)

# ── W2-K: Fix btn-teal CSS (currently identical to btn-amber, renders gold) ───
html = html.replace(
    '.btn-teal{background:var(--amber);color:#0B1F3A;box-shadow:0 0 24px rgba(200,164,77,0.25)}\n.btn-teal:hover{background:var(--amber2);box-shadow:0 0 32px rgba(200,164,77,0.4);transform:translateY(-1px)}',
    '.btn-teal{background:#0B1F3A;color:#FFFFFF;box-shadow:0 0 24px rgba(11,31,58,0.25)}\n.btn-teal:hover{background:#1A3A60;box-shadow:0 0 32px rgba(11,31,58,0.4);transform:translateY(-1px)}'
)

# ── W2-G: Proof bar — trim to 3 most relevant stats, tie to named clients ─────
html = html.replace(
    '''<!-- PROOF BAR -->
<div id="proof-bar">
  <div class="container pbar">
    <div class="pstat"><div class="pstat-num"><span class="a">25</span>+</div><div class="pstat-label">Years experience</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="a">S$2M</span></div><div class="pstat-label">Revenue from S$5K campaign</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="t">400×</span></div><div class="pstat-label">ROAS on SEM campaign</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="t">S$1M+</span></div><div class="pstat-label">Software cost savings</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="a">+30%</span></div><div class="pstat-label">Revenue lift in 6 months</div></div>
  </div>
</div>''',
    '''<!-- PROOF BAR -->
<div id="proof-bar">
  <div class="container pbar">
    <div class="pstat"><div class="pstat-num"><span class="a">400×</span></div><div class="pstat-label">ROAS · Global Sources SEM</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="a">+30%</span></div><div class="pstat-label">Revenue lift · Tuscani Tapware</div></div>
    <div class="pdiv"></div>
    <div class="pstat"><div class="pstat-num"><span class="t">S$1M+</span></div><div class="pstat-label">Cost savings · Ethis Group</div></div>
  </div>
</div>'''
)

# ── W2-C: Move Tuscani Tapware card to first position in results grid ──────────
tuscani = '''      <div class="res-card g">
        <div class="res-industry">Tuscani Tapware · Retail</div>
        <div class="res-metric">+30%</div>
        <div class="res-metric-label">Revenue lift in 6 months from negative cashflow</div>
        <div class="res-quote">"The business was bleeding when Azam came in. He found the conversion leaks in the first week and we were cashflow positive within the quarter."</div>
        <div class="res-attr">Director · Tuscani Tapware Singapore</div>
      </div>'''

global_sources = '''      <div class="res-card a">
        <div class="res-industry">Global Sources · B2B Exhibition</div>
        <div class="res-metric">400×</div>
        <div class="res-metric-label">Return on SEM campaign spend</div>
        <div class="res-quote">"S$5,000 in campaign investment generated over S$2 million in exhibition floor revenue. The targeting strategy and funnel architecture made the difference."</div>
        <div class="res-attr">Head of Digital Revenue · Global Sources SG</div>
      </div>'''

ethis = '''      <div class="res-card t">
        <div class="res-industry">Ethis Group · Islamic Fintech</div>
        <div class="res-metric">S$1M+</div>
        <div class="res-metric-label">Software cost savings through BI redesign</div>
        <div class="res-quote">"Azam redesigned our entire data infrastructure. We decommissioned three expensive platforms and replaced them with a leaner, faster system."</div>
        <div class="res-attr">CTO · Ethis Group</div>
      </div>'''

old_grid = f'''    <div class="results-grid">
{global_sources}
{ethis}
{tuscani}
    </div>'''

new_grid = f'''    <div class="results-grid">
{tuscani}
{global_sources}
{ethis}
    </div>'''

html = html.replace(old_grid, new_grid)

# ── W2-D: Move client logos strip to just below hero (after proof bar) ─────────
# Extract the clients-row from inside #results and insert after proof-bar
clients_row = '''    <div class="clients-row">
      <div>
        <div class="clients-label">Clients &amp; organisations</div>
        <div class="clients-badges">
          <span class="badge badge-ghost">KPMG</span>
          <span class="badge badge-ghost">Changi Airport Group</span>
          <span class="badge badge-ghost">Ethis Group</span>
          <span class="badge badge-ghost">EthisX Capital Markets</span>
          <span class="badge badge-ghost">SMF · IMDA</span>
          <span class="badge badge-ghost">ERA Singapore</span>
          <span class="badge badge-ghost">Global Sources</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:var(--display);font-size:34px;font-weight:900;color:var(--text)">25<span style="color:var(--amber)">+</span></div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">years · SG &amp; ASEAN</div>
      </div>
    </div>'''

# Remove from results section
html = html.replace('\n' + clients_row, '')

# Insert as a standalone strip between proof-bar and value-prop
logo_strip = '''
<!-- CLIENT LOGOS STRIP -->
<div style="padding:20px 0;border-bottom:1px solid var(--border);background:var(--bg)">
  <div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.1em">Trusted by</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <span class="badge badge-ghost">KPMG</span>
        <span class="badge badge-ghost">Changi Airport Group</span>
        <span class="badge badge-ghost">Ethis Group</span>
        <span class="badge badge-ghost">EthisX Capital Markets</span>
        <span class="badge badge-ghost">SMF · IMDA</span>
        <span class="badge badge-ghost">ERA Singapore</span>
        <span class="badge badge-ghost">Global Sources</span>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <span style="font-family:var(--display);font-size:22px;font-weight:900;color:var(--text)">25<span style="color:var(--amber)">+</span></span>
        <span style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-left:6px">yrs SG &amp; ASEAN</span>
      </div>
    </div>
  </div>
</div>
'''

html = html.replace(
    '\n<!-- VALUE PROP FIRST -->',
    logo_strip + '\n<!-- VALUE PROP FIRST -->'
)

# ── W2-E: Calculator follow-through CTA after result shows ────────────────────
old_calc_js = '''      res.classList.add("show");

      if (rank === "top3") {
        num.style.color = "var(--green)";
        num.textContent = "Top 3 position!";
        note.textContent = "Great Maps ranking. Is your website converting that traffic? Ask us about CRO.";
        return;
      }

      var lossMap = { "4": 0.28, "7": 0.48, "11": 0.65, "0": 0.80 };
      var loss = lossMap[rank] || 0.50;
      var est = rev * loss * 0.12;
      var rounded = Math.round(est / 100) * 100;

      num.style.color = "var(--red)";
      num.textContent = "S$" + rounded.toLocaleString() + "+";
      note.textContent = "Estimated monthly revenue lost due to your current Maps position. Your free audit shows exactly why and how to fix it.";'''

new_calc_js = '''      res.classList.add("show");

      if (rank === "top3") {
        num.style.color = "var(--green)";
        num.textContent = "Top 3 position!";
        note.textContent = "Great Maps ranking. Is your website converting that traffic? Ask us about CRO — the other half of the revenue equation.";
        var existingCta = document.getElementById("calc-cta");
        if (!existingCta) {
          var cta = document.createElement("a");
          cta.id = "calc-cta";
          cta.href = "#audit";
          cta.className = "calc-btn";
          cta.style.cssText = "display:block;text-align:center;margin-top:12px;background:var(--teal);color:#fff;text-decoration:none;border-radius:9px;padding:12px;font-size:13px;font-weight:700";
          cta.textContent = "Get a free CRO audit →";
          res.parentNode.insertBefore(cta, document.getElementById("calc-btn"));
        }
        return;
      }

      var lossMap = { "4": 0.28, "7": 0.48, "11": 0.65, "0": 0.80 };
      var loss = lossMap[rank] || 0.50;
      var est = rev * loss * 0.12;
      var rounded = Math.round(est / 100) * 100;

      num.style.color = "var(--red)";
      num.textContent = "S$" + rounded.toLocaleString() + "+";
      note.textContent = "Estimated monthly revenue lost due to your current Maps position.";

      var existingCta = document.getElementById("calc-cta");
      if (!existingCta) {
        var cta = document.createElement("a");
        cta.id = "calc-cta";
        cta.href = "#audit";
        cta.style.cssText = "display:block;text-align:center;margin-top:12px;background:var(--amber);color:#0B1F3A;text-decoration:none;border-radius:9px;padding:12px;font-size:13px;font-weight:700;cursor:pointer";
        cta.textContent = "Fix this — get your free audit →";
        res.parentNode.insertBefore(cta, document.getElementById("calc-btn"));
      }'''

html = html.replace(old_calc_js, new_calc_js)

# ── W2-H: Flip pricing order — Dominance first, then Growth, then Foundation ──
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

foundation_card = '''      <div class="svc-card">
        <div class="svc-top">
          <div class="svc-name" style="color:var(--teal)">Foundation</div>
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

old_seo_panel = f'''    <!-- SEO PANEL -->
    <div class="svc-panel active" id="panel-seo">
{foundation_card}

{growth_card}

{dominance_card}
    </div>'''

new_seo_panel = f'''    <!-- SEO PANEL -->
    <div class="svc-panel active" id="panel-seo">
{dominance_card}

{growth_card}

{foundation_card}
    </div>'''

html = html.replace(old_seo_panel, new_seo_panel)

# ── W2-I: Rename "Foundation" tier to "Essentials" ────────────────────────────
# Only in the svc-name label, not in feature descriptions ("Everything in Foundation")
html = html.replace(
    '<div class="svc-name" style="color:var(--teal)">Foundation</div>',
    '<div class="svc-name" style="color:var(--teal)">Essentials</div>'
)

# ── VERIFY ────────────────────────────────────────────────────────────────────
checks = [
    ("W2-A hero H1",             "Your website isn't" in html),
    ("W2-B single primary CTA",  "See how it works</a>" in html and "btn btn-outline" not in html.split("See how it works")[0].split("hero-ctas")[-1]),
    ("W2-F AI concrete example", "weekly GBP posts, review monitoring" in html),
    ("W2-J OG title updated",    "Conversion Rate Optimisation &amp; Local SEO Agency Singapore | Vanguardeer" in html and "og:title" in html),
    ("W2-K btn-teal fixed",      "background:#0B1F3A;color:#FFFFFF" in html),
    ("W2-G proof bar trimmed",   "ROAS · Global Sources SEM" in html and "Years experience" not in html),
    ("W2-C Tuscani first",       html.index("Tuscani Tapware") < html.index("Global Sources · B2B")),
    ("W2-D logos strip added",   "CLIENT LOGOS STRIP" in html),
    ("W2-E calc CTA added",      "Fix this — get your free audit" in html),
    ("W2-H Dominance first",     html.index("S$4,200") < html.index("S$2,400")),
    ("W2-I Foundation renamed",  "Essentials" in html and '<div class="svc-name" style="color:var(--teal)">Foundation</div>' not in html),
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
