(function () {
  'use strict';

  const canvas = document.getElementById('matrix');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    const chars = 'ｱｲｳｴｵｶｷｸｹｺABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>{}[]/\\|';
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
      ctx.fillStyle = 'rgba(5, 5, 5, 0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px JetBrains Mono, monospace';

      for (let i = 0; i < columns.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = columns[i] * fontSize;
        const isHead = Math.random() > 0.978;
        ctx.fillStyle = isHead
          ? 'rgba(210, 255, 210, 0.82)'
          : 'rgba(100, 190, 110, 0.32)';
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

  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const btnEnter = document.getElementById('btn-enter');
  const STORAGE_KEY = 'hats444_entered_v15';

  function showApp() {
    if (!gate || !app) return;
    gate.classList.add('leaving');
    setTimeout(() => {
      gate.hidden = true;
      app.hidden = false;
      gate.classList.remove('leaving');
    }, 500);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (btnEnter) {
    btnEnter.addEventListener('click', showApp);
  }

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1' && gate && app) {
      gate.hidden = true;
      app.hidden = false;
    }
  } catch {
    /* ignore */
  }

  const scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const audio = document.getElementById('bg-music');
  const btnMusic = document.getElementById('btn-music');
  const viz = document.getElementById('viz-bars');

  function setPlaying(isPlaying) {
    if (!btnMusic || !viz) return;
    btnMusic.classList.toggle('is-playing', isPlaying);
    viz.classList.toggle('is-paused', !isPlaying);
    btnMusic.setAttribute(
      'aria-label',
      isPlaying ? 'Pausar FML — Arizona Zervas' : 'Tocar FML — Arizona Zervas'
    );
  }

  if (audio && btnMusic) {
    btnMusic.addEventListener('click', async () => {
      try {
        if (audio.paused) {
          await audio.play();
          setPlaying(true);
        } else {
          audio.pause();
          setPlaying(false);
        }
      } catch {
        setPlaying(false);
      }
    });

    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('error', () => setPlaying(false));
  }
})();
