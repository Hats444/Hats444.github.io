/**
 * Hanork adaptation wheel — SVG artifact, click sequence, mute-aware tick.
 * Does not replace existing matrix, player, or navigation.
 */
(function () {
  'use strict';

  var MOVES = [
    { z: 360 },
    { z: -360 },
    { x: 360 },
    { x: -360 },
    { y: 360 },
    { y: -360 },
    { z: 360, x: 360 },
    { z: -360, x: -360 }
  ];

  var DURATION = 1000;
  var EASING = 'cubic-bezier(.7, 0, .2, 1)';
  var rot = { x: 0, y: 0, z: 0 };
  var step = 0;
  var animating = false;
  var pending = false;
  var hidden = document.visibilityState === 'hidden';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var isNarrow = window.matchMedia('(max-width: 768px)').matches;

  var stage;
  var wheel;
  var core;
  var svgEl;
  var particleCanvas;
  var particleCtx;
  var particles = [];
  var particleRaf = 0;
  var parallaxY = 0;
  var mouseTilt = { x: 0, y: 0 };
  var orientTilt = { x: 0, y: 0 };
  var audioCtx = null;
  var lastParticle = 0;

  function svgMarkup() {
    var i;
    var rays = '';
    var tips = '';
    var radials = '';
    var bolts = '';
    for (i = 0; i < 8; i++) {
      rays +=
        '<g transform="rotate(' +
        i * 45 +
        ' 200 200)">' +
        '<path d="M200 48 L206 168 L200 178 L194 168 Z"/>' +
        '<path d="M200 38 L204 52 L200 58 L196 52 Z"/>' +
        '<line x1="200" y1="62" x2="200" y2="96"/>' +
        '<circle cx="200" cy="108" r="3.2"/>' +
        '<rect x="197.2" y="128" width="5.6" height="14" rx="0.6"/>' +
        '</g>';
      tips +=
        '<g transform="rotate(' +
        i * 45 +
        ' 200 200)">' +
        '<path d="M200 18 L208 36 L200 32 L192 36 Z"/>' +
        '<path d="M188 40 L200 28 L212 40"/>' +
        '</g>';
    }
    for (i = 0; i < 32; i++) {
      radials +=
        '<line transform="rotate(' +
        i * 11.25 +
        ' 200 200)" x1="200" y1="24" x2="200" y2="' +
        (i % 4 === 0 ? 34 : 30) +
        '"/>';
    }
    for (i = 0; i < 8; i++) {
      bolts +=
        '<circle transform="rotate(' +
        (22.5 + i * 45) +
        ' 200 200)" cx="200" cy="72" r="2.1"/>';
    }
    return (
      '<svg class="hanork-adaptation-svg" viewBox="0 0 400 400" focusable="false" aria-hidden="true">' +
      '<g fill="none" stroke="#c9b27c" stroke-linejoin="miter" stroke-linecap="square">' +
      '<circle cx="200" cy="200" r="188" stroke-width="1.15"/>' +
      '<circle cx="200" cy="200" r="178" stroke-width="0.7"/>' +
      '<circle cx="200" cy="200" r="168" stroke-width="0.45" stroke-dasharray="2 7"/>' +
      radials +
      tips +
      rays +
      bolts +
      '<circle cx="200" cy="200" r="58" stroke-width="1"/>' +
      '<circle cx="200" cy="200" r="46" stroke-width="0.6"/>' +
      '<circle cx="200" cy="200" r="34" stroke-width="0.5" stroke-dasharray="1 4"/>' +
      '<rect x="176" y="176" width="48" height="48" transform="rotate(45 200 200)" stroke-width="0.7"/>' +
      '<path d="M200 148 L214 200 L200 252 L186 200 Z" stroke-width="0.55"/>' +
      '<path d="M148 200 L200 214 L252 200 L200 186 Z" stroke-width="0.55"/>' +
      '<circle cx="200" cy="200" r="16" stroke-width="1.2"/>' +
      '<circle cx="200" cy="200" r="8" stroke-width="0.8"/>' +
      '</g>' +
      '<circle class="hanork-adaptation-nucleus" cx="200" cy="200" r="4.5" fill="#c9b27c"/>' +
      '</svg>'
    );
  }

  function mount() {
    stage = document.createElement('div');
    stage.className = 'hanork-adaptation-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML =
      '<div class="hanork-adaptation-parallax">' +
      '<div class="hanork-adaptation-wheel">' +
      svgMarkup() +
      '<div class="hanork-adaptation-core"></div>' +
      '</div></div>';
    var grain = document.querySelector('.grain');
    if (grain && grain.parentNode) {
      grain.parentNode.insertBefore(stage, grain.nextSibling);
    } else {
      document.body.insertBefore(stage, document.body.firstChild);
    }
    wheel = stage.querySelector('.hanork-adaptation-wheel');
    core = stage.querySelector('.hanork-adaptation-core');
    svgEl = stage.querySelector('.hanork-adaptation-svg');
    applyTransform();

    if (finePointer && !isNarrow && !reduced) {
      particleCanvas = document.createElement('canvas');
      particleCanvas.className = 'hanork-particle-layer';
      particleCanvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(particleCanvas);
      particleCtx = particleCanvas.getContext('2d');
      resizeParticles();
    }
  }

  function applyTransform() {
    if (!wheel) return;
    wheel.style.transform =
      'rotateX(' + rot.x + 'deg) rotateY(' + rot.y + 'deg) rotateZ(' + rot.z + 'deg)';
  }

  function applyParallax() {
    if (!stage) return;
    var layer = stage.firstElementChild;
    if (!layer) return;
    var ox = mouseTilt.x + orientTilt.x;
    var oy = mouseTilt.y + orientTilt.y + parallaxY;
    layer.style.transform =
      'translate3d(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px,0) rotateX(' +
      (oy * 0.12).toFixed(2) + 'deg) rotateY(' + (ox * -0.12).toFixed(2) + 'deg)';
  }

  function musicIsOn() {
    var audio = document.getElementById('bg-music');
    if (!audio) return false;
    return !audio.paused && !audio.muted && audio.volume > 0;
  }

  function playTick() {
    if (hidden || !musicIsOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var osc2 = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc2.type = 'square';
      osc.frequency.setValueAtTime(1680, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.07);
      osc2.frequency.setValueAtTime(880, t);
      osc2.frequency.exponentialRampToValueAtTime(220, t + 0.05);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.045, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.1);
      osc2.stop(t + 0.08);
    } catch (e) {
      /* ignore */
    }
  }

  function flash() {
    if (!wheel || !core || !svgEl) return;
    wheel.classList.add('is-adapting');
    core.classList.add('is-adapting');
    svgEl.classList.add('is-adapting');
    window.setTimeout(function () {
      wheel.classList.remove('is-adapting');
      core.classList.remove('is-adapting');
      svgEl.classList.remove('is-adapting');
    }, 280);
  }

  function runMove() {
    if (hidden) {
      animating = false;
      if (pending) {
        pending = false;
        adapt();
      }
      return;
    }

    if (reduced) {
      step += 1;
      flash();
      playTick();
      animating = false;
      if (pending) {
        pending = false;
        adapt();
      }
      return;
    }

    var move = MOVES[step % MOVES.length];
    step += 1;
    var from = { x: rot.x, y: rot.y, z: rot.z };
    var to = {
      x: rot.x + (move.x || 0),
      y: rot.y + (move.y || 0),
      z: rot.z + (move.z || 0)
    };

    animating = true;
    flash();
    playTick();

    var over = {
      x: to.x + (move.x ? (move.x > 0 ? 8 : -8) : 0),
      y: to.y + (move.y ? (move.y > 0 ? 8 : -8) : 0),
      z: to.z + (move.z ? (move.z > 0 ? 8 : -8) : 0)
    };

    var anim = wheel.animate(
      [
        {
          transform:
            'rotateX(' + from.x + 'deg) rotateY(' + from.y + 'deg) rotateZ(' + from.z + 'deg)'
        },
        {
          offset: 0.84,
          transform:
            'rotateX(' + over.x + 'deg) rotateY(' + over.y + 'deg) rotateZ(' + over.z + 'deg)'
        },
        {
          transform:
            'rotateX(' + to.x + 'deg) rotateY(' + to.y + 'deg) rotateZ(' + to.z + 'deg)'
        }
      ],
      { duration: DURATION, easing: EASING, fill: 'forwards' }
    );

    anim.addEventListener('finish', function () {
      rot = to;
      applyTransform();
      try {
        anim.cancel();
      } catch (e) {
        /* ignore */
      }
      animating = false;
      if (pending) {
        pending = false;
        adapt();
      }
    });
  }

  function adapt() {
    if (animating) {
      pending = true;
      return;
    }
    runMove();
  }

  function onPointer(ev) {
    if (ev.button != null && ev.button !== 0) return;
    adapt();
  }

  function onScroll() {
    if (hidden || reduced) return;
    var y = window.scrollY || 0;
    parallaxY = ((y % 240) / 240) * 4 - 2;
    applyParallax();
  }

  function onMouse(ev) {
    if (hidden || reduced || !finePointer || isNarrow) return;
    var nx = (ev.clientX / window.innerWidth) * 2 - 1;
    var ny = (ev.clientY / window.innerHeight) * 2 - 1;
    mouseTilt.x = nx * 4;
    mouseTilt.y = ny * 3;
    applyParallax();
    spawnParticle(ev.clientX, ev.clientY);
  }

  function onOrient(ev) {
    if (hidden || reduced || !isNarrow) return;
    if (ev.gamma == null || ev.beta == null) return;
    orientTilt.x = Math.max(-3, Math.min(3, ev.gamma * 0.08));
    orientTilt.y = Math.max(-3, Math.min(3, (ev.beta - 45) * 0.04));
    applyParallax();
  }

  function resizeParticles() {
    if (!particleCanvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    particleCanvas.width = Math.floor(window.innerWidth * dpr);
    particleCanvas.height = Math.floor(window.innerHeight * dpr);
    particleCanvas.style.width = window.innerWidth + 'px';
    particleCanvas.style.height = window.innerHeight + 'px';
    if (particleCtx) particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnParticle(x, y) {
    if (!particleCtx || hidden) return;
    var now = performance.now();
    if (now - lastParticle < 32) return;
    lastParticle = now;
    if (particles.length > 18) particles.shift();
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      life: 1,
      gold: Math.random() > 0.45
    });
    if (!particleRaf) particleRaf = requestAnimationFrame(drawParticles);
  }

  function drawParticles() {
    particleRaf = 0;
    if (!particleCtx || hidden) {
      particles.length = 0;
      return;
    }
    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      particleCtx.globalAlpha = p.life * 0.35;
      particleCtx.fillStyle = p.gold ? '#c9b27c' : '#8b1a2b';
      particleCtx.fillRect(p.x, p.y, 1.5, 1.5);
    }
    particleCtx.globalAlpha = 1;
    if (particles.length) particleRaf = requestAnimationFrame(drawParticles);
  }

  function onVisibility() {
    hidden = document.visibilityState === 'hidden';
    if (hidden) {
      if (particleCtx) particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.length = 0;
      if (particleRaf) {
        cancelAnimationFrame(particleRaf);
        particleRaf = 0;
      }
    }
  }

  mount();

  document.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', function () {
    isNarrow = window.matchMedia('(max-width: 768px)').matches;
    resizeParticles();
  });

  if (finePointer && !isNarrow && !reduced) {
    window.addEventListener('mousemove', onMouse, { passive: true });
  }

  if (isNarrow && !reduced && typeof window.DeviceOrientationEvent === 'function') {
    window.addEventListener('deviceorientation', onOrient, { passive: true });
  }
})();
