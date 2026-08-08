# Security

## Reporting a vulnerability

Email **york@hague-dixon.co.uk** with "Security" in the subject line. Please
include enough detail to reproduce the issue. We will acknowledge within five
working days.

Please do not run automated scanners against the live site, attempt denial of
service, or access data belonging to anyone else. The machine-readable version
of this contact lives at `/.well-known/security.txt`.

---

## What protects this site today

It is a static site: HTML, CSS and one JavaScript file, with no server-side
execution, no database, no accounts and no file uploads. That removes most of
the usual attack surface outright — there is nothing to inject SQL into, no
session to steal, no authorisation to bypass.

What remains is enforced by response headers. `vercel.json` is authoritative
(Vercel is the deploy target); `_headers`, `.htaccess` and `web.config` are kept
for portability and must carry the identical policy:

| Header | What it does here |
| --- | --- |
| `Content-Security-Policy` | No `'unsafe-inline'` for scripts **or** styles. Trusted Types blocks every HTML-parsing sink. `frame-ancestors 'none'` prevents clickjacking. |
| `Strict-Transport-Security` | Forces HTTPS for a year, including subdomains. |
| `X-Content-Type-Options` | Stops MIME sniffing. |
| `Referrer-Policy` | No path or query data leaks to other origins. |
| `Permissions-Policy` | Camera, microphone, geolocation, payment and the rest are switched off. |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | Isolates the browsing context. |

`.github/scripts/check_headers.py` runs in CI and fails the build if those
configs drift apart, if the policy is weakened, if an inline script, inline
style or `on*` attribute reappears, or if a non-asset file lands in the web root
without being excluded in `.vercelignore`.

`.github/scripts/csp-smoke-test.js` then loads every page in a browser under the
policy from `vercel.json`, and `.github/scripts/api-smoke-test.js` fires
malformed, oversized, CRLF-injected and cross-origin payloads at the two form
endpoints. Both run in CI.

**No third-party requests.** Fonts and images are served from this domain.
Loading a page contacts nobody but us — verified in CI.

---

## What is NOT protected, and where it has to be

**There is no rate limiting, and a static site cannot provide any.** The
20-second throttle and honeypot in `script.js` reduce accidental double
submissions and background bot spam. They are trivially bypassed with `curl` and
are not security controls.

Rate limiting has to be enforced somewhere the visitor does not control:

1. **At the edge — the Vercel WAF.** A custom rule scoped to `/api/*` is the
   rate limit for this site. It is **not yet configured**; until it is, the form
   endpoints have none. Suggested starting point: 5 requests per IP per hour on
   `/api/*`, action "deny".
2. **In the endpoint.** `/api/contact` and `/api/feedback` re-validate every
   field, cap the body at 16 KB, check the request origin and reject CRLF in any
   field bound for an email header. They deliberately do **not** rate limit —
   that is the WAF's job — but they are written to sit behind one: stateless,
   with the cheap rejections before any parsing.

`docs/form-endpoint-example.js` is the earlier Cloudflare Worker reference,
kept because it shows the rate-limiting shape the WAF rule replaces.

---

## DNS records to put in place

These cannot be set from this repository — they need registrar and DNS access.
Without them anyone can send email that appears to come from
`@hague-dixon.co.uk`, which matters more than usual for a law firm: convincing
spoofed completion-statement emails are the standard conveyancing fraud.

### SPF — who may send mail as this domain

One TXT record on the apex. Microsoft 365 is assumed, since the client feedback
survey is hosted on Microsoft Forms — **confirm the mail provider before
publishing this**, and add any third party that sends on your behalf.

```
Type: TXT
Name: @
Value: v=spf1 include:spf.protection.outlook.com -all
```

`-all` is a hard fail. Start with `~all` (soft fail) for a week, check the DMARC
reports for legitimate senders you have missed, then tighten to `-all`.

### DKIM — cryptographic signing

Enable in the Microsoft 365 Defender portal (Email & collaboration → Policies →
Email authentication → DKIM), then publish the two CNAMEs it gives you:

```
Type: CNAME   Name: selector1._domainkey   Value: <supplied by Microsoft>
Type: CNAME   Name: selector2._domainkey   Value: <supplied by Microsoft>
```

### DMARC — what to do with mail that fails the above

Start in monitor-only mode so nothing legitimate is lost:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@hague-dixon.co.uk; fo=1; adkim=s; aspf=s
```

Read the aggregate reports for a few weeks, confirm every legitimate sender
passes, then move to `p=quarantine` and finally `p=reject`. **`p=none` provides
no protection on its own** — it is a diagnostic step, not a destination.

### CAA — which authorities may issue certificates for this domain

Stops any other CA issuing a certificate for `hague-dixon.co.uk`. Set the value
to match whoever actually issues yours (Let's Encrypt shown):

```
Type: CAA   Name: @   Value: 0 issue "letsencrypt.org"
Type: CAA   Name: @   Value: 0 iodef "mailto:york@hague-dixon.co.uk"
```

### Registrar account

Enable MFA on the registrar and DNS accounts, and turn on domain transfer lock.
A domain takeover defeats every control listed above.

---

## Periodic checks

| Frequency | Check |
| --- | --- |
| On every push | CI: HTML validity, links, accessibility, header/CSP guard |
| Monthly | Headers still present: `curl -sI https://www.hague-dixon.co.uk/` |
| Monthly | DMARC aggregate reports |
| Quarterly | Certificate expiry and renewal automation |
| Quarterly | Review `.well-known/security.txt` — the `Expires` field must be in the future |
| Annually | Review this document and the privacy notice |

The `Expires` date in `security.txt` is one year out. A stale value makes the
file invalid under RFC 9116, so renew it as part of the annual review.
