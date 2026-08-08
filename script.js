/* Hague & Dixon LLP — site behaviour.
 *
 * Everything is bound here rather than with inline on* attributes, so the site
 * can ship a Content-Security-Policy without 'unsafe-inline' on script-src.
 * Each module guards on the elements it needs and returns early otherwise, so
 * this one file is safe to load on every page.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * CONFIGURATION
   * ------------------------------------------------------------------ */

  /* Where submissions are sent. Each form names its own endpoint with a
   * data-endpoint attribute (/api/contact, /api/feedback); this is the default
   * for any form that does not.
   *
   * These are Vercel serverless functions in /api. They re-validate every
   * field — the client-side checks below are for immediate feedback only and
   * are not a security control. Rate limiting is a Vercel WAF rule scoped to
   * /api/*, not something this file or the functions implement.
   *
   * If the endpoint reports that no mail transport is configured (503 with
   * fallback:true), the form falls back to opening the visitor's own email
   * client rather than claiming a submission was received. */
  var FORM_ENDPOINT = '/api/contact';

  /* Analytics is off. When the firm chooses a provider, load it from
   * loadAnalytics() below; it is only ever called after opt-in consent. */
  var ANALYTICS_ID = '';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Build elements with DOM calls only. Nothing in this file assigns innerHTML,
   * which is what lets the CSP switch on Trusted Types — every HTML-parsing sink
   * is then blocked outright by the browser rather than by convention. */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------ *
   * IMAGE FALLBACKS  (replaces the old inline onerror= handlers)
   * ------------------------------------------------------------------ */

  function applyImageFallback(img) {
    var mode = img.getAttribute('data-fallback');
    if (mode === 'remove') {
      img.remove();
    } else if (mode === 'brand') {
      img.classList.add('is-hidden');
      var text = img.parentElement && img.parentElement.querySelector('.brand-text');
      if (text) text.classList.remove('is-hidden');
    } else {
      img.classList.add('is-hidden');
    }
  }

  $$('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () { applyImageFallback(img); });
    // The image may already have failed before this script parsed.
    if (img.complete && img.naturalWidth === 0) applyImageFallback(img);
  });

  /* ------------------------------------------------------------------ *
   * STICKY HEADER
   * ------------------------------------------------------------------ */

  var header = $('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('solid', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------ *
   * MOBILE MENU
   * ------------------------------------------------------------------ */

  var burger = $('.burger');
  var mobile = $('.mobile-menu');
  if (burger && mobile) {
    var setMenu = function (open) {
      mobile.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('no-scroll', open);
      if (!open) burger.focus();
    };
    burger.addEventListener('click', function () {
      setMenu(!mobile.classList.contains('open'));
    });
    $$('a', mobile).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobile.classList.contains('open')) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------ *
   * SCROLL REVEAL
   * ------------------------------------------------------------------ */

  var revealables = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    // Show everything at once rather than animating it in.
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ *
   * TESTIMONIAL MARQUEE — pause control (WCAG 2.2.2)
   * ------------------------------------------------------------------ */

  var marquee = $('.marquee');
  if (marquee && !reduceMotion) {
    var paused = false;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'marquee-pause';
    btn.textContent = 'Pause';
    btn.setAttribute('aria-label', 'Pause the scrolling testimonials');
    btn.addEventListener('click', function () {
      paused = !paused;
      marquee.classList.toggle('paused', paused);
      btn.textContent = paused ? 'Play' : 'Pause';
      btn.setAttribute('aria-label', paused
        ? 'Resume the scrolling testimonials'
        : 'Pause the scrolling testimonials');
    });
    marquee.appendChild(btn);
  }

  /* ------------------------------------------------------------------ *
   * FOOTER YEAR
   * ------------------------------------------------------------------ */

  $$('#yr').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------ *
   * COOKIE CONSENT
   *
   * The site currently sets no analytics or advertising cookies at all, so
   * nothing non-essential is stored unless and until a provider is configured
   * above. The visitor's choice is recorded in localStorage, which is
   * "strictly necessary" under PECR because it exists solely to remember that
   * choice and to stop us asking again.
   * ------------------------------------------------------------------ */

  var KEY = 'hd-cookie-consent';

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function loadAnalytics() {
    if (!ANALYTICS_ID) return;      // nothing configured — nothing to load
    /* Insert the analytics provider's snippet here. It must only ever be
     * called from applyConsent() below, i.e. after an explicit opt-in. */
  }

  function applyConsent(consent) {
    if (consent && consent.analytics) loadAnalytics();
  }

  function setConsent(analytics) {
    var consent = {
      essential: true,
      analytics: !!analytics,
      date: new Date().toISOString()
    };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch (e) { /* private mode */ }
    applyConsent(consent);
    return consent;
  }

  function clearConsent() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  window.HDCookies = { getConsent: getConsent, setConsent: setConsent, clearConsent: clearConsent };

  (function cookieBanner() {
    var existing = getConsent();
    if (existing) { applyConsent(existing); return; }

    var banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie choices');

    var inner = el('div', 'wrap cookie-banner-inner');
    var copy = el('p');
    copy.append(
      'This site uses only the storage strictly necessary to remember this choice. ' +
      'We do not currently run analytics or advertising cookies. If we introduce ' +
      'analytics in future we will only use it if you accept below. ');
    var policyLink = el('a', null, 'Read our cookie policy');
    policyLink.setAttribute('href', 'cookies.html');
    copy.append(policyLink, '.');

    var btns = el('div', 'cookie-banner-btns');
    var essential = el('button', 'btn ghost-light cookie-essential', 'Essential only');
    essential.type = 'button';
    var accept = el('button', 'btn cookie-accept', 'Accept analytics ');
    accept.type = 'button';
    accept.appendChild(el('span', 'arr', '→'));
    btns.append(essential, accept);

    inner.append(copy, btns);
    banner.appendChild(inner);
    document.body.appendChild(banner);

    if (!reduceMotion) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { banner.classList.add('in'); });
      });
    } else {
      banner.classList.add('in');
    }

    var lastFocus = document.activeElement;
    function dismiss() {
      banner.classList.remove('in');
      window.setTimeout(function () { banner.remove(); }, reduceMotion ? 0 : 500);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $('.cookie-accept', banner).addEventListener('click', function () { setConsent(true); dismiss(); });
    $('.cookie-essential', banner).addEventListener('click', function () { setConsent(false); dismiss(); });
  })();

  /* Cookie preferences panel on cookies.html */
  (function cookiePrefs() {
    var statusEl = $('#cookie-status');
    if (!statusEl) return;

    var acceptBtn = $('#cookie-pref-accept');
    var essentialBtn = $('#cookie-pref-essential');
    var withdrawBtn = $('#cookie-pref-withdraw');

    function renderStatus() {
      var consent = getConsent();
      if (!consent) {
        statusEl.textContent = 'You have not made a choice yet — you will be asked on your next visit.';
        return;
      }
      statusEl.textContent =
        'Your current choice — Essential: always on · Analytics: ' +
        (consent.analytics ? 'accepted' : 'declined') +
        ' (recorded ' + new Date(consent.date).toLocaleDateString('en-GB') + ').';
    }

    if (acceptBtn) acceptBtn.addEventListener('click', function () { setConsent(true); renderStatus(); });
    if (essentialBtn) essentialBtn.addEventListener('click', function () { setConsent(false); renderStatus(); });
    if (withdrawBtn) withdrawBtn.addEventListener('click', function () { clearConsent(); renderStatus(); });
    renderStatus();
  })();

  /* ------------------------------------------------------------------ *
   * FORMS
   *
   * Client-side validation here is a convenience only. It is NOT a security
   * control: whatever endpoint FORM_ENDPOINT points at must validate, length-
   * limit and rate-limit every field again on the server.
   * ------------------------------------------------------------------ */

  var MAX = { name: 100, email: 254, phone: 40, text: 4000 };

  function fieldWrap(el) { return el.closest('.field') || el.parentElement; }

  function clearError(el) {
    el.removeAttribute('aria-invalid');
    var wrap = fieldWrap(el);
    var msg = wrap && wrap.querySelector('.field-error');
    if (msg) msg.remove();
  }

  function showError(el, message) {
    var wrap = fieldWrap(el);
    if (!wrap) return;
    clearError(el);
    var id = (el.id || 'field') + '-error';
    var msg = document.createElement('p');
    msg.className = 'field-error';
    msg.id = id;
    msg.textContent = message;
    wrap.appendChild(msg);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', id);
  }

  function validate(form) {
    var errors = [];
    $$('input, textarea, select', form).forEach(clearError);

    $$('[data-required]', form).forEach(function (el) {
      if (!el.value.trim()) {
        showError(el, 'This field is required.');
        errors.push(el);
      }
    });

    $$('input[type=email]', form).forEach(function (el) {
      var v = el.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        showError(el, 'Please enter a valid email address, for example jane@example.com.');
        errors.push(el);
      }
    });

    $$('input, textarea', form).forEach(function (el) {
      var limit = el.type === 'email' ? MAX.email
        : el.type === 'tel' ? MAX.phone
          : el.tagName === 'TEXTAREA' ? MAX.text : MAX.name;
      if (el.value.length > limit) {
        showError(el, 'Please keep this under ' + limit + ' characters.');
        errors.push(el);
      }
    });

    return errors;
  }

  function collect(form) {
    var data = {};
    $$('input, textarea, select', form).forEach(function (el) {
      if (el.type === 'submit' || el.type === 'button') return;
      var key = el.name || el.id;
      if (!key) return;
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; return; }
      if (el.type === 'checkbox') { data[key] = el.checked ? 'Yes' : 'No'; return; }
      if (el.value.trim()) data[key] = el.value.trim();
    });
    return data;
  }

  function labelFor(form, key) {
    var el = form.querySelector('#' + CSS.escape(key)) ||
      form.querySelector('[name="' + CSS.escape(key) + '"]');
    if (!el) return key;
    var lab = el.id && form.querySelector('label[for="' + CSS.escape(el.id) + '"]');
    if (lab) return lab.textContent.trim();
    var group = el.closest('.q-block');
    var q = group && group.querySelector('.qlabel');
    return q ? q.textContent.trim() : key;
  }

  function statusRegion(form) {
    var el = form.querySelector('.form-status');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      form.appendChild(el);
    }
    return el;
  }

  function mailtoFallback(form, data) {
    var to = form.getAttribute('data-mailto') || 'york@hague-dixon.co.uk';
    var subject = form.getAttribute('data-subject') || 'Website enquiry';
    var lines = Object.keys(data).map(function (k) {
      return labelFor(form, k) + ': ' + data[k];
    });
    return 'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function bindForm(form) {
    var status = statusRegion(form);
    var submit = form.querySelector('button[type=submit], button:not([type])');

    // Honeypot: a field no human sees. Bots fill it; we drop those quietly.
    var potId = form.id + '-hp';
    var pot = el('div', 'hp-field');
    pot.setAttribute('aria-hidden', 'true');
    var potLabel = el('label', null, 'Leave this field empty');
    potLabel.setAttribute('for', potId);
    var honeypot = el('input');
    honeypot.id = potId;
    honeypot.name = 'website';
    honeypot.type = 'text';
    honeypot.tabIndex = -1;
    honeypot.autocomplete = 'off';
    pot.append(potLabel, honeypot);
    form.insertBefore(pot, form.firstChild);

    /* Submission throttle — one per form per 20 seconds.
     *
     * This is NOT a rate limit and must never be relied on as one. It lives in
     * the visitor's own browser, so anyone can defeat it by disabling
     * JavaScript or posting directly. It exists to stop accidental
     * double-submissions and casual bot noise.
     *
     * Real rate limiting has to be enforced at FORM_ENDPOINT and/or at the CDN
     * edge. See SECURITY.md and docs/form-endpoint-example.js.
     *
     * sessionStorage rather than a closure variable, so a page reload does not
     * reset it. */
    var throttleKey = 'hd-last-submit-' + form.id;

    function lastSubmitAt() {
      try { return Number(sessionStorage.getItem(throttleKey)) || 0; }
      catch (e) { return 0; }
    }
    function markSubmitted(t) {
      try { sessionStorage.setItem(throttleKey, String(t)); } catch (e) { /* private mode */ }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';

      if (honeypot.value) return;                 // bot — pretend nothing happened

      var now = Date.now();
      if (now - lastSubmitAt() < 20000) {
        status.classList.add('is-error');
        status.textContent = 'Please wait a few seconds before submitting again.';
        return;
      }

      var errors = validate(form);
      if (errors.length) {
        status.classList.add('is-error');
        status.textContent = 'Please check the ' + errors.length +
          ' highlighted ' + (errors.length === 1 ? 'field' : 'fields') + ' and try again.';
        errors[0].focus();
        return;
      }

      var data = collect(form);
      delete data.website;
      markSubmitted(now);

      var endpoint = form.getAttribute('data-endpoint') || FORM_ENDPOINT;

      function useMailClient(reason) {
        window.location.href = mailtoFallback(form, data);
        status.className = 'form-status is-info';
        status.textContent = reason + ' Your email program should now open with ' +
          'these details ready to send. If nothing opened, please call your ' +
          'nearest office or email us directly.';
      }

      if (!endpoint) {
        useMailClient('This form is not connected yet.');
        return;
      }

      if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
      status.textContent = 'Sending…';

      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 15000);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (payload) {
          return { res: res, payload: payload };
        });
      }).then(function (r) {
        // The endpoint tells us when no mail transport is configured. Hand off
        // to the visitor's mail client rather than reporting a false success
        // or a dead end.
        if (r.res.status === 503 && r.payload && r.payload.fallback) {
          useMailClient('This form is not connected yet.');
          return;
        }
        if (!r.res.ok) {
          status.classList.add('is-error');
          status.textContent = (r.payload && r.payload.error) ||
            'Sorry, we could not send that just now. Please try again, or call ' +
            'your nearest office — the numbers are at the top of this page.';
          return;
        }
        form.reset();
        status.classList.add('is-success');
        status.textContent = 'Thank you — your message has been sent. ' +
          'We will be in touch shortly.';
      }).catch(function () {
        status.classList.add('is-error');
        status.textContent = 'Sorry, we could not send that just now. ' +
          'Please try again, or call your nearest office — the numbers are at the top of this page.';
      }).finally(function () {
        window.clearTimeout(timeout);
        if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
      });
    });
  }

  $$('form[data-hd-form]').forEach(bindForm);

  /* ------------------------------------------------------------------ *
   * TEAM PROFILE MODAL  (team.html)
   * ------------------------------------------------------------------ */

  (function teamModal() {
    var modal = $('#tmModal');
    if (!modal) return;

    var closeBtn = $('#tmClose');
    var card = $('.tm-card', modal);
    var lastFocus = null;

    function open(cardEl) {
      var d = cardEl.dataset;

      $('#tmName').textContent = d.tmName || '';
      $('#tmTitle').textContent = d.tmRole || '';
      $('#tmOfficeTag').textContent = d.tmOffice || '';

      var bio = $('#tmBio');
      bio.textContent = d.tmBio || '';
      bio.hidden = !d.tmBio;

      var img = $('#tmImg');
      var mono = $('#tmMono');
      if (d.tmImg) {
        img.setAttribute('src', d.tmImg);
        img.setAttribute('alt', d.tmName ? 'Photograph of ' + d.tmName : '');
        img.hidden = false;
        mono.textContent = '';
      } else {
        img.hidden = true;
        img.removeAttribute('src');
        mono.textContent = d.tmMono || '';
      }

      // Built with DOM methods rather than innerHTML so profile data can never
      // be parsed as markup.
      var links = $('#tmLinks');
      links.textContent = '';
      function addLink(href, label, value) {
        var a = document.createElement('a');
        a.setAttribute('href', href);
        var lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = label;
        a.appendChild(lbl);
        a.appendChild(document.createTextNode(value));
        links.appendChild(a);
      }
      if (d.tmTel && d.tmTelHref) addLink(d.tmTelHref, 'Phone', d.tmTel);
      if (d.tmEmail) addLink('mailto:' + d.tmEmail, 'Email', d.tmEmail);

      lastFocus = document.activeElement;
      modal.classList.add('open');
      // `inert` (rather than aria-hidden) keeps the closed dialog out of both
      // the tab order and the accessibility tree, with no conflict between them.
      modal.removeAttribute('inert');
      document.body.classList.add('no-scroll');
      closeBtn.focus();
    }

    function close() {
      modal.classList.remove('open');
      modal.setAttribute('inert', '');
      document.body.classList.remove('no-scroll');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Each card gets a real button rather than role="button" on the card
    // itself — the cards already contain phone and email links, and nesting
    // interactive controls inside a button is invalid and confuses screen
    // readers. Clicking anywhere on the card still works for mouse users.
    $$('.member').forEach(function (cardEl) {
      var name = cardEl.getAttribute('data-tm-name') || 'this team member';

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'member-more';
      trigger.textContent = 'View profile';
      trigger.setAttribute('aria-label', 'View the profile of ' + name);
      trigger.addEventListener('click', function () { open(cardEl); });
      cardEl.appendChild(trigger);

      cardEl.addEventListener('click', function (e) {
        // Links and the trigger itself handle their own clicks.
        if (e.target.closest('a, button')) return;
        open(cardEl);
      });
    });

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;

      // Keep focus inside the dialog while it is open.
      var focusable = $$('a[href], button:not([disabled])', card)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

})();
