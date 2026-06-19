#!/usr/bin/env python3
"""Week 1 CRO/SEO patches for index.html — Changes 1, 2, 3, 5"""

import re

path = "/Users/azamahmad/Claude/Projects/Vanguardeer/index.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

original = html

# ── CHANGE 1: Meta description ────────────────────────────────────────────────
html = html.replace(
    '<meta name="description" content="Vanguardeer helps Singapore SMEs dominate local search and convert more visitors into customers. Free Digital Footprint Audit worth S$299. Led by Nor Azam Ahmad, top business growth consultant in Singapore.">',
    '<meta name="description" content="You\'re losing revenue in two places: Google can\'t find you, and your website doesn\'t convert. We fix both — free audit worth S$299.">'
)

# ── CHANGE 2: WhatsApp helper text ────────────────────────────────────────────
html = html.replace(
    '''            <div class="fg">
              <label>WhatsApp Number</label>
              <input type="tel" name="phone" placeholder="+65 9XXX XXXX">
            </div>''',
    '''            <div class="fg">
              <label>WhatsApp Number</label>
              <input type="tel" name="phone" placeholder="+65 9XXX XXXX">
              <div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:var(--mono)">Optional — for faster audit delivery</div>
            </div>'''
)

# ── CHANGE 3: Trust line above submit button ──────────────────────────────────
html = html.replace(
    '            <button type="submit" class="form-submit" id="form-btn">Send Me My Free Audit →</button>\n            <div class="form-disc">No spam. Your audit lands in your inbox within 24 hours.</div>',
    '            <div class="form-disc" style="margin-bottom:10px;margin-top:0">No spam. Your audit lands in your inbox within 24 hours.</div>\n            <button type="submit" class="form-submit" id="form-btn">Send Me My Free Audit →</button>'
)

# ── CHANGE 5: FAQPage JSON-LD schema ─────────────────────────────────────────
faq_schema = '''<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How long before I see ranking improvements on Google Maps?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Initial movement typically appears within 6–10 weeks. Meaningful improvements (top 5) usually take 3–4 months. We include a 90-day performance clause — if there is no measurable ranking improvement by Day 90, you can exit with 30 days notice. Results consistently appear before Day 90 with our system."
      }
    },
    {
      "@type": "Question",
      "name": "What does AI-powered actually mean in practice?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Claude (Anthropic's AI) handles research, content generation, competitor analysis, reputation monitoring, and client communications — tasks that would otherwise require 2–3 human staff. You get enterprise-grade execution at a fraction of the cost, with you approving key decisions before they go live."
      }
    },
    {
      "@type": "Question",
      "name": "What happens if I already tried SEO before and it did not work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Most SEO that fails does so because it stops at on-page basics and ignores the Google Business Profile entirely — which is where 80% of local search conversions actually happen. Our system is GBP-first, content-second, and runs continuously rather than in one-off bursts. The free audit will show you exactly what was missed and what the gap looks like now."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between CRO and Local SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Local SEO brings more people to your door or phone. CRO makes sure more of them become paying customers. Most businesses need both — but we will tell you honestly which will move the needle most for your specific situation. The free audit identifies exactly that."
      }
    },
    {
      "@type": "Question",
      "name": "How much of my time does this require each week?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For Local SEO packages: approximately 15–30 minutes per week, depending on tier. Mostly reviewing and approving things we have already drafted. You take photos of your work. We write everything else. For CRO: monthly calls and approvals before implementation."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a contract lock-in?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "12-month agreements with a 90-day performance clause. If we have not moved your ranking within 90 days, you can exit with 30 days notice — no penalty. We are confident enough in the system to offer this."
      }
    },
    {
      "@type": "Question",
      "name": "What is in the free Digital Footprint Audit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Google Maps rank for your primary keyword, review count versus top competitors, GBP completeness score, indexed pages analysis, title tag and schema check, Carousell presence where applicable, estimated monthly revenue impact of your current position, and 3 specific quick-win recommendations. Delivered within 24 hours."
      }
    },
    {
      "@type": "Question",
      "name": "Do you work with businesses outside Singapore?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Local SEO packages are designed for Singapore-based businesses. CRO and Fractional Growth Director engagements are open to ASEAN businesses across Malaysia, Indonesia, and broader Southeast Asia."
      }
    },
    {
      "@type": "Question",
      "name": "How much does local SEO cost in Singapore?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vanguardeer's Local SEO packages start at S$1,200 per month for the Foundation tier, covering Google Maps optimisation for single-location businesses. The Growth tier at S$2,400 per month adds Carousell, Facebook Groups, and content pages. The Dominance tier at S$4,200 per month includes full multi-channel coverage with Instagram, Lemon8, and Telegram. All engagements begin with a free Digital Footprint Audit."
      }
    },
    {
      "@type": "Question",
      "name": "What is conversion rate optimisation and do I need it?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Conversion rate optimisation (CRO) is the process of improving your website so more visitors take action — call, enquire, book, or buy. If your website receives traffic but generates few leads, CRO finds and fixes the leaks. The average Singapore SME website converts less than 2% of visitors. A well-optimised site converts 4–8%. That difference is revenue you are currently leaving on the table."
      }
    },
    {
      "@type": "Question",
      "name": "How does the free Digital Footprint Audit work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fill in the form with your business name, website URL, industry, and primary keyword. Within 24 hours, you receive a personalised report covering your Google Maps rank, competitor review gap, GBP completeness score, website indexing health, schema markup status, and an estimated monthly revenue impact figure. There is no sales call unless you request one."
      }
    }
  ]
}
</script>'''

# Insert after the closing </script> of the existing LocalBusiness/Person schema
marker = '''  ]
}
</script>'''
html = html.replace(marker, marker + "\n" + faq_schema, 1)

# ── Verify all 4 changes landed ───────────────────────────────────────────────
checks = [
    ("Change 1 — meta desc",      "You're losing revenue in two places" in html),
    ("Change 2 — WA helper text", "Optional — for faster audit delivery" in html),
    ("Change 3 — trust line up",  'style="margin-bottom:10px;margin-top:0">No spam.' in html),
    ("Change 5 — FAQ schema",     '"@type": "FAQPage"' in html),
]

all_ok = True
for label, ok in checks:
    status = "✓" if ok else "✗ FAILED"
    print(f"  {status}  {label}")
    if not ok:
        all_ok = False

if not all_ok:
    print("\nAborting — not writing file. Check diffs above.")
    exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. File written ({len(html):,} chars).")
