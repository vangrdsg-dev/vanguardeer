# Vanguardeer Brand Guidelines

**Version 1.0 — June 2026**

---

## Brand Identity

Vanguardeer is a strategic growth consultancy for SMBs. The brand communicates authority, precision, and direction — a guide that takes businesses from where they are to where they need to be.

**Tagline:** Strategy. Execution. Growth.

---

## Logo System

### The Mark — V+Compass Rose

The primary mark combines a bold Navy **V** letterform with an **8-pointed compass star** integrated at the junction. The elongated gold north needle represents direction and deliberate execution. The V and compass are inseparable — they are one unified mark, not two elements placed together.

**Files (all in `brand/logos/`):**

| File | Usage |
|------|-------|
| `logo-mark.svg` | Icon, favicon, app icon, social avatar |
| `logo-horizontal.svg` | Default lockup — headers, email, documents |
| `logo-horizontal-tagline.svg` | Full identity — proposals, presentations, reports |
| `logo-stacked.svg` | Square applications — cover pages, print materials |
| `logo-mark-reversed.svg` | White mark for dark/navy backgrounds |

### Clearspace

Maintain clearspace equal to the height of the **V** arm width on all sides of the logo. Never crowd the mark with other elements.

### Minimum Sizes

- Mark only: 24px / 8mm minimum
- Horizontal lockup: 120px / 40mm minimum
- Stacked lockup: 80px / 28mm minimum

### Don'ts

- Do not recolour the mark (no green, no greyscale, no custom colours)
- Do not separate the compass from the V
- Do not use the old text-only logotype (`Van<span>guardeer</span>`)
- Do not place the navy mark on dark backgrounds — use the reversed (white) variant
- Do not add drop shadows, gradients, or effects to the mark
- Do not stretch or distort proportions

---

## Colour Palette

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Deep Navy | `#0B1F3A` | Primary brand colour — logo V arms, headings, body text on light backgrounds |
| Vanguard Gold | `#C8A44D` | Accent — compass star, CTAs, highlights, "GROWTH." in tagline |

### Secondary

| Name | Hex | Usage |
|------|-----|-------|
| Steel Gray | `#5B6470` | Body copy, supporting text, tagline "STRATEGY. EXECUTION." |
| Warm White | `#FAF8F2` | Page/section backgrounds |
| Off-White | `#F8F7F4` | Admin/dashboard backgrounds |
| Pure White | `#FFFFFF` | Report body background |

### Dark Gold (hover/active)

| Name | Hex | Usage |
|------|-----|-------|
| Dark Gold | `#9B7830` | Button hover states, active link states |

### Retired Colours

- ~~`#00c896`~~ (Emerald Green) — fully retired, do not use
- ~~`#0d2e26`~~ (Dark Teal) — fully retired

---

## Typography

### Wordmark

**Montserrat** — weight 800 (ExtraBold), ALL CAPS, letter-spacing 0.18em

### Headings

**Montserrat** — weight 700–900, letter-spacing −0.02em for large display sizes

### Body

**Montserrat** or system sans-serif fallback — weight 400–600

### Tagline

**Montserrat** — weight 600, ALL CAPS, letter-spacing 0.15em  
"STRATEGY. EXECUTION." in Steel Gray `#5B6470`  
"GROWTH." in Vanguard Gold `#C8A44D`

### Font Stack (CSS)

```css
font-family: 'Montserrat', 'Arial Black', Arial, sans-serif;
```

---

## Voice & Tone

- Direct, confident, no fluff
- Strategic framing — every statement should feel like it moves a business forward
- Authority without arrogance
- Results-oriented — concrete outcomes over abstract promises

---

## Digital Applications

### Audit Report

- Background: White `#FFFFFF`, text: Deep Navy `#0B1F3A`
- Accent elements: Vanguard Gold `#C8A44D`
- CTA box: Deep Navy background with Gold heading
- Grade indicators: Gold for A/high-performance scores
- Logo in report header: mark (28×25px) + "VANGUARDEER" wordmark

### Admin Dashboard

- Background: `#F8F7F4`
- Buttons: Deep Navy with Vanguard Gold text
- Logo: "VANGUARDEER" wordmark, no decorative span colouring

### Website (Cloudflare Pages)

- Primary CTA buttons: `#C8A44D` background, `#0B1F3A` text
- Nav logo: `logo-horizontal.svg` or `logo-horizontal-tagline.svg`
- Footer: navy background with reversed (white) mark

---

## Social & Favicon

Use `logo-mark.svg` for all circular/square icon contexts. When placed on a navy background, use `logo-mark-reversed.svg`.

Recommended favicon pipeline:
1. Export `logo-mark.svg` to PNG at 512×512 (navy mark on transparent)
2. Generate `favicon.ico` (16, 32, 48px) from the PNG
3. Generate `apple-touch-icon.png` (180×180px) with `#0B1F3A` background

---

*Last updated: June 2026 — Alternative 2: The Strategic Guide*
