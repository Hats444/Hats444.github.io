(function () {

  'use strict';



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

      ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';

      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.font = fontSize + 'px JetBrains Mono, monospace';



      for (let i = 0; i < columns.length; i++) {

        const char = chars[Math.floor(Math.random() * chars.length)];

        const x = i * fontSize;

        const y = columns[i] * fontSize;

        const isHead = Math.random() > 0.975;

        ctx.fillStyle = isHead

          ? 'rgba(180, 255, 160, 0.95)'

          : 'rgba(70, 200, 90, 0.42)';

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



  if (window.Hats444Analytics) {

    window.Hats444Analytics.init();

  }

})();


