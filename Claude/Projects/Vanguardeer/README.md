# Vanguardeer Website

Marketing site for **Vanguardeer** — a Singapore-based digital agency offering Digital Footprint Audits and growth services for SMBs.

Live at: [vanguardeer.com](https://vanguardeer.com)

---

## Architecture

| Layer | Technology |
|---|---|
| Site | Single-file `index.html` (HTML/CSS/JS) |
| Hosting | Cloudflare Pages (project: `vanguardeer`) |
| Domain | `vanguardeer.com` via Cloudflare DNS |
| Chat backend | Cloudflare Worker (`vanguardeer-chat`) |
| Contact form | FormSubmit.co AJAX |

### Why a Cloudflare Worker for chat?

Cloudflare Pages Functions **do not execute** on direct/ZIP deployments — only on Git-connected deployments. The standalone Worker is the correct solution for server-side API proxying without exposing the Anthropic API key in browser source.

---

## Files

```
index.html          # Entire website — HTML, CSS, and JS in one file
worker.js           # Cloudflare Worker: proxies chat requests to Anthropic API
wrangler.toml       # Wrangler config for the Worker deployment
README.md           # This file
```

---

## Deployment

### Site (Cloudflare Pages)

```bash
npx wrangler pages deploy . --project-name vanguardeer
```

### Chat Worker

```bash
# Deploy worker code
npx wrangler deploy

# Set the Anthropic API key as an encrypted secret (run once, or to rotate)
npx wrangler secret put ANTHROPIC_API_KEY
```

The Worker is live at `https://vanguardeer-chat.vanguardeer.workers.dev` and is referenced in `index.html`.

### First-time setup

```bash
npx wrangler login   # Authenticate with Cloudflare (opens browser)
```

---

## Contact Form

The audit request form uses [FormSubmit.co](https://formsubmit.co) AJAX, posting to `enquiries@vanguardeer.com`.

**Important:** On first submission to a new email, FormSubmit.co sends an activation email. Click the confirmation link before submissions will deliver.

---

## Environment

- **Anthropic API key** — stored as a Cloudflare Worker Secret (`ANTHROPIC_API_KEY`). Never committed to this repo.
- **CORS** — Worker allows requests from `vanguardeer.com`, `www.vanguardeer.com`, and `vanguardeer.pages.dev`.
