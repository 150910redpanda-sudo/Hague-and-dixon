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
