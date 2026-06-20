/* ═══════════════════════════════════════════════════════════
   Vanguardeer — Shared Chatbot JS
   Injects chat widget HTML + handles all interactions
   Loaded on all pages: <script src="/chat.js" defer></script>
   ════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  // ── Inject HTML ────────────────────────────────────────────
  const html = `
<div id="chat-bubble">
  <button class="chat-dismiss" aria-label="Hide chat" title="Hide chat" onclick="chatHide()">✕</button>
  <div class="chat-window" id="chat-window">
    <div class="chat-head">
      <div class="chat-head-avatar">🤖</div>
      <div class="chat-head-info">
        <h4>Vanguardeer AI</h4>
        <p>Typically replies in seconds</p>
      </div>
      <button class="chat-head-close" onclick="chatClose()" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-msgs" id="chat-msgs"></div>
    <div class="chat-qs" id="chat-qs">
      <button class="chat-q" onclick="chatQ(this)">What's in the free audit?</button>
      <button class="chat-q" onclick="chatQ(this)">How much does it cost?</button>
      <button class="chat-q" onclick="chatQ(this)">How long to see results?</button>
      <button class="chat-q" onclick="chatQ(this)">Do I need SEO or CRO?</button>
    </div>
    <div class="chat-input-row">
      <input id="chat-input" placeholder="Ask anything…" autocomplete="off">
      <button id="chat-send" onclick="chatSend()">Send</button>
    </div>
  </div>
  <button class="chat-toggle" onclick="chatToggle()" aria-label="Open chat">
    💬
  </button>
</div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // ── Inject restore button into footer ──────────────────────
  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    const restore = document.createElement('button');
    restore.id = 'chat-restore';
    restore.setAttribute('aria-label', 'Show chat');
    restore.onclick = chatShow;
    restore.innerHTML = '💬 Show chat';
    footerBottom.appendChild(restore);
  }

  // ── State ──────────────────────────────────────────────────
  const STORAGE_KEY = 'vg-chat-hidden';
  const HISTORY_KEY = 'vg-chat-history';
  let chatOpen = false;
  let greeted = false;

  // ── Restore hidden state ───────────────────────────────────
  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    document.getElementById('chat-bubble').classList.add('chat-hidden');
    const r = document.getElementById('chat-restore');
    if (r) r.classList.add('visible');
  }

  // ── Greeting ───────────────────────────────────────────────
  const greetings = [
    "Hi! 👋 I'm the Vanguardeer AI. I can answer questions about our services, pricing, and how we help Singapore businesses grow. What would you like to know?",
  ];

  function greet() {
    if (greeted) return;
    greeted = true;
    addMsg('bot', greetings[0]);
  }

  // ── Toggle / open / close ─────────────────────────────────
  window.chatToggle = function() {
    chatOpen = !chatOpen;
    document.getElementById('chat-window').classList.toggle('open', chatOpen);
    if (chatOpen) {
      greet();
      setTimeout(() => document.getElementById('chat-input').focus(), 100);
      if (typeof gtag !== 'undefined') gtag('event', 'chat_open', {'page': location.pathname});
    }
  };

  window.chatClose = function() {
    chatOpen = false;
    document.getElementById('chat-window').classList.remove('open');
  };

  window.chatHide = function() {
    chatClose();
    document.getElementById('chat-bubble').classList.add('chat-hidden');
    localStorage.setItem(STORAGE_KEY, 'true');
    const r = document.getElementById('chat-restore');
    if (r) r.classList.add('visible');
  };

  window.chatShow = function() {
    document.getElementById('chat-bubble').classList.remove('chat-hidden');
    localStorage.removeItem(STORAGE_KEY);
    const r = document.getElementById('chat-restore');
    if (r) r.classList.remove('visible');
  };

  // ── Quick question buttons ─────────────────────────────────
  window.chatQ = function(btn) {
    const q = btn.textContent;
    btn.remove();
    sendMessage(q);
  };

  // ── Send ───────────────────────────────────────────────────
  window.chatSend = function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement === document.getElementById('chat-input')) {
      chatSend();
    }
  });

  // ── Message flow ───────────────────────────────────────────
  function sendMessage(text) {
    if (!chatOpen) {
      chatOpen = true;
      document.getElementById('chat-window').classList.add('open');
      greet();
    }
    addMsg('user', text);
    showTyping();
    callAPI(text);
  }

  function addMsg(role, text) {
    const msgs = document.getElementById('chat-msgs');
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = text.replace(/\n/g, '<br>');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  let typingEl = null;
  function showTyping() {
    const msgs = document.getElementById('chat-msgs');
    typingEl = document.createElement('div');
    typingEl.className = 'msg bot typing';
    typingEl.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ── API call ───────────────────────────────────────────────
  async function callAPI(userMsg) {
    const system = `You are the Vanguardeer AI assistant — a helpful, knowledgeable assistant for Vanguardeer, a Singapore-based Local SEO and CRO agency. 

Your role: Answer questions about Vanguardeer's services, pricing, and how the company helps Singapore SMEs grow. Be concise, warm, and direct. Never be salesy or pushy.

Key facts:
- Vanguardeer offers Local SEO (Search Engine Optimisation) and CRO (Conversion Rate Optimisation) for Singapore SMEs
- Local SEO packages: Essentials S$1,200/mo · Growth S$2,400/mo · Dominance S$4,200/mo
- CRO packages: Conversion Leak Audit S$3,500 once · Implementation Retainer S$4,500/mo · Fractional Growth Director (custom)
- Full Growth System: SEO + CRO combined, custom quote, minimum 12 months
- Free Digital Footprint Audit worth S$299 — delivered within 24 hours, no obligation
- All Local SEO packages include a 90-day performance clause — exit with 30 days notice if no ranking improvement
- Founder: Nor Azam Ahmad, 25+ years experience, Singapore and ASEAN
- Website: vanguardeer.com · Email: enquiries@vanguardeer.com · Phone: +65 9696 0063
- Free audit page: vanguardeer.com/audit.html
- Services page: vanguardeer.com/services.html

Keep responses under 120 words. Use line breaks for readability. If someone asks to book or get the audit, direct them to /audit.html. Never make up facts.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: system,
          messages: [{ role: 'user', content: userMsg }]
        })
      });

      const data = await response.json();
      removeTyping();

      if (data.content && data.content[0] && data.content[0].text) {
        addMsg('bot', data.content[0].text);
      } else {
        addMsg('bot', "Sorry, I had trouble answering that. You can email us at enquiries@vanguardeer.com or call +65 9696 0063.");
      }
    } catch(err) {
      removeTyping();
      addMsg('bot', "I'm having a connection issue right now. Please email enquiries@vanguardeer.com or call +65 9696 0063 — we'll get back to you quickly.");
    }
  }

})();
