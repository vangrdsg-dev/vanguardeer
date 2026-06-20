#!/usr/bin/env python3
"""
Add shared chat.css + chat.js to all pages except index.html
(index.html has its own chatbot CSS/JS inline — will be handled separately)
Also removes any existing inline chatbot CSS/HTML/JS from index.html
and replaces with shared files.
"""

import os, re

base = "/Users/azamahmad/Claude/Projects/Vanguardeer"

# Pages to add chatbot to (excluding index.html — handled separately)
TARGET_PAGES = [
    "about.html",
    "services.html",
    "audit.html",
    "privacy.html",
    "terms.html",
    "404.html",
    "insights/index.html",
    "insights/google-maps-ranking-singapore.html",
    "insights/conversion-rate-optimisation-singapore.html",
    "insights/google-business-profile-optimisation-singapore.html",
    "insights/local-seo-cost-singapore.html",
    "insights/google-maps-rank-cost-singapore.html",
    "insights/conversion-leaks-singapore-sme.html",
    "insights/google-reviews-singapore.html",
]

# CSS link to inject before </head>
CSS_LINK = '<link rel="stylesheet" href="/chat.css">'

# Script to inject before </body>
SCRIPT_TAG = '<script src="/chat.js" defer></script>'

for fname in TARGET_PAGES:
    fpath = os.path.join(base, fname)
    if not os.path.exists(fpath):
        print(f"  ✗  NOT FOUND: {fname}")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        html = f.read()

    changed = False

    # Add CSS link before </head> if not already present
    if CSS_LINK not in html:
        html = html.replace('</head>', f'{CSS_LINK}\n</head>', 1)
        changed = True

    # Add script before </body> if not already present
    if SCRIPT_TAG not in html:
        html = html.replace('</body>', f'{SCRIPT_TAG}\n</body>', 1)
        changed = True

    if changed:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  ✓  {fname}")
    else:
        print(f"  —  {fname} (already has chat)")

# ── index.html — replace inline chatbot with shared files ────────────────────
print("\nUpdating index.html...")
index_path = os.path.join(base, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    index = f.read()

# 1. Remove inline chatbot CSS block from <style>
old_css = '''/* ═══ CHATBOT ════════════════════════════════════════════════ */
#chat-bubble{position:fixed;bottom:28px;right:28px;z-index:2000}
.chat-toggle{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0B1F3A,#1A3A60);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(11,31,58,0.3);transition:all 0.2s;font-size:22px}
.chat-toggle:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(11,31,58,0.45)}
.chat-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:var(--amber);border-radius:50%;font-size:10px;font-weight:700;color:#0B1F3A;display:flex;align-items:center;justify-content:center;font-family:var(--mono)}
.chat-window{position:absolute;bottom:70px;right:0;width:340px;background:var(--surface);border:1px solid var(--border2);border-radius:16px;box-shadow:0 8px 48px rgba(11,31,58,0.15);overflow:hidden;display:none;flex-direction:column;max-height:500px}
.chat-window.open{display:flex}
.chat-head{padding:14px 16px;background:linear-gradient(135deg,rgba(11,31,58,0.06),rgba(11,31,58,0.02));border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.chat-head-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#0B1F3A,#1A3A60);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.chat-head-info h4{font-size:13px;font-weight:700;color:var(--text)}
.chat-head-info p{font-size:10px;color:var(--amber);font-family:var(--mono)}
.chat-head-close{margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px}
.chat-head-close:hover{color:var(--text)}
.chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px}
.chat-msgs::-webkit-scrollbar{width:3px}
.chat-msgs::-webkit-scrollbar-thumb{background:var(--border2);border-radius:10px}
.msg{max-width:88%;font-size:12px;line-height:1.6;padding:9px 12px;border-radius:10px;word-break:break-word}
.msg.bot{background:var(--surface2);color:var(--text2);border-radius:4px 10px 10px 10px;align-self:flex-start}
.msg.user{background:var(--amber-dim);color:var(--text);border:1px solid var(--amber-b);border-radius:10px 4px 10px 10px;align-self:flex-end}
.msg.typing{display:flex;gap:4px;align-items:center;padding:12px}
.typing-dot{width:6px;height:6px;border-radius:50%;background:var(--text3);animation:bounce 1.2s infinite}
.typing-dot:nth-child(2){animation-delay:0.2s}
.typing-dot:nth-child(3){animation-delay:0.4s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
.chat-input-row{padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px}
#chat-input{flex:1;padding:9px 12px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;font-size:12px;color:var(--text);outline:none}
#chat-input:focus{border-color:var(--amber)}
#chat-send{padding:9px 14px;background:var(--amber);color:#0B1F3A;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:background 0.2s}
#chat-send:hover{background:var(--amber2)}
.chat-qs{padding:8px 12px 2px;display:flex;flex-wrap:wrap;gap:5px}
.chat-q{padding:4px 9px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:10px;color:var(--text2);cursor:pointer;transition:all 0.15s}
.chat-q:hover{border-color:var(--amber-b);color:var(--amber);background:var(--amber-dim)}'''

if old_css in index:
    index = index.replace(old_css, '/* Chatbot styles moved to /chat.css */', 1)
    print("  ✓  Inline chatbot CSS removed from index.html")
else:
    print("  —  Inline chatbot CSS not matched (may already be removed)")

# 2. Add chat.css link
if CSS_LINK not in index:
    index = index.replace('</head>', f'{CSS_LINK}\n</head>', 1)
    print("  ✓  chat.css link added to index.html")

# 3. Remove the old inline chat HTML + JS block and replace with script tag
# Find the chat-bubble div in the HTML body
chat_html_start = index.find('<div id="chat-bubble">')
if chat_html_start != -1:
    # Find the closing of the entire chatbot section + its script
    # The chatbot JS ends with the closing </script> near end of file
    chat_script_end = index.rfind('</script>')
    if chat_script_end != -1:
        # Keep everything before chat-bubble, add script tag, keep </body></html>
        before_chat = index[:chat_html_start]
        after_chat = index[chat_script_end+9:]  # after </script>
        index = before_chat + SCRIPT_TAG + '\n' + after_chat
        print("  ✓  Inline chat HTML+JS replaced with chat.js script tag")
    else:
        print("  ✗  Could not find end of chat script block")
else:
    if SCRIPT_TAG not in index:
        index = index.replace('</body>', f'{SCRIPT_TAG}\n</body>', 1)
        print("  ✓  chat.js script tag added to index.html")
    else:
        print("  —  index.html already has chat.js")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(index)

print(f"\n✅ All done. index.html: {len(index):,} chars")
