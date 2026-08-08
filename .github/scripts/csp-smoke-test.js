#!/usr/bin/env node
/* Load every page through a server that applies the real Content-Security-Policy
 * and fail on any violation.
 *
 * Reading the policy out of a config file proves it is well-formed. It does not
 * prove the site still works under it — a missing directive breaks the page only
 * once a browser enforces it. This exercises the interactive paths too: the
 * cookie banner, the team modal, and a form submission.
 *
 * Run locally with:  node .github/scripts/csp-smoke-test.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8123;

const TYPES = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json',
};

/* vercel.json is the deploy target, so that is the policy worth testing.
 * check_headers.py separately proves the legacy host configs still agree. */
function policyFromHeaders() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  for (const rule of cfg.headers || []) {
    for (const header of rule.headers || []) {
      if (String(header.key).toLowerCase() === 'content-security-policy') {
        return header.value.trim();
      }
    }
  }
  throw new Error('No Content-Security-Policy found in vercel.json');
}

function serve(csp) {
  return http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/') rel = '/index.html';
    const file = path.join(ROOT, rel);

    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
      return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(fs.readFileSync(file));
  });
}

(async () => {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('puppeteer is required: npm i -D puppeteer');
    process.exit(1);
  }

  const csp = policyFromHeaders();
  console.log('Policy under test:\n  ' + csp.split('; ').join('\n  ') + '\n');

  const server = serve(csp);
  await new Promise((r) => server.listen(PORT, r));

  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let failures = 0;

  for (const file of pages) {
    const page = await browser.newPage();
    const violations = [];

    page.on('console', (m) => {
      const text = m.text();
      if (/Content Security Policy|Trusted Type|Refused to/i.test(text)) {
        violations.push(text.slice(0, 200));
      }
    });
    page.on('pageerror', (e) => violations.push('PAGEERROR: ' + e.message.slice(0, 160)));

    await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // Exercise the paths that build DOM at runtime — these are what a strict
    // script-src and Trusted Types would break.
    const accept = await page.$('.cookie-accept');
    if (accept) await accept.click();

    const profile = await page.$('.member-more');
    if (profile) {
      await profile.click();
      await new Promise((r) => setTimeout(r, 400));
      await page.keyboard.press('Escape');
    }

    const submit = await page.$('form[data-hd-form] button[type=submit]');
    if (submit) {
      await submit.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    await new Promise((r) => setTimeout(r, 300));
    await page.close();

    if (violations.length) {
      failures += violations.length;
      console.error(`FAIL  ${file}`);
      violations.forEach((v) => console.error(`        ${v}`));
    } else {
      console.log(`ok    ${file}`);
    }
  }

  await browser.close();
  server.close();

  if (failures) {
    console.error(`\n${failures} CSP/Trusted Types violation(s). The policy would break the live site.`);
    process.exit(1);
  }
  console.log(`\nNo violations across ${pages.length} pages.`);
})();
