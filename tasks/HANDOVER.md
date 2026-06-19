# Vanguardeer — Claude Code Handover Brief
**Last updated:** 19 June 2026
**Prepared by:** Claude (claude.ai conversation session)
**Handover to:** Claude Code

---

## Project Overview

**Site:** https://vanguardeer.com
**Repo:** /Users/azamahmad/Claude/Projects/Vanguardeer/
**Stack:** Static HTML + CSS + vanilla JS · Cloudflare Pages · Cloudflare Workers
**Owner:** Nor Azam Ahmad · enquiries@vanguardeer.com · +65 9696 0063

---

## What Has Been Built (Completed)

### Core Pages — All Written and Deployed
| File | Status | Notes |
|---|---|---|
| `/index.html` | ✅ Live | Homepage — multi-section single page |
| `/services.html` | ✅ Created | Renamed from pricing.html — NEEDS REBUILD (see below) |
| `/about.html` | ✅ Live | Photo added: /images/nor-azam-ahmad.jpeg |
| `/audit.html` | ✅ Live | Standalone form page with sample report visual |
| `/privacy.html` | ✅ Live | PDPA + GDPR compliant |
| `/terms.html` | ✅ Live | IP licensed, 3-month liability cap |
| `/404.html` | ✅ Live | Branded with nav + CTA |
| `/sitemap.xml` | ✅ Live | All pages listed |
| `/robots.txt` | ✅ Live | Allows all, references sitemap |
| `/shared.css` | ✅ Live | Shared CSS for article pages |

### Insights Articles — All Written and Deployed
| File | Primary Keyword |
|---|---|
| `/insights/google-maps-ranking-singapore.html` | google maps ranking singapore |
| `/insights/conversion-rate-optimisation-singapore.html` | conversion rate optimisation singapore dental |
| `/insights/google-business-profile-optimisation-singapore.html` | google business profile optimisation singapore |
| `/insights/local-seo-cost-singapore.html` | local seo cost singapore |
| `/insights/google-maps-rank-cost-singapore.html` | google maps rank cost singapore |
| `/insights/conversion-leaks-singapore-sme.html` | website conversion leaks singapore |
| `/insights/google-reviews-singapore.html` | google reviews singapore |
| `/insights/index.html` | Insights landing page — grid of all 7 articles |

### Brand Assets
- Logo: `/brand/logos/logo-horizontal-tagline.svg`
- OG image: `/brand/logos/og-image.png` (1200×630px, Canva-designed)
- Founder photo: `/images/nor-azam-ahmad.jpeg` (821×821px)

---

## Brand Tokens (use in all new pages/components)

```css
--bg: #FFFFFF
--bg2: #FAF8F2
--amber: #C8A44D
--amber2: #9B7830
--teal: #0B1F3A
--green: #22C55E
--red: #EF4444
--text: #0B1F3A
--text2: #5B6470
--text3: #9B9893
--display: 'Montserrat'
--sans: 'Open Sans'
--mono: 'DM Mono'
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap
```

GA4 tag (add to `<head>` of every page):
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2NXT9XWLET"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-2NXT9XWLET');
</script>
```

---

## Navigation (current — all pages)

```html
How It Works → /#how
Services → /services.html
Insights → /insights/
About → /about.html
[Free Audit →] → /audit.html (amber button)
```

Mobile drawer mirrors desktop nav.

Footer columns:
1. Brand + tagline + phone (+65 9696 0063) + email (enquiries@vanguardeer.com)
2. Services: Local SEO / CRO / Full Growth System / Free Audit → all link to /services.html
3. Company: About / Insights / Services / Privacy Policy / Terms of Service

---

## Infrastructure

### Cloudflare
- Pages: static hosting at vanguardeer.com
- Worker: `vanguardeer-chat.vanguardeer.workers.dev`
- Worker endpoint for audit form: `https://vanguardeer-chat.vanguardeer.workers.dev/audit/request`
- D1 database: **NOT YET SET UP** — form submissions currently go to Worker only, no persistence
- wrangler.toml present in repo

### Resend (email)
- Free tier: 3,000 emails/month
- Used for audit form notification emails

### n8n
- Connected at: https://vanguardeer.app.n8n.cloud/mcp-server/http
- **DEFERRED** — not currently wired up. Future use: follow-up sequences, CRM sync

---

## Pending Tasks — Priority Order

### P0 — Services Page Rebuild (MOST URGENT)
The current `/services.html` was copied from `pricing.html` and has NOT been restructured yet.

**Required changes:**

1. **3-tab service selector at the top of the page** (not the suggestion tool)
   - Tab 01: Local SEO (Search Engine Optimisation)
   - Tab 02: CRO (Conversion Rate Optimisation)
   - Tab 03: Full Growth System

   Tab styling: large, clear, clickable. Active tab has amber bottom border + white background.
   Each tab shows/hides its panel below via JS `showService(id, btn)`.

2. **Panel content per tab:**
   - **Local SEO tab:** Opening paragraph explaining what Local SEO is → 3 pricing cards (Dominance S$4,200/mo · Growth S$2,400/mo · Essentials S$1,200/mo) → 90-day clause callout → links to relevant insight articles
   - **CRO tab:** Opening paragraph explaining what CRO is → 3 pricing cards (Conversion Leak Audit S$3,500 once · Implementation Retainer S$4,500/mo · Fractional Growth Director custom) → link to CRO insight article
   - **Full Growth System tab:** NO pricing cards. Show: FGS description block + "Who this is for" grid + Cal.com CTA ("Let's talk about your numbers →")

3. **Suggestion tool moves BELOW all panels** (not above). Fix the JS bug — stray `)` in one string. Working corrected function:
```javascript
function showSuggestion(){
  const q1=answers['1'],q2=answers['2'],q3=answers['3'];
  let text='';
  if(q2==='both'||q3==='high'){
    text='The <strong>Full Growth System</strong> is likely your best fit.';
  } else if(q2==='convert'){
    text='Your priority is <strong>CRO (Conversion Rate Optimisation)</strong>. Start with the Conversion Leak Audit (S$3,500).';
  } else if(q2==='traffic'&&q3==='low'){
    text='The <strong>Local SEO Essentials</strong> package (S$1,200/mo) is the right starting point.';
  } else {
    text='The <strong>Local SEO Growth</strong> package (S$2,400/mo) is our most popular starting point.';
  }
  document.getElementById('suggest-text').innerHTML=text;
  const r=document.getElementById('suggest-result');
  r.classList.add('show');
  r.scrollIntoView({behavior:'smooth',block:'nearest'});
}
```

4. **Fix "Custom pricing" font size** — currently `font-size:22px`, should match other prices (no inline override, use `.svc-price` class default).

5. **Expand abbreviations on first mention:**
   - "Local SEO (Search Engine Optimisation)" — first mention only, then just "Local SEO"
   - "CRO (Conversion Rate Optimisation)" — first mention only, then just "CRO"

6. **Page hero heading:** Centre-align the H1 and deck on this page.

7. **Page title:** `Services — Local SEO, CRO & Growth for Singapore SMEs | Vanguardeer`

8. **Add `showService` JS function:**
```javascript
function showService(id, btn){
  document.querySelectorAll('.svc-tab-top').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.svc-panel-top').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-'+id+'-top').classList.add('active');
  gtag('event','tab_click',{'tab':id,'page':'services'});
}
```

### P0 — Homepage: Remove #services Section
In `index.html`, the `<!-- SERVICES (TABBED, COMPACT) -->` section still exists and should be removed entirely. The nav "Services" link already points to `/services.html` correctly. Just delete the section and the anchor `id="services"`.

Also remove "Services" from the homepage nav anchor links (the `href="#services"` one, not the `/services.html` page link).

### P1 — Cloudflare D1 + Worker Setup
**Goal:** Form submissions → stored in D1 + email notification via Resend

D1 schema needed:
```sql
CREATE TABLE audit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  business_name TEXT,
  industry TEXT,
  website TEXT,
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  keyword TEXT,
  notes TEXT,
  utm_data TEXT,
  form_time TEXT,
  source TEXT DEFAULT 'homepage'
);

CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  session_id TEXT,
  messages TEXT,
  email TEXT
);
```

Worker update needed:
- `POST /audit/request` → validate → insert to D1 → send email via Resend → return JSON
- `POST /chat` → store conversation to D1

### P1 — GSC Sitemap Submission
Manual task — submit `https://vanguardeer.com/sitemap.xml` at:
https://search.google.com/search-console

### P2 — About Page Personal Story
The `<div class="story-placeholder">` in `about.html` is hidden (`display:none`). Azam will provide personal story copy. When ready, unhide and populate.

### P2 — Homepage Article Cards
Currently showing 3 article cards. Should ideally show the 3 highest-traffic articles with real view counts once GSC data is available. For now the current cards are fine.

### P3 — LinkedIn Snippets
Write 7 LinkedIn post snippets — one per article. Format: hook line → 3-5 bullet points → CTA to read full article. Keep professional tone, no AI-speak.

### P3 — Third-Party Review Platforms
Set up Vanguardeer profiles on:
- Trustpilot (most credible for B2B)
- Google Business Profile (for Vanguardeer itself)
- Clutch.co (agency directory, high SEO value)
- GoodFirms (Singapore agency listings)

### P3 — Service Pages (Phase 5)
- `/services/local-seo.html` — deep-dive Local SEO service page
- `/services/cro.html` — deep-dive CRO service page
These were deferred. Lower priority now that `/services.html` covers the overview.

### P4 — Vanguardeer Internal Workflow Checklist
Build a documented internal checklist for delivering client work — what Vanguardeer does each week for each client tier. Should mirror what we tell clients we do. "Practice what we preach."

### P4 — Client Value Delivery Framework
Auto-monitoring system + client reporting + follow-up scheduling. Should exceed what's promised in the service agreements. Tooling: Cloudflare Workers + D1 for data, Resend for reports, n8n (when ready) for automation.

### P4 — n8n Workflows (when ready to scale)
- Audit form submission → CRM record + follow-up email sequence
- Weekly ranking check → client report email
- Review velocity monitor → alert if below threshold

---

## Key Decisions — Do Not Reverse

| Decision | Rationale |
|---|---|
| IP retained by Vanguardeer, licensed to client on full payment | Legal protection |
| Liability cap: 3 months fees | Standard Singapore consultancy |
| No General Assembly reference on About page | Owner's instruction |
| n8n deferred (cost) | Not worth it at current volume |
| Pricing published openly (S$1,200/S$2,400/S$4,200) | Self-qualification mechanism |
| Full Growth System: custom quote, no headline price | Avoid commodity comparison |
| 90-day performance clause on all Local SEO packages | Differentiator + confidence signal |
| Primary CTA everywhere: "Get Free Audit" → /audit.html | Single conversion path |
| Cal.com only on: /services.html, /about.html, /audit.html | Avoid CTA overload on other pages |
| Phone number in footer ALL pages | High-ticket buyers prefer to call |

---

## Services Pricing (source of truth)

### Local SEO
| Tier | Price | For |
|---|---|---|
| Essentials | S$1,200/mo | Single-location, low competition |
| Growth | S$2,400/mo | Multi-channel, moderate competition |
| Dominance | S$4,200/mo | Full stack, high competition |

### CRO
| Tier | Price | For |
|---|---|---|
| Conversion Leak Audit | S$3,500 once | Diagnosis only |
| Implementation Retainer | S$4,500/mo | Ongoing fix + test |
| Fractional Growth Director | Custom | Embedded leadership |

### Full Growth System
- Custom quote
- Minimum 12-month engagement
- No headline price — always drives to Cal.com call
- Cal.com: https://cal.com/vanguardeer-pte-ltd-5v1v0x/30min

---

## Content Rules (maintain across all pages)

- **Tone:** Knowledgeable human, not AI. Direct, honest, no fluff. No "leverage", "robust", "comprehensive", "synergy".
- **Abbreviations:** Always spell out on first mention — "Local SEO (Search Engine Optimisation)", "CRO (Conversion Rate Optimisation)", "Google Business Profile (not GBP)". After first mention, abbreviation is fine.
- **No fabricated case studies.** Use real client results (Global Sources, Tuscani, Ethis) or published third-party benchmarks (BrightLocal, Google). Placeholder markers for future data.
- **No General Assembly reference** anywhere on the site.
- **Article structure:** TLDR box at top (dark navy, amber arrows) + Key Takeaways at bottom (green checkmarks) + contextual cross-links + CTA block → /audit.html
- **Image placeholders:** Use `display:none` data-placeholder divs, not visible broken images.
- **GA4 events to fire:** `form_submit`, `cta_click`, `calc_use`, `chat_open`, `scroll_depth` (25/50/75/100%)

---

## Cross-Link Map (implemented in all articles)

Each article links to at least 3 other internal pages. Key links:
- Every article → /audit.html (CTA)
- Every article → /services.html (pricing mention)
- Maps articles cross-link to GBP and reviews articles
- CRO articles cross-link to maps and conversion leaks articles
- Cost article links to /services.html#full-growth-system
- Homepage #articles → /insights/ (see all)

---

## File Naming Conventions

- Pages: lowercase, hyphens, `.html` extension
- Images: lowercase, hyphens, `.jpeg` or `.png`
- Scripts: `patch_[description].py` (one-off patches, safe to delete after use)
- CSS: `/shared.css` for article pages; inline `<style>` blocks for standalone pages

---

## Git Workflow

Branch: `main` → auto-deploys to Cloudflare Pages
```bash
git add -A
git commit -m "descriptive message"
git push origin main
```

Cloudflare Pages picks up push within ~30 seconds.

---

## What NOT to Do

- Do not add `pricing.html` back — it was renamed to `services.html`
- Do not reference General Assembly anywhere
- Do not use `n8n` workflows yet (cost decision — deferred)
- Do not create fake testimonials or fabricated case studies
- Do not add `og:image` tags without confirming the image exists at that URL
- Do not remove the `display:none` story placeholder in about.html — Azam will fill it
- Do not remove the `data-placeholder` hidden divs in articles — they're for future data
- Do not change the 90-day performance clause language without checking terms.html
