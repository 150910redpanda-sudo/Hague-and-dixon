# Hague & Dixon LLP — website

A static brochure site for Hague & Dixon LLP, solicitors in York, Stamford Bridge
and Pickering. Plain HTML, CSS and JavaScript — no build step, no framework, no
backend, no database.

## Layout

```
Served to visitors
  *.html                 20 content pages + 404.html
  style.css              the whole design system
  script.js              all site behaviour (no inline scripts anywhere)
  assets/fonts.css       @font-face for the self-hosted fonts
  assets/fonts/*.woff2   Fraunces, Hanken Grotesk, Pinyon Script (OFL 1.1)
  assets/img/            logos, accreditation badges, team photographs
  assets/no-js.css       loaded via <noscript>; see "No JavaScript" below
  *.jpg                  the three office photographs
  robots.txt             crawler directives (nothing disallowed, by design)
  sitemap.xml            XML sitemap for search engines
  .well-known/security.txt  vulnerability disclosure contact (RFC 9116)

Host configuration — same policies, three syntaxes; keep them in sync
  _headers               headers for Netlify / Cloudflare Pages
  _redirects             path blocking for Netlify / Cloudflare Pages
  .htaccess              headers + path blocking for Apache / cPanel
  web.config             headers + path blocking for IIS / Windows

Not served — blocked by all of the above
  README.md, SECURITY.md      documentation
  package.json, package-lock.json, .pa11yci, .htmlvalidate.json
  .github/                    CI workflow and its guard scripts
  scripts/extract_styles.py   inline-style extractor
  docs/                       reference form endpoint (not deployed)
```

Anything you add to the repository root that is not a page asset **must** be
listed in `_redirects` — `npm run check:headers` fails otherwise, because on a
static host the repository root is the web root.

## Running it locally

```sh
npm ci        # restores the pinned tooling from package-lock.json
npm start     # serves on http://127.0.0.1:8099
```

Opening the `.html` files directly with `file://` mostly works, but the fonts
and the 404 page will not resolve properly.

The site itself has **no runtime dependencies** — nothing in `node_modules`
reaches a visitor. It is all checking tooling.

## Checks

```sh
npm run check          # html + headers + csp + accessibility
npm run check:links    # needs `npm start` running in another shell
npm audit              # known vulnerabilities in the tooling
```

All of these run in CI on every push and pull request. `npm ci` (not
`npm install`) is used there so the build resolves to exactly what
`package-lock.json` pins.

## Deploying

**Vercel.** `vercel.json` is authoritative — it carries the security headers,
the cache policy and the function config. The repository root is the web root.

`.vercelignore` decides what is *not* published. This matters: on Vercel every
uploaded file is served, so the CI scripts, `package.json` and any source
archive would be publicly downloadable without it. It is also the only mechanism
that gives a genuine 404 — `redirects` emit a 3xx and `rewrites` serve the
target with a 200. Add anything non-asset you put in the root, or
`npm run check:headers` fails.

`_headers`, `_redirects`, `.htaccess` and `web.config` are kept for portability
and must not drift from `vercel.json`; the guard enforces that. Delete them once
Vercel is confirmed.

### Environment variables

Set in the Vercel project (Production and Preview):

| Variable | Purpose |
| --- | --- |
| `MAIL_TRANSPORT` | `graph` (Microsoft 365) or `webhook`. Unset = forms return 503 and fall back to the visitor's mail client. |
| `ALLOWED_ORIGINS` | Extra origins allowed to POST, comma-separated. The canonical domain is always allowed. |
| `GRAPH_TENANT_ID` `GRAPH_CLIENT_ID` `GRAPH_CLIENT_SECRET` | Graph app registration (`Mail.Send` application permission, admin-consented). |
| `MAIL_SENDER` | Mailbox the mail is sent *from*. Must pass SPF/DKIM — see `SECURITY.md`. |
| `MAIL_TO` | Where submissions are delivered, comma-separated. Used for feedback, and as the fallback for any office below that is not set. |
| `MAIL_TO_YORK` `MAIL_TO_STAMFORD_BRIDGE` `MAIL_TO_PICKERING` | Optional per-office mailboxes for the contact form's office picker, comma-separated. Unset offices fall back to `MAIL_TO`. The visitor's choice is only ever a key into this list — a submitted address is never used as a recipient. |
| `FORM_WEBHOOK_URL` `FORM_WEBHOOK_SECRET` | For `MAIL_TRANSPORT=webhook`. |

### Rate limiting

**Not implemented in the functions, by design.** It is a Vercel WAF custom rule
scoped to `/api/*`. Configure it before launch — without it the endpoints have
no rate limit at all. The handlers are written to sit behind one: stateless, and
the cheap rejections (method, origin, content type, size) run before any parsing.

### After the first deploy, verify

```sh
curl -sI https://www.hague-dixon.co.uk/ | grep -i "content-security\|strict-transport\|x-frame"
curl -s -o /dev/null -w "%{http_code}
" https://www.hague-dixon.co.uk/package.json          # expect 404
curl -s -o /dev/null -w "%{http_code}
" https://www.hague-dixon.co.uk/hague-dixon-A_original.zip  # expect 404
curl -s -o /dev/null -w "%{http_code}
" https://www.hague-dixon.co.uk/vercel.json           # expect 404
curl -s -X POST https://www.hague-dixon.co.uk/api/contact -H 'Content-Type: application/json' -d '{}'  # expect 403 (no Origin)
```

`vercel.json` and `.vercelignore` are consumed as configuration rather than
served, but confirm that rather than assume it.

### Rollback

There is no build artefact, so rolling back is just redeploying the previous
commit:

```sh
git log --oneline          # find the last good commit
git revert <bad-commit>    # or: git checkout <good-commit> -- .
```

Then redeploy. Confirm the homepage, the contact page and one service page load
before you walk away.

## Content Security Policy

The policy carries **no `'unsafe-inline'` for scripts or styles**, and switches
on Trusted Types:

```
default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self';
img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self';
frame-ancestors 'none'; base-uri 'self'; object-src 'none';
upgrade-insecure-requests; require-trusted-types-for 'script'; trusted-types 'none'
```

That imposes three rules on anything you add:

1. **No inline `<script>`, no `on*` attributes.** All behaviour goes in
   `script.js`.
2. **No `style="..."` attributes and no inline `<style>`.** Styles go in
   `style.css`. If you inherit markup carrying them, run `npm run
   extract-styles` — it moves each one into a generated utility class at the
   bottom of `style.css`, verified to leave rendering pixel-identical.
3. **No `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`.**
   Trusted Types blocks these at the browser level. Build nodes with
   `createElement` and `textContent` — `script.js` has an `el()` helper. Do not
   "fix" a Trusted Types error by creating a permissive policy.

Two commands enforce this:

```sh
npm run check:headers   # static: configs agree, policy not weakened, nothing inline
npm run check:csp       # dynamic: loads every page under the real CSP, fails on violations
```

The second matters most — a policy can be perfectly well-formed and still break
the live site. Only a browser enforcing it proves otherwise.

### The one hashed exception

The JSON-LD structured-data block is inline and allowed by SHA-256 hash. It is
byte-identical on every page. **If you edit it you must recompute the hash** and
update all three header files. `npm run check:headers` fails until you do, and
prints the expected value:

```sh
python - <<'PY'
import re, hashlib, base64
s = open('index.html', encoding='utf-8').read()
body = re.search(r'<script type="application/ld\+json">\n(.*?)\n</script>', s, re.S).group(1)
print("'sha256-" + base64.b64encode(hashlib.sha256(body.encode()).digest()).decode() + "'")
PY
```

See `SECURITY.md` for the full header set, the DNS records still to be put in
place, and where rate limiting has to live.

## Forms

Both forms (`contact.html`, `feedback.html`) are wired through `bindForm()` in
`script.js`. They validate, throttle, and carry a honeypot field.

`FORM_ENDPOINT` at the top of `script.js` is **empty**. While it is empty, both
forms fall back to opening the visitor's own email client with the details
pre-filled, and say so on the page — they never claim a submission was received
when it was not.

To make them submit properly, set `FORM_ENDPOINT` to a URL that accepts a JSON
`POST`, then add that origin to `connect-src` in all three header files or the
CSP will block the fetch.

**None of the client-side checks are security controls.** The 20-second
throttle, the honeypot and the `MAX` field lengths all live in the visitor's
browser and are bypassed by a single `curl`. They exist to stop accidental
double-submissions and casual bot spam.

Whatever `FORM_ENDPOINT` points at must independently re-validate every field,
cap lengths, and rate limit by IP. `docs/form-endpoint-example.js` is a
reference implementation with those controls; `SECURITY.md` explains why they
cannot live here.

## No JavaScript

The scroll-reveal effect starts every `[data-reveal]` element at `opacity: 0`.
Without `script.js` nothing ever adds `.in`, so **the whole page renders blank —
including every `<h1>`**. `assets/no-js.css` is loaded through `<noscript>` and
reverses that, hides the burger menu (which needs JS), and swaps both forms for
a panel of phone numbers and email addresses.

A `<noscript><link>` is used rather than `<noscript><style>` because the CSP has
no `'unsafe-inline'` for styles. Test it by disabling JavaScript in devtools —
every page must still show its content, and neither form may present a button
that silently does nothing.


## Accessibility

The site targets WCAG 2.2 AA. Things that are easy to break:

- every page needs the skip link and a `<main id="main">` landmark
- `:focus-visible` styling lives at the bottom of `style.css` — don't add
  `outline: none` anywhere
- team cards on `team.html` are keyboard-operable via `role="button"` wiring in
  `script.js`; they must stay reachable by Tab, Enter and Space
- the testimonial marquee needs its pause control (WCAG 2.2.2)
- every `<img>` needs `alt`, plus `width` and `height` to avoid layout shift

Test with the keyboard alone before shipping any change to navigation, forms or
the team modal.

### About the automated audit

`npx pa11y-ci` runs both the `axe` and `htmlcs` engines against every page and
must stay at 20/20. Two deliberate exclusions are configured in `.pa11yci`, both
because the tool cannot evaluate the page rather than because a rule was
inconvenient:

- **`ignore: ["color-contrast"]`** turns off *axe's* contrast rule only. axe
  cannot resolve a background colour behind the gradient hero sections and
  reports every element over one as a failure. `htmlcs` still checks contrast
  and reports exact ratios — it is what caught the genuine 3.32:1 failure on the
  header's office labels. Contrast is still gated.
- **`hideElements: ".cookie-banner"`** — the banner is `position: fixed` and
  overlaps page content, which defeats background resolution for both the banner
  and whatever sits under it. Its own ratios were checked by calculation:
  body text 9.85:1, link 5.01:1, accept button 5.53:1.

If you change any colour in `:root`, re-check it by hand. `--brass` (`#b58a4e`)
is **not** readable as small text on the header — that is what `--brass-light`
is for. `--brass-deep` sits at 5.06:1 on the darkest light ground, so there is
not much headroom.

## SRA compliance

The regulatory content is deliberately spread across three places, and they
have to stay consistent with each other:

- **`costs.html`** — the SRA Transparency Rules content. Price, basis of charge,
  disbursements, VAT, **key stages**, **typical timescales**, which funding
  arrangements are and are not offered, and who does the work. Rules 1.4 and 1.5
  require all of it for conveyancing, uncontested probate and Employment
  Tribunal claims, which are the three published-price services this firm
  offers. If a fee changes, the worked examples in the Employment section are
  derived from the hourly rates and must be recalculated too.
- **`legal.html`** — complaints, the Legal Ombudsman, the SRA reporting route,
  professional indemnity insurance, and client money.
- **The footer of every page** — the SRA digital badge, required by Rule 4 to be
  "in a prominent place". `.foot-sra` carries the firm's own validation URL.

Two things here go stale on someone else's schedule, so check them when you
touch this area:

- **The Legal Ombudsman's address.** It moved to PO Box 6167, Slough SL1 0EH in
  January 2024. The site carried the old Wolverhampton address until now.
- **Time limits and fees.** The LeO six-month/one-year limits, the Solicitors
  Act assessment periods, the probate application fee and the Land Registry
  scale are all set by third parties.

The EU ODR platform reference was removed — that platform shut down on 20 July
2025 and traders are no longer required, or able, to link to it.

## Staff qualifications

`team.html` carries a qualification line on each card and a fuller statement in
the profile modal, fed by `data-tm-quals` on the `.member` element. `costs.html`
has the matching "Who Will Do Your Work" section the SRA Transparency Rules
require.

**Everything currently published there is derived from the role the firm already
advertises** — that a director or assistant solicitor at an SRA-authorised firm
is an admitted solicitor, that a paralegal is supervised. No academic
qualification, admission date or SRA roll number is asserted anywhere, because
none is on record in this repository. If the firm supplies that detail, add it
to `data-tm-quals` and to the visible `.quals` line; the modal picks it up with
no further change. Nothing needs inventing to make the page render.

## Vacancies

`recruitment.html` currently shows a "no advertised vacancies" card. The markup
for a real vacancy is documented in an HTML comment directly above it — replace
that one card with a `.vacancy` block per role. Applications are addressed to
Dawn Taylor; if that changes, it appears in three places on the page.

## Things deliberately left for the firm to decide

See the launch notes for detail, but in short: the social preview image, the
service timescales and key stages on `costs.html`, the individual credentials
described above, the substantiation for the "5★ Client Rated" claim, and whether
the on-site feedback form or the Microsoft Forms survey is the one to keep.
