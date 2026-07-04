(function () {
  'use strict';

  /* ── Matrix rain (estilo referência D.K.C) ── */
  const canvas = document.getElementById('matrix');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>{}[]/\\|';
    let columns = [];
    let fontSize = 14;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = window.innerWidth < 480 ? 12 : 14;
      const colCount = Math.ceil(canvas.width / fontSize);
      columns = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * (canvas.height / fontSize))
      );
    }

    function draw() {
      ctx.fillStyle = 'rgba(5, 5, 5, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(180, 180, 180, 0.35)';
      ctx.font = fontSize + 'px JetBrains Mono, monospace';

      for (let i = 0; i < columns.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = columns[i] * fontSize;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i]++;
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    setInterval(draw, 45);
  }

  /* ── Gate → App ── */
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const btnEnter = document.getElementById('btn-enter');
  const STORAGE_KEY = 'hats444_entered';

  function enterSite() {
    if (!gate || !app) return;
    gate.classList.add('leaving');
    setTimeout(() => {
      gate.classList.add('hidden');
      app.classList.remove('hidden');
    }, 550);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (btnEnter) {
    btnEnter.addEventListener('click', enterSite);
  }

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1' && gate && app) {
      gate.classList.add('hidden');
      app.classList.remove('hidden');
    }
  } catch {
    /* ignore */
  }

  /* ── Scroll top ── */
  const scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
