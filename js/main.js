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

    const chars = 'ｱｲｳｴｵｶｷｸｹｺABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>{}[]/\\|';

    let columns = [];

    let fontSize = 14;



    function resize() {

      const w = window.innerWidth;

      const h = window.innerHeight;

      fontSize = w < 480 ? 12 : 14;

      if (canvas) {

        canvas.width = w;

        canvas.height = h;

      }

      if (gateCanvas) {

        gateCanvas.width = w;

        gateCanvas.height = h;

      }

      const colCount = Math.ceil(w / fontSize);

      columns = Array.from({ length: colCount }, () =>

        Math.floor(Math.random() * (h / fontSize))

      );

    }



    function paint(ctx) {

      if (!ctx) return;

      ctx.fillStyle = 'rgba(7, 6, 10, 0.16)';

      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = fontSize + 'px JetBrains Mono, monospace';



      for (let i = 0; i < columns.length; i++) {

        const char = chars[Math.floor(Math.random() * chars.length)];

        const x = i * fontSize;

        const y = columns[i] * fontSize;

        const isHead = Math.random() > 0.975;

        ctx.fillStyle = isHead

          ? 'rgba(201, 185, 138, 0.92)'

          : 'rgba(139, 30, 45, 0.55)';

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

    setInterval(draw, 42);

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



  if (window.Hats444Analytics) {

    window.Hats444Analytics.init();

  }

})();


