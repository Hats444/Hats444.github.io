(function () {

  'use strict';

  document.documentElement.classList.add('js');

  const canvas = document.getElementById('matrix');

  const gateCanvas = document.getElementById('gate-matrix');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const targets = [canvas, gateCanvas].filter(Boolean);



  if (targets.length && !reduced) {

    const ctxMain = canvas ? canvas.getContext('2d') : null;

    const ctxGate = gateCanvas ? gateCanvas.getContext('2d') : null;

    const marks = ['+', '·', '×', '—'];

    let columns = [];

    let fontSize = 14;

    let columnStep = 14;



    function resize() {

      const w = window.innerWidth;

      const h = window.innerHeight;

      /* fonte maior em telas pequenas = menos colunas = menos custo */

      fontSize = w < 480 ? 16 : (w < 900 ? 18 : 20);

      /* limita o número de colunas: é o que realmente pesa */

      const MIN_COL_GAP = 28;

      const maxCols = Math.max(12, Math.floor(w / MIN_COL_GAP));

      const step = Math.max(fontSize, w / maxCols);

      if (canvas) {

        canvas.width = w;

        canvas.height = h;

      }

      if (gateCanvas) {

        gateCanvas.width = w;

        gateCanvas.height = h;

      }

      columns = Array.from({ length: Math.ceil(w / step) }, () =>

        Math.floor(Math.random() * (h / fontSize))

      );

      /* guarda o passo para o paint usar o mesmo espaçamento */

      columnStep = step;

    }



    function paint(ctx) {

      if (!ctx) return;

      ctx.fillStyle = 'rgba(5, 5, 6, 0.22)';

      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = fontSize + 'px IBM Plex Mono, monospace';



      for (let i = 0; i < columns.length; i++) {

        const char = marks[Math.floor(Math.random() * marks.length)];

        const x = i * columnStep;

        const y = columns[i] * fontSize;

        const isHead = Math.random() > 0.985;

        ctx.fillStyle = isHead

          ? 'rgba(139, 30, 45, 0.55)'

          : 'rgba(196, 200, 206, 0.18)';

        ctx.fillText(char, x, y);



        if (y > ctx.canvas.height && Math.random() > 0.972) {

          columns[i] = 0;

        } else {

          columns[i]++;

        }

      }

    }



    function draw() {

      paint(ctxMain);

      if (document.documentElement.classList.contains('gate-open')) {

        paint(ctxGate);

      }

    }



    resize();

    window.addEventListener('resize', resize);

    /* FPS da chuva: 42ms ≈ 24fps. Baixa para 55ms (~18fps).
     A chuva é decorativa e opaca a 0.22 — nobody percebe os frames
     que caem, mas o processador agradece. Em telas pequenas o custo
     por frame é o mesmo, então menos frames = menos trabalho. */
    const MATRIX_MS = 90;

    var matrixTimer = null;

    function startMatrix() {
      if (matrixTimer || document.visibilityState === 'hidden') return;
      matrixTimer = setInterval(draw, MATRIX_MS);
    }

    function stopMatrix() {
      if (!matrixTimer) return;
      clearInterval(matrixTimer);
      matrixTimer = null;
    }

    startMatrix();

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') stopMatrix();
      else startMatrix();
    });

    /* Quando o gate fecha, a chuva do gate não roda mais.
       Reduz para metade da taxa quando o gate já passou. */
    const originalDraw = draw;
    draw = function () {
      if (document.documentElement.classList.contains('gate-open')) {
        originalDraw();
      } else {
        paint(ctxMain);   /* só a camada principal */
      }
    };

  }



  const gate = document.getElementById('gate');

  const app = document.getElementById('app');

  const btnEnter = document.getElementById('btn-enter');

  const STORAGE_KEY = 'hats444_entered_v22';



  function showApp() {

    if (!gate || !app) return;

    document.documentElement.classList.remove('gate-open');

    gate.classList.add('leaving');

    setTimeout(() => {

      gate.hidden = true;

      app.hidden = false;

      try {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch (e) { /* ignore */ }

      /* avisa módulos que dependem de layout visível (ex.: scrollFx) */
      try {
        document.dispatchEvent(new CustomEvent('hats444:app-shown'));
      } catch (e) {
        /* ignore */
      }

      document.querySelectorAll('.reveal').forEach(function (node) {

        const rect = node.getBoundingClientRect();

        if (rect.top < window.innerHeight * 0.96) node.classList.add('is-in');

      });

      gate.classList.remove('leaving');

    }, 500);

    try {

      sessionStorage.setItem(STORAGE_KEY, '1');

    } catch {

      /* ignore */

    }

    if (window.Hats444Analytics) {

      window.Hats444Analytics.startPresence();

    }

  }



  async function onEnterClick() {

    if (window.Hats444Analytics) {

      await window.Hats444Analytics.trackEnter();

    }

    showApp();

  }



  if (btnEnter) {

    btnEnter.addEventListener('click', onEnterClick);

  }



  try {

    if (sessionStorage.getItem(STORAGE_KEY) === '1' && gate && app) {

      document.documentElement.classList.remove('gate-open');

      gate.hidden = true;

      app.hidden = false;

      if (window.Hats444Analytics) {

        window.Hats444Analytics.startPresence();

      }

    }

  } catch {

    /* ignore */

  }



  const scrollBehavior = reduced ? 'auto' : 'smooth';

  const scrollTopBtn = document.getElementById('scroll-top');

  const scrollDownBtn = document.getElementById('scroll-down');

  if (scrollTopBtn) {

    scrollTopBtn.addEventListener('click', () => {

      window.scrollTo({ top: 0, behavior: scrollBehavior });
      document.documentElement.scrollTop = 0;

    });

  }

  if (scrollDownBtn) {

    scrollDownBtn.addEventListener('click', () => {

      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: scrollBehavior });

    });

  }



  const audio = document.getElementById('bg-music');

  const btnMusic = document.getElementById('btn-music');

  const viz = document.getElementById('viz-bars');

  const TRACK_LABEL = 'Ciência Nikola Tesla — Enygma';



  function setPlaying(isPlaying) {

    if (!btnMusic || !viz) return;

    btnMusic.classList.toggle('is-playing', isPlaying);

    viz.classList.toggle('is-paused', !isPlaying);

    btnMusic.setAttribute(

      'aria-label',

      isPlaying ? 'Pausar ' + TRACK_LABEL : 'Tocar ' + TRACK_LABEL

    );

  }



  function rememberMusic(on) {

    try {

      localStorage.setItem('hats444_music', on ? '1' : '0');

    } catch (e) {

      /* ignore */

    }

  }



  if (audio && btnMusic) {

    btnMusic.addEventListener('click', async () => {

      try {

        if (audio.paused) {

          await audio.play();

          setPlaying(true);

          rememberMusic(true);

        } else {

          audio.pause();

          setPlaying(false);

          rememberMusic(false);

        }

      } catch {

        setPlaying(false);

        rememberMusic(false);

      }

    });



    audio.addEventListener('play', () => setPlaying(true));

    audio.addEventListener('pause', () => setPlaying(false));

    audio.addEventListener('error', () => setPlaying(false));

  }



  const revealNodes = document.querySelectorAll('.reveal');

  if (revealNodes.length && 'IntersectionObserver' in window && !reduced) {

    const io = new IntersectionObserver(function (entries) {

      entries.forEach(function (entry) {

        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-in');

        io.unobserve(entry.target);

      });

    }, { threshold: 0.12 });

    revealNodes.forEach(function (node) { io.observe(node); });

  } else {

    revealNodes.forEach(function (node) { node.classList.add('is-in'); });

  }



  const topbar = document.querySelector('.topbar');
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');
  const progressBar = document.getElementById('nav-progress-bar');

  if (navToggle && topbar) {
    navToggle.addEventListener('click', function () {
      const open = !topbar.classList.contains('is-open');
      topbar.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  if (siteNav) {
    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (topbar) topbar.classList.remove('is-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const navSections = ['sobre', 'foco', 'planos', 'caps', 'projetos', 'stack']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function updateNavChrome() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar && max > 0) {
      progressBar.style.width = Math.min(100, (window.scrollY / max) * 100).toFixed(2) + '%';
    }
    let current = navSections[0];
    navSections.forEach(function (section) {
      if (section.getBoundingClientRect().top < window.innerHeight * 0.32) current = section;
    });
    if (siteNav && current) {
      siteNav.querySelectorAll('a').forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('data-nav') === current.id);
      });
    }
  }

  window.addEventListener('scroll', updateNavChrome, { passive: true });
  window.addEventListener('resize', updateNavChrome);
  updateNavChrome();

  if (window.Hats444Analytics) {

    window.Hats444Analytics.init();

  }

})();


