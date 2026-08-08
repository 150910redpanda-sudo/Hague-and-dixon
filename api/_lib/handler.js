/* Shared request pipeline for the form endpoints.
 *
 * Order matters: the cheap rejections (method, origin, content type, size) all
 * run before anything is parsed or allocated. That is what makes these handlers
 * safe to sit behind the Vercel WAF rate-limit rule rather than duplicating it
 * — a flood costs almost nothing to reject here, and the WAF stops it before it
 * reaches the function at all.
 */
'use strict';

const V = require('./validate');
const { buildMessage, deliver } = require('./mailer');

function json(res, status, payload, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach((k) => res.setHeader(k, extraHeaders[k]));
  }
  res.end(JSON.stringify(payload));
}

/** Echo the caller's origin only when it is one we already allow — never
 *  reflect an arbitrary Origin header back. */
function corsHeaders(req) {
  const origin = req.headers.origin;
  if (origin && V.allowedOrigins(req).includes(origin)) {
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  }
  return { Vary: 'Origin' };
}

function makeHandler({ kind, schema, labels }) {
  return async function handler(req, res) {
    try {
      if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (!origin || !V.allowedOrigins(req).includes(origin)) {
          return json(res, 403, { error: 'Forbidden' }, { Vary: 'Origin' });
        }
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Vary', 'Origin');
        return res.end();
      }

      V.assertMethod(req);
      V.assertOrigin(req);
      V.assertContentType(req);

      const body = await V.readBody(req);
      const { honeypot, fields } = V.validate(body, schema);

      // A bot filled the hidden field. Accept so it learns nothing, but send
      // nothing on.
      if (honeypot) return json(res, 200, { ok: true }, corsHeaders(req));

      const message = buildMessage(kind, fields, labels);
      const result = await deliver(message);

      if (!result.sent && result.reason === 'unconfigured') {
        // No mail transport configured yet. Say so honestly and tell the client
        // it may fall back to the visitor's own mail program — never pretend
        // the submission was received.
        console.error('[%s] no MAIL_TRANSPORT configured — submission not delivered', kind);
        return json(res, 503, {
          error: 'This form is not connected yet. Please call or email us directly.',
          fallback: true
        }, corsHeaders(req));
      }

      return json(res, 200, { ok: true }, corsHeaders(req));
    } catch (err) {
      if (err instanceof V.RequestError) {
        const extra = corsHeaders(req);
        if (err.allow) extra.Allow = err.allow;
        return json(res, err.status, { error: err.message }, extra);
      }
      // Never leak an internal error, a stack trace or provider detail to the
      // browser. Log the message only — the payload contains personal data and,
      // on the feedback form, details of someone's legal matter.
      console.error('[%s] delivery failed: %s', kind, err && err.message);
      return json(res, 502, {
        error: 'Sorry, we could not send that just now. Please try again, or call your nearest office.'
      }, corsHeaders(req));
    }
  };
}

module.exports = { makeHandler };
