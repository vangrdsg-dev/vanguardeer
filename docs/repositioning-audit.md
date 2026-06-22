# Vanguardeer Repositioning Audit
**Date:** June 2026  
**Prepared by:** Implementation session — Days 1–3

---

## 1. Current Site Structure

### Pages
| File | Current Title | Status |
|------|--------------|--------|
| `index.html` | CRO & Local SEO Agency Singapore | REWRITE |
| `about.html` | About — Azam Ahmad | REWRITE |
| `services.html` | Services | REWRITE |
| `pricing.html` | Pricing | REWRITE |
| `audit.html` | Free Digital Footprint Audit | RENAME/REWRITE |
| `privacy.html` | Privacy Policy | KEEP |
| `terms.html` | Terms | KEEP |
| `404.html` | 404 | UPDATE nav/footer |
| `insights/index.html` | Insights | RESTRUCTURE |
| `insights/*.html` | SEO/CRO articles | ARCHIVE OR REDIRECT |

### Insights Articles (all old-positioning)
- conversion-leaks-singapore-sme.html
- conversion-rate-optimisation-singapore.html
- google-business-profile-optimisation-singapore.html
- google-maps-rank-cost-singapore.html
- google-maps-ranking-singapore.html
- google-reviews-singapore.html
- local-seo-cost-singapore.html

**Decision:** Keep articles live (SEO value) but update nav/footer. Add noindex to articles that conflict with new positioning if needed. Do not delete.

---

## 2. Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Pure static HTML/CSS/JS |
| Hosting | Cloudflare Pages (auto-deploy on git push to main) |
| Worker | Cloudflare Workers (`vanguardeer-chat.vanguardeer.workers.dev`) |
| Database | Cloudflare D1 (`vanguardeer-db`) |
| KV Store | Cloudflare KV (`AUDIT_REPORTS`) |
| Analytics | Google Analytics 4 (ID: `G-2NXT9XWLET`) |
| Email | Resend API (via worker, secret: `RESEND_API_KEY`) |
| AI | Anthropic Claude (secret: `ANTHROPIC_API_KEY`) |
| Booking | cal.com (`/vanguardeer-pte-ltd-5v1v0x/30min`) |

---

## 3. Current Forms & Integrations

### Existing form
- **Endpoint:** `https://vanguardeer-chat.vanguardeer.workers.dev/audit/request`
- **Action:** Triggers AI-generated audit report, emails owner, creates KV entry
- **Fields:** Business name, website, industry, keyword, email, captcha

### New forms needed
- **Revenue Leak Intelligence Brief** → new Worker route `/lead/request`
- **Market Capture Sprint Application** → same route, different source
- **Contact / Apply** → same route, different source

---

## 4. Current Analytics

- GA4 tag: `G-2NXT9XWLET` — **KEEP**
- Current events: `calc_use`, `form_submit_success`
- New events needed: `revenue_leak_brief_submit`, `market_capture_application_submit`, `strategic_fit_call_click`, `clinic_brief_submit`, `cyber_diagnostic_submit`

---

## 5. Brand Assets (Retained)

### Colors
- Deep Navy: `#0B1F3A` (primary)
- Vanguard Gold: `#C8A44D` (accent)
- Steel Gray: `#5B6470` (body)
- Warm White: `#FAF8F2` (alt bg)

### Fonts
- Headlines: Montserrat (display variable: `--display`)
- Body: Open Sans (sans variable: `--sans`)

### Logos
- `/brand/logos/logo-horizontal.svg` (primary)
- `/brand/logos/logo-horizontal-tagline.svg`
- `/brand/logos/logo-mark.svg` (icon)
- `/brand/logos/logo-mark-reversed.svg` (reversed)

### Images
- `/images/nor-azam-ahmad.webp` (founder photo)
- `/images/nor-azam-ahmad.jpeg`

---

## 6. New Page Architecture

### Pages to Create
| New File | URL | Priority |
|----------|-----|----------|
| `index.html` | / | CRITICAL — rewrite |
| `ai-revenue-systems.html` | /ai-revenue-systems | HIGH |
| `market-capture-sprint.html` | /market-capture-sprint | HIGH |
| `ai-revenue-operating-system.html` | /ai-revenue-operating-system | HIGH |
| `revenue-leak-intelligence-brief.html` | /revenue-leak-intelligence-brief | HIGH |
| `patient-acquisition-system.html` | /patient-acquisition-system | HIGH |
| `cyber-gtm-intelligence-system.html` | /cyber-gtm-intelligence-system | MEDIUM |
| `about.html` | /about | HIGH — rewrite |
| `contact.html` | /contact | HIGH |
| `insights/index.html` | /insights | MEDIUM — restructure |

### Old pages to retire
| File | Action |
|------|--------|
| `services.html` | Replace with `ai-revenue-systems.html` |
| `pricing.html` | Replace content, redirect via 404 |
| `audit.html` | Replace with `revenue-leak-intelligence-brief.html` |

---

## 7. Worker Changes Needed

Add new route to `worker.js`:
- `POST /lead/request` — receives new lead qualification form, calculates score, sends structured email notification
- Fields: name, business, website, email, phone, industry, role, revenue_range, customer_value, marketing_spend, budget_readiness, bottleneck, competitors, timeline, source_page, selected_offer, utm data

---

## 8. Known Risks

1. **Old insights articles** — keeping them helps SEO but contradicts new positioning. Mitigation: update their nav/footer, let them age out organically, replace with new-positioning articles.
2. **Worker changes** — must not break existing `/audit/request` route or `/report/:id` routes.
3. **Deployment** — Cloudflare Pages auto-deploys from git push. Test locally with Wrangler if possible before major changes.
4. **No CMS** — all content is hardcoded HTML. Maintain consistency through shared components and this audit doc.

---

## 9. Implementation Order (30 Days)

### Session 1 (Days 1–7): Foundation
- [x] Audit document (this file)
- [ ] Sales asset markdown files
- [ ] Worker: add `/lead/request` route
- [ ] Homepage rewrite (index.html)
- [ ] Navigation update (new positioning)
- [ ] Page stubs for all new pages

### Session 2 (Days 8–17): Core Pages
- [ ] AI Revenue Systems page
- [ ] Market Capture Sprint page  
- [ ] AI Revenue Operating System page
- [ ] Revenue Leak Intelligence Brief page
- [ ] Patient Acquisition System page
- [ ] Cyber GTM Intelligence System page

### Session 3 (Days 18–24): Forms & About
- [ ] Full qualification forms
- [ ] Lead scoring in Worker
- [ ] About page rewrite
- [ ] Contact/Apply page

### Session 4 (Days 25–30): SEO, Analytics & QA
- [ ] Metadata updates
- [ ] Schema updates
- [ ] Analytics events
- [ ] Sitemap update
- [ ] QA pass
- [ ] Launch prep
