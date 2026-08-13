/* Delivery transport for the form endpoints.
 *
 * NOTHING IS HARDCODED TO A PROVIDER. Which one to use is chosen by the
 * MAIL_TRANSPORT environment variable, because the firm's actual mail path had
 * not been confirmed when this was written. Microsoft 365 is the likely answer
 * (the client feedback survey is hosted on Microsoft Forms) but "likely" is not
 * "confirmed", and quietly guessing would mean enquiries vanishing into a
 * mailbox nobody reads.
 *
 *   MAIL_TRANSPORT=graph     Microsoft 365 via Microsoft Graph sendMail
 *   MAIL_TRANSPORT=webhook   POST the payload to any URL (Power Automate, etc.)
 *   MAIL_TRANSPORT unset     Not configured — the handler returns 503 and the
 *                            browser falls back to opening the mail client.
 *
 * Whichever is used, the From address must pass SPF and DKIM for the sending
 * domain or the mail will land in junk. See SECURITY.md for those DNS records —
 * they are still outstanding.
 *
 * No dependencies: everything here uses the global fetch built into the Node
 * runtime, so the deployment needs no package.json and no install step.
 */
'use strict';

const { headerValue } = require('./validate');

const TIMEOUT_MS = 8000;

/* Per-office delivery.
 *
 * The contact form lets the visitor pick which office should receive their
 * enquiry. That choice arrives as one of three fixed strings (validate.js
 * constrains it with oneOf) and is used ONLY as a key into this map — the
 * recipient address itself always comes from the environment, never from the
 * request. A submitted address must never reach a To header, or the form
 * becomes an open relay.
 *
 * Each variable is optional and holds a comma-separated list. Any office
 * without one falls back to MAIL_TO, so an existing deployment that sets only
 * MAIL_TO keeps working exactly as before. */
const OFFICE_ENV = {
  'York': 'MAIL_TO_YORK',
  'Stamford Bridge': 'MAIL_TO_STAMFORD_BRIDGE',
  'Pickering': 'MAIL_TO_PICKERING'
};

/** Recipient list for an office, as a comma-separated string.
 *  Falls back to MAIL_TO when the office is unknown, absent, or unconfigured. */
function recipientsFor(office) {
  const key = Object.prototype.hasOwnProperty.call(OFFICE_ENV, office)
    ? OFFICE_ENV[office]
    : null;
  const specific = key ? process.env[key] : null;
  return (specific && specific.trim()) || process.env.MAIL_TO || '';
}

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/** True when a transport is configured and has everything it needs. */
function isConfigured() {
  const mode = (process.env.MAIL_TRANSPORT || '').toLowerCase();
  if (mode === 'graph') {
    return Boolean(process.env.GRAPH_TENANT_ID && process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET && process.env.MAIL_SENDER && process.env.MAIL_TO);
  }
  if (mode === 'webhook') return Boolean(process.env.FORM_WEBHOOK_URL);
  return false;
}

/* ---------------------------------------------------------------- *
 * Microsoft Graph (client credentials)
 * ---------------------------------------------------------------- */

async function graphToken() {
  const tenant = encodeURIComponent(process.env.GRAPH_TENANT_ID);
  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const t = withTimeout(null, TIMEOUT_MS);
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: t.signal
    });
    if (!res.ok) throw new Error('token endpoint returned ' + res.status);
    const json = await res.json();
    if (!json.access_token) throw new Error('no access_token in token response');
    return json.access_token;
  } finally {
    t.done();
  }
}

async function sendViaGraph(message) {
  const token = await graphToken();
  const sender = process.env.MAIL_SENDER;
  const recipients = recipientsFor(message.office).split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));

  if (!recipients.length) throw new Error('no recipients configured');

  const payload = {
    message: {
      subject: message.subject,
      body: { contentType: 'Text', content: message.text },
      toRecipients: recipients,
      // replyTo is the visitor, so staff can reply straight to them. The
      // address has already been format-checked and rejected for CRLF.
      replyTo: message.replyTo
        ? [{ emailAddress: { address: message.replyTo } }]
        : undefined
    },
    saveToSentItems: true
  };

  const t = withTimeout(null, TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: t.signal
      }
    );
    if (!res.ok && res.status !== 202) {
      throw new Error('graph sendMail returned ' + res.status);
    }
  } finally {
    t.done();
  }
}

/* ---------------------------------------------------------------- *
 * Generic webhook (Power Automate, Zapier, an internal service…)
 * ---------------------------------------------------------------- */

async function sendViaWebhook(message) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.FORM_WEBHOOK_SECRET) {
    headers['X-Webhook-Secret'] = process.env.FORM_WEBHOOK_SECRET;
  }

  // The office and its resolved mailbox are passed on so the receiving flow can
  // route without having to know the mapping itself.
  const payload = Object.assign({}, message, { to: recipientsFor(message.office) });

  const t = withTimeout(null, TIMEOUT_MS);
  try {
    const res = await fetch(process.env.FORM_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: t.signal
    });
    if (!res.ok) throw new Error('webhook returned ' + res.status);
  } finally {
    t.done();
  }
}

/* ---------------------------------------------------------------- *
 * Message construction
 * ---------------------------------------------------------------- */

/** Build the message. Every value that lands in a header goes through
 *  headerValue(), which flattens newlines and bounds the length — a second
 *  line of defence behind the per-field CRLF rejection in validate.js. */
function buildMessage(kind, fields, labels) {
  const subjectBase = kind === 'feedback'
    ? 'Client feedback (website)'
    : 'Website enquiry';

  const who = fields.name || fields.fb_name || '';
  const office = fields.office || fields.fb_office || '';
  // The office goes in the subject so staff can see at a glance where an
  // enquiry was addressed, even once it has been forwarded on.
  let subject = who ? `${subjectBase} — ${who}` : subjectBase;
  if (office) subject += ` (${office})`;

  const lines = Object.keys(fields).map((key) => {
    const label = labels[key] || key;
    return `${label}: ${fields[key]}`;
  });

  return {
    kind,
    subject: headerValue(subject, 160),
    office: office || null,
    replyTo: headerValue(fields.email || fields.fb_email || '', 254) || null,
    text: lines.join('\n'),
    fields,
    receivedAt: new Date().toISOString()
  };
}

/** Deliver, or report that no transport is configured.
 *  Returns { sent: true } or { sent: false, reason: 'unconfigured' }.
 *  Throws only on a genuine delivery failure. */
async function deliver(message) {
  if (!isConfigured()) return { sent: false, reason: 'unconfigured' };

  const mode = (process.env.MAIL_TRANSPORT || '').toLowerCase();
  if (mode === 'graph') await sendViaGraph(message);
  else if (mode === 'webhook') await sendViaWebhook(message);
  else return { sent: false, reason: 'unconfigured' };

  return { sent: true };
}

module.exports = { isConfigured, buildMessage, deliver };
