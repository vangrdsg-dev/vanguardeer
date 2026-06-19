// Cloudflare Worker — Vanguardeer
// Routes:
//   POST /                        → Anthropic chat proxy
//   POST /audit/request           → Receive audit form, trigger auto-audit
//   GET  /report/:id              → Password-gated client audit report
//   GET  /report/:id?pv=SECRET    → Admin view (bypasses gate, shows PDF button)
//   GET  /report/:id?pv=SECRET&print=1 → Admin view + auto-print
//   POST /report/:id/view         → Track report open
//
//   GET  /admin                   → Login page (redirects to /admin/dashboard if session active)
//   POST /admin/login             → Authenticate, set session cookie
//   POST /admin/logout            → Clear session, redirect to /admin
//   POST /admin/forgot            → Send magic login link email
//   GET  /admin/magic             → Consume magic token, create session, redirect to dashboard
//   GET  /admin/dashboard         → Admin dashboard (session required)
//   GET  /admin/dashboard?create=1 → Manual report creator (session required)
//   POST /admin/approve/:id       → Approve report (session required)
//   GET  /admin/report-info/:id   → Fetch report password (session required)
//   POST /admin/report            → Manual report create (session required)
//
// Secrets: ANTHROPIC_API_KEY, ADMIN_SECRET, RESEND_API_KEY
// KV:      AUDIT_REPORTS

const ALLOWED_ORIGINS = [
  "https://vanguardeer.com",
  "https://www.vanguardeer.com",
  "https://vanguardeer.pages.dev",
];
const NOTIFY_EMAIL = "enquiries@vanguardeer.com";
const BOOKING_URL  = "https://cal.com/vanguardeer-pte-ltd-5v1v0x/30min";
const SESSION_TTL  = 86400;   // 24 hours
const MAGIC_TTL    = 900;     // 15 minutes

function uid()         { return Math.random().toString(36).slice(2, 9); }
function esc(s)        { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function html(c,s=200,extra={}) { return new Response(c,{status:s,headers:{"Content-Type":"text/html;charset=UTF-8",...extra}}); }
function json(d,s=200,e={})     { return new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json",...e}}); }
function redirect(url,s=302,extra={}) { return new Response(null,{status:s,headers:{Location:url,...extra}}); }

// ── Session helpers ───────────────────────────────────────────────────────────

async function createSession(env) {
  const buf   = new Uint8Array(24);
  crypto.getRandomValues(buf);
  const token = Array.from(buf).map(b => b.toString(16).padStart(2,"0")).join("");
  await env.AUDIT_REPORTS.put(`session:${token}`, "1", { expirationTtl: SESSION_TTL });
  return token;
}

async function validateSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const m      = cookie.match(/admin_session=([a-f0-9]{48})/);
  if (!m) return false;
  const val = await env.AUDIT_REPORTS.get(`session:${m[1]}`);
  return !!val;
}

function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m      = cookie.match(/admin_session=([a-f0-9]{48})/);
  return m ? m[1] : null;
}

function sessionCookieHeader(token) {
  return `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${SESSION_TTL}`;
}

function clearCookieHeader() {
  return `admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0`;
}

// ── KV Index helpers ──────────────────────────────────────────────────────────

async function addToIndex(env, id, status, business) {
  const raw = await env.AUDIT_REPORTS.get("_index");
  const idx = raw ? JSON.parse(raw) : [];
  const filtered = idx.filter(e => e.id !== id);
  filtered.unshift({ id, status, business, created_at: new Date().toISOString() });
  await env.AUDIT_REPORTS.put("_index", JSON.stringify(filtered.slice(0, 200)));
}

async function updateIndexStatus(env, id, status) {
  const raw = await env.AUDIT_REPORTS.get("_index");
  if (!raw) return;
  const idx   = JSON.parse(raw);
  const entry = idx.find(e => e.id === id);
  if (entry) { entry.status = status; await env.AUDIT_REPORTS.put("_index", JSON.stringify(idx)); }
}

// ── Router ────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      const o  = request.headers.get("Origin") || "";
      const co = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin":  co,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }});
    }

    if (path === "/" || path === "/api/chat")               return handleChat(request, env);
    if (path === "/audit/request" && method === "POST")     return handleAuditRequest(request, env, ctx);

    // Admin auth routes (no session required)
    if (path === "/admin" && method === "GET")              return handleAdminLogin(request, env);
    if (path === "/admin/login" && method === "POST")       return handleAdminLoginPost(request, env);
    if (path === "/admin/logout" && method === "POST")      return handleAdminLogout(request, env);
    if (path === "/admin/forgot" && method === "POST")      return handleAdminForgot(request, env);
    if (path === "/admin/magic" && method === "GET")        return handleAdminMagic(request, env);

    // Admin protected routes (session required)
    if (path === "/admin/dashboard" && method === "GET")    return handleAdminDashboard(request, env);
    if (path === "/admin/report" && method === "POST")      return handleCreateReport(request, env);

    if (path.startsWith("/admin/approve/") && method === "POST")    return handleApprove(request, path, env);
    if (path.startsWith("/admin/report-info/") && method === "GET") return handleReportInfo(request, path, env);

    // Client report routes
    const rm = path.match(/^\/report\/([a-z0-9]+)(\/view)?$/);
    if (rm) {
      if (rm[2] === "/view" && method === "POST") return handleTrackView(rm[1], env);
      if (method === "GET")                        return handleReportPage(rm[1], request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

// ── Chat Proxy ────────────────────────────────────────────────────────────────

async function handleChat(request, env) {
  const o  = request.headers.get("Origin") || "";
  const co = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  const ch = { "Access-Control-Allow-Origin": co, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!env.ANTHROPIC_API_KEY)    return json({ error: "API key not configured" }, 500, ch);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, ch); }
  const { messages, system, max_tokens = 150 } = body;
  const { session_id, email } = body;
  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens, system, messages }),
  });
  const data = await up.json();

  // Persist conversation to D1 (non-blocking, best-effort)
  if (env.DB && messages?.length) {
    env.DB.prepare(
      `INSERT INTO chat_sessions (created_at, session_id, messages, email) VALUES (?, ?, ?, ?)`
    ).bind(
      new Date().toISOString(),
      session_id || uid(),
      JSON.stringify(messages),
      email || ""
    ).run().catch(() => {});
  }

  return new Response(JSON.stringify(data), { status: up.status, headers: { ...ch, "Content-Type": "application/json" } });
}

// ── Audit Request ─────────────────────────────────────────────────────────────

async function handleAuditRequest(request, env, ctx) {
  const o  = request.headers.get("Origin") || "";
  const co = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  const ch = { "Access-Control-Allow-Origin": co, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: "Invalid request" }, 400, ch); }

  if (body._gotcha) return json({ success: true }, 200, ch);
  if (!body.business || !body.name || !body.email) {
    return json({ success: false, error: "Missing required fields" }, 400, ch);
  }

  const id       = uid();
  const password = uid();
  const record   = {
    id, password, status: "pending", created_at: new Date().toISOString(),
    client: { business: body.business||"", industry: body.industry||"", name: body.name||"", email: body.email||"", phone: body.phone||"", website: body.website||"", keyword: body.keyword||"" },
    audit: {}, view_count: 0, views: [],
  };

  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(record));
  await addToIndex(env, id, "pending", record.client.business);

  // Persist structured data to D1 for querying/reporting
  try {
    await env.DB.prepare(
      `INSERT INTO audit_requests (created_at, business_name, industry, website, name, email, whatsapp, keyword, notes, utm_data, form_time, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      record.created_at,
      body.business || "",
      body.industry || "",
      body.website  || "",
      body.name     || "",
      body.email    || "",
      body.phone    || "",
      body.keyword  || "",
      body.notes    || "",
      JSON.stringify(body.utm || {}),
      body.form_time || "",
      body.source || "homepage"
    ).run();
  } catch (_) { /* D1 failure is non-fatal — KV is the source of truth */ }

  ctx.waitUntil(autoAudit(id, record, env));

  return json({ success: true, message: "Your audit is being prepared. Expect it within minutes!" }, 200, ch);
}

// ── Auto Audit Pipeline ───────────────────────────────────────────────────────

async function autoAudit(id, record, env) {
  try {
    const websiteData = record.client.website ? await fetchWebsiteData(record.client.website) : {};
    const auditData   = await generateAuditWithClaude(record.client, websiteData, env);
    const updated     = { ...record, status: "ready", audit: { ...websiteData, ...auditData }, audit_generated_at: new Date().toISOString() };
    await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(updated));
    await updateIndexStatus(env, id, "ready");
    await notifyAzam(updated, env);
  } catch (err) {
    const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
    if (raw) {
      const r = JSON.parse(raw);
      r.status = "error"; r.error_msg = err.message;
      await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(r));
      await updateIndexStatus(env, id, "error");
    }
  }
}

// ── Website Data Scraper ──────────────────────────────────────────────────────

async function fetchWebsiteData(website) {
  const url    = website.startsWith("http") ? website : `https://${website}`;
  const result = {
    title_tag: null, title_tag_ok: false, meta_description: null, meta_description_ok: false,
    schema_detected: false, local_business_schema: false, indexed_pages: null,
    is_https: url.startsWith("https://"), page_load_ok: false,
    has_og_tags: false, has_viewport: false, has_analytics: false,
    has_social_links: false, has_whatsapp_widget: false, has_robots_txt: false, image_count: 0,
  };

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VanguardeerBot/1.0)" }, redirect: "follow" });
    if (resp.ok) {
      result.page_load_ok = true;
      const text          = await resp.text();
      const titleM        = text.match(/<title[^>]*>([^<]{3,80})<\/title>/i);
      if (titleM) { result.title_tag = titleM[1].trim(); result.title_tag_ok = result.title_tag.length > 10; }
      const descM = text.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']{10,})/i)
                 || text.match(/<meta\s+content=["']([^"']{10,})["'][^>]+name=["']description["']/i);
      if (descM) { result.meta_description = descM[1].trim(); result.meta_description_ok = true; }
      result.schema_detected       = /<script[^>]+application\/ld\+json/i.test(text);
      result.local_business_schema = /LocalBusiness|HomeAndConstruction|ProfessionalService|FoodEstablishment/i.test(text);
      result.has_og_tags           = /property=["']og:/i.test(text);
      result.has_viewport          = /name=["']viewport["']/i.test(text);
      result.has_analytics         = /google-analytics|gtag\(|googletagmanager|gtm\.js|_ga\b/i.test(text);
      result.has_social_links      = /facebook\.com\/|instagram\.com\/|linkedin\.com\/|tiktok\.com\//i.test(text);
      result.has_whatsapp_widget   = /wa\.me\/|whatsapp\.com\/send|api\.whatsapp\.com/i.test(text);
      const imgs = text.match(/<img[\s>]/gi);
      result.image_count = imgs ? imgs.length : 0;
    }
  } catch {}

  try {
    const domain = new URL(url).origin;
    const sm     = await fetch(`${domain}/sitemap.xml`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (sm.ok) { const xml = await sm.text(); const locs = xml.match(/<loc>/g); if (locs) result.indexed_pages = locs.length; }
  } catch {}

  try {
    const domain = new URL(url).origin;
    const rb     = await fetch(`${domain}/robots.txt`, { headers: { "User-Agent": "Mozilla/5.0" } });
    result.has_robots_txt = rb.ok && rb.status === 200;
  } catch {}

  return result;
}

// ── Claude Audit Generation ───────────────────────────────────────────────────

async function generateAuditWithClaude(client, web, env) {
  const prompt = `You are a Singapore digital marketing expert producing a premium Digital Footprint Audit for a local SMB. Be specific, realistic, and Singapore-contextualised throughout. Use plain English — speak to a business owner, not a developer. Avoid jargon. Frame findings in terms of business impact.

Business: ${client.business}
Industry: ${client.industry || "not specified"}
Primary keyword/service: ${client.keyword || "not specified"}
Website: ${client.website || "none provided"}

Automated website scan results:
- HTTPS: ${web.is_https ? "yes" : "no"}
- Page loads OK: ${web.page_load_ok ? "yes" : "no"}
- Title tag: ${web.title_tag || "not found"} (${web.title_tag_ok ? "OK" : "issue"})
- Meta description: ${web.meta_description_ok ? "present" : "missing"}
- Mobile viewport: ${web.has_viewport ? "yes" : "no"}
- Open Graph tags: ${web.has_og_tags ? "yes" : "no"}
- Analytics/GTM: ${web.has_analytics ? "detected" : "not detected"}
- Schema markup: ${web.schema_detected ? "yes" : "no"}
- LocalBusiness schema: ${web.local_business_schema ? "yes" : "no"}
- Social links on site: ${web.has_social_links ? "yes" : "no"}
- WhatsApp widget: ${web.has_whatsapp_widget ? "yes" : "no"}
- Sitemap pages: ${web.indexed_pages ?? "unknown"}
- robots.txt: ${web.has_robots_txt ? "present" : "missing"}
- Homepage images: ${web.image_count}

Return ONLY a valid JSON object (no markdown fences, no commentary) with ALL of these fields:

{
  "overall_score": <integer 0-100>,
  "overall_grade": "<A|B|C|D|F>",
  "summary": "<2 punchy sentences: core digital problem and biggest opportunity>",
  "lost_leads_monthly": <integer>,
  "gbp_score": <integer 1-10>, "gbp_grade": "<A|B|C|D|F>",
  "gbp_notes": "<2-3 sentences>", "gbp_missing": ["<element>","<element>","<element>"],
  "gmb_rank": "<e.g. 5-9>", "gmb_area": "<SG district>",
  "reviews_ours": <integer, use 0 if no reviews found>,
  "review_rating": "<estimated avg star rating e.g. 4.2, or null if no reviews>",
  "review_velocity": "<slow|moderate|fast>",
  "review_summary": "<2-3 sentences in plain English: frank assessment of the review situation — volume, quality, what potential customers see when they Google this business>",
  "review_strengths": ["<positive theme visible in reviews — empty array if no reviews>"],
  "review_weaknesses": ["<gap or negative theme — if no reviews use 'No online social proof' as first item>"],
  "review_insight": "<1 sentence: specific business-revenue impact of the current review situation>",
  "seo_score": <integer 1-10>, "seo_grade": "<A|B|C|D|F>",
  "keyword_volume": "<e.g. 480>", "keyword_difficulty": "<Low|Medium|High>",
  "keyword_opportunity": "<1 sentence>",
  "citation_score": <integer 1-10>, "citation_grade": "<A|B|C|D|F>", "citation_notes": "<1-2 sentences>",
  "social_score": <integer 1-10>, "social_grade": "<A|B|C|D|F>", "social_notes": "<1-2 sentences>",
  "c1_name": "<competitor>", "reviews_c1": <integer>, "c1_rank": "<rank range>",
  "c2_name": "<competitor>", "reviews_c2": <integer>, "c2_rank": "<rank range>",
  "c3_name": "<competitor>", "reviews_c3": <integer>, "c3_rank": "<rank range>",
  "c4_name": "<competitor>", "reviews_c4": <integer>, "c4_rank": "<rank range>",
  "c5_name": "<competitor>", "reviews_c5": <integer>, "c5_rank": "<rank range>",
  "revenue_impact": "<SGD monthly range>", "revenue_breakdown": "<1 sentence logic>",
  "quick_wins": [
    {"title":"<title>","action":"<action>","impact":"<High|Medium>","time":"<e.g. 2 hours>"},
    {"title":"...","action":"...","impact":"...","time":"..."},
    {"title":"...","action":"...","impact":"...","time":"..."}
  ],
  "short_term": [
    {"title":"<title>","action":"<action>","impact":"<High|Medium>","timeline":"<e.g. 2 weeks>"},
    {"title":"...","action":"...","impact":"...","timeline":"..."},
    {"title":"...","action":"...","impact":"...","timeline":"..."}
  ],
  "rec1": "<SG-specific recommendation>", "rec2": "<recommendation>", "rec3": "<recommendation>"
}`;

  try {
    const resp  = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });
    const data  = await resp.json();
    const text  = data.content?.[0]?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch { return {}; }
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendEmail(env, { to = NOTIFY_EMAIL, subject, html: htmlBody }) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: "Vanguardeer <noreply@vanguardeer.com>", to: [to], subject, html: htmlBody }),
  }).catch(() => {});
}

async function notifyAzam(report, env) {
  await sendEmail(env, {
    subject: `🔍 Audit ready — ${report.client.business}`,
    html: `<h2>New audit ready for review</h2>
      <table cellpadding="6">
        <tr><td><strong>Business</strong></td><td>${esc(report.client.business)}</td></tr>
        <tr><td><strong>Client</strong></td><td>${esc(report.client.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${esc(report.client.email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${esc(report.client.phone || "—")}</td></tr>
        <tr><td><strong>Score</strong></td><td>${esc(String(report.audit?.overall_score || "?"))}/100</td></tr>
        <tr><td><strong>Report</strong></td><td>https://vanguardeer.com/report/${report.id}</td></tr>
        <tr><td><strong>Password</strong></td><td><strong>${report.password}</strong></td></tr>
      </table><br>
      <a href="https://vanguardeer-chat.vanguardeer.workers.dev/admin" style="background:#C8A44D;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Admin Dashboard →</a>`,
  });
}

// ── Admin: Login page ─────────────────────────────────────────────────────────

async function handleAdminLogin(request, env) {
  // Redirect to dashboard if already logged in
  if (await validateSession(request, env)) {
    return redirect("/admin/dashboard");
  }
  const url   = new URL(request.url);
  const error = url.searchParams.get("error");
  const info  = url.searchParams.get("info");
  return html(adminLoginHTML(error, info));
}

async function handleAdminLoginPost(request, env) {
  let body;
  try { const fd = await request.formData(); body = { password: fd.get("password") }; }
  catch { return redirect("/admin?error=invalid"); }

  if (!env.ADMIN_SECRET || body.password !== env.ADMIN_SECRET) {
    return redirect("/admin?error=wrong");
  }

  const token = await createSession(env);
  return redirect("/admin/dashboard", 302, { "Set-Cookie": sessionCookieHeader(token) });
}

async function handleAdminLogout(request, env) {
  const token = getSessionToken(request);
  if (token) await env.AUDIT_REPORTS.delete(`session:${token}`).catch(() => {});
  return redirect("/admin", 302, { "Set-Cookie": clearCookieHeader() });
}

// ── Admin: Forgot password (magic link) ───────────────────────────────────────

async function handleAdminForgot(request, env) {
  // Generate a 15-min magic token, email it to NOTIFY_EMAIL
  const buf   = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const token = Array.from(buf).map(b => b.toString(16).padStart(2,"0")).join("");
  await env.AUDIT_REPORTS.put(`magic:${token}`, "1", { expirationTtl: MAGIC_TTL });

  const workerBase = "https://vanguardeer-chat.vanguardeer.workers.dev";
  const link       = `${workerBase}/admin/magic?token=${token}`;
  const expires    = new Date(Date.now() + MAGIC_TTL * 1000).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" });

  await sendEmail(env, {
    subject: "🔑 Vanguardeer Admin — Magic Login Link",
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h2 style="color:#C8A44D">Admin Login Request</h2>
      <p>Click the link below to log in to the Vanguardeer admin dashboard. This link expires at <strong>${expires} SGT</strong>.</p>
      <br>
      <a href="${link}" style="display:inline-block;background:#C8A44D;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">Log In Now →</a>
      <br><br>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email. The link will expire in 15 minutes.</p>
      <p style="color:#bbb;font-size:11px;margin-top:16px;word-break:break-all">${link}</p>
    </div>`,
  });

  return redirect("/admin?info=sent");
}

async function handleAdminMagic(request, env) {
  const url   = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return redirect("/admin?error=invalid");

  const val = await env.AUDIT_REPORTS.get(`magic:${token}`);
  if (!val)  return redirect("/admin?error=expired");

  // Consume the magic token (one-time use)
  await env.AUDIT_REPORTS.delete(`magic:${token}`).catch(() => {});

  const sessionToken = await createSession(env);
  return redirect("/admin/dashboard", 302, { "Set-Cookie": sessionCookieHeader(sessionToken) });
}

// ── Admin: Dashboard ──────────────────────────────────────────────────────────

async function handleAdminDashboard(request, env) {
  if (!await validateSession(request, env)) return redirect("/admin?error=session");

  const url = new URL(request.url);
  if (url.searchParams.get("create") === "1") return html(adminCreateHTML());

  const raw = await env.AUDIT_REPORTS.get("_index");
  const idx = raw ? JSON.parse(raw) : [];
  return html(adminDashboardHTML(idx, env.ADMIN_SECRET || ""));
}

// ── Admin: Approve ────────────────────────────────────────────────────────────

async function handleApprove(request, path, env) {
  if (!await validateSession(request, env)) return json({ error: "Unauthorized" }, 401);

  const id  = path.split("/")[3];
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ error: "Not found" }, 404);

  const report       = JSON.parse(raw);
  report.status      = "approved";
  report.approved_at = new Date().toISOString();
  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(report));
  await updateIndexStatus(env, id, "approved");

  const c    = report.client;
  const msg  = `Hi ${c.name}! 👋\n\nYour Digital Footprint Audit for *${c.business}* is ready.\n\n🔗 Report: https://vanguardeer.com/report/${id}\n🔑 Password: ${report.password}\n\nWant to walk through the findings together? Book your free 30-min review call:\n📅 ${BOOKING_URL}\n\n— Azam, Vanguardeer`;
  const phone = c.phone.replace(/\D/g, "");
  const waUrl = phone
    ? `https://wa.me/${phone.startsWith("65") ? phone : "65" + phone}?text=${encodeURIComponent(msg)}`
    : null;

  return json({ ok: true, wa_url: waUrl, message: msg });
}

// ── Admin: Report Info ────────────────────────────────────────────────────────

async function handleReportInfo(request, path, env) {
  if (!await validateSession(request, env)) return json({ error: "Unauthorized" }, 401);
  const id  = path.split("/")[3];
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ error: "Not found" }, 404);
  const r = JSON.parse(raw);
  return json({ id, password: r.password, status: r.status, business: r.client?.business });
}

// ── Admin: Manual Report Create ───────────────────────────────────────────────

async function handleCreateReport(request, env) {
  if (!await validateSession(request, env)) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const id       = body.id || uid();
  const password = body.password || uid();
  const report   = { id, password, status: "ready", created_at: new Date().toISOString(), client: body.client || {}, audit: body.audit || {}, view_count: 0, views: [] };
  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(report));
  await addToIndex(env, id, "ready", report.client?.business || "—");
  const base = `https://vanguardeer.com/report/${id}`;
  const adminUrl = env.ADMIN_SECRET ? `${base}?pv=${encodeURIComponent(env.ADMIN_SECRET)}` : base;
  return json({ id, password, url: base, admin_url: adminUrl });
}

// ── View Tracking ─────────────────────────────────────────────────────────────

async function handleTrackView(id, env) {
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ ok: false }, 404);
  const report     = JSON.parse(raw);
  const now        = new Date().toISOString();
  report.view_count = (report.view_count || 0) + 1;
  report.views      = [...(report.views || []), now];
  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(report));
  sendEmail(env, {
    subject: `🔓 Report opened — ${report.client.business || id}`,
    html: `<p><strong>${esc(report.client.business)}</strong>'s report was just opened.</p><p>Total views: <strong>${report.view_count}</strong> · Time: ${now}</p>`,
  }).catch(() => {});
  return json({ ok: true });
}

// ── Client Report Page ────────────────────────────────────────────────────────

async function handleReportPage(id, request, env) {
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return html(`<!DOCTYPE html><html><head><title>Not Found</title>
<style>body{background:#F8F7F4;color:#0B1F3A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.b{text-align:center}.logo{font-size:2rem;font-weight:900;letter-spacing:-.05em}.logo span{color:#C8A44D}p{color:#888}</style>
</head><body><div class="b"><div class="logo">VANGUARDEER</div>
<p>Report not found. Contact <a href="mailto:enquiries@vanguardeer.com" style="color:#C8A44D">enquiries@vanguardeer.com</a></p>
</div></body></html>`, 404);

  const u         = new URL(request.url);
  const pv        = u.searchParams.get("pv") || "";
  const r         = JSON.parse(raw);
  const adminView = !!(env.ADMIN_SECRET && pv === env.ADMIN_SECRET);
  const autoPrint = adminView && u.searchParams.get("print") === "1";
  // Skip the password gate if admin OR if the report hasn't been sent to the client yet
  const skipGate  = adminView || r.status !== "approved";

  return html(reportHTML(r, id, adminView, autoPrint, skipGate));
}

// ── Admin Login HTML ──────────────────────────────────────────────────────────

function adminLoginHTML(error, info) {
  const errorMsg = {
    wrong:   "Incorrect password. Try again or use a magic link.",
    invalid: "Something went wrong. Please try again.",
    session: "Your session has expired. Please log in again.",
    expired: "That magic link has expired. Request a new one.",
  }[error] || "";

  const infoMsg = info === "sent"
    ? "Magic link sent! Check your email at enquiries@vanguardeer.com."
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Login — Vanguardeer</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F8F7F4;color:#0B1F3A;font-family:'Open Sans',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
.card{width:100%;max-width:400px}
.logo{text-align:center;margin-bottom:.4rem}
.sub{text-align:center;color:#444;font-size:.85rem;margin-bottom:2rem}
.field{margin-bottom:1rem}
label{display:block;font-size:.78rem;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.45rem}
input[type=password]{width:100%;background:#fff;border:1px solid #c8c4bc;border-radius:8px;color:#0B1F3A;padding:.9rem 1rem;font-size:1rem;outline:none;transition:border .2s;-webkit-appearance:none}
input[type=password]:focus{border-color:#C8A44D}
.btn{width:100%;background:#C8A44D;color:#0B1F3A;font-weight:700;font-size:1rem;padding:.9rem;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s;margin-top:.25rem}
.btn:hover{opacity:.9}
.divider{display:flex;align-items:center;gap:1rem;margin:1.5rem 0;color:#333;font-size:.8rem}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:#e8e4dc}
.magic-form{text-align:center}
.magic-btn{background:none;border:1px solid #222;color:#888;font-size:.9rem;padding:.75rem 1.5rem;border-radius:8px;cursor:pointer;width:100%;transition:border-color .2s,color .2s}
.magic-btn:hover{border-color:#9B7830;color:#9B7830}
.msg-error{background:#2e0d0d;border:1px solid #ff6b6b40;color:#ff6b6b;font-size:.85rem;padding:.75rem 1rem;border-radius:8px;margin-bottom:1.25rem;text-align:center}
.msg-info{background:#faf8f2;border:1px solid #e8d8a0;color:#9B7830;font-size:.85rem;padding:.75rem 1rem;border-radius:8px;margin-bottom:1.25rem;text-align:center}
.toggle-hint{font-size:.78rem;color:#444;text-align:center;margin-top:1.25rem;cursor:pointer;user-select:none}
.toggle-hint span{color:#9B7830}
#magic-section{display:none}
#pw-section{}
.pw-eye{position:relative}
.pw-eye input{padding-right:2.8rem}
.eye-btn{position:absolute;right:.9rem;top:50%;transform:translateY(-50%);background:none;border:none;color:#444;cursor:pointer;font-size:1rem;padding:0;line-height:1;transition:color .15s}
.eye-btn:hover{color:#9B7830}
</style>
</head>
<body>
<div class="card">
  <div class="logo"><img src="https://vanguardeer.com/brand/logos/logo-horizontal-tagline.svg" alt="Vanguardeer" style="height:68px;display:block;margin:0 auto"></div>
  <div class="sub">Admin Dashboard</div>

  ${errorMsg ? `<div class="msg-error">⚠ ${esc(errorMsg)}</div>` : ""}
  ${infoMsg  ? `<div class="msg-info">✉ ${esc(infoMsg)}</div>`   : ""}

  <div id="pw-section">
    <form method="POST" action="/admin/login">
      <div class="field">
        <label for="password">Password</label>
        <div class="pw-eye">
          <input type="password" id="password" name="password" autocomplete="current-password" autofocus required>
          <button type="button" class="eye-btn" onclick="togglePw()" title="Show/hide">👁</button>
        </div>
      </div>
      <button type="submit" class="btn">Log In →</button>
    </form>
    <div class="toggle-hint" onclick="showMagic()">Forgot your password? <span>Send a magic link</span></div>
  </div>

  <div id="magic-section">
    <div style="color:#666;font-size:.85rem;text-align:center;margin-bottom:1.25rem;line-height:1.6">
      We'll email a one-time login link to<br><strong style="color:#5B6470">enquiries@vanguardeer.com</strong><br>Valid for 15 minutes.
    </div>
    <form method="POST" action="/admin/forgot" class="magic-form">
      <button type="submit" class="btn">Send Magic Link →</button>
    </form>
    <div class="toggle-hint" onclick="showPw()">← Back to password login</div>
  </div>
</div>

<script>
function showMagic(){ document.getElementById("pw-section").style.display="none"; document.getElementById("magic-section").style.display="block"; }
function showPw()   { document.getElementById("magic-section").style.display="none"; document.getElementById("pw-section").style.display="block"; }
function togglePw() {
  var i = document.getElementById("password");
  i.type = i.type === "password" ? "text" : "password";
}
document.getElementById("password").addEventListener("keydown", function(e){ if(e.key==="Enter") e.target.closest("form").submit(); });
</script>
</body>
</html>`;
}

// ── Admin Dashboard HTML ──────────────────────────────────────────────────────

function adminDashboardHTML(idx, adminSecret) {
  const statusBadge = s => ({
    pending:  "<span style=\"color:#f0a500\">⏳ Generating…</span>",
    ready:    "<span style=\"color:#C8A44D\">✅ Ready</span>",
    approved: "<span style=\"color:#888\">✓ Approved</span>",
    error:    "<span style=\"color:#ff6b6b\">⚠ Error</span>",
    sent:     "<span style=\"color:#888\">✓ Sent</span>",
  }[s] || s);

  const rows = idx.length ? idx.map(e => `
    <tr>
      <td>${esc(e.business || "—")}</td>
      <td>${statusBadge(e.status)}</td>
      <td style="color:#555;font-size:.8rem">${new Date(e.created_at).toLocaleDateString("en-SG",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</td>
      <td style="white-space:nowrap">
        <a href="/report/${esc(e.id)}?pv=${encodeURIComponent(adminSecret)}" target="_blank" style="color:#C8A44D;font-size:.8rem;margin-right:.75rem">View</a>
        <button onclick="showPwd('${esc(e.id)}')" style="background:#fff;border:1px solid #c8c4bc;color:#5B6470;padding:.3rem .7rem;border-radius:4px;font-size:.8rem;cursor:pointer;margin-right:.5rem">Password</button>
        ${e.status === "ready" ? `<button onclick="approve('${esc(e.id)}',this)" style="background:#C8A44D;color:#0B1F3A;border:none;padding:.3rem .8rem;border-radius:4px;font-size:.8rem;font-weight:700;cursor:pointer">Approve &amp; Send →</button>` : ""}
      </td>
    </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;color:#555;padding:2rem">No audits yet</td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audit Dashboard — Vanguardeer</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F8F7F4;color:#0B1F3A;font-family:'Open Sans',Arial,sans-serif;padding:2rem 1.5rem;max-width:960px;margin:0 auto}
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:.35rem}
h1{font-size:1.4rem;font-weight:800;color:#0B1F3A}h1 span{color:#9B7830}
.actions{display:flex;gap:.75rem;align-items:center}
.sub{color:#666;font-size:.85rem;margin-bottom:2rem}
.action-link{color:#9B7830;font-size:.85rem;text-decoration:none;background:#faf8f2;border:1px solid #e8d8a0;padding:.35rem .8rem;border-radius:6px}
.logout-btn{background:#fff;border:1px solid #c8c4bc;color:#5B6470;font-size:.8rem;padding:.35rem .8rem;border-radius:6px;cursor:pointer;text-decoration:none}
.logout-btn:hover{border-color:#ff6b6b;color:#ff6b6b}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#5B6470;padding:.6rem 0;border-bottom:1px solid #e8e4dc}
td{padding:.75rem 0;border-bottom:1px solid #e8e4dc;vertical-align:middle}
#wa-modal{display:none;position:fixed;inset:0;background:#000a;z-index:99;align-items:center;justify-content:center}
#wa-modal.show{display:flex}
.modal-box{background:#fff;border:1px solid #e8e4dc;border-radius:12px;padding:1.5rem;max-width:500px;width:90%}
.modal-box h3{color:#C8A44D;margin-bottom:1rem}
.msg-box{background:#fff;border:1px solid #e8e4dc;border-radius:8px;padding:1rem;font-size:.85rem;color:#0B1F3A;white-space:pre-wrap;margin-bottom:1rem}
.wa-btn{display:block;width:100%;text-align:center;background:#25d366;color:#fff;font-weight:700;padding:.85rem;border-radius:8px;text-decoration:none;margin-bottom:.75rem;font-size:.95rem}
.close-btn{background:#F8F7F4;border:none;color:#5B6470;padding:.5rem 1rem;border-radius:6px;cursor:pointer;font-size:.85rem;width:100%}
</style></head><body>
<div class="topbar">
  <img src="https://vanguardeer.com/brand/logos/logo-horizontal-tagline.svg" alt="Vanguardeer" style="height:68px;display:block">
  <div class="actions">
    <a href="/admin/dashboard?create=1" class="action-link">+ Manual audit</a>
    <form method="POST" action="/admin/logout" style="margin:0">
      <button type="submit" class="logout-btn">Log out</button>
    </form>
  </div>
</div>
<div class="sub">Audit reports &nbsp;·&nbsp; <span style="cursor:pointer;color:#555" onclick="location.reload()">↻ Refresh</span></div>
<table>
  <thead><tr><th>Business</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div id="wa-modal">
  <div class="modal-box">
    <h3>✅ Report Approved</h3>
    <p style="color:#666;font-size:.85rem;margin-bottom:.75rem">WhatsApp message ready to send:</p>
    <div class="msg-box" id="wa-msg"></div>
    <a id="wa-link" href="#" target="_blank" class="wa-btn">📲 Open in WhatsApp</a>
    <button class="close-btn" onclick="closeModal()">Close</button>
  </div>
</div>
<script>
async function approve(id, btn) {
  btn.textContent = "Approving…"; btn.disabled = true;
  try {
    const r = await fetch("/admin/approve/" + id, { method: "POST", credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "HTTP " + r.status);
    document.getElementById("wa-msg").textContent = d.message;
    document.getElementById("wa-link").href = d.wa_url || "#";
    document.getElementById("wa-modal").classList.add("show");
    btn.closest("tr").querySelector("td:nth-child(2)").innerHTML = '<span style="color:#888">✓ Approved</span>';
    btn.remove();
  } catch(e) { alert("Approval failed: " + e.message); btn.textContent = "Approve & Send →"; btn.disabled = false; }
}
function closeModal() { document.getElementById("wa-modal").classList.remove("show"); }
async function showPwd(id) {
  const r = await fetch("/admin/report-info/" + id, { credentials: "include" });
  const d = await r.json();
  if (d.password) alert("Report: https://vanguardeer.com/report/" + id + "\\nPassword: " + d.password);
  else alert("Error: " + (d.error || "Could not fetch"));
}
</script></body></html>`;
}

// ── Admin Create HTML ─────────────────────────────────────────────────────────

function adminCreateHTML() {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Create Audit — Vanguardeer</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#F8F7F4;color:#0B1F3A;font-family:'Open Sans',Arial,sans-serif;padding:2rem 1rem;max-width:760px;margin:0 auto}
h1{font-size:1.4rem;font-weight:800;margin-bottom:.25rem}h1 span{color:#C8A44D}.sub{color:#666;font-size:.85rem;margin-bottom:2rem}.sub a{color:#C8A44D;text-decoration:none}
.sec{margin-bottom:2rem}.sec h2{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C8A44D;margin-bottom:.75rem;padding-bottom:.4rem;border-bottom:1px solid #e8e4dc}
.row{display:grid;gap:.75rem;margin-bottom:.75rem}.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1fr 1fr 1fr}
label{font-size:.75rem;color:#666;display:block;margin-bottom:.3rem}
input,textarea{width:100%;background:#fff;border:1px solid #c8c4bc;border-radius:6px;color:#0B1F3A;padding:.65rem .8rem;font-size:.9rem;font-family:inherit;outline:none;transition:border .2s}
input:focus,textarea:focus{border-color:#9B7830}textarea{resize:vertical;min-height:80px}
.cb-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem}.cb-row input{width:auto}.cb-row label{margin:0;color:#5B6470}
.sbtn{background:#C8A44D;color:#0B1F3A;font-weight:700;font-size:1rem;padding:.9rem 2rem;border:none;border-radius:8px;cursor:pointer;width:100%;margin-top:1rem}
.result{display:none;margin-top:1.5rem;background:#faf8f2;border:1px solid #C8A44D40;border-radius:8px;padding:1.25rem}
.result h3{color:#C8A44D;font-size:.85rem;margin-bottom:.75rem}.ru{font-size:.9rem;word-break:break-all;margin-bottom:.5rem}.ru a{color:#C8A44D}
.rpw{font-size:.9rem;color:#5B6470}.rpw strong{color:#0B1F3A}
.cpbtn{margin-top:.75rem;background:#F8F7F4;border:1px solid #c8c4bc;color:#0B1F3A;padding:.45rem .9rem;border-radius:6px;cursor:pointer;font-size:.8rem}
</style></head><body>
<img src="https://vanguardeer.com/brand/logos/logo-horizontal-tagline.svg" alt="Vanguardeer" style="height:68px;display:block;margin-bottom:.75rem">
<h1>Manual Audit</h1>
<p class="sub"><a href="/admin/dashboard">← Back to dashboard</a></p>
<form id="f">
  <div class="sec"><h2>Client Info</h2>
    <div class="row r2"><div><label>Business Name *</label><input name="business" required></div><div><label>Industry</label><input name="industry"></div></div>
    <div class="row r2"><div><label>Contact Name *</label><input name="name" required></div><div><label>Email *</label><input name="email" type="email" required></div></div>
    <div class="row r2"><div><label>WhatsApp</label><input name="phone"></div><div><label>Website</label><input name="website"></div></div>
    <div class="row"><div><label>Primary Keyword</label><input name="keyword"></div></div>
    <div class="row r2"><div><label>Report Password</label><input name="password" placeholder="Auto-generate if blank"></div></div>
  </div>
  <div class="sec"><h2>Overall Score</h2>
    <div class="row r2"><div><label>Score /100</label><input name="overall_score" type="number" min="0" max="100"></div><div><label>Grade</label><input name="overall_grade" placeholder="A / B / C / D / F"></div></div>
    <div class="row"><div><label>Executive Summary</label><textarea name="summary"></textarea></div></div>
    <div class="row r2"><div><label>Lost Leads / Month</label><input name="lost_leads_monthly" type="number" min="0"></div></div>
  </div>
  <div class="sec"><h2>Google Business Profile</h2>
    <div class="row r2"><div><label>Maps Rank Range</label><input name="gmb_rank" placeholder="e.g. 5-8"></div><div><label>Search Area</label><input name="gmb_area" placeholder="e.g. Jurong West"></div></div>
    <div class="row r2"><div><label>GBP Score /10</label><input name="gbp_score" type="number" min="0" max="10" step="0.5"></div><div><label>GBP Grade</label><input name="gbp_grade" placeholder="A / B / C / D / F"></div></div>
    <div class="row"><div><label>GBP Notes</label><textarea name="gbp_notes"></textarea></div></div>
    <div class="row"><div><label>GBP Missing Elements (comma-separated)</label><input name="gbp_missing" placeholder="e.g. Regular posts, Q&amp;A responses"></div></div>
  </div>
  <div class="sec"><h2>Reviews &amp; Competitors</h2>
    <div class="row r2"><div><label>Client Reviews</label><input name="reviews_ours" type="number" min="0"></div><div><label>Review Velocity</label><input name="review_velocity" placeholder="slow / moderate / fast"></div></div>
    <div class="row r3"><div><label>Competitor 1</label><input name="c1_name"></div><div><label>Competitor 2</label><input name="c2_name"></div><div><label>Competitor 3</label><input name="c3_name"></div></div>
    <div class="row r3"><div><label>C1 Reviews</label><input name="reviews_c1" type="number"></div><div><label>C2 Reviews</label><input name="reviews_c2" type="number"></div><div><label>C3 Reviews</label><input name="reviews_c3" type="number"></div></div>
    <div class="row r3"><div><label>C1 Rank</label><input name="c1_rank" placeholder="e.g. 1-2"></div><div><label>C2 Rank</label><input name="c2_rank"></div><div><label>C3 Rank</label><input name="c3_rank"></div></div>
  </div>
  <div class="sec"><h2>Website &amp; SEO</h2>
    <div class="row r2"><div><label>SEO Score /10</label><input name="seo_score" type="number" min="0" max="10" step="0.5"></div><div><label>SEO Grade</label><input name="seo_grade" placeholder="A / B / C / D / F"></div></div>
    <div class="row r3"><div><label>Keyword Volume / mo</label><input name="keyword_volume" placeholder="e.g. 480"></div><div><label>Keyword Difficulty</label><input name="keyword_difficulty" placeholder="Low / Medium / High"></div><div><label>Indexed Pages</label><input name="indexed_pages" type="number" min="0"></div></div>
    <div class="row"><div><label>Keyword Opportunity</label><input name="keyword_opportunity"></div></div>
    <div>
      <div class="cb-row"><input type="checkbox" name="is_https" id="https"><label for="https">HTTPS secure</label></div>
      <div class="cb-row"><input type="checkbox" name="title_tag_ok" id="tto"><label for="tto">Title tag OK</label></div>
      <div class="cb-row"><input type="checkbox" name="meta_description_ok" id="mdo"><label for="mdo">Meta description present</label></div>
      <div class="cb-row"><input type="checkbox" name="has_viewport" id="vp"><label for="vp">Mobile viewport</label></div>
      <div class="cb-row"><input type="checkbox" name="has_analytics" id="ha"><label for="ha">Analytics / GTM detected</label></div>
      <div class="cb-row"><input type="checkbox" name="schema_detected" id="sd"><label for="sd">Schema markup</label></div>
      <div class="cb-row"><input type="checkbox" name="local_business_schema" id="lbs"><label for="lbs">LocalBusiness schema</label></div>
      <div class="cb-row"><input type="checkbox" name="has_og_tags" id="og"><label for="og">Open Graph tags</label></div>
      <div class="cb-row"><input type="checkbox" name="has_social_links" id="sl"><label for="sl">Social links on site</label></div>
      <div class="cb-row"><input type="checkbox" name="has_whatsapp_widget" id="wa"><label for="wa">WhatsApp widget</label></div>
    </div>
  </div>
  <div class="sec"><h2>Online Presence &amp; Social</h2>
    <div class="row r2"><div><label>Citation Score /10</label><input name="citation_score" type="number" min="0" max="10" step="0.5"></div><div><label>Citation Grade</label><input name="citation_grade" placeholder="A / B / C / D / F"></div></div>
    <div class="row"><div><label>Citation Notes</label><textarea name="citation_notes"></textarea></div></div>
    <div class="row r2"><div><label>Social Score /10</label><input name="social_score" type="number" min="0" max="10" step="0.5"></div><div><label>Social Grade</label><input name="social_grade" placeholder="A / B / C / D / F"></div></div>
    <div class="row"><div><label>Social Notes</label><textarea name="social_notes"></textarea></div></div>
  </div>
  <div class="sec"><h2>Revenue Impact</h2>
    <div class="row"><div><label>Monthly Revenue Potential</label><input name="revenue_impact" placeholder="e.g. S$3,000–S$8,000"></div></div>
    <div class="row"><div><label>Revenue Breakdown (logic)</label><input name="revenue_breakdown"></div></div>
  </div>
  <div class="sec"><h2>Recommendations</h2>
    <div class="row"><div><label>Rec 1</label><textarea name="rec1"></textarea></div></div>
    <div class="row"><div><label>Rec 2</label><textarea name="rec2"></textarea></div></div>
    <div class="row"><div><label>Rec 3</label><textarea name="rec3"></textarea></div></div>
  </div>
  <button type="submit" class="sbtn">Generate Report →</button>
</form>
<div class="result" id="res">
  <h3>✅ Report Created</h3>
  <div class="ru">URL: <a id="ru" href="#" target="_blank"></a></div>
  <div class="rpw">Password: <strong id="rpw"></strong></div>
  <button class="cpbtn" onclick="copyAll()">Copy URL + Password</button>
</div>
<script>
document.getElementById("f").addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target), btn = e.target.querySelector(".sbtn");
  btn.textContent = "Generating…"; btn.disabled = true;
  const client = { business:fd.get("business"), name:fd.get("name"), email:fd.get("email"), phone:fd.get("phone"), website:fd.get("website"), keyword:fd.get("keyword"), industry:fd.get("industry") };
  const audit  = {
    overall_score:fd.get("overall_score"), overall_grade:fd.get("overall_grade"), summary:fd.get("summary"), lost_leads_monthly:fd.get("lost_leads_monthly"),
    gmb_rank:fd.get("gmb_rank"), gmb_area:fd.get("gmb_area"), gbp_score:fd.get("gbp_score"), gbp_grade:fd.get("gbp_grade"), gbp_notes:fd.get("gbp_notes"),
    gbp_missing: fd.get("gbp_missing") ? fd.get("gbp_missing").split(",").map(s=>s.trim()).filter(Boolean) : [],
    reviews_ours:fd.get("reviews_ours"), review_velocity:fd.get("review_velocity"),
    c1_name:fd.get("c1_name"), reviews_c1:fd.get("reviews_c1"), c1_rank:fd.get("c1_rank"),
    c2_name:fd.get("c2_name"), reviews_c2:fd.get("reviews_c2"), c2_rank:fd.get("c2_rank"),
    c3_name:fd.get("c3_name"), reviews_c3:fd.get("reviews_c3"), c3_rank:fd.get("c3_rank"),
    seo_score:fd.get("seo_score"), seo_grade:fd.get("seo_grade"), keyword_volume:fd.get("keyword_volume"),
    keyword_difficulty:fd.get("keyword_difficulty"), keyword_opportunity:fd.get("keyword_opportunity"), indexed_pages:fd.get("indexed_pages"),
    is_https:fd.get("is_https")==="on", title_tag_ok:fd.get("title_tag_ok")==="on", meta_description_ok:fd.get("meta_description_ok")==="on",
    has_viewport:fd.get("has_viewport")==="on", has_analytics:fd.get("has_analytics")==="on", schema_detected:fd.get("schema_detected")==="on",
    local_business_schema:fd.get("local_business_schema")==="on", has_og_tags:fd.get("has_og_tags")==="on",
    has_social_links:fd.get("has_social_links")==="on", has_whatsapp_widget:fd.get("has_whatsapp_widget")==="on",
    citation_score:fd.get("citation_score"), citation_grade:fd.get("citation_grade"), citation_notes:fd.get("citation_notes"),
    social_score:fd.get("social_score"), social_grade:fd.get("social_grade"), social_notes:fd.get("social_notes"),
    revenue_impact:fd.get("revenue_impact"), revenue_breakdown:fd.get("revenue_breakdown"),
    rec1:fd.get("rec1"), rec2:fd.get("rec2"), rec3:fd.get("rec3")
  };
  try {
    const r = await fetch("/admin/report", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({client,audit,password:fd.get("password")||undefined}) });
    const d = await r.json();
    if (!r.ok) { if(r.status===401){location.href="/admin?error=session";return;} throw new Error(d.error); }
    document.getElementById("ru").href = d.admin_url || d.url;
    document.getElementById("ru").textContent = d.url;
    document.getElementById("rpw").textContent = d.password;
    document.getElementById("res").style.display = "block";
    btn.textContent = "Generate Report →"; btn.disabled = false;
    document.getElementById("res").scrollIntoView({behavior:"smooth"});
  } catch(e) { alert("Error: "+e.message); btn.textContent = "Generate Report →"; btn.disabled = false; }
});
function copyAll(){ navigator.clipboard.writeText("Report: "+document.getElementById("ru").textContent+"\\nPassword: "+document.getElementById("rpw").textContent).then(()=>alert("Copied!")); }
</script></body></html>`;
}

// ── Report HTML ───────────────────────────────────────────────────────────────

function reportHTML(r, id, adminView, autoPrint, skipGate) {
  adminView  = !!adminView;
  autoPrint  = !!autoPrint;
  skipGate   = !!skipGate;
  const c    = r.client || {};
  const a    = r.audit  || {};
  const date = new Date(r.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });

  const score    = Math.min(100, Math.max(0, Number(a.overall_score) || 0));
  const grade    = a.overall_grade || "—";
  const scoreArc = ((score / 100) * 251.3).toFixed(1);
  const gbpScore = Number(a.gbp_score) || 0;
  const gbpArc   = ((gbpScore / 10) * 251.3).toFixed(1);

  const gc = function(g) { var m = { A:"#C8A44D", B:"#22c55e", C:"#f0a500", D:"#f97316", F:"#ef4444" }; return m[g] || "#888"; };
  const gradeColor = gc(grade);

  var compRows = [[a.c1_name,a.reviews_c1,a.c1_rank],[a.c2_name,a.reviews_c2,a.c2_rank],[a.c3_name,a.reviews_c3,a.c3_rank],[a.c4_name,a.reviews_c4,a.c4_rank],[a.c5_name,a.reviews_c5,a.c5_rank]]
    .filter(function(x){return x[0];}).map(function(x){return "<tr><td>"+esc(x[0])+"</td><td>"+(x[1]||"—")+"</td><td style=\"color:#666\">"+(x[2]?"~"+esc(String(x[2])):"—")+"</td></tr>";}).join("");

  var webChecks = c.website ? [
    ["Secure Connection (HTTPS)",!!a.is_https,"crit"],["Page Title Optimised",!!a.title_tag_ok,"crit"],["Google Search Preview Text",!!a.meta_description_ok,"crit"],
    ["Works on Mobile",!!a.has_viewport,"crit"],["Visitor Tracking (Analytics)",!!a.has_analytics,"crit"],["Rich Search Snippets",!!a.schema_detected,"imp"],
    ["Local Business Data",!!a.local_business_schema,"nice"],["Social Media Share Preview",!!a.has_og_tags,"imp"],
    ["Search Engine Sitemap",(a.indexed_pages||0)>0,"imp"],["Search Bot Guide",!!a.has_robots_txt,"nice"],
    ["Social Media Links on Site",!!a.has_social_links,"nice"],["WhatsApp Chat Button",!!a.has_whatsapp_widget,"nice"],
  ] : [];

  var checkHTML = webChecks.map(function(item){
    var ok=item[1],type=item[2],cls=ok?"ok":(type==="crit"?"bad":"warn"),icon=ok?"✓":(type==="crit"?"✗":"!");
    return "<div class=\"check-item\"><div class=\"ci-icon "+cls+"\">"+icon+"</div><span class=\"ci-"+(ok?"ok":type==="crit"?"bad":"warn")+"\">"+esc(item[0])+"</span></div>";
  }).join("");

  var gbpMissing    = (a.gbp_missing||[]).map(function(m){return "<span class=\"miss-tag\">✗ "+esc(m)+"</span>";}).join("");
  var quickWinsHTML = (a.quick_wins||[]).map(function(qw){var imp=String(qw.impact||"").toLowerCase()==="high"?"high":"med";return "<div class=\"action-card\"><span class=\"ac-badge ac-badge-"+imp+"\">"+esc(qw.impact||"Medium")+" Impact</span><div class=\"ac-title\">"+esc(qw.title||"")+"</div><div class=\"ac-action\">"+esc(qw.action||"")+"</div></div>";}).join("");
  var shortTermHTML = (a.short_term||[]).map(function(st,i){var imp=String(st.impact||"").toLowerCase()==="high"?"high":"med";return "<div class=\"ri\"><div class=\"rn\" style=\"background:#f0a500;color:#fff\">"+(i+1)+"</div><div class=\"rtx\"><strong>"+esc(st.title||"")+"</strong><br>"+esc(st.action||"")+"<span class=\"ri-meta\"> &nbsp;·&nbsp; "+esc(st.timeline||"")+" &nbsp;·&nbsp; <span class=\"ac-badge ac-badge-"+imp+"\">"+esc(st.impact||"Medium")+"</span></span></div></div>";}).join("");

  function scorecard(label,sv,gv){var color=gc(gv);return "<div class=\"scorecard\"><div class=\"sc-grade\" style=\"color:"+color+"\">"+esc(gv||"—")+"</div><div class=\"sc-score\">"+esc(String(sv||"—"))+"/10</div><div class=\"sc-label\">"+esc(label)+"</div></div>";}

  var revRows = [[a.c1_name,a.reviews_c1],[a.c2_name,a.reviews_c2],[a.c3_name,a.reviews_c3]].filter(function(x){return x[0];}).map(function(x){return "<tr><td>"+esc(x[0])+"</td><td>"+(x[1]||"—")+"</td></tr>";}).join("");
  var numRevs = (a.reviews_ours !== undefined && a.reviews_ours !== "" && a.reviews_ours !== null) ? Number(a.reviews_ours) : null;
  var revCountDisplay = (numRevs === null || numRevs === 0) ? "0 &#x2014; No Reviews Found" : String(numRevs);
  var revCountColor = (numRevs === null || numRevs === 0) ? "#ff6b6b" : numRevs < 10 ? "#f0a500" : "#C8A44D";
  var velColorMap = {slow:"#ff6b6b",moderate:"#f0a500",fast:"#C8A44D"};
  var velColor = velColorMap[a.review_velocity] || "#555";
  var strengthTags = (a.review_strengths||[]).map(function(s){return "<span class=\"strength-tag\">&#10003; "+esc(s)+"</span>";}).join("");
  var weakTags = (a.review_weaknesses||[]).map(function(w){return "<span class=\"miss-tag\">&#10007; "+esc(w)+"</span>";}).join("");
  var reviewsSection =
    "  <div class=\"sec\">\n    <div class=\"st\">&#11088; Customer Reviews &amp; Reputation</div>\n    <div class=\"sb\">\n"+
    "      <div class=\"review-stats\">\n"+
    "        <div class=\"rs-stat\"><div class=\"rs-num\" style=\"color:"+revCountColor+"\">"+revCountDisplay+"</div><div class=\"rs-lbl\">Reviews on Google</div></div>\n"+
    (a.review_rating?"        <div class=\"rs-stat\"><div class=\"rs-num\" style=\"color:#f0a500\">"+esc(String(a.review_rating))+" &#9733;</div><div class=\"rs-lbl\">Average Rating</div></div>\n":"")+
    (a.review_velocity?"        <div class=\"rs-stat\"><div class=\"rs-num\" style=\"color:"+velColor+";font-size:1.1rem;text-transform:capitalize\">"+esc(a.review_velocity)+"</div><div class=\"rs-lbl\">New Review Rate</div></div>\n":"")+
    "      </div>\n"+
    (a.review_summary?"      <div class=\"rev-summary\">"+esc(a.review_summary)+"</div>\n":"")+
    ((strengthTags||weakTags)?
      "      <div class=\"rev-tags-grid\">\n"+
      "        <div><div class=\"rev-col-label\">What customers say positively</div><div class=\"tag-group\">"+(strengthTags||"<span style=\"color:#888;font-size:.8rem\">No positive reviews found yet</span>")+"</div></div>\n"+
      "        <div><div class=\"rev-col-label\">Areas to address</div><div class=\"tag-group\">"+(weakTags||"<span style=\"color:#444;font-size:.8rem\">Nothing flagged</span>")+"</div></div>\n"+
      "      </div>\n":"")+
    (a.review_insight?"      <div class=\"insight-box\">&#128161; <strong>What this means for "+esc(c.business||"your business")+":</strong> "+esc(a.review_insight)+"</div>\n":"")+
    "    </div>\n  </div>\n\n";
  var recs = [a.rec1,a.rec2,a.rec3].filter(Boolean);
  var hasActionPlan = a.quick_wins && a.quick_wins.length;

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap\">\n<title>Digital Footprint Audit — "+esc(c.business||"Your Business")+"</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{background:#ECEAE4;color:#0B1F3A;font-family:'Open Sans',Arial,sans-serif;min-height:100vh;line-height:1.5}\n#gate{position:fixed;inset:0;background:#ffffff;z-index:999;display:flex;align-items:center;justify-content:center}\n#gate.gone{display:none}\n.gb{width:100%;max-width:380px;padding:2rem;text-align:center;background:#fff;border-radius:12px;border:0.5px solid #e8e4dc}\n.gl{font-size:1.1rem;font-weight:800;letter-spacing:.18em;margin-bottom:.5rem;color:#0B1F3A;display:flex;align-items:center;justify-content:center;gap:0}\n.gs{color:#5B6470;margin-bottom:2rem;font-size:.9rem}\n.gi{width:100%;padding:.9rem 1rem;background:#fff;border:1px solid #c8c4bc;border-radius:8px;color:#0B1F3A;font-size:1rem;margin-bottom:1rem;outline:none;transition:border .2s}\n.gi:focus{border-color:#C8A44D}\n.gbtn{width:100%;padding:.9rem;background:#0B1F3A;color:#C8A44D;font-weight:700;font-size:1rem;border:none;border-radius:8px;cursor:pointer}\n.ge{color:#ff6b6b;font-size:.85rem;margin-top:.75rem;min-height:1.2em}\n#report{max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem;background:#fff;border-radius:16px;box-shadow:0 2px 24px rgba(11,31,58,.08)}\n.rh{border-radius:12px;margin-bottom:2rem;overflow:hidden;border:1px solid rgba(200,164,77,.25)}\n.rh-bar{background:#ffffff;padding:.85rem 1.5rem;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #C8A44D}\n.rh-body{background:#0B1F3A;padding:1.5rem 1.75rem 1.75rem}\n.rh-logo{display:flex;align-items:center}\n.rh-wordmark{font-size:1rem;font-weight:800;letter-spacing:.18em;color:#0B1F3A;vertical-align:middle}\n.conf-badge{font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#C8A44D;border:1px solid rgba(200,164,77,.5);padding:.3rem .7rem;border-radius:4px;background:rgba(200,164,77,.08)}\n.rh-badge{display:inline-block;background:#C8A44D;color:#0B1F3A;font-size:.65rem;font-weight:700;letter-spacing:.1em;padding:.3rem .75rem;border-radius:4px;margin-bottom:.85rem;text-transform:uppercase}\n.rh-title{font-size:2rem;font-weight:800;margin-bottom:.4rem;line-height:1.15;color:#FAF8F2;font-family:'Montserrat',sans-serif;letter-spacing:-.02em}\n.rh-sub{color:#7B90A8;font-size:.85rem;margin-top:.1rem}\n.rh-id{color:#4A5A6A;font-size:.72rem;margin-top:.35rem;font-family:'Montserrat',sans-serif;letter-spacing:.05em}\n#print-btn{display:inline-flex;align-items:center;gap:.4rem;background:#fff;border:1px solid #c8c4bc;color:#0B1F3A;padding:.5rem 1rem;border-radius:6px;font-size:.85rem;font-weight:600;cursor:pointer;margin-bottom:1.5rem;text-decoration:none;line-height:1}\n#print-btn:hover{background:#f8f7f4}\n.print-tip{font-size:.72rem;color:#5B6470;margin-left:.75rem;vertical-align:middle}\n.gauge-wrap{background:#0B1F3A;border:none;border-radius:14px;padding:1.75rem;display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1.5rem}\n.gauge-left{display:flex;flex-direction:column;align-items:center;flex-shrink:0}\n.gauge-grade{font-size:2.8rem;font-weight:900;line-height:1;margin-top:.5rem;font-family:'Montserrat',sans-serif}\n.gauge-grade-label{font-size:.7rem;color:#8B9DB5;text-transform:uppercase;letter-spacing:.1em;margin-top:.2rem}\n.gauge-right{flex:1;min-width:200px}\n.exec-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#C8A44D;margin-bottom:.6rem}\n.exec-summary{font-size:.95rem;color:#c8c4bc;line-height:1.7;margin-bottom:1.2rem}\n.lost-box{background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.25);border-radius:8px;padding:1rem;display:flex;align-items:center;gap:.75rem}\n.lost-num{font-size:2rem;font-weight:800;color:#ff8b8b;line-height:1;flex-shrink:0}\n.lost-desc{font-size:.8rem;color:#8B9DB5;line-height:1.4}\n.scorecards{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem}\n.scorecard{background:#0B1F3A;border:none;border-radius:10px;padding:1.1rem;text-align:center;position:relative;overflow:hidden}\n.scorecard::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:#C8A44D}\n.sc-grade{font-size:2rem;font-weight:900;line-height:1;font-family:'Montserrat',sans-serif}\n.sc-score{font-size:.8rem;color:#8B9DB5;margin-top:.2rem}\n.sc-label{font-size:.68rem;color:#8B9DB5;text-transform:uppercase;letter-spacing:.08em;margin-top:.25rem}\n.sec{margin-bottom:2rem}\n.st{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#0B1F3A;margin-bottom:.9rem;display:flex;align-items:center;gap:.75rem;padding-left:.85rem;border-left:3px solid #C8A44D;font-family:'Montserrat',sans-serif}\n.sb{background:#FAF8F2;border:1px solid #e8e4dc;border-radius:12px;padding:1.5rem}\n.gbpr{display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap}\n.ring-wrap{position:relative;width:100px;height:100px;flex-shrink:0}\n.rw svg{transform:rotate(-90deg)}\n.rc{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800}\n.grn{flex:1;font-size:.9rem;color:#5B6470;line-height:1.7;min-width:180px}\n.miss-tags{margin-top:.75rem;display:flex;flex-wrap:wrap;gap:.3rem}\n.miss-tag{display:inline-block;background:#2e0d0d;color:#ff6b6b;font-size:.72rem;padding:.2rem .5rem;border-radius:4px}\n.checklist{display:grid;grid-template-columns:1fr 1fr;gap:.45rem .75rem;margin-top:.75rem}\n.check-item{display:flex;align-items:center;gap:.5rem;font-size:.85rem}\n.ci-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;flex-shrink:0}\n.ci-icon.ok{background:#faf3e0;color:#9B7830}\n.ci-icon.warn{background:#f0a50025;color:#f0a500}\n.ci-icon.bad{background:#ff6b6b25;color:#ff6b6b}\n.ci-ok{color:#0B1F3A}.ci-warn{color:#f0a500}.ci-bad{color:#ff6b6b}\n.kw-box{background:#0B1F3A;border:none;border-radius:8px;padding:1.25rem 1.5rem;margin-top:1rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}\n.kw-stat{text-align:center}\n.kw-val{font-size:1.4rem;font-weight:800;color:#C8A44D;line-height:1;font-family:'Montserrat',sans-serif}\n.kw-lbl{font-size:.68rem;color:#8B9DB5;text-transform:uppercase;letter-spacing:.08em;margin-top:.25rem}\n.kw-opp{font-size:.85rem;color:#8B9DB5;line-height:1.6;padding-top:.75rem;border-top:1px solid rgba(255,255,255,.1);grid-column:1/-1}\n.two-col{display:grid;grid-template-columns:1fr 1fr;gap:1rem}\n.citation-col{background:#FAF8F2;border:1px solid #e8e4dc;border-radius:10px;padding:1.25rem}\n.col-score{font-size:1.8rem;font-weight:900;line-height:1}\n.col-label{font-size:.68rem;color:#5B6470;text-transform:uppercase;letter-spacing:.08em;margin-top:.2rem;margin-bottom:.75rem}\n.col-notes{font-size:.85rem;color:#5B6470;line-height:1.6}\ntable{width:100%;border-collapse:collapse;font-size:.9rem}\nth{text-align:left;color:#5B6470;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;padding:.5rem 0;border-bottom:1px solid #e8e4dc}\nth:not(:first-child){text-align:right}\ntd{padding:.65rem 0;border-bottom:1px solid #f0ede7;color:#5B6470}\ntd:first-child{color:#0B1F3A}\ntd:not(:first-child){text-align:right}\ntr.hl td{color:#9B7830;font-weight:700}\n.note{font-size:.7rem;color:#5B6470;margin-top:.6rem;font-style:italic}\n.revbox{background:#0B1F3A;border:none;border-radius:12px;padding:1.75rem;text-align:center;position:relative;overflow:hidden}\n.revbox::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#C8A44D,#e8c870,#C8A44D)}\n.rvv{font-size:2.8rem;font-weight:800;color:#C8A44D;line-height:1;font-family:'Montserrat',sans-serif}\n.rvl{color:#8B9DB5;font-size:.85rem;margin-top:.5rem}\n.rvb{font-size:.82rem;color:#8B9DB5;margin-top:.6rem;font-style:italic;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.5}\n.action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-top:.5rem}\n.action-card{background:#FAF8F2;border:1px solid #e8e4dc;border-radius:10px;padding:1.1rem;display:flex;flex-direction:column;gap:.4rem}\n.ac-badge{display:inline-block;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.15rem .45rem;border-radius:3px}\n.ac-badge-high{background:#0B1F3A;color:#C8A44D}\n.ac-badge-med{background:#f0a50020;color:#f0a500}\n.ac-title{font-size:.9rem;font-weight:700;color:#0B1F3A;line-height:1.3}\n.ac-action{font-size:.8rem;color:#5B6470;line-height:1.5;flex:1}\n.ac-time{font-size:.72rem;color:#444}\n.review-stats{display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid #e8e4dc}\n.rs-stat{min-width:120px}\n.rs-num{font-size:1.8rem;font-weight:800;line-height:1}\n.rs-lbl{font-size:.68rem;color:#5B6470;text-transform:uppercase;letter-spacing:.08em;margin-top:.3rem}\n.rev-summary{font-size:.88rem;color:#5B6470;line-height:1.7;margin-bottom:1rem;padding:1rem;background:#faf8f2;border-radius:8px;border-left:3px solid #C8A44D;border-radius:0 8px 8px 0}\n.rev-tags-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}\n.rev-col-label{font-size:.68rem;font-weight:700;color:#5B6470;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}\n.tag-group{display:flex;flex-wrap:wrap;gap:.3rem}\n.strength-tag{display:inline-block;background:#faf3e0;color:#9B7830;font-size:.72rem;padding:.2rem .5rem;border-radius:4px}\n.insight-box{background:#0B1F3A;border:none;border-radius:8px;padding:.9rem 1rem;font-size:.85rem;color:#8B9DB5;line-height:1.6;margin-top:.75rem}\n.insight-box strong{color:#C8A44D}\n.ri{display:flex;gap:.85rem;padding:.9rem 0;border-bottom:1px solid #e8e4dc}\n.ri:last-child{border-bottom:none}\n.rn{width:28px;height:28px;background:#C8A44D;color:#0B1F3A;font-weight:800;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.8rem;font-family:'Montserrat',sans-serif}\n.rtx{flex:1;font-size:.9rem;color:#5B6470;line-height:1.6;padding-top:.1rem}\n.rtx strong{color:#0B1F3A}\n.ri-meta{font-size:.78rem;color:#5B6470}\n.cta-box{background:#0B1F3A;border-radius:14px;padding:2.25rem 2rem;text-align:center;margin-bottom:2rem}\n.cta-heading{font-size:1.25rem;font-weight:900;margin-bottom:.5rem;color:#C8A44D;letter-spacing:-.02em}\n.cta-box p{color:#c8c4bc;margin-bottom:1.5rem;font-size:.92rem;max-width:480px;margin-left:auto;margin-right:auto}\n.cta-btn{display:inline-block;background:#C8A44D;color:#0B1F3A;font-weight:800;padding:.9rem 2.25rem;border-radius:8px;text-decoration:none;font-size:.95rem;letter-spacing:-.01em}\n.cta-print{display:none}\n.foot{margin-top:3rem;border-top:1px solid #e8e4dc;padding-top:1.5rem;text-align:center;color:#5B6470;font-size:.78rem;line-height:1.8}\n.foot a{color:#C8A44D;text-decoration:none}\n.foot-disc{color:#9B9893;font-size:.7rem;margin-top:.75rem;max-width:620px;margin-left:auto;margin-right:auto;line-height:1.6}\n@media(max-width:600px){.rh-title{font-size:1.4rem}.scorecards{grid-template-columns:repeat(2,1fr)}.checklist{grid-template-columns:1fr}.two-col{grid-template-columns:1fr}.action-grid{grid-template-columns:1fr}.kw-box{grid-template-columns:1fr 1fr}.gauge-wrap{gap:1.25rem}}\n@media print{\n@page{size:A4;margin:20mm 15mm 16mm 15mm;@bottom-right{content:counter(page);font-size:10pt;font-family:'Open Sans',Arial,sans-serif;color:#555}}\n*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}\nbody{background:#fff!important;color:#111!important;font-size:9.5pt!important}\n#gate{display:none!important}\n#report{display:block!important;padding:0!important;max-width:100%!important;background:#fff!important;box-shadow:none!important;border-radius:0!important}\n#print-btn{display:none!important}\n.print-tip{display:none!important}\n.rh{border-color:rgba(200,164,77,.4)!important;margin-bottom:1.5rem!important}\n.rh-bar{background:#ffffff!important;padding:.75rem 1.25rem!important;border-bottom:2px solid #C8A44D!important}\n.rh-body{background:#0B1F3A!important;padding:1.25rem!important}\n.rh-title{color:#FAF8F2!important}\n.rh-sub,.rh-id{color:#7B90A8!important}\n.conf-badge{color:#C8A44D!important;border-color:rgba(200,164,77,.4)!important}\n.sb,.action-card,.citation-col,.lost-box{background:#f7f7f7!important;border-color:#ddd!important}\n.gauge-wrap,.scorecard,.revbox,.kw-box,.insight-box{background:#0B1F3A!important;border:none!important}\n.ac-title,.rn{color:#111!important}\n.exec-summary,.grn,.col-notes,.ac-action,.rtx,.cta-box p{color:#444!important}\n.st{color:#0B1F3A!important;border-left:3px solid #C8A44D!important;padding-bottom:4pt;margin-bottom:8pt}\n.rh-sub,.rh-id,.note,.foot-disc{color:#777!important}\ntd,th{color:#333!important;border-color:#e0e0e0!important}\ntr.hl td{color:#9B7830!important;font-weight:700}\n.ci-ok{color:#9B7830!important}.ci-warn{color:#b07000!important}.ci-bad{color:#cc2222!important}\n.ci-icon.ok{background:#e0f5ef!important;color:#9B7830!important}\n.ci-icon.warn{background:#fff3d4!important;color:#b07000!important}\n.ci-icon.bad{background:#fce8e8!important;color:#cc2222!important}\n.miss-tag{background:#fce8e8!important;color:#cc2222!important}\n.strength-tag{background:#faf3e0!important;color:#9B7830!important}\n.rev-summary{background:#f7f7f7!important;border-color:#ddd!important;color:#333!important}\n.insight-box{background:#faf8f2!important;border-color:#e8d8a0!important}\n.insight-box strong{color:#9B7830!important}\n.insight-box{color:#333!important}\n.rtx strong{color:#111!important}\n.rtx{color:#333!important}\n.kw-opp{color:#333!important}\n.rev-col-label,.rs-lbl,.rvl,.ri-meta,.kw-lbl,.col-label,.gauge-grade-label,.sc-score,.sc-label,.rh-sub,.rh-id,.note{color:#444!important}\n.ac-badge-high{background:#faf3e0!important;color:#9B7830!important}\n.ac-badge-med{background:#fff3d4!important;color:#b07000!important}\n.conf-badge{border-color:#5B6470!important;color:#777!important}\n.cta-box{background:#0B1F3A!important;border:none!important}\n.cta-heading{color:#C8A44D!important}\n.cta-box p{color:#c8c4bc!important}\n.cta-btn{display:none!important}\n.cta-print{display:block!important;font-size:9pt;color:#C8A44D!important;margin-top:.5rem}\n.cta-box{break-inside:avoid!important;page-break-inside:avoid!important}\n.sec{margin-bottom:1.5rem!important}\n.st{margin-top:.5rem!important}\n.pb{page-break-before:always}\n.action-grid{display:block!important}\n.action-card{margin-bottom:.5rem!important;break-inside:avoid!important;page-break-inside:avoid!important}\n.scorecards,.two-col,.kw-box,.gauge-wrap,.review-stats,.rev-tags-grid{page-break-inside:avoid;break-inside:avoid}\n.st{page-break-after:avoid}\n.foot{border-top:1px solid #e0e0e0!important;color:#888!important}\n.foot a{color:#C8A44D!important}\n.lost-num{color:#cc2222!important}\n.rvv{color:#C8A44D!important}\n.kw-val{color:#C8A44D!important}\n}\n</style>\n</head>\n<body>\n\n"+
(skipGate?"":
"<div id=\"gate\"><div class=\"gb\">\n  <div class=\"gl\"><img src=\"https://vanguardeer.com/brand/logos/logo-stacked.svg\" alt=\"Vanguardeer\" style=\"height:64px\"></div>\n  <p class=\"gs\">Enter your password to view your audit report.</p>\n  <input id=\"pw\" class=\"gi\" type=\"password\" placeholder=\"Password\" autocomplete=\"off\">\n  <button class=\"gbtn\" onclick=\"unlock()\">View My Report →</button>\n  <div class=\"ge\" id=\"pe\"></div>\n</div></div>\n")+
"<div id=\"report\""+(skipGate?"":" style=\"display:none\"")+">\n\n"+
"  <div class=\"rh\">\n    <div class=\"rh-bar\"><div class=\"rh-logo\"><img src=\"https://vanguardeer.com/brand/logos/logo-horizontal-tagline.svg\" alt=\"Vanguardeer\" style=\"height:52px;display:block\"></div><div class=\"conf-badge\">Confidential</div></div>\n    <div class=\"rh-body\">\n      <div class=\"rh-badge\">Digital Footprint Audit</div>\n      <div class=\"rh-title\">"+esc(c.business||"Your Business")+"</div>\n      <div class=\"rh-sub\">Prepared for <strong style=\"color:#a0b4c8\">"+esc(c.name||"")+"</strong> &nbsp;&middot;&nbsp; "+date+(c.website?" &nbsp;&middot;&nbsp; <span style=\"color:#4A9EBF\">"+esc(c.website)+"</span>":"")+"</div>\n      <div class=\"rh-id\">REPORT ID &nbsp;"+esc(id)+"</div>\n    </div>\n  </div>\n\n"+
(adminView?"  <button id=\"print-btn\" onclick=\"window.print()\">💾 Save as PDF</button><span class=\"print-tip\">In Chrome print dialog &rarr; uncheck <strong>Headers and footers</strong></span>\n\n":"")+
"  <div class=\"gauge-wrap\">\n    <div class=\"gauge-left\">\n      <svg width=\"160\" height=\"100\" viewBox=\"0 0 200 120\" overflow=\"visible\">\n        <path d=\"M 20 110 A 80 80 0 0 1 180 110\" fill=\"none\" stroke=\"#e8e4dc\" stroke-width=\"14\" stroke-linecap=\"round\"/>\n        <path d=\"M 20 110 A 80 80 0 0 1 180 110\" fill=\"none\" stroke=\""+gradeColor+"\" stroke-width=\"14\" stroke-linecap=\"round\" stroke-dasharray=\""+scoreArc+" 251.3\"/>\n        <text x=\"100\" y=\"90\" text-anchor=\"middle\" fill=\""+gradeColor+"\" font-size=\"36\" font-weight=\"800\" font-family=\"-apple-system,sans-serif\">"+score+"</text>\n        <text x=\"100\" y=\"112\" text-anchor=\"middle\" fill=\"#444\" font-size=\"11\" font-family=\"-apple-system,sans-serif\">out of 100</text>\n      </svg>\n      <div class=\"gauge-grade\" style=\"color:"+gradeColor+"\">"+esc(grade)+"</div>\n      <div class=\"gauge-grade-label\">Overall Grade</div>\n    </div>\n    <div class=\"gauge-right\">\n      <div class=\"exec-label\">Executive Summary</div>\n      <div class=\"exec-summary\">"+(a.summary?esc(a.summary):"Your digital presence analysis is complete. Review the sections below for detailed findings and recommended actions.")+"</div>\n"+
(a.lost_leads_monthly?"      <div class=\"lost-box\"><div class=\"lost-num\">"+esc(String(a.lost_leads_monthly))+"</div><div class=\"lost-desc\">estimated customer inquiries missed<br>every month due to digital gaps</div></div>\n":"")+
"    </div>\n  </div>\n\n"+
"  <div class=\"scorecards\">\n    "+scorecard("Google Business",a.gbp_score,a.gbp_grade)+"\n    "+scorecard("Website & SEO",a.seo_score,a.seo_grade)+"\n    "+scorecard("Online Presence",a.citation_score,a.citation_grade)+"\n    "+scorecard("Social Media",a.social_score,a.social_grade)+"\n  </div>\n\n"+
"  <div class=\"sec\">\n    <div class=\"st\">📍 Your Google Business Listing</div>\n    <div class=\"sb\">\n      <div class=\"gbpr\">\n        <div class=\"ring-wrap rw\"><svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"none\" stroke=\"#e8e4dc\" stroke-width=\"10\"/><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"none\" stroke=\""+gc(a.gbp_grade)+"\" stroke-width=\"10\" stroke-dasharray=\""+gbpArc+" 251.3\" stroke-linecap=\"round\"/></svg><div class=\"rc\" style=\"color:"+gc(a.gbp_grade)+"\">"+gbpScore+"</div></div>\n        <div class=\"grn\">\n"+(a.gmb_rank?"          <strong>Estimated rank "+esc(String(a.gmb_rank))+"</strong> for &ldquo;"+esc(c.keyword||c.industry||"your keyword")+"&rdquo; in "+esc(a.gmb_area||"Singapore")+"<br>\n":"")+
(a.review_velocity?"          New reviews coming in: <strong>"+esc(a.review_velocity)+"</strong><br>\n":"")+
"          <br>"+(a.gbp_notes?esc(a.gbp_notes):"See recommendations below for quick-win GBP improvements.")+"\n"+
(gbpMissing?"          <div class=\"miss-tags\">"+gbpMissing+"</div>\n":"")+
"          <div class=\"note\">* Score is an estimate based on automated analysis and industry benchmarks.</div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n"+
(c.website?
"  <div class=\"sec\">\n    <div class=\"st\">🌐 Your Website &amp; Search Visibility</div>\n    <div class=\"sb\">\n      <div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem\">\n        <span style=\"color:#555;font-size:.82rem\">"+esc(c.website)+"</span>\n"+
(a.indexed_pages?"        <span style=\"font-size:.78rem;color:#C8A44D\">"+esc(String(a.indexed_pages))+" pages indexed</span>\n":"        <span style=\"font-size:.78rem;color:#f0a500\">Sitemap not found</span>\n")+
"      </div>\n      <div class=\"checklist\">"+checkHTML+"</div>\n"+
((a.keyword_volume||a.keyword_difficulty||a.keyword_opportunity)?
"      <div class=\"kw-box\">\n"+
(a.keyword_volume?"        <div class=\"kw-stat\"><div class=\"kw-val\">"+esc(a.keyword_volume)+"</div><div class=\"kw-lbl\">Monthly Searches</div></div>\n":"")+
(a.keyword_difficulty?"        <div class=\"kw-stat\"><div class=\"kw-val\">"+esc(a.keyword_difficulty)+"</div><div class=\"kw-lbl\">Difficulty</div></div>\n":"")+
(a.seo_score?"        <div class=\"kw-stat\"><div class=\"kw-val\">"+esc(String(a.seo_score))+"/10</div><div class=\"kw-lbl\">SEO Score</div></div>\n":"")+
(a.keyword_opportunity?"        <div class=\"kw-opp\">"+esc(a.keyword_opportunity)+"</div>\n":"")+
"      </div>\n":"")+
"      <div class=\"note\">* Checklist based on automated scan of homepage. Dynamic or JS-rendered content may not be detected.</div>\n    </div>\n  </div>\n\n":"")+
"  <div class=\"sec\">\n    <div class=\"st\">📋 Directory Listings &amp; Social Media</div>\n    <div class=\"two-col\">\n      <div class=\"citation-col\"><div class=\"col-score\" style=\"color:"+gc(a.citation_grade)+"\">"+esc(String(a.citation_score||"—"))+"/10</div><div class=\"col-label\">Citations &amp; Directories</div><div class=\"col-notes\">"+(a.citation_notes?esc(a.citation_notes):"Consistent listings across Google, Facebook, and local directories improve local search ranking.")+"</div></div>\n      <div class=\"citation-col\"><div class=\"col-score\" style=\"color:"+gc(a.social_grade)+"\">"+esc(String(a.social_score||"—"))+"/10</div><div class=\"col-label\">Social Media Presence</div><div class=\"col-notes\">"+(a.social_notes?esc(a.social_notes):"An active social presence signals legitimacy and drives referral traffic.")+"</div></div>\n    </div>\n  </div>\n\n"+
(compRows?"  <div class=\"sec pb\">\n    <div class=\"st\">🏆 How You Stack Up Against Competitors</div>\n    <div class=\"sb\">\n      <table><thead><tr><th>Business</th><th>Est. Reviews</th><th>Maps Rank</th></tr></thead>\n      <tbody><tr class=\"hl\"><td>⭐ "+esc(c.business||"You")+"</td><td>"+(a.reviews_ours||"—")+"</td><td>"+(a.gmb_rank?"~"+esc(String(a.gmb_rank)):"—")+"</td></tr>"+compRows+"</tbody></table>\n      <div class=\"note\">* Competitor data is estimated. Actual figures may vary.</div>\n    </div>\n  </div>\n\n":"")+
reviewsSection+
(a.revenue_impact?"  <div class=\"sec\">\n    <div class=\"st\">💰 Estimated Monthly Revenue at Stake</div>\n    <div class=\"revbox\">\n      <div class=\"rvv\">"+esc(a.revenue_impact)+"</div>\n      <div class=\"rvl\">in additional monthly revenue potential with quick-win fixes applied</div>\n"+(a.revenue_breakdown?"      <div class=\"rvb\">"+esc(a.revenue_breakdown)+"</div>\n":"")+
"    </div>\n  </div>\n\n":"")+
(hasActionPlan?"  <div class=\"sec\">\n    <div class=\"st\">⚡ Quick Wins — Do These This Week</div>\n    <div class=\"action-grid\">"+quickWinsHTML+"</div>\n  </div>\n\n":"")+
(a.short_term&&a.short_term.length?"  <div class=\"sec\">\n    <div class=\"st\">📅 Short-Term Actions — Next 30 Days</div>\n    <div class=\"sb\">"+shortTermHTML+"</div>\n  </div>\n\n":"")+
(!hasActionPlan&&recs.length?"  <div class=\"sec\">\n    <div class=\"st\">✅ Top Recommendations</div>\n    <div class=\"sb\">"+recs.map(function(rec,i){return "<div class=\"ri\"><div class=\"rn\">"+(i+1)+"</div><div class=\"rtx\">"+esc(rec)+"</div></div>";}).join("")+"</div>\n  </div>\n\n":"")+
"  <div class=\"cta-box\">\n    <div class=\"cta-heading\">Ready to close the gap on your competitors?</div>\n    <p>Book a free 30-minute call and we'll walk through every finding — with a custom action plan tailored to your goals and budget.</p>\n    <a href=\""+BOOKING_URL+"\" target=\"_blank\" class=\"cta-btn\">Book Your Free Review Call →</a>\n    <div class=\"cta-print\"><strong>To discuss these findings, contact Vanguardeer:</strong><br>📞 +65 9696 0063 &nbsp;·&nbsp; ✉️ enquiries@vanguardeer.com &nbsp;·&nbsp; 🌐 vanguardeer.com<br>Book a free consultation: "+BOOKING_URL+"</div>\n  </div>\n\n"+
"  <div class=\"foot\">\n    Prepared exclusively for <strong>"+esc(c.business||"")+"</strong> by <a href=\"https://vanguardeer.com\">Vanguardeer</a> &nbsp;·&nbsp;\n    <a href=\"mailto:enquiries@vanguardeer.com\">enquiries@vanguardeer.com</a> &nbsp;·&nbsp;\n    <a href=\"https://wa.me/6596960063\">WhatsApp</a>\n    <div class=\"foot-disc\">This report is confidential and prepared solely for the named recipient. Rankings, scores, and revenue estimates are indicative, not guaranteed. &copy; "+new Date().getFullYear()+" Vanguardeer Pte Ltd. All rights reserved.</div>\n  </div>\n\n"+
"</div>\n\n<script>\nvar PW="+JSON.stringify(r.password)+",ID="+JSON.stringify(id)+";\n"+
(skipGate?"":
"document.getElementById('pw').addEventListener('keydown',function(e){if(e.key==='Enter')unlock()});\nfunction unlock(){\n  if(document.getElementById('pw').value.trim()===PW){\n    document.getElementById('gate').classList.add('gone');\n    document.getElementById('report').style.display='block';\n    fetch('/report/'+ID+'/view',{method:'POST'}).catch(function(){});\n  } else {\n    document.getElementById('pe').textContent='Incorrect password. Check your WhatsApp or email.';\n    document.getElementById('pw').style.borderColor='#ff6b6b';\n  }\n}\n")+
(autoPrint?"window.addEventListener('load',function(){setTimeout(function(){window.print();},900)});\n":"")+
"</script>\n</body>\n</html>";
}
