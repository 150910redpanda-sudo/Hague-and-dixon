/* POST /api/contact — the enquiry form on contact.html.
 *
 * Rate limiting is handled by a Vercel WAF custom rule scoped to /api/*, not
 * here. See api/_lib/handler.js for the request pipeline and
 * api/_lib/validate.js for the authoritative field limits.
 */
'use strict';

const { makeHandler } = require('./_lib/handler');
const { CONTACT_FIELDS } = require('./_lib/validate');

/* Labels for the email body, so the message reads the way the form did. */
const LABELS = {
  name: 'Name',
  email: 'Email',
  phone: 'Telephone',
  topic: 'How can we help',
  msg: 'Message'
};

module.exports = makeHandler({
  kind: 'contact',
  schema: CONTACT_FIELDS,
  labels: LABELS
});
