// Sticky header solidify
const header = document.querySelector('.site-header');
const onScroll = () => {
  if (window.scrollY > 40) header.classList.add('solid');
  else header.classList.remove('solid');
};
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

// Mobile menu
const burger = document.querySelector('.burger');
const mobile = document.querySelector('.mobile-menu');
if (burger && mobile){
  burger.addEventListener('click', () => {
    mobile.classList.toggle('open');
    document.body.style.overflow = mobile.classList.contains('open') ? 'hidden' : '';
  });
  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobile.classList.remove('open');
    document.body.style.overflow = '';
  }));
}

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

// Footer year
const y = document.getElementById('yr');
if (y) y.textContent = new Date().getFullYear();

// Cookie consent
(function(){
  const KEY = 'hd-cookie-consent';
  const YEAR = 60 * 60 * 24 * 365;

  function getConsent(){
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  // Essential cookies (e.g. remembering this choice) are always required for the site to work.
  // Tracking (analytics) and advertising cookies are only set once the visitor opts in.
  function applyConsent(consent){
    document.cookie = 'hd_analytics=' + (consent.tracking ? '1' : '') + '; path=/; max-age=' + (consent.tracking ? YEAR : 0) + '; SameSite=Lax';
    document.cookie = 'hd_ads=' + (consent.advertising ? '1' : '') + '; path=/; max-age=' + (consent.advertising ? YEAR : 0) + '; SameSite=Lax';
  }

  function setConsent(tracking, advertising){
    const consent = { essential:true, tracking:!!tracking, advertising:!!advertising, date:new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(consent));
    applyConsent(consent);
    return consent;
  }

  window.HDCookies = { getConsent, setConsent };

  const existing = getConsent();
  if (existing){
    applyConsent(existing);
    return;
  }

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie notice');
  banner.innerHTML = `
    <div class="wrap cookie-banner-inner">
      <p>We use essential cookies to make this website work. With your permission we'd also like to set analytics (tracking) and advertising cookies to help us understand site use and measure our marketing. <a href="cookies.html">Read our cookie policy</a>.</p>
      <div class="cookie-banner-btns">
        <button type="button" class="btn ghost-light cookie-decline">Decline</button>
        <button type="button" class="btn ghost-light cookie-essential">Essential only</button>
        <button type="button" class="btn cookie-accept">Accept all <span class="arr">→</span></button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('in')));

  function dismiss(){
    banner.classList.remove('in');
    setTimeout(() => banner.remove(), 500);
  }
  banner.querySelector('.cookie-accept').addEventListener('click', () => { setConsent(true, true); dismiss(); });
  banner.querySelector('.cookie-essential').addEventListener('click', () => { setConsent(false, false); dismiss(); });
  banner.querySelector('.cookie-decline').addEventListener('click', () => { setConsent(false, false); dismiss(); });
})();

// Cookie preferences panel (cookies.html)
(function(){
  const statusEl = document.getElementById('cookie-status');
  const acceptBtn = document.getElementById('cookie-pref-accept');
  const essentialBtn = document.getElementById('cookie-pref-essential');
  const declineBtn = document.getElementById('cookie-pref-decline');
  if (!statusEl || !window.HDCookies) return;

  function renderStatus(){
    const consent = HDCookies.getConsent();
    if (!consent){
      statusEl.textContent = "You haven't made a choice yet — the cookie banner will appear on your next visit.";
      return;
    }
    const on = (v) => v ? 'on' : 'off';
    statusEl.textContent = `Current choice — Essential: on · Analytics: ${on(consent.tracking)} · Advertising: ${on(consent.advertising)} (set ${new Date(consent.date).toLocaleDateString('en-GB')})`;
  }

  if (acceptBtn) acceptBtn.addEventListener('click', () => { HDCookies.setConsent(true, true); renderStatus(); });
  if (essentialBtn) essentialBtn.addEventListener('click', () => { HDCookies.setConsent(false, false); renderStatus(); });
  if (declineBtn) declineBtn.addEventListener('click', () => { HDCookies.setConsent(false, false); renderStatus(); });

  renderStatus();
})();
