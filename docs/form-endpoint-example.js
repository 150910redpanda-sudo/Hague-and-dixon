/* Reference form endpoint — Cloudflare Worker.
 *
 * NOT DEPLOYED. This is a starting point for the endpoint that `FORM_ENDPOINT`
 * in script.js should point at. Nothing on the website can rate limit or
 * validate anything: a static page hands the browser a set of rules the visitor
 * is free to ignore. Every control that matters lives here.
 *
 * Adapting this to an Azure Function or a Power Automate flow is fine — keep
 * all five controls below, they are the point of the file.
 *
 * Setup:
 *   1. wrangler kv namespace create FORM_RATE
 *   2. Bind it as FORM_RATE, and set ALLOWED_ORIGIN + a mail provider secret.
 *   3. Set FORM_ENDPOINT in script.js to the deployed URL.
 *   4. Add that origin to connect-src in _headers / .htaccess / web.config,
 *      or the browser's CSP will block the fetch.
 */

const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_SECONDS = 3600;
const MAX_PER_WINDOW = 5;          // submissions per IP per hour

// Mirrors the client-side caps in script.js — but this copy is the one that counts.
const FIELDS = {
  name:       { max: 100,  required: true },
  email:      { max: 254,  required: true },
  phone:      { max: 40 },
  topic:      { max: 100 },
  msg:        { max: 4000, required: true },
  fb_name:    { max: 100 },
  fb_email:   { max: 254 },
  fb_office:  { max: 60 },
  fb_service: { max: 80 },
  fb_well:    { max: 4000 },
  fb_improve: { max: 4000 },
  fb_perm:    { max: 3 },
  overall:    { max: 1 }, quality: { max: 1 }, comms: { max: 1 },
  timing:     { max: 1 }, value:   { max: 1 }, recommend: { max: 10 },
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN;           // e.g. https://www.hague-dixon.co.uk
    const origin = request.headers.get('Origin');

    // --- CORS preflight -------------------------------------------------
    if (request.method === 'OPTIONS') {
      if (origin !== allowed) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowed,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // --- 1. Method and origin -------------------------------------------
    // Only this site may post here. Not a complete CSRF defence, but there is
    // no session to ride, so the risk is submission spam rather than account
    // compromise.
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
    if (origin !== allowed) return json(403, { error: 'Forbidden' });
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
      return json(415, { error: 'Unsupported media type' });
    }

    // --- 2. Request size --------------------------------------------------
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY_BYTES) return json(413, { error: 'Payload too large' });

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Payload too large' });

    // --- 3. Rate limiting -------------------------------------------------
    // The real control. Keyed on the connecting IP, in a store the client
    // cannot touch. Cloudflare sets CF-Connecting-IP itself; never trust
    // X-Forwarded-For from the client.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const bucket = `rl:${ip}:${Math.floor(Date.now() / 1000 / WINDOW_SECONDS)}`;
    const seen = Number((await env.FORM_RATE.get(bucket)) || 0);

    if (seen >= MAX_PER_WINDOW) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later, or call us.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(WINDOW_SECONDS),
            'Access-Control-Allow-Origin': allowed,
          },
        }
      );
    }
    // Count the attempt before doing any work, so failures cannot be used to
    // probe the endpoint for free.
    await env.FORM_RATE.put(bucket, String(seen + 1), { expirationTtl: WINDOW_SECONDS * 2 });

    // --- 4. Parse and validate -------------------------------------------
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json(400, { error: 'Invalid request' });
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return json(400, { error: 'Invalid request' });
    }

    // Honeypot: the browser adds a hidden `website` field. Humans leave it
    // empty. Accept silently so bots learn nothing from the response.
    if (data.website) return json(200, { ok: true });

    const clean = {};
    for (const [key, rule] of Object.entries(FIELDS)) {
      const v = data[key];
      if (v === undefined || v === null || v === '') {
        if (rule.required) return json(400, { error: `Missing required field: ${key}` });
        continue;
      }
      if (typeof v !== 'string') return json(400, { error: `Invalid field: ${key}` });
      if (v.length > rule.max) return json(400, { error: `Field too long: ${key}` });
      clean[key] = v;
    }

    const email = clean.email || clean.fb_email;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json(400, { error: 'Invalid email address' });
    }

    // --- 5. Header injection ---------------------------------------------
    // Anything going into an email header must not contain newlines, or an
    // attacker can append their own headers and relay mail through us.
    for (const v of Object.values(clean)) {
      if (/[\r\n]/.test(v)) return json(400, { error: 'Invalid characters' });
    }

    // --- Deliver ----------------------------------------------------------
    // Send via your mail provider here. Log the outcome, never the payload —
    // it contains personal data and, on the feedback form, details of someone's
    // legal matter. Keep retention aligned with the privacy notice.
    try {
      await deliver(clean, env);
    } catch (err) {
      // Never return the underlying error to the browser.
      console.error('delivery failed', err && err.message);
      return new Response(JSON.stringify({ error: 'Could not send. Please call us.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed },
    });
  },
};

async function deliver(fields, env) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
  const isFeedback = 'fb_name' in fields || 'fb_well' in fields || 'overall' in fields;

  const res = await fetch('https://api.mailprovider.example/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.MAIL_API_KEY}`,   // a secret, never in this file
    },
    body: JSON.stringify({
      to: isFeedback ? 'york@hague-dixon.co.uk' : 'york@hague-dixon.co.uk',
      from: 'website@hague-dixon.co.uk',             // must pass SPF/DKIM — see SECURITY.md
      reply_to: fields.email || fields.fb_email || undefined,
      subject: isFeedback ? 'Client feedback (website)' : 'Website enquiry',
      text: lines,
    }),
  });

  if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
}
