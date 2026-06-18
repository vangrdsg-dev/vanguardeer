// Cloudflare Worker — Vanguardeer
// Routes:
//   POST /                        → Anthropic chat proxy
//   POST /audit/request           → Receive audit form, trigger auto-audit
//   GET  /report/:id              → Password-gated client audit report
//   POST /report/:id/view         → Track report open
//   GET  /admin?secret=           → Admin dashboard (pending approvals)
//   GET  /admin?secret=&create=1  → Manual report creator
//   POST /admin/approve/:id       → Approve report, get WhatsApp link
//   POST /admin/report            → Manual report create/override
//
// Secrets: ANTHROPIC_API_KEY, ADMIN_SECRET
// KV:      AUDIT_REPORTS

// ── Config ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://vanguardeer.com",
  "https://www.vanguardeer.com",
  "https://vanguardeer.pages.dev",
];
const NOTIFY_EMAIL = "enquiries@vanguardeer.com";
const BOOKING_URL  = "https://cal.com/vanguardeer-pte-ltd-5v1v0x/30min";

// ── Utilities ─────────────────────────────────────────────────────────────────

function uid()         { return Math.random().toString(36).slice(2, 9); }
function esc(s)        { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function html(c,s=200) { return new Response(c,{status:s,headers:{"Content-Type":"text/html;charset=UTF-8"}}); }
function json(d,s=200,e={}) { return new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json",...e}}); }

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
  const idx = JSON.parse(raw);
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
      const o = request.headers.get("Origin") || "";
      const co = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": co,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret",
      }});
    }

    if (path === "/" || path === "/api/chat")                    return handleChat(request, env);
    if (path === "/audit/request" && method === "POST")          return handleAuditRequest(request, env, ctx);
    if (path === "/admin" && method === "GET")                        return handleAdminDashboard(request, env);
    if (path.startsWith("/admin/approve/") && method === "POST")     return handleApprove(request, path, env);
    if (path.startsWith("/admin/report-info/") && method === "GET")  return handleReportInfo(request, path, env);
    if (path === "/admin/report" && method === "POST")           return handleCreateReport(request, env);

    const rm = path.match(/^\/report\/([a-z0-9]+)(\/view)?$/);
    if (rm) {
      if (rm[2] === "/view" && method === "POST") return handleTrackView(rm[1], env);
      if (method === "GET")                        return handleReportPage(rm[1], env);
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
  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens, system, messages }),
  });
  const data = await up.json();
  return new Response(JSON.stringify(data), { status: up.status, headers: { ...ch, "Content-Type": "application/json" } });
}

// ── Audit Request (form ingestion) ────────────────────────────────────────────

async function handleAuditRequest(request, env, ctx) {
  const o  = request.headers.get("Origin") || "";
  const co = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  const ch = { "Access-Control-Allow-Origin": co, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: "Invalid request" }, 400, ch); }

  // Honeypot spam check
  if (body._gotcha) return json({ success: true }, 200, ch);

  if (!body.business || !body.name || !body.email) {
    return json({ success: false, error: "Missing required fields" }, 400, ch);
  }

  const id       = uid();
  const password = uid();

  const record = {
    id, password,
    status: "pending",
    created_at: new Date().toISOString(),
    client: {
      business: body.business || "",
      industry: body.industry || "",
      name:     body.name     || "",
      email:    body.email    || "",
      phone:    body.phone    || "",
      website:  body.website  || "",
      keyword:  body.keyword  || "",
    },
    audit: {},
    view_count: 0,
    views: [],
  };

  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(record));
  await addToIndex(env, id, "pending", record.client.business);

  // Run auto-audit in background
  ctx.waitUntil(autoAudit(id, record, env));

  return json({ success: true, message: "Your audit is being prepared. Expect it within minutes!" }, 200, ch);
}

// ── Auto Audit Pipeline ───────────────────────────────────────────────────────

async function autoAudit(id, record, env) {
  try {
    const websiteData = record.client.website
      ? await fetchWebsiteData(record.client.website)
      : {};

    const auditData = await generateAuditWithClaude(record.client, websiteData, env);

    const updated = {
      ...record,
      status: "ready",
      audit: { ...websiteData, ...auditData },
      audit_generated_at: new Date().toISOString(),
    };

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

async function fetchWebsiteData(website) {
  const url = website.startsWith("http") ? website : `https://${website}`;
  const result = { title_tag: null, title_tag_ok: false, meta_description: null, schema_detected: false, local_business_schema: false, indexed_pages: null };

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VanguardeerBot/1.0)" } });
    if (resp.ok) {
      const text = await resp.text();
      const titleM = text.match(/<title[^>]*>([^<]{3,80})<\/title>/i);
      if (titleM) { result.title_tag = titleM[1].trim(); result.title_tag_ok = result.title_tag.length > 10; }
      const descM = text.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']{10,})/i)
                 || text.match(/<meta\s+content=["']([^"']{10,})["'][^>]+name=["']description["']/i);
      if (descM) result.meta_description = descM[1].trim();
      result.schema_detected       = /<script[^>]+application\/ld\+json/i.test(text);
      result.local_business_schema = /LocalBusiness|HomeAndConstruction|ProfessionalService|FoodEstablishment/i.test(text);
    }
  } catch {}

  try {
    const domain = new URL(url).origin;
    const sm = await fetch(`${domain}/sitemap.xml`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (sm.ok) {
      const xml  = await sm.text();
      const locs = xml.match(/<loc>/g);
      if (locs) result.indexed_pages = locs.length;
    }
  } catch {}

  return result;
}

async function generateAuditWithClaude(client, web, env) {
  const prompt = `You are a Singapore digital marketing expert producing a Digital Footprint Audit for a local SMB.

Business: ${client.business}
Industry: ${client.industry || "not specified"}
Primary keyword/service: ${client.keyword || "not specified"}
Website: ${client.website || "none provided"}

Automated website scan results:
- Title tag: ${web.title_tag || "not found"}
- Meta description: ${web.meta_description ? "present" : "missing"}
- Schema markup: ${web.schema_detected ? "yes" : "no"}
- LocalBusiness schema: ${web.local_business_schema ? "yes" : "no"}
- Sitemap page count: ${web.indexed_pages ?? "unknown"}

Return ONLY a valid JSON object (no markdown, no commentary) with exactly these fields:
{
  "gbp_score": <integer 1-10, realistic Google Business Profile completeness estimate>,
  "gbp_notes": "<2-3 sentences: what's likely incomplete on their GBP and why it matters for Singapore SMBs>",
  "gmb_rank": "<estimated Maps rank range, e.g. '5-9' or '3-6', for their keyword in Singapore>",
  "gmb_area": "<most likely Singapore area/district for this business>",
  "reviews_ours": <realistic estimated Google review count for this business size/age>,
  "c1_name": "<likely competitor name 1 in this Singapore niche>",
  "reviews_c1": <estimated reviews>,
  "c2_name": "<likely competitor name 2>",
  "reviews_c2": <estimated reviews>,
  "c3_name": "<likely competitor name 3>",
  "reviews_c3": <estimated reviews>,
  "revenue_impact": "<realistic SGD monthly range, e.g. 'S$2,000–S$5,000'>",
  "rec1": "<specific, actionable recommendation with a supporting stat or reason — Singapore context>",
  "rec2": "<specific recommendation>",
  "rec3": "<specific recommendation>"
}`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
    });
    const data  = await resp.json();
    const text  = data.content?.[0]?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch { return {}; }
}

async function sendEmail(env, { to = NOTIFY_EMAIL, subject, html }) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Vanguardeer <noreply@vanguardeer.com>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}

async function notifyAzam(report, env) {
  const adminUrl = `https://vanguardeer-chat.vanguardeer.workers.dev/admin`;
  await sendEmail(env, {
    subject: `🔍 Audit ready — ${report.client.business}`,
    html: `
      <h2>New audit ready for review</h2>
      <table cellpadding="6">
        <tr><td><strong>Business</strong></td><td>${esc(report.client.business)}</td></tr>
        <tr><td><strong>Client</strong></td><td>${esc(report.client.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${esc(report.client.email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${esc(report.client.phone || "—")}</td></tr>
        <tr><td><strong>Keyword</strong></td><td>${esc(report.client.keyword)}</td></tr>
        <tr><td><strong>Website</strong></td><td>${esc(report.client.website)}</td></tr>
        <tr><td><strong>Report URL</strong></td><td>https://vanguardeer.com/report/${report.id}</td></tr>
        <tr><td><strong>Report Password</strong></td><td><strong>${report.password}</strong></td></tr>
      </table>
      <br>
      <a href="${adminUrl}" style="background:#00c896;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Admin Dashboard →</a>
    `,
  });
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

async function handleAdminDashboard(request, env) {
  const url    = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    return html(`<!DOCTYPE html><html><head><title>Access Denied</title>
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.b{text-align:center}.logo{font-size:2rem;font-weight:900;letter-spacing:-.05em;margin-bottom:.5rem}.logo span{color:#00c896}p{color:#888}code{background:#1a1a1a;padding:.2rem .4rem;border-radius:4px}</style>
</head><body><div class="b"><div class="logo">Van<span>guardeer</span></div>
<p>Append <code>?secret=YOUR_ADMIN_SECRET</code> to the URL.</p></div></body></html>`, 401);
  }

  if (url.searchParams.get("create") === "1") {
    return html(adminCreateHTML(secret));
  }

  const raw = await env.AUDIT_REPORTS.get("_index");
  const idx = raw ? JSON.parse(raw) : [];

  return html(adminDashboardHTML(idx, secret));
}

// ── Admin: Approve ────────────────────────────────────────────────────────────

async function handleApprove(request, path, env) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);

  const id  = path.split("/")[3];
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ error: "Not found" }, 404);

  const report = JSON.parse(raw);
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

// ── Admin: Report Info (password lookup) ─────────────────────────────────────

async function handleReportInfo(request, path, env) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);
  const id  = path.split("/")[3];
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ error: "Not found" }, 404);
  const r = JSON.parse(raw);
  return json({ id, password: r.password, status: r.status, business: r.client?.business });
}

// ── Admin: Manual Report Create ───────────────────────────────────────────────

async function handleCreateReport(request, env) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const id       = body.id || uid();
  const password = body.password || uid();
  const report   = { id, password, status: "ready", created_at: new Date().toISOString(), client: body.client || {}, audit: body.audit || {}, view_count: 0, views: [] };
  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(report));
  await addToIndex(env, id, "ready", report.client.business || "—");
  return json({ id, password, url: `https://vanguardeer.com/report/${id}` });
}

// ── View Tracking ─────────────────────────────────────────────────────────────

async function handleTrackView(id, env) {
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return json({ ok: false }, 404);
  const report = JSON.parse(raw);
  const now    = new Date().toISOString();
  report.view_count = (report.view_count || 0) + 1;
  report.views      = [...(report.views || []), now];
  await env.AUDIT_REPORTS.put(`report:${id}`, JSON.stringify(report));
  sendEmail(env, {
    subject: `🔓 Report opened — ${report.client.business || id}`,
    html: `<p><strong>${esc(report.client.business)}</strong>'s report was just opened.</p>
           <p>Total views: <strong>${report.view_count}</strong> &nbsp;·&nbsp; Time: ${now}</p>`,
  }).catch(() => {});
  return json({ ok: true });
}

// ── Client Report Page ────────────────────────────────────────────────────────

async function handleReportPage(id, env) {
  const raw = await env.AUDIT_REPORTS.get(`report:${id}`);
  if (!raw) return html(`<!DOCTYPE html><html><head><title>Not Found</title>
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.b{text-align:center}.logo{font-size:2rem;font-weight:900;letter-spacing:-.05em}.logo span{color:#00c896}p{color:#888}</style>
</head><body><div class="b"><div class="logo">Van<span>guardeer</span></div>
<p>Report not found. Contact <a href="mailto:enquiries@vanguardeer.com" style="color:#00c896">enquiries@vanguardeer.com</a></p>
</div></body></html>`, 404);
  return html(reportHTML(JSON.parse(raw), id));
}

// ── Report HTML ───────────────────────────────────────────────────────────────

function reportHTML(r, id) {
  const c = r.client || {}, a = r.audit || {};
  const date    = new Date(r.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
  const gbpPct  = Math.round(((Number(a.gbp_score) || 0) / 10) * 251.3);
  const compRows = [
    [a.c1_name, a.reviews_c1],
    [a.c2_name, a.reviews_c2],
    [a.c3_name, a.reviews_c3],
  ].filter(([n]) => n).map(([n, rv]) => `<tr><td>${esc(n)}</td><td style="text-align:right">${rv || "—"}</td></tr>`).join("");
  const recs = [a.rec1, a.rec2, a.rec3].filter(Boolean);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Digital Footprint Audit — ${esc(c.business||"Your Business")}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
#gate{position:fixed;inset:0;background:#0a0a0a;z-index:999;display:flex;align-items:center;justify-content:center}#gate.gone{display:none}
.gb{width:100%;max-width:380px;padding:2rem;text-align:center}.gl{font-size:2rem;font-weight:900;letter-spacing:-.05em;margin-bottom:.5rem}.gl span{color:#00c896}
.gs{color:#666;margin-bottom:2rem;font-size:.9rem}.gi{width:100%;padding:.9rem 1rem;background:#161616;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:1rem;margin-bottom:1rem;outline:none;transition:border .2s}
.gi:focus{border-color:#00c896}.gbtn{width:100%;padding:.9rem;background:#00c896;color:#0a0a0a;font-weight:700;font-size:1rem;border:none;border-radius:8px;cursor:pointer}.ge{color:#ff6b6b;font-size:.85rem;margin-top:.75rem;min-height:1.2em}
#report{display:none;max-width:860px;margin:0 auto;padding:2rem 1.5rem 4rem}
.rh{border-bottom:1px solid #1e1e1e;padding-bottom:1.5rem;margin-bottom:2rem}.rb{display:inline-block;background:#00c896;color:#0a0a0a;font-size:.7rem;font-weight:700;letter-spacing:.1em;padding:.3rem .7rem;border-radius:4px;margin-bottom:.75rem}
.rt{font-size:1.8rem;font-weight:800;margin-bottom:.3rem}.rm{color:#666;font-size:.85rem}.rl{font-size:1.1rem;font-weight:900;letter-spacing:-.03em;float:right;padding-top:.25rem}.rl span{color:#00c896}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem}.card{background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:1.25rem;text-align:center}
.cv{font-size:2rem;font-weight:800;color:#00c896;line-height:1}.cl{font-size:.75rem;color:#666;margin-top:.4rem;text-transform:uppercase;letter-spacing:.05em}
.sec{margin-bottom:2rem}.st{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#00c896;margin-bottom:1rem}
.sb{background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:1.5rem}
.ring-wrap{position:relative;width:100px;height:100px;flex-shrink:0}.rw svg{transform:rotate(-90deg)}.rc{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:#00c896}
.gbpr{display:flex;align-items:center;gap:2rem;flex-wrap:wrap}.grn{flex:1;font-size:.9rem;color:#aaa;line-height:1.6}
table{width:100%;border-collapse:collapse;font-size:.9rem}th{text-align:left;color:#666;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;padding:.5rem 0;border-bottom:1px solid #1e1e1e}
td{padding:.6rem 0;border-bottom:1px solid #141414;color:#aaa}td:first-child{color:#e8e8e8}tr.hl td{color:#00c896;font-weight:600}
.tag{display:inline-block;font-size:.75rem;padding:.2rem .6rem;border-radius:4px;margin:.2rem .1rem}.tok{background:#0d2e26;color:#00c896}.twn{background:#2e1f0d;color:#f0a500}.tbd{background:#2e0d0d;color:#ff6b6b}
.revbox{background:linear-gradient(135deg,#0d2e26,#111);border:1px solid #00c89640;border-radius:12px;padding:1.5rem;text-align:center}.rvv{font-size:2.5rem;font-weight:800;color:#00c896}.rvl{color:#666;font-size:.85rem;margin-top:.4rem}
.ri{display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid #1a1a1a}.ri:last-child{border-bottom:none}.rn{width:32px;height:32px;background:#00c896;color:#0a0a0a;font-weight:800;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem}.rtx{flex:1;padding-top:.35rem;font-size:.95rem;color:#ccc;line-height:1.5}
.cta-box{background:#111;border:1px solid #00c89640;border-radius:12px;padding:1.5rem;text-align:center;margin-bottom:2rem}
.cta-box p{color:#aaa;margin-bottom:1rem;font-size:.9rem}.cta-btn{display:inline-block;background:#00c896;color:#0a0a0a;font-weight:700;padding:.8rem 1.5rem;border-radius:8px;text-decoration:none;font-size:.95rem}
.foot{margin-top:3rem;border-top:1px solid #1e1e1e;padding-top:1.5rem;text-align:center;color:#444;font-size:.8rem}.foot a{color:#00c896;text-decoration:none}
.note{font-size:.72rem;color:#444;margin-top:.5rem;font-style:italic}
@media(max-width:500px){.rt{font-size:1.4rem}.rl{float:none;display:block;margin-bottom:.5rem}}
</style></head><body>
<div id="gate"><div class="gb">
  <div class="gl">Van<span>guardeer</span></div>
  <p class="gs">Enter your password to view the audit report.</p>
  <input id="pw" class="gi" type="password" placeholder="Password" autocomplete="off">
  <button class="gbtn" onclick="unlock()">View My Report →</button>
  <div class="ge" id="pe"></div>
</div></div>

<div id="report">
  <div class="rh">
    <div class="rl">Van<span>guardeer</span></div>
    <div class="rb">Digital Footprint Audit</div>
    <div class="rt">${esc(c.business||"Your Business")}</div>
    <div class="rm">Prepared for ${esc(c.name||"")} &nbsp;·&nbsp; ${date}</div>
  </div>

  <div class="cards">
    <div class="card"><div class="cv">${a.gmb_rank ? esc(String(a.gmb_rank)) : "—"}</div><div class="cl">Maps Rank</div></div>
    <div class="card"><div class="cv">${a.reviews_ours||"—"}</div><div class="cl">Your Reviews</div></div>
    <div class="card"><div class="cv">${a.gbp_score||"—"}/10</div><div class="cl">GBP Score</div></div>
    <div class="card"><div class="cv">${a.indexed_pages||"—"}</div><div class="cl">Indexed Pages</div></div>
  </div>

  <div class="sec"><div class="st">Google Business Profile</div><div class="sb">
    <div class="gbpr">
      <div class="ring-wrap rw"><svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1e1e" stroke-width="10"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#00c896" stroke-width="10"
          stroke-dasharray="${gbpPct} 251.3" stroke-linecap="round"/>
      </svg><div class="rc">${a.gbp_score||0}</div></div>
      <div class="grn">
        ${a.gmb_rank ? `<strong>Estimated rank ${esc(String(a.gmb_rank))}</strong> for "${esc(c.keyword||c.industry||"")}" in ${esc(a.gmb_area||"Singapore")}<br>` : ""}
        ${a.gbp_notes ? esc(a.gbp_notes) : "See recommendations below for quick-win GBP improvements."}
        <div class="note">* Rankings and scores are estimates based on automated analysis and industry benchmarks.</div>
      </div>
    </div>
  </div></div>

  ${compRows ? `<div class="sec"><div class="st">Review Gap vs Competitors</div><div class="sb">
    <table><thead><tr><th>Business</th><th style="text-align:right">Est. Reviews</th></tr></thead>
    <tbody><tr class="hl"><td>⭐ ${esc(c.business||"You")}</td><td style="text-align:right">${a.reviews_ours||"—"}</td></tr>
    ${compRows}</tbody></table>
    <div class="note">* Competitor data is estimated based on industry benchmarks. Actual figures may vary.</div>
  </div></div>` : ""}

  <div class="sec"><div class="st">Website Audit</div><div class="sb">
    <p style="color:#666;font-size:.8rem;margin-bottom:1rem">${esc(c.website||"")}</p>
    <span class="tag ${(a.indexed_pages||0) > 0 ? "tok":"twn"}">${a.indexed_pages||0} pages indexed</span>
    <span class="tag ${a.title_tag_ok ? "tok":"tbd"}">${a.title_tag_ok ? "✓ Title tag":"✗ Title tag issue"}</span>
    <span class="tag ${a.schema_detected ? "tok":"twn"}">${a.schema_detected ? "✓ Schema markup":"No schema markup"}</span>
    <span class="tag ${a.local_business_schema ? "tok":"twn"}">${a.local_business_schema ? "✓ LocalBusiness schema":"No LocalBusiness schema"}</span>
  </div></div>

  ${a.revenue_impact ? `<div class="sec"><div class="st">Estimated Monthly Revenue Potential</div>
  <div class="revbox"><div class="rvv">${esc(a.revenue_impact)}</div>
  <div class="rvl">in additional revenue potential with quick-win fixes applied</div></div></div>` : ""}

  ${recs.length ? `<div class="sec"><div class="st">Top ${recs.length} Quick-Win Recommendations</div><div class="sb">
    ${recs.map((rec,i) => `<div class="ri"><div class="rn">${i+1}</div><div class="rtx">${esc(rec)}</div></div>`).join("")}
  </div></div>` : ""}

  <div class="cta-box">
    <p>Want to walk through these findings together and get a personalised action plan?</p>
    <a href="${BOOKING_URL}" target="_blank" class="cta-btn">Book Your Free 30-Min Review Call →</a>
  </div>

  <div class="foot">Prepared by <a href="https://vanguardeer.com">Vanguardeer</a> &nbsp;·&nbsp;
  <a href="mailto:enquiries@vanguardeer.com">enquiries@vanguardeer.com</a> &nbsp;·&nbsp;
  <a href="https://wa.me/6596960063">WhatsApp</a></div>
</div>

<script>
const PW="${r.password}", ID="${id}";
document.getElementById("pw").addEventListener("keydown",e=>{if(e.key==="Enter")unlock()});
function unlock(){
  if(document.getElementById("pw").value.trim()===PW){
    document.getElementById("gate").classList.add("gone");
    document.getElementById("report").style.display="block";
    fetch("/report/"+ID+"/view",{method:"POST"}).catch(()=>{});
  } else {
    document.getElementById("pe").textContent="Incorrect password. Check your email.";
    document.getElementById("pw").style.borderColor="#ff6b6b";
  }
}
</script></body></html>`;
}

// ── Admin Dashboard HTML ──────────────────────────────────────────────────────

function adminDashboardHTML(idx, secret) {
  const statusBadge = s => ({
    pending:  '<span style="color:#f0a500">⏳ Generating…</span>',
    ready:    '<span style="color:#00c896">✅ Ready</span>',
    approved: '<span style="color:#888">✓ Approved</span>',
    error:    '<span style="color:#ff6b6b">⚠ Error</span>',
    sent:     '<span style="color:#888">✓ Sent</span>',
  }[s] || s);

  const rows = idx.length ? idx.map(e => `
    <tr>
      <td>${esc(e.business||"—")}</td>
      <td>${statusBadge(e.status)}</td>
      <td style="color:#555;font-size:.8rem">${new Date(e.created_at).toLocaleDateString("en-SG",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</td>
      <td>
        <a href="/report/${esc(e.id)}" target="_blank" style="color:#00c896;font-size:.8rem;margin-right:.75rem">Preview</a>
        <button onclick="showPwd('${esc(e.id)}')" style="background:#1e1e1e;border:1px solid #333;color:#aaa;padding:.3rem .7rem;border-radius:4px;font-size:.8rem;cursor:pointer;margin-right:.5rem">Password</button>
        ${e.status === "ready" ? `<button onclick="approve('${esc(e.id)}',this)" style="background:#00c896;color:#0a0a0a;border:none;padding:.3rem .8rem;border-radius:4px;font-size:.8rem;font-weight:700;cursor:pointer">Approve & Send →</button>` : ""}
      </td>
    </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;color:#555;padding:2rem">No audits yet</td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audit Dashboard — Vanguardeer</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem 1.5rem;max-width:900px;margin:0 auto}
h1{font-size:1.4rem;font-weight:800;margin-bottom:.25rem}h1 span{color:#00c896}.sub{color:#666;font-size:.85rem;margin-bottom:2rem;display:flex;gap:1rem;align-items:center}
.sub a{color:#00c896;font-size:.85rem;text-decoration:none}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#555;padding:.6rem 0;border-bottom:1px solid #1e1e1e}
td{padding:.75rem 0;border-bottom:1px solid #141414;vertical-align:middle}
#wa-modal{display:none;position:fixed;inset:0;background:#000a;z-index:99;align-items:center;justify-content:center}
#wa-modal.show{display:flex}.modal-box{background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:1.5rem;max-width:500px;width:90%}
.modal-box h3{color:#00c896;margin-bottom:1rem}.msg-box{background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:1rem;font-size:.85rem;color:#ccc;white-space:pre-wrap;margin-bottom:1rem}
.wa-btn{display:block;width:100%;text-align:center;background:#25d366;color:#fff;font-weight:700;padding:.85rem;border-radius:8px;text-decoration:none;margin-bottom:.75rem;font-size:.95rem}
.close-btn{background:#1e1e1e;border:none;color:#888;padding:.5rem 1rem;border-radius:6px;cursor:pointer;font-size:.85rem;width:100%}
.refresh{font-size:.8rem;color:#555}
</style></head><body>
<h1>Van<span>guardeer</span> Dashboard</h1>
<div class="sub">
  <span>Audit reports</span>
  <a href="/admin?secret=${esc(secret)}&create=1">+ Manual audit</a>
  <a href="javascript:location.reload()" class="refresh">↻ Refresh</a>
</div>

<table>
  <thead><tr><th>Business</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
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
const SECRET = ${JSON.stringify(secret)};
async function approve(id, btn) {
  btn.textContent = "Approving…"; btn.disabled = true;
  try {
    const r = await fetch("/admin/approve/" + id, {
      method: "POST",
      headers: { "X-Admin-Secret": SECRET }
    });
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
  const r = await fetch("/admin/report-info/" + id, { headers: { "X-Admin-Secret": SECRET } });
  const d = await r.json();
  if (d.password) alert("Report: https://vanguardeer.com/report/" + id + "\\nPassword: " + d.password);
  else alert("Error: " + (d.error || "Could not fetch"));
}
</script></body></html>`;
}

// ── Admin Create HTML (manual override form) ──────────────────────────────────

function adminCreateHTML(secret) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Create Audit — Vanguardeer</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem 1rem;max-width:760px;margin:0 auto}
h1{font-size:1.4rem;font-weight:800;margin-bottom:.25rem}h1 span{color:#00c896}.sub{color:#666;font-size:.85rem;margin-bottom:2rem}
.sub a{color:#00c896;text-decoration:none}.sec{margin-bottom:2rem}.sec h2{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#00c896;margin-bottom:.75rem;padding-bottom:.4rem;border-bottom:1px solid #1e1e1e}
.row{display:grid;gap:.75rem;margin-bottom:.75rem}.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1fr 1fr 1fr}
label{font-size:.75rem;color:#666;display:block;margin-bottom:.3rem}
input,textarea,select{width:100%;background:#111;border:1px solid #222;border-radius:6px;color:#e8e8e8;padding:.65rem .8rem;font-size:.9rem;font-family:inherit;outline:none;transition:border .2s}
input:focus,textarea:focus{border-color:#00c896}textarea{resize:vertical;min-height:80px}
.hint{font-size:.72rem;color:#444;margin-top:.25rem}.cb-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem}.cb-row input{width:auto}.cb-row label{margin:0;color:#aaa}
.sbtn{background:#00c896;color:#0a0a0a;font-weight:700;font-size:1rem;padding:.9rem 2rem;border:none;border-radius:8px;cursor:pointer;width:100%;margin-top:1rem}
.result{display:none;margin-top:1.5rem;background:#0d2e26;border:1px solid #00c89640;border-radius:8px;padding:1.25rem}
.result h3{color:#00c896;font-size:.85rem;margin-bottom:.75rem}.ru{font-size:.9rem;word-break:break-all;margin-bottom:.5rem}.ru a{color:#00c896}.rpw{font-size:.9rem;color:#aaa}.rpw strong{color:#e8e8e8}
.cpbtn{margin-top:.75rem;background:#1e1e1e;border:1px solid #333;color:#e8e8e8;padding:.45rem .9rem;border-radius:6px;cursor:pointer;font-size:.8rem}
</style></head><body>
<h1>Van<span>guardeer</span> Manual Audit</h1>
<p class="sub"><a href="/admin?secret=${esc(secret)}">← Back to dashboard</a></p>
<form id="f">
  <div class="sec"><h2>Client Info</h2>
    <div class="row r2"><div><label>Business Name *</label><input name="business" required></div><div><label>Industry</label><input name="industry"></div></div>
    <div class="row r2"><div><label>Contact Name *</label><input name="name" required></div><div><label>Email *</label><input name="email" type="email" required></div></div>
    <div class="row r2"><div><label>WhatsApp</label><input name="phone"></div><div><label>Website</label><input name="website"></div></div>
    <div class="row"><div><label>Primary Keyword</label><input name="keyword"></div></div>
    <div class="row r2"><div><label>Report Password</label><input name="password" placeholder="Auto-generate if blank"></div></div>
  </div>
  <div class="sec"><h2>Google Business Profile</h2>
    <div class="row r2">
      <div><label>Maps Rank</label><input name="gmb_rank" type="number" min="1" placeholder="e.g. 4"><div class="hint">Search [keyword] [area] in Maps</div></div>
      <div><label>Search Area</label><input name="gmb_area" placeholder="e.g. Jurong West"></div>
    </div>
    <div class="row r2"><div><label>GBP Score /10</label><input name="gbp_score" type="number" min="0" max="10" step="0.5"><div class="hint">Photos, hours, description, services, posts, Q&A, reviews responded, categories, attributes, website</div></div></div>
    <div class="row"><div><label>GBP Notes</label><textarea name="gbp_notes"></textarea></div></div>
  </div>
  <div class="sec"><h2>Reviews</h2>
    <div class="row r2"><div><label>Client Reviews</label><input name="reviews_ours" type="number" min="0"></div></div>
    <div class="row r3"><div><label>Competitor 1</label><input name="c1_name"></div><div><label>Competitor 2</label><input name="c2_name"></div><div><label>Competitor 3</label><input name="c3_name"></div></div>
    <div class="row r3"><div><label>C1 Reviews</label><input name="reviews_c1" type="number"></div><div><label>C2 Reviews</label><input name="reviews_c2" type="number"></div><div><label>C3 Reviews</label><input name="reviews_c3" type="number"></div></div>
  </div>
  <div class="sec"><h2>Website</h2>
    <div class="row r2"><div><label>Indexed Pages</label><input name="indexed_pages" type="number" min="0"><div class="hint">site:domain.com in Google</div></div></div>
    <div>
      <div class="cb-row"><input type="checkbox" name="title_tag_ok" id="tto"><label for="tto">Title tag present and includes keyword</label></div>
      <div class="cb-row"><input type="checkbox" name="schema_detected" id="sd"><label for="sd">Schema markup detected</label></div>
      <div class="cb-row"><input type="checkbox" name="carousell_present" id="cp"><label for="cp">Carousell listing present</label></div>
    </div>
    <div class="row" style="margin-top:.75rem"><div><label>Carousell Notes</label><textarea name="carousell_notes"></textarea></div></div>
  </div>
  <div class="sec"><h2>Revenue Impact</h2>
    <div class="row"><div><label>Monthly Revenue Potential</label><input name="revenue_impact" placeholder="e.g. S$2,000–S$5,000"></div></div>
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
  const audit  = { gmb_rank:fd.get("gmb_rank"), gmb_area:fd.get("gmb_area"), gbp_score:fd.get("gbp_score"), gbp_notes:fd.get("gbp_notes"), reviews_ours:fd.get("reviews_ours"), c1_name:fd.get("c1_name"), reviews_c1:fd.get("reviews_c1"), c2_name:fd.get("c2_name"), reviews_c2:fd.get("reviews_c2"), c3_name:fd.get("c3_name"), reviews_c3:fd.get("reviews_c3"), indexed_pages:fd.get("indexed_pages"), title_tag_ok:fd.get("title_tag_ok")==="on", schema_detected:fd.get("schema_detected")==="on", carousell_present:fd.get("carousell_present")==="on", carousell_notes:fd.get("carousell_notes"), revenue_impact:fd.get("revenue_impact"), rec1:fd.get("rec1"), rec2:fd.get("rec2"), rec3:fd.get("rec3") };
  try {
    const r = await fetch("/admin/report", { method:"POST", headers:{"Content-Type":"application/json","X-Admin-Secret":SECRET}, body:JSON.stringify({client,audit,password:fd.get("password")||undefined}) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById("ru").href = document.getElementById("ru").textContent = d.url;
    document.getElementById("rpw").textContent = d.password;
    document.getElementById("res").style.display = "block";
    btn.textContent = "Generate Report →"; btn.disabled = false;
    document.getElementById("res").scrollIntoView({behavior:"smooth"});
  } catch(e) { alert("Error: "+e.message); btn.textContent = "Generate Report →"; btn.disabled = false; }
});
function copyAll(){ navigator.clipboard.writeText("Report: "+document.getElementById("ru").textContent+"\\nPassword: "+document.getElementById("rpw").textContent).then(()=>alert("Copied!")); }
</script></body></html>`;
}
