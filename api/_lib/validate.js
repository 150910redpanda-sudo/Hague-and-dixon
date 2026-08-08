/* Server-side request validation for the form endpoints.
 *
 * These limits are the authoritative ones. script.js has its own copy so it can
 * give the visitor immediate feedback, but a direct POST never runs that code —
 * nothing here derives from the client, and the two are deliberately
 * independent. If you change one, change the other, but never assume the
 * client's copy was applied.
 *
 * Rate limiting is NOT done here. It is enforced by a Vercel WAF custom rule
 * scoped to /api/*. Everything in this file is ordered so the cheap rejections
 * (method, origin, size) happen before any parsing or allocation, which is what
 * makes the handler safe to sit behind that rule rather than duplicating it.
 */
'use strict';

const MAX_BODY_BYTES = 16 * 1024;
const CANONICAL_ORIGIN = 'https://www.hague-dixon.co.uk';

/* Control characters have no business in a submitted field. Multiline fields
 * keep tab, newline and carriage return; single-line fields keep none. */
const CTRL_ALL = /[\x00-\x1F\x7F]/g;
const CTRL_KEEP_NEWLINES = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const CRLF = /[\r\n]/;

/* A field marked headerSafe ends up in an email header (To, Reply-To, Subject)
 * or in a header-adjacent position. A newline in one of those lets an attacker
 * append headers of their own and relay mail through us, so they are rejected
 * outright rather than sanitised — a legitimate name never contains one. */
const CONTACT_FIELDS = {
  name:  { max: 100,  required: true,  headerSafe: true },
  email: { max: 254,  required: true,  headerSafe: true, email: true },
  phone: { max: 40,   headerSafe: true },
  topic: { max: 100,  headerSafe: true },
  msg:   { max: 4000, required: true,  multiline: true }
};

const FEEDBACK_FIELDS = {
  fb_name:    { max: 100, headerSafe: true },
  fb_email:   { max: 254, headerSafe: true, email: true },
  fb_office:  { max: 60,  headerSafe: true },
  fb_service: { max: 80,  headerSafe: true },
  overall:    { max: 1, headerSafe: true, oneOf: ['1', '2', '3', '4', '5'] },
  quality:    { max: 1, headerSafe: true, oneOf: ['1', '2', '3', '4', '5'] },
  comms:      { max: 1, headerSafe: true, oneOf: ['1', '2', '3', '4', '5'] },
  timing:     { max: 1, headerSafe: true, oneOf: ['1', '2', '3', '4', '5'] },
  value:      { max: 1, headerSafe: true, oneOf: ['1', '2', '3', '4', '5'] },
  recommend:  { max: 10, headerSafe: true, oneOf: ['yes', 'maybe', 'no'] },
  fb_perm:    { max: 3,  headerSafe: true, oneOf: ['Yes', 'No'] },
  fb_well:    { max: 4000, multiline: true },
  fb_improve: { max: 4000, multiline: true }
};

/* Deliberately permissive: this rejects the obviously malformed without
 * turning away valid addresses that a stricter pattern would refuse. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;   // safe to show the visitor
  }
}

function stripControl(value, multiline) {
  if (multiline) {
    return value.replace(CTRL_KEEP_NEWLINES, '').replace(/\r\n?/g, '\n');
  }
  return value.replace(CTRL_ALL, '');
}

/** Same-origin check. Browsers always send Origin for a JSON POST because the
 *  content type makes it non-simple and forces a preflight. This is not a
 *  defence against a determined script — there is no session to ride — but it
 *  stops other sites posting through our endpoint. */
function allowedOrigins(req) {
  const list = [CANONICAL_ORIGIN];
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
      const t = o.trim();
      if (t) list.push(t);
    });
  }
  // Preview deployments: VERCEL_URL is set by the platform and cannot be
  // influenced by the caller, unlike the Host header. Preferred for exactly
  // that reason — trusting Host would let anyone who can set both Host and
  // Origin satisfy this check.
  if (process.env.VERCEL_URL) {
    list.push('https://' + process.env.VERCEL_URL);
    return list;
  }

  // No VERCEL_URL means local development (`vercel dev`, the CI harness).
  // Loopback only, and http is allowed there so nobody is tempted to loosen
  // the check to make local testing work.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host && !CRLF.test(host) && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    list.push('http://' + host);
    list.push('https://' + host);
  }
  return list;
}

function assertMethod(req) {
  if (req.method === 'POST') return;
  const err = new RequestError(405, 'Method not allowed');
  err.allow = 'POST';
  throw err;
}

function assertOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new RequestError(403, 'Forbidden');
  if (!allowedOrigins(req).includes(origin)) throw new RequestError(403, 'Forbidden');

  // Extra signal where the browser provides it; absent on older browsers.
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') throw new RequestError(403, 'Forbidden');
}

function assertContentType(req) {
  const ct = req.headers['content-type'] || '';
  if (!ct.toLowerCase().includes('application/json')) {
    throw new RequestError(415, 'Unsupported media type');
  }
}

/** Read the body with a hard byte cap.
 *
 *  Vercel populates req.body for JSON requests, but relying on that alone would
 *  mean the payload is already parsed and allocated before we can object to its
 *  size. Content-Length is checked first, then the parsed body is re-measured
 *  in case the header lied or was absent. */
function readBody(req) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_BODY_BYTES) {
    // Drain before rejecting. Leaving an unread body on a keep-alive
    // connection strands the socket and the next request over it fails.
    req.resume();
    throw new RequestError(413, 'Payload too large');
  }

  if (req.body !== undefined && req.body !== null) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      req.resume();
      throw new RequestError(413, 'Payload too large');
    }
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { throw new RequestError(400, 'Invalid request'); }
    }
    return req.body;
  }

  return new Promise((resolve, reject) => {
    // The platform may already have consumed the stream without populating
    // req.body (an empty body, for instance). Attaching listeners now would
    // wait for an 'end' that has already fired and hang until the function
    // times out.
    if (req.readableEnded || req.complete) { resolve({}); return; }

    let size = 0;
    let aborted = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (aborted) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        chunks.length = 0;               // release what was buffered
        reject(new RequestError(413, 'Payload too large'));
        // Drain the rest into the void rather than destroying the socket:
        // tearing the connection down here means the 413 never reaches the
        // client, which sees a connection reset instead of an error it can
        // act on. resume() keeps memory bounded without buffering.
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(new RequestError(400, 'Invalid request'));
      }
    });
    req.on('error', () => reject(new RequestError(400, 'Invalid request')));
  });
}

/** Validate the parsed body against a schema. Returns cleaned fields only —
 *  anything not in the schema is dropped rather than passed through. */
function validate(body, schema) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new RequestError(400, 'Invalid request');
  }

  // Honeypot. The browser adds a hidden `website` field that humans leave
  // empty. Accept silently so a bot learns nothing from the response.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return { honeypot: true, fields: {} };
  }

  const clean = {};
  for (const key of Object.keys(schema)) {
    const rule = schema[key];
    let value = body[key];

    if (value === undefined || value === null || value === '') {
      if (rule.required) throw new RequestError(400, 'Please complete every required field.');
      continue;
    }
    if (typeof value !== 'string') throw new RequestError(400, 'Invalid request');

    // CRLF injection: checked against the RAW value and rejected, not
    // sanitised. Doing this after stripControl() would silently swallow the
    // attempt and make a header-injection payload look like ordinary input.
    if (rule.headerSafe && CRLF.test(value)) {
      throw new RequestError(400, 'Invalid characters in a field.');
    }

    value = stripControl(value, rule.multiline).trim();
    if (!value) {
      if (rule.required) throw new RequestError(400, 'Please complete every required field.');
      continue;
    }
    if (value.length > rule.max) throw new RequestError(400, 'One of the fields is too long.');

    if (rule.email && !EMAIL_RE.test(value)) throw new RequestError(400, 'Please enter a valid email address.');
    if (rule.oneOf && !rule.oneOf.includes(value)) throw new RequestError(400, 'Invalid request');

    clean[key] = value;
  }

  return { honeypot: false, fields: clean };
}

/** Anything placed in an email header must be single-line and bounded, whatever
 *  path it took to get here. Belt and braces over the per-field check above. */
function headerValue(value, max) {
  const limit = max || 200;
  const flat = String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim();
  return flat.slice(0, limit);
}

module.exports = {
  MAX_BODY_BYTES,
  CANONICAL_ORIGIN,
  CONTACT_FIELDS,
  FEEDBACK_FIELDS,
  RequestError,
  assertMethod,
  assertOrigin,
  assertContentType,
  readBody,
  validate,
  headerValue,
  allowedOrigins
};
