# Vanguardeer

CRO and Local SEO agency site for **Vanguardeer** — helping Singapore SMEs dominate local search and convert more visitors into customers.

Live at: [vanguardeer.com](https://vanguardeer.com)

---

## Architecture

| Layer | Technology |
|---|---|
| Site | Single-file `index.html` (HTML/CSS/JS) |
| Hosting | Cloudflare Pages (project: `vanguardeer`) |
| Domain | `vanguardeer.com` via Cloudflare DNS |
| Backend | Cloudflare Worker (`vanguardeer-chat`) |
| Storage | Cloudflare KV (`AUDIT_REPORTS`, ID: `9be03d56f64848268f9dc7ddd94fde6a`) |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) via Worker |
| Email | Resend — `noreply@vanguardeer.com` → `enquiries@vanguardeer.com` |
| Booking | Cal.com — `https://cal.com/vanguardeer-pte-ltd-5v1v0x/30min` |

---

## Files

```
index.html      # Entire website — HTML, CSS, and JS in one file
worker.js       # Cloudflare Worker: audit pipeline, chat proxy, admin, report serving
wrangler.toml   # Wrangler config (Worker name, KV bindings, routes)
README.md       # This file
```

---

## Site Sections & Features

### Announcement Bar
Sticky amber top bar promoting the free Digital Footprint Audit (S$299 value). Links to `#audit`. Dismissable. Responsive (abbreviated on mobile).

### Navigation
Fixed nav with blur/glass effect; turns solid on scroll. Links: How It Works, Services, Results, Insights, About, FAQ. Mobile: hamburger → full-screen slide-in drawer.

### Referrer Banner
Shown below nav for tracked traffic sources. Reads UTM/referrer params and displays personalised context.

### Hero Section
Headline: *"Most Singapore businesses are losing revenue in two places at once. We fix both."*

Dynamic segmentation — hero copy swaps based on traffic source:
- **Default** — organic/direct
- **Google** — "If you found us on Google, imagine what we can do for yours."
- **LinkedIn** — "You've built the reputation. Let's make sure clients find you."
- Carousell and Audit variants also defined

Trust line: *"Free · No commitment · S$299 value · Delivered in 24 hrs"*

### Revenue Leak Calculator
Pure client-side JS tool (no backend). Inputs: Monthly Revenue (S$) + Google Maps rank (dropdown). Calculates estimated monthly revenue lost. CTA links to audit form.

### Proof Bar
Social proof stats: 25+ years, S$2M revenue from S$5K campaign, 400× ROAS, S$1M+ software savings, +30% revenue lift in 6 months.

### Value Proposition (3 cards)
More qualified traffic · Higher conversion rates · Runs without you

### How It Works (4 steps)
01 Free Audit → 02 Strategy & Onboarding → 03 Execute & Optimise → 04 Report & Scale

### Two Problems Section
Side-by-side diagnosis: **Funnel leaks** (CRO problem) and **Google Maps invisible** (Local SEO problem), with a bridge card positioning Vanguardeer as the combined fix.

### Services Section
Tabbed (SEO / CRO / Automation), three cards per tab with pricing, features, and CTAs. Featured card: Digital Footprint Audit.

### Results / Social Proof
3 case study cards with metrics (+30% revenue, 400× ROAS, etc.) and client testimonial quotes.

### About Section
Founder photo (Nor Azam Ahmad), bio, credentials grid (previous roles), expertise badges, LinkedIn link.

### Insights / Articles
3 article preview cards with category, title, excerpt, date, and read-more links.

### FAQ
2-column accordion (1 column on mobile). Covers: what the audit includes, timeline, pricing, differentiators.

### Chat Widget
Floating teal bubble (bottom-right). Powered by Claude Haiku via the Worker. Pre-loaded quick questions. Conversation history maintained in-session.

### Footer
Brand description, quick links, contact details, copyright.

---

## Forms

### 1. Digital Footprint Audit Request (`#audit` section)

The primary lead form. Triggers the full automated audit pipeline on submission.

**Fields:**

| Field | Input type | Required | Notes |
|---|---|---|---|
| Business Name | text | ✓ | `business_name` |
| Industry | select | ✓ | F&B, Retail, Professional Services, Medical/Dental, Beauty/Wellness, Education, Other |
| Website URL | url | ✓ | Scraped server-side to generate the audit |
| Target Keyword | text | ✓ | e.g. "dentist Singapore" — drives GMB rank analysis |
| Your Name | text | ✓ | `name` |
| Email Address | email | ✓ | Report notification sent here |
| Phone / WhatsApp | tel | ✓ | Used in the WhatsApp follow-up message |
| `_gotcha` | hidden | — | Honeypot spam trap — must be empty |
| Math captcha answer | text | ✓ | Simple addition, validated client-side before submit |

**How it submits:**
POSTs JSON to `https://vanguardeer-chat.vanguardeer.workers.dev/audit/request` with `Content-Type: application/json`.

On success (`data.success === true`): hides form, shows success message — *"Your audit is being generated now. We'll send your personalised digital footprint report with specific, actionable findings — usually within minutes."*

On error: shows inline error, re-enables submit button.

**What happens server-side:**
```
Immediate 200 returned to client
ctx.waitUntil(autoAudit(...)) runs in background:
  1. Fetch + scrape client website
     → title tag, meta description, schema types, local business schema,
       sitemap page count
  2. Call Claude Haiku with scraped data + client info
     → GBP score, GBP notes, GMB rank estimate, review counts,
       top 3 competitor names + reviews, revenue impact,
       3 prioritised recommendations
  3. Save completed report to KV (status: "ready")
  4. Send Resend email to enquiries@vanguardeer.com
     → Includes: client details table, report URL, password, admin link
```

### 2. Revenue Leak Calculator (inline tool)

Not a backend form — pure client-side JS. Two inputs:
- Monthly Revenue (number)
- Google Maps Rank (select)

Calculates estimated monthly revenue loss. No data submitted anywhere.

### 3. Chat Widget

Single free-text input + Send button + quick-question chips. POSTs to `POST /` on the Worker, proxied to Claude Haiku. No data persisted.

---

## Automated Audit Pipeline

```
Client fills #audit form on vanguardeer.com
       ↓
POST /audit/request  (Worker)
  → Immediate 200 response (client sees success)
  → Background: scrape website + Claude Haiku analysis
  → Save to KV (status: ready) with password
  → Resend email to Azam: details + report URL + password
       ↓
Azam reviews at /admin?secret=ADMIN_SECRET
  → "Password" button → shows report URL + password
  → "Approve & Send" button → POST /admin/approve/:id
       ↓
WhatsApp message pre-generated (link + password + booking URL)
  → Azam clicks wa.me link → sends manually from phone
       ↓
Client opens vanguardeer.com/report/:id
  → Enters password → full audit report revealed
```

---

## Worker Routes

| Route | Method | Purpose |
|---|---|---|
| `/` or `/api/chat` | POST | Anthropic chat proxy |
| `/audit/request` | POST | Receive audit form, trigger pipeline |
| `/report/:id` | GET | Password-gated client report page |
| `/report/:id/view` | POST | Track report open |
| `/admin` | GET | Admin dashboard (`?secret=ADMIN_SECRET`) |
| `/admin/approve/:id` | POST | Approve report → return WhatsApp link |
| `/admin/report-info/:id` | GET | Fetch report password (admin only) |
| `/admin/report` | POST | Manually create/override a report |

---

## Deployment

### Site (Cloudflare Pages)
```bash
npx wrangler pages deploy . --project-name vanguardeer
```

### Worker
```bash
npx wrangler deploy
```

### Secrets (run once, or to rotate)
```bash
npx wrangler secret put ANTHROPIC_API_KEY   # Claude Haiku
npx wrangler secret put ADMIN_SECRET        # Protects /admin routes
npx wrangler secret put RESEND_API_KEY      # Resend email API
```

---

## Admin Dashboard

```
https://vanguardeer-chat.vanguardeer.workers.dev/admin?secret=YOUR_ADMIN_SECRET
```

- Lists all audits with status (Pending / Ready / Approved)
- **Password** — reveals report URL + password for any row
- **Approve & Send** — approves report, generates pre-filled WhatsApp message
- **+ Manual audit** — create a report for walk-in or phone clients

---

## Key Constants in `worker.js`

```javascript
const BOOKING_URL  = "https://cal.com/vanguardeer-pte-ltd-5v1v0x/30min";
const NOTIFY_EMAIL = "enquiries@vanguardeer.com";
```

---

## Environment Variables

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Haiku. Never in source. |
| `ADMIN_SECRET` | Protects `/admin` and `/admin/approve/*`. |
| `RESEND_API_KEY` | Resend API key for email notifications. |

CORS allowed origins: `vanguardeer.com`, `www.vanguardeer.com`, `vanguardeer.pages.dev`

---

## Known Gotchas

- **`\n` in Worker template literals** — evaluated to a literal newline at Worker runtime. Any `\n` inside a `<script>` block embedded in generated HTML must be written as `\\n`, or the browser throws `SyntaxError: Invalid or unexpected token` and the entire script block fails.
- **`esc()` is HTML-only** — safe for HTML attributes and content, but NOT for embedding values inside JS string literals. Use `JSON.stringify()` for secrets and IDs that appear inside `<script>` tags.
- **Cloudflare Pages Functions** — do not work with ZIP/wrangler uploads; only with Git-connected deployments. The standalone Worker is the correct backend pattern for this project.
