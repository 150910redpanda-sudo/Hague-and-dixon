#!/usr/bin/env node
/* Exercise /api/contact and /api/feedback with real HTTP requests.
 *
 * Mounts the two handlers on a local server the way Vercel routes them, then
 * fires malformed, oversized, CRLF-injected, cross-origin and valid payloads at
 * them. Reading the validation code proves it was written; only sending the
 * requests proves it runs.
 *
 * Rate limiting is deliberately NOT tested — it is a Vercel WAF rule scoped to
 * /api/*, not part of these functions. What is tested is that the handlers stay
 * cheap and stateless enough to sit behind one.
 *
 * Run locally with:  node .github/scripts/api-smoke-test.js
 */
'use strict';

const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8131;
const HOOK_PORT = 8132;
const ORIGIN = 'https://www.hague-dixon.co.uk';

const contact = require(path.join(ROOT, 'api', 'contact.js'));
const feedback = require(path.join(ROOT, 'api', 'feedback.js'));

let received = [];       // payloads the fake webhook accepted
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function request(pathname, { method = 'POST', headers = {}, body = null, chunked = false } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const h = Object.assign({
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'Sec-Fetch-Site': 'same-origin'
    }, headers);
    if (payload != null && !chunked && h['Content-Length'] === undefined) {
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    if (chunked) delete h['Content-Length'];

    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: pathname, method, headers: h, agent: false },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) { /* not json */ }
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload != null) req.write(payload);
    req.end();
  });
}

const validContact = () => ({
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '01904 000000',
  topic: 'Conveyancing',
  office: 'York',
  msg: 'I am buying a house in York and would like a quote.'
});

const validFeedback = () => ({
  fb_name: 'John Brown',
  fb_email: 'john@example.com',
  fb_office: 'York',
  fb_service: 'Conveyancing — buying a property',
  overall: '5', quality: '5', comms: '4', timing: '4', value: '5',
  recommend: 'yes',
  fb_well: 'Kept me informed throughout.',
  fb_improve: 'Nothing.',
  fb_perm: 'Yes'
});

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/api/contact') return contact(req, res);
    if (req.url.split('?')[0] === '/api/feedback') return feedback(req, res);
    res.statusCode = 404;
    res.end('not found');
  });
  await new Promise((r) => server.listen(PORT, r));

  const hook = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { received.push(JSON.parse(data)); } catch (e) { received.push({ unparsable: data }); }
      res.statusCode = 200;
      res.end('{"ok":true}');
    });
  });
  await new Promise((r) => hook.listen(HOOK_PORT, r));

  let r;

  // ---- Method, origin, content type -------------------------------------
  console.log('\nMethod / origin / content type');

  r = await request('/api/contact', { method: 'GET', body: null });
  check('GET is rejected 405', r.status === 405, `got ${r.status}`);
  check('405 advertises Allow: POST', String(r.headers.allow) === 'POST', r.headers.allow);

  r = await request('/api/contact', { headers: { Origin: 'https://evil.example' }, body: validContact() });
  check('cross-origin POST is rejected 403', r.status === 403, `got ${r.status}`);

  r = await request('/api/contact', { headers: { Origin: '' }, body: validContact() });
  check('missing Origin is rejected 403', r.status === 403, `got ${r.status}`);

  r = await request('/api/contact', {
    headers: { Origin: ORIGIN, 'Sec-Fetch-Site': 'cross-site' }, body: validContact()
  });
  check('Sec-Fetch-Site cross-site is rejected 403', r.status === 403, `got ${r.status}`);

  r = await request('/api/contact', { headers: { 'Content-Type': 'text/plain' }, body: 'hello' });
  check('non-JSON content type is rejected 415', r.status === 415, `got ${r.status}`);

  r = await request('/api/contact', {
    method: 'OPTIONS', headers: { Origin: 'https://evil.example' }, body: null
  });
  check('preflight from a foreign origin is rejected 403', r.status === 403, `got ${r.status}`);

  r = await request('/api/contact', { method: 'OPTIONS', body: null });
  check('preflight from our own origin is allowed 204', r.status === 204, `got ${r.status}`);
  check('preflight does not reflect a wildcard origin',
    r.headers['access-control-allow-origin'] === ORIGIN,
    r.headers['access-control-allow-origin']);

  // ---- Body size --------------------------------------------------------
  console.log('\nBody size');

  const huge = { name: 'A', email: 'a@b.co', msg: 'x'.repeat(20000) };
  r = await request('/api/contact', { body: huge });
  check('oversized body with Content-Length is rejected 413', r.status === 413, `got ${r.status}`);

  r = await request('/api/contact', { body: huge, chunked: true });
  check('oversized body without Content-Length is rejected 413', r.status === 413, `got ${r.status}`);

  r = await request('/api/contact', {
    body: JSON.stringify(validContact()), headers: { 'Content-Length': '999999' }
  });
  check('lying Content-Length is rejected 413', r.status === 413, `got ${r.status}`);

  // ---- Malformed input --------------------------------------------------
  console.log('\nMalformed input');

  r = await request('/api/contact', { body: '{not json' });
  check('malformed JSON is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: '["array","not","object"]' });
  check('array body is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: '"just a string"' });
  check('string body is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: { email: 'a@b.co', msg: 'hi' } });
  check('missing required field is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: Object.assign(validContact(), { email: 'not-an-email' }) });
  check('malformed email is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: Object.assign(validContact(), { name: 'x'.repeat(101) }) });
  check('over-length name is rejected 400 (server limit, not the client one)',
    r.status === 400, `got ${r.status}`);

  r = await request('/api/contact', { body: Object.assign(validContact(), { name: { nested: 1 } }) });
  check('non-string field is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/feedback', { body: Object.assign(validFeedback(), { overall: '9' }) });
  check('out-of-range rating is rejected 400', r.status === 400, `got ${r.status}`);

  r = await request('/api/feedback', { body: Object.assign(validFeedback(), { recommend: 'maybe-not' }) });
  check('unknown enum value is rejected 400', r.status === 400, `got ${r.status}`);

  // ---- CRLF header injection --------------------------------------------
  console.log('\nCRLF header injection');

  for (const [field, value] of [
    ['name', 'Jane\r\nBcc: attacker@evil.example'],
    ['name', 'Jane\nBcc: attacker@evil.example'],
    ['email', 'jane@example.com\r\nBcc: attacker@evil.example'],
    ['topic', 'Conveyancing\r\nX-Injected: yes'],
    ['phone', '01904\r\nSubject: hijacked']
  ]) {
    r = await request('/api/contact', { body: Object.assign(validContact(), { [field]: value }) });
    check(`CRLF in ${field} is rejected 400`, r.status === 400, `got ${r.status}`);
  }

  r = await request('/api/feedback', {
    body: Object.assign(validFeedback(), { fb_office: 'York\r\nBcc: x@y.z' })
  });
  check('CRLF in fb_office is rejected 400', r.status === 400, `got ${r.status}`);

  // ---- Honeypot ---------------------------------------------------------
  console.log('\nHoneypot');

  received = [];
  process.env.MAIL_TRANSPORT = 'webhook';
  process.env.FORM_WEBHOOK_URL = `http://127.0.0.1:${HOOK_PORT}/hook`;

  r = await request('/api/contact', {
    body: Object.assign(validContact(), { website: 'http://spam.example' })
  });
  check('honeypot submission returns 200', r.status === 200, `got ${r.status}`);
  check('honeypot submission is not delivered', received.length === 0, `${received.length} delivered`);

  // ---- Valid submissions, transport configured --------------------------
  console.log('\nValid submissions (webhook transport)');

  received = [];
  r = await request('/api/contact', { body: validContact() });
  check('valid enquiry returns 200', r.status === 200, `got ${r.status} ${r.raw}`);
  check('valid enquiry is delivered once', received.length === 1, `${received.length} delivered`);

  const msg = received[0] || {};
  check('subject contains no CR or LF', !/[\r\n]/.test(String(msg.subject)), JSON.stringify(msg.subject));
  check('replyTo contains no CR or LF', !/[\r\n]/.test(String(msg.replyTo || '')), String(msg.replyTo));
  check('replyTo is the visitor address', msg.replyTo === 'jane@example.com', String(msg.replyTo));
  check('honeypot field is not forwarded', !('website' in (msg.fields || {})), JSON.stringify(msg.fields));

  received = [];
  r = await request('/api/contact', {
    body: Object.assign(validContact(), { msg: 'Line one\nLine two\n\nLine four' })
  });
  check('newlines are allowed in the message body', r.status === 200, `got ${r.status}`);
  check('message newlines are preserved',
    (received[0] && received[0].fields.msg || '').includes('\nLine two'),
    JSON.stringify(received[0] && received[0].fields.msg));

  received = [];
  r = await request('/api/contact', {
    body: Object.assign(validContact(), { unexpected_field: 'dropped', __proto__: 'x' })
  });
  check('unknown fields are dropped, not forwarded',
    r.status === 200 && !('unexpected_field' in (received[0] || {}).fields),
    JSON.stringify(received[0] && received[0].fields));

  // ---- Office routing ---------------------------------------------------
  // The visitor picks which office receives the enquiry. The submitted value is
  // a key, never an address: only the three known offices are accepted, and the
  // recipient is resolved from the environment. A form that let the caller name
  // the recipient would be an open relay.
  console.log('\nOffice routing');

  process.env.MAIL_TO = 'fallback@hague-dixon.co.uk';
  process.env.MAIL_TO_YORK = 'york@hague-dixon.co.uk';
  process.env.MAIL_TO_PICKERING = 'pickering@hague-dixon.co.uk';
  delete process.env.MAIL_TO_STAMFORD_BRIDGE;

  for (const [office, expected] of [
    ['York', 'york@hague-dixon.co.uk'],
    ['Pickering', 'pickering@hague-dixon.co.uk'],
    ['Stamford Bridge', 'fallback@hague-dixon.co.uk']   // unconfigured → MAIL_TO
  ]) {
    received = [];
    r = await request('/api/contact', { body: Object.assign(validContact(), { office }) });
    check(`office "${office}" is accepted`, r.status === 200, `got ${r.status} ${r.raw}`);
    check(`office "${office}" routes to ${expected}`,
      (received[0] || {}).to === expected, String((received[0] || {}).to));
    check(`office "${office}" appears in the subject`,
      String((received[0] || {}).subject).includes(`(${office})`),
      String((received[0] || {}).subject));
  }

  for (const bad of [
    'Leeds',
    'attacker@evil.example',
    'York, attacker@evil.example',
    'york'                                   // case must match exactly
  ]) {
    received = [];
    r = await request('/api/contact', { body: Object.assign(validContact(), { office: bad }) });
    check(`office "${bad}" is rejected`, r.status === 400, `got ${r.status}`);
    check(`office "${bad}" is not delivered`, received.length === 0, `${received.length} delivered`);
  }

  received = [];
  r = await request('/api/contact', {
    body: Object.assign(validContact(), { office: 'York\r\nBcc: attacker@evil.example' })
  });
  check('CRLF in office is rejected', r.status === 400, `got ${r.status}`);
  check('CRLF office is not delivered', received.length === 0, `${received.length} delivered`);

  // Omitting the field entirely must still work — the picker is optional.
  received = [];
  const noOffice = validContact();
  delete noOffice.office;
  r = await request('/api/contact', { body: noOffice });
  check('enquiry without an office is accepted', r.status === 200, `got ${r.status}`);
  check('enquiry without an office falls back to MAIL_TO',
    (received[0] || {}).to === 'fallback@hague-dixon.co.uk', String((received[0] || {}).to));

  received = [];
  r = await request('/api/feedback', { body: validFeedback() });
  check('valid feedback returns 200', r.status === 200, `got ${r.status} ${r.raw}`);
  check('valid feedback is delivered', received.length === 1, `${received.length} delivered`);
  check('feedback subject is single-line', !/[\r\n]/.test(String((received[0] || {}).subject)));


  // ---- Vercel's pre-parsed body path ------------------------------------
  // Vercel populates req.body for JSON requests, so the stream branch above is
  // NOT the production path. Exercise the handlers directly with req.body set
  // the way the platform sets it.
  console.log('\nVercel pre-parsed body (req.body already populated)');

  function invoke(handler, { body, headers = {}, method = 'POST' } = {}) {
    return new Promise((resolve) => {
      const req = {
        method,
        headers: Object.assign({
          origin: ORIGIN,
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
          host: 'www.hague-dixon.co.uk'
        }, headers),
        body,
        readableEnded: true,
        complete: true,
        on() {}, resume() {}, destroy() {}
      };
      const out = { status: 200, headers: {}, raw: '' };
      const res = {
        set statusCode(v) { out.status = v; },
        get statusCode() { return out.status; },
        setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
        end(payload) {
          out.raw = payload || '';
          try { out.body = JSON.parse(out.raw); } catch (e) { out.body = null; }
          resolve(out);
        }
      };
      handler(req, res);
    });
  }

  received = [];
  process.env.MAIL_TRANSPORT = 'webhook';
  process.env.FORM_WEBHOOK_URL = `http://127.0.0.1:${HOOK_PORT}/hook`;

  r = await invoke(contact, { body: validContact() });
  check('pre-parsed object body is accepted', r.status === 200, `got ${r.status} ${r.raw}`);
  check('pre-parsed body is delivered', received.length === 1, `${received.length} delivered`);

  r = await invoke(contact, { body: JSON.stringify(validContact()) });
  check('pre-parsed string body is accepted', r.status === 200, `got ${r.status} ${r.raw}`);

  r = await invoke(contact, { body: Object.assign(validContact(), { name: 'A\r\nBcc: x@y.z' }) });
  check('CRLF is rejected on the pre-parsed path too', r.status === 400, `got ${r.status}`);

  r = await invoke(contact, { body: { name: 'A', email: 'a@b.co', msg: 'x'.repeat(20000) } });
  check('oversized pre-parsed body is rejected 413', r.status === 413, `got ${r.status}`);

  r = await invoke(contact, { body: '{not json' });
  check('malformed pre-parsed string is rejected 400', r.status === 400, `got ${r.status}`);

  r = await invoke(contact, { body: undefined, headers: { 'content-length': '0' } });
  check('empty consumed stream does not hang', r.status === 400, `got ${r.status}`);

  r = await invoke(contact, { body: validContact(), headers: { origin: 'https://evil.example' } });
  check('cross-origin rejected on the pre-parsed path', r.status === 403, `got ${r.status}`);

  // ---- Unconfigured transport -------------------------------------------
  console.log('\nUnconfigured transport');

  delete process.env.MAIL_TRANSPORT;
  delete process.env.FORM_WEBHOOK_URL;

  r = await request('/api/contact', { body: validContact() });
  check('unconfigured transport returns 503', r.status === 503, `got ${r.status}`);
  check('503 tells the client to fall back', r.body && r.body.fallback === true, JSON.stringify(r.body));
  check('503 does not claim the message was received',
    !/thank you|received|sent/i.test(String(r.body && r.body.error)),
    String(r.body && r.body.error));

  // ---- Response hygiene --------------------------------------------------
  console.log('\nResponse hygiene');

  r = await request('/api/contact', { body: '{bad' });
  check('errors are JSON, not HTML', r.headers['content-type'].includes('application/json'));
  check('errors carry nosniff', r.headers['x-content-type-options'] === 'nosniff');
  check('errors are not cacheable', /no-store/.test(String(r.headers['cache-control'])));
  check('errors leak no stack trace', !/at |\.js:\d+/.test(r.raw), r.raw);

  server.close();
  hook.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})().catch((err) => {
  console.error('harness error:', err);
  process.exit(1);
});
