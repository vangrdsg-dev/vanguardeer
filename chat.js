/* ═══════════════════════════════════════════════════════════
   Vanguardeer — Shared Chatbot JS
   ════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  const STORAGE_KEY = 'vg-chat-hidden';
  let chatOpen = false;
  let greeted = false;
  let typingEl = null;

  // ── All functions defined first ───────────────────────────

  function chatToggle() {
    chatOpen = !chatOpen;
    document.getElementById('chat-window').classList.toggle('open', chatOpen);
    if (chatOpen) {
      greet();
      setTimeout(function(){ document.getElementById('chat-input').focus(); }, 100);
      if (typeof gtag !== 'undefined') gtag('event', 'chat_open', {'page': location.pathname});
    }
  }

  function chatClose() {
    chatOpen = false;
    document.getElementById('chat-window').classList.remove('open');
  }

  function chatHide() {
    chatClose();
    document.getElementById('chat-bubble').classList.add('chat-hidden');
    localStorage.setItem(STORAGE_KEY, 'true');
    var r = document.getElementById('chat-restore');
    if (r) r.classList.add('visible');
  }

  function chatShow() {
    document.getElementById('chat-bubble').classList.remove('chat-hidden');
    localStorage.removeItem(STORAGE_KEY);
    var r = document.getElementById('chat-restore');
    if (r) r.classList.remove('visible');
  }

  function chatSend() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addMsg('bot', "Hi! 👋 I'm the Vanguardeer AI. I can answer questions about our services, pricing, and how we help Singapore businesses grow. What would you like to know?");
  }

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
    var msgs = document.getElementById('chat-msgs');
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = text.replace(/\n/g, '<br>');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    var msgs = document.getElementById('chat-msgs');
    typingEl = document.createElement('div');
    typingEl.className = 'msg bot typing';
    typingEl.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  async function callAPI(userMsg) {
    var system = 'You are the Vanguardeer AI assistant for Vanguardeer, a Singapore Local SEO and CRO agency. Be concise, warm, direct. Never salesy.\n\nKey facts:\n- Local SEO packages: Essentials S$1,200/mo · Growth S$2,400/mo · Dominance S$4,200/mo\n- CRO: Conversion Leak Audit S$3,500 once · Implementation Retainer S$4,500/mo · Fractional Growth Director custom\n- Full Growth System: SEO + CRO combined, custom quote, min 12 months\n- Free Digital Footprint Audit worth S$299, 24hr delivery, no obligation\n- 90-day performance clause on all Local SEO packages\n- Founder: Nor Azam Ahmad, 25+ years, Singapore & ASEAN\n- Email: enquiries@vanguardeer.com · Phone: +65 9696 0063\n- Free audit: /audit.html · Services: /services.html\n\nKeep responses under 120 words. Direct audit requests to /audit.html. Never make up facts.';

    try {
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: system,
          messages: [{ role: 'user', content: userMsg }]
        })
      });
      var data = await response.json();
      removeTyping();
      if (data.content && data.content[0] && data.content[0].text) {
        addMsg('bot', data.content[0].text);
      } else {
        addMsg('bot', 'Sorry, I had trouble with that. Email enquiries@vanguardeer.com or call +65 9696 0063.');
      }
    } catch(err) {
      removeTyping();
      addMsg('bot', "Connection issue. Please email enquiries@vanguardeer.com or call +65 9696 0063.");
    }
  }

  // ── Inject HTML ───────────────────────────────────────────
  var html = '<div id="chat-bubble">' +
    '<button class="chat-dismiss" id="chat-dismiss" aria-label="Hide chat" title="Hide chat">✕</button>' +
    '<div class="chat-window" id="chat-window">' +
      '<div class="chat-head">' +
        '<div class="chat-head-avatar">🤖</div>' +
        '<div class="chat-head-info"><h4>Vanguardeer AI</h4><p>Typically replies in seconds</p></div>' +
        '<button class="chat-head-close" id="chat-close" aria-label="Close chat">✕</button>' +
      '</div>' +
      '<div class="chat-msgs" id="chat-msgs"></div>' +
      '<div class="chat-qs" id="chat-qs">' +
        '<button class="chat-q">What\'s in the free audit?</button>' +
        '<button class="chat-q">How much does it cost?</button>' +
        '<button class="chat-q">How long to see results?</button>' +
        '<button class="chat-q">Do I need SEO or CRO?</button>' +
      '</div>' +
      '<div class="chat-input-row">' +
        '<input id="chat-input" placeholder="Ask anything…" autocomplete="off">' +
        '<button id="chat-send">Send</button>' +
      '</div>' +
    '</div>' +
    '<button class="chat-toggle" id="chat-toggle-btn" aria-label="Open chat">💬</button>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', html);

  // ── Bind events (functions already defined above) ─────────
  document.getElementById('chat-dismiss').addEventListener('click', function(e){
    e.stopPropagation();
    chatHide();
  });

  document.getElementById('chat-close').addEventListener('click', function(e){
    e.stopPropagation();
    chatClose();
  });

  document.getElementById('chat-toggle-btn').addEventListener('click', function(e){
    e.stopPropagation();
    chatToggle();
  });

  document.getElementById('chat-send').addEventListener('click', function(){
    chatSend();
  });

  document.getElementById('chat-qs').addEventListener('click', function(e){
    if (e.target.classList.contains('chat-q')) {
      var q = e.target.textContent;
      e.target.remove();
      sendMessage(q);
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && document.activeElement === document.getElementById('chat-input')) {
      chatSend();
    }
  });

  // ── Restore button in footer ──────────────────────────────
  var footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    var restore = document.createElement('button');
    restore.id = 'chat-restore';
    restore.setAttribute('aria-label', 'Show chat');
    restore.innerHTML = '💬 Show chat';
    restore.addEventListener('click', chatShow);
    footerBottom.appendChild(restore);
  }

  // ── Apply saved hidden state ──────────────────────────────
  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    document.getElementById('chat-bubble').classList.add('chat-hidden');
    var r = document.getElementById('chat-restore');
    if (r) r.classList.add('visible');
  }

})();
