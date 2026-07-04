(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const revealEls = document.querySelectorAll(
    '.section-head, .about-grid, .skill-card, .project-card, .timeline-item, .contact-box, .hero-content, .hero-terminal'
  );

  revealEls.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  const header = document.querySelector('.site-header');
  let lastY = 0;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (!header) return;
      header.style.transform = y > lastY && y > 120 ? 'translateY(-100%)' : 'translateY(0)';
      lastY = y;
    },
    { passive: true }
  );
})();
