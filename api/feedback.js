/* POST /api/feedback — the client feedback form on feedback.html.
 *
 * Rate limiting is handled by a Vercel WAF custom rule scoped to /api/*, not
 * here. See api/_lib/handler.js for the request pipeline and
 * api/_lib/validate.js for the authoritative field limits.
 *
 * This form carries more sensitive material than the enquiry form: it can
 * identify someone as a client of a particular service, including family law.
 * Nothing is logged beyond the outcome — see the catch block in handler.js.
 */
'use strict';

const { makeHandler } = require('./_lib/handler');
const { FEEDBACK_FIELDS } = require('./_lib/validate');

const LABELS = {
  fb_name: 'Name',
  fb_email: 'Email',
  fb_office: 'Office used',
  fb_service: 'Service',
  overall: 'Overall satisfaction (1-5)',
  quality: 'Quality of legal advice (1-5)',
  comms: 'Communication (1-5)',
  timing: 'Timeliness and efficiency (1-5)',
  value: 'Value for money (1-5)',
  recommend: 'Would recommend',
  fb_well: 'What we did well',
  fb_improve: 'What we could improve',
  fb_perm: 'Consent to quote feedback'
};

module.exports = makeHandler({
  kind: 'feedback',
  schema: FEEDBACK_FIELDS,
  labels: LABELS
});
