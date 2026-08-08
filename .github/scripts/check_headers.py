#!/usr/bin/env python3
"""Guard rails for the host configs and the hashed inline JSON-LD.

Vercel is the deployment target, so vercel.json is authoritative. The other
host configs are kept for portability and must not drift away from it.

Fails if:
  * vercel.json has no CSP, or any other host config disagrees with it
  * the JSON-LD block differs between pages
  * the CSP does not allow the hash of the JSON-LD that is actually shipped
  * any page has regained an inline <script>, <style>, style="" or on* attribute
  * the CSP has been weakened, or a required directive removed
  * a non-asset file appears in the web root without being excluded from the
    Vercel deployment

Run locally with:  python3 .github/scripts/check_headers.py
"""
import base64
import fnmatch
import glob
import hashlib
import json
import os
import re
import sys

FAILURES = []


def fail(msg):
    FAILURES.append(msg)


# --- 1. Every host config must agree with vercel.json ---------------------
def csp_from(path):
    """Each host expresses the same policy in its own syntax."""
    if not os.path.exists(path):
        return None

    if path == 'vercel.json':
        try:
            cfg = json.load(open(path, encoding='utf-8'))
        except ValueError as exc:
            fail(f'vercel.json is not valid JSON: {exc}')
            return None
        for rule in cfg.get('headers', []):
            for header in rule.get('headers', []):
                if header.get('key', '').lower() == 'content-security-policy':
                    return header['value'].strip()
        return None

    text = open(path, encoding='utf-8').read()
    patterns = (
        r'<add name="Content-Security-Policy" value="([^"]+)"',   # web.config
        r'Header always set Content-Security-Policy "([^"]+)"',   # .htaccess
        r'^\s*Content-Security-Policy:\s*(.+)$',                  # _headers
    )
    for pat in patterns:
        m = re.search(pat, text, re.M)
        if m:
            return m.group(1).strip()
    return None


csp = csp_from('vercel.json')
if not csp:
    fail('no Content-Security-Policy found in vercel.json (the deploy target)')
    csp = ''

# Legacy configs are optional — delete them once Vercel is confirmed. While
# they exist they must match, or whoever reads them will be misled.
for legacy in ('_headers', '.htaccess', 'web.config'):
    if not os.path.exists(legacy):
        continue
    other = csp_from(legacy)
    if other is None:
        fail(f'{legacy} exists but has no Content-Security-Policy')
    elif csp and other != csp:
        fail(f'{legacy} disagrees with vercel.json on the CSP:\n'
             f'  vercel.json: {csp}\n'
             f'  {legacy}: {other}')


# --- 2. The JSON-LD must be identical everywhere and match the CSP hash ----
LD = re.compile(r'<script type="application/ld\+json">\n(.*?)\n</script>', re.S)
blocks = {}
for f in sorted(glob.glob('*.html')):
    m = LD.search(open(f, encoding='utf-8').read())
    if m:
        blocks[f] = m.group(1)

if not blocks:
    fail("no JSON-LD structured data found on any page")
elif len(set(blocks.values())) > 1:
    fail("the JSON-LD block is not identical across pages, so one CSP hash "
         "cannot cover them all: " + ", ".join(sorted(blocks)))
else:
    body = next(iter(blocks.values()))
    digest = base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode()
    if f"'sha256-{digest}'" not in csp:
        fail(f"the CSP does not allow the JSON-LD that is shipped.\n"
             f"  expected: 'sha256-{digest}'\n"
             f"  update script-src in _headers, .htaccess and web.config")


# --- 3. Nothing inline may creep back in ----------------------------------
# The CSP has no 'unsafe-inline' for either scripts or styles, so anything
# inline is not a style nit — it is a page that will visibly break in
# production. Catch it here rather than after deploying.
for f in sorted(glob.glob('*.html')):
    s = open(f, encoding='utf-8').read()
    s = LD.sub('', s)                       # the hashed block is allowed
    if '<script>' in s:
        fail(f"{f}: inline <script> block — the CSP will block it")
    if '<style' in s:
        fail(f"{f}: inline <style> block — the CSP will block it")
    for attr in sorted(set(re.findall(r'\son[a-z]+=', s))):
        fail(f"{f}: inline event handler '{attr.strip()}' — the CSP will block it")
    n_style = len(re.findall(r'\sstyle="', s))
    if n_style:
        fail(f"{f}: {n_style} inline style attribute(s) — the CSP will block them. "
             f"Run `python scripts/extract_styles.py` to move them into classes.")


# --- 4. The policy itself must not be weakened ----------------------------
for token, why in (("'unsafe-inline'", "defeats the point of the script/style policy"),
                   ("'unsafe-eval'", "re-enables eval() and Function()"),
                   ("'strict-dynamic'", "not needed here and widens script-src")):
    if token in csp:
        fail(f"CSP contains {token} — {why}")

for required, why in (("frame-ancestors 'none'", "clickjacking protection"),
                      ("object-src 'none'", "plugin/embed protection"),
                      ("base-uri 'self'", "stops <base> hijacking relative URLs"),
                      ("require-trusted-types-for 'script'", "DOM XSS sink protection")):
    if required not in csp:
        fail(f"CSP is missing `{required}` ({why})")


# --- 5. Nothing but page assets may be publicly reachable -----------------
# The repository root is the web root. On Vercel, every uploaded file is served,
# so anything here that is not a page asset must be excluded from the upload via
# .vercelignore — that is the only mechanism that produces a genuine 404
# (`redirects` emit a 3xx, `rewrites` serve the target with a 200).
PUBLIC_EXT = ('.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.svg',
              '.woff2', '.xml', '.txt', '.ico', '.webp')

# Consumed by the platform as configuration rather than served as content.
# Verify with curl after the first deploy that both actually 404.
PLATFORM_CONFIG = {'vercel.json', '.vercelignore'}

if not os.path.exists('.vercelignore'):
    ignore_lines = []
    fail('.vercelignore is missing — every tooling file in the repository root '
         'would be publicly downloadable on Vercel')
else:
    ignore_lines = [
        ln.strip() for ln in open('.vercelignore', encoding='utf-8').read().splitlines()
        if ln.strip() and not ln.strip().startswith('#')
    ]


def excluded_from_deploy(name):
    """Mirror .vercelignore matching: exact name, glob, or directory prefix."""
    for pattern in ignore_lines:
        p = pattern.rstrip('/')
        if name == p or fnmatch.fnmatch(name, p):
            return True
        if pattern.endswith('/') and name.startswith(p + '/'):
            return True
    return False


for name in sorted(os.listdir('.')):
    if os.path.isdir(name):
        continue
    if name.lower().endswith(PUBLIC_EXT) or name in PLATFORM_CONFIG:
        continue
    if not excluded_from_deploy(name):
        fail(f"{name} sits in the web root but is not excluded in .vercelignore — "
             f"it would be publicly downloadable")

# _redirects only matters while the Netlify/Cloudflare config is still around.
if os.path.exists('_redirects'):
    redirects = open('_redirects', encoding='utf-8').read()
    for name in sorted(os.listdir('.')):
        if os.path.isdir(name) or name.lower().endswith(PUBLIC_EXT) or name in PLATFORM_CONFIG:
            continue
        if ('/' + name) not in redirects:
            fail(f"{name} is not blocked in _redirects (legacy Netlify/Cloudflare config)")


# --- Report ---------------------------------------------------------------
if FAILURES:
    print("Header/CSP checks failed:\n")
    for msg in FAILURES:
        print(" - " + msg)
    sys.exit(1)

legacy_present = [p for p in ('_headers', '.htaccess', 'web.config') if os.path.exists(p)]
print("Header/CSP checks passed.")
print(f"  vercel.json CSP matches {len(legacy_present)} legacy host config(s)")
print(f"  JSON-LD identical across {len(blocks)} pages and allowed by the CSP")
print("  no inline scripts, styles or on* handlers")
print("  web root contains no unexcluded non-asset files")
