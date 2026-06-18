# Vanguardeer Brand Guidelines

**Version 1.1 — June 2026**

---

## 1. Brand Essence & Vision

Vanguardeer helps organizations bridge the gap between vision and results. We convert strategy into disciplined execution, and execution into measurable, sustainable business outcomes. We are builders, not just advisors.

**Brand Core Values:**
- Strategic and Practical
- Decisive and Dependable
- Executive Credibility

**Tagline:** Strategy. Execution. Growth.

---

## 2. The Core Identity — The Logo

The chosen identity is **Alternative 2: The Strategic Guide** — a hybrid mark that addresses the gap between vision and results. It integrates a stylized compass rose seamlessly into the structure of a bold capital V.

### Symbolic Architecture

- **The V-Structure (Architect):** The solid, linear structure of the V provides a foundation — representing robustness and implementation.
- **The Compass Needle (Pathfinder):** The embedded compass implies leadership, direction, wisdom, and dependable navigation. Execution is always aligned with strategy.

### Logo Files (`brand/logos/`)

| File | Type | Usage |
|------|------|-------|
| `logo-mark.svg` | Mark only | Icon, favicon, watermark, foil stamp |
| `logo-mark-reversed.svg` | Mark only (white) | Dark/navy backgrounds |
| `logo-horizontal.svg` | Primary lockup | Headers, email, documents, website nav |
| `logo-horizontal-tagline.svg` | Full identity | Proposals, presentations, report covers |
| `logo-stacked.svg` | Stacked lockup | Center-aligned layouts, square favicons, report covers |

### Primary Lockup

The **horizontal lockup** (icon left, wordmark right) is the default. Use it everywhere unless the layout specifically demands a stacked or mark-only treatment.

### Construction & Usage Rules

**Minimum size:** 15mm width (horizontal lockup)

**Clear space:** Maintain a distance equal to half the height of the wordmark (`X/2`) on all sides of the logo. Never crowd the mark.

**Stacked variation:** Center the icon above the wordmark and tagline. Use for center-aligned layouts — report covers, square favicons, padfolios.

**Textless icon:** The V-Compass mark may stand alone only when the surrounding context (labeled presentation slide, branded padfolio, etc.) clearly identifies the Vanguardeer brand.

### Don'ts

- Do not recolour the mark in any unapproved colour
- Do not separate the compass needle from the V
- Do not use the retired text-only logotype
- Do not place the navy mark on dark backgrounds — use the reversed (white) variant
- Do not add drop shadows, gradients, bevels, or effects
- Do not stretch or distort proportions
- Do not use text in the favicon — mark only

---

## 3. Colour Palette

This palette conveys intelligence, authority, and premium quality. Reproduce colours accurately.

### Primary

| Name | Hex | CMYK (approx.) | Usage |
|------|-----|----------------|-------|
| Deep Navy | `#0B1F3A` | 96, 78, 48, 52 | Default wordmark and icon colour. Professionalism and trust. |
| Vanguard Gold | `#C8A44D` | 28, 38, 85, 3 | Accents, critical highlights, premium print finishes (hot foil stamping). Achievement and excellence. |

### Secondary

| Name | Hex | Usage |
|------|-----|-------|
| Steel Gray | `#5B6470` | Body copy, structural dividers, neutral backgrounds. Modern executive feel. |
| White | `#FFFFFF` | Backgrounds and negative space. Maximum visual clarity. |

### Extended Digital

| Name | Hex | Usage |
|------|-----|-------|
| Warm White | `#FAF8F2` | Page/section backgrounds |
| Off-White | `#F8F7F4` | Admin/dashboard backgrounds |
| Dark Gold | `#9B7830` | Button hover, active link states |

### Retired Colours — Do Not Use

- ~~`#00c896`~~ (Emerald Green) — fully retired
- ~~`#0d2e26`~~ (Dark Teal) — fully retired

---

## 4. Typography

Professional, confident, and highly legible. Reflects a modern executive sensibility.

### Primary (Headlines & Wordmark)

**Vanguardeer Sans** — a custom corporate face in the style of Gotham / Avenir Next.  
Digital fallback: `Montserrat, 'Arial Black', Arial, sans-serif`

- Weight: Medium / SemiBold (600) for headlines; ExtraBold (800) for the wordmark
- Style: All-caps for wordmark and headline treatments
- Letter-spacing: `+0.18em` (wordmark), `+0.05–0.15em` (headlines)

### Body Copy

**Open Sans** (or comparable high-legibility secondary sans-serif)  
Digital fallback: `'Open Sans', Arial, sans-serif`

- Weight: Regular (400)
- Usage: All paragraph text, correspondence, and technical details

### Tagline Treatment

All-caps, weight 600, letter-spacing `0.15em`:
- "STRATEGY. EXECUTION." — Steel Gray `#5B6470`
- "GROWTH." — Vanguard Gold `#C8A44D`

### CSS Font Stack

```css
/* Headlines & wordmark */
font-family: 'Montserrat', 'Arial Black', Arial, sans-serif;

/* Body */
font-family: 'Open Sans', Arial, sans-serif;
```

---

## 5. Branded Touchpoints

### Corporate Stationery (Physical)

**Business Cards**
- Stock: Matte white, premium card weight
- Logo: Primary navy horizontal lockup
- Finish: V-Compass icon with subtle Vanguard Gold hot foil stamping for tactile premium finish

**Letterhead**
- Layout: Minimalist. Navy logo top-left; contact details in Steel Gray, bottom-right.
- Stock: White textured paper

**Envelopes**
- Interior: Solid navy
- Exterior: Navy/Gold logo on face, clear white window

### Corporate Materials

**A4 Brochure / Folder**
- Stock: Deep Navy textured card (suiting fabric texture)
- Treatment: Prominent V-Compass icon, Vanguard Gold foil-stamped center
- Rule: Avoid large exterior text — rely on the icon's quiet confidence

**Leather Padfolio**
- Material: Tan or mid-brown premium leather
- Treatment: V-Compass icon debossed, gold-filled, centered

### Digital Presence

**Website Header**
- Clear white navigation bar
- Navy logo (horizontal lockup)
- Navigation links in Steel Gray (`#5B6470`): SERVICES, APPROACH, RESULTS
- CTA button in Vanguard Gold with Navy text

**Hero Image Strategy**
- Avoid generic consulting visuals (handshakes, boardrooms)
- Use abstract structural/architectural imagery: intersecting beams, structural geometry, rendered in deep corporate blues
- Visual supports the Builder archetype

**Favicon**
- Strict square application
- Gold V-Compass icon on pure Navy (`#0B1F3A`) or White background
- Never use text in favicon

**Favicon Production Pipeline**
1. Export `logo-mark.svg` to PNG at 512×512
2. Generate `favicon.ico` at 16, 32, 48px
3. Generate `apple-touch-icon.png` at 180×180 with `#0B1F3A` background

**Presentation Templates**
- Structured, clean layout with bold typography and clear hierarchy
- Structural architecture graphics as supporting visuals
- Navy / Gold / White colour system throughout

### Audit Report (Digital)

- Background: White `#FFFFFF`; text: Deep Navy `#0B1F3A`
- Accent elements: Vanguard Gold `#C8A44D`
- CTA box: Deep Navy background, Gold heading, white body copy
- Grade indicators: Gold for A/high-performance scores
- Report header logo: Mark (28×25px) + "VANGUARDEER" wordmark

### Admin Dashboard

- Background: `#F8F7F4`
- Buttons: Deep Navy background, Vanguard Gold text
- Logo: VANGUARDEER wordmark only (no decorative span colouring)

---

*Version 1.1 — Last updated June 2026*  
*Identity: Alternative 2 — The Strategic Guide*
