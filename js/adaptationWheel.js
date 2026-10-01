/**
 * Hanork adaptation wheel — SVG artifact, click sequence, mute-aware tick.
 * Does not replace existing matrix, player, or navigation.
 */
(function () {
  'use strict';

  /* A sequência fixa de 8 movimentos foi substituída: o clique agora
   acelera a roda e injeta tombamento aleatório. Sem passos fixos. */

  var rot = { x: 0, y: 0, z: 0 };
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
      '<div class="hanork-heat-ring"></div>' +
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

  /* ══ ADAPTAÇÃO ══════════════════════════════════════════
     O clique NÃO dá mais um passo de uma sequência fixa.
     Ele acelera a roda e injeta tombamento aleatório em X/Y,
     com direção e intensidade nunca repetidas — o disco
     reage como um corpo pesado, não como uma carta.
     Depois volta sozinho ao giro calmo. Continua girando. */
  function randomPick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function runMove() {
    if (hidden) { animating = false; drainPending(); return; }

    var dir = Math.random() < 0.5 ? -1 : 1;

    /* velocidade: base + impulso, sempre voltando à base */
    var boost = SPIN_BASE + Math.random() * (SPIN_MAX - SPIN_BASE) * (0.55 + Math.random() * 0.45);
    spin = dir * Math.max(Math.abs(spin), boost);

    /* tombamento: eixo e sentido sorteados a cada clique.
       Potência em GRAUS POR SEGUNDO de velocidade angular,
       e o teto é TILT_CLAMP — a roda nunca cai de lado. */
    var axis = randomPick(['x', 'y', 'z', 'xy']);
    var power = 0.05 + Math.random() * 0.09;   /* 0.05–0.14 deg/frame de tombo */

    if (axis === 'x' || axis === 'xy') tiltVX += (Math.random() < 0.5 ? -1 : 1) * power;
    if (axis === 'y' || axis === 'xy') tiltVY += (Math.random() < 0.5 ? -1 : 1) * power;

    /* Z também pode levar um impulso extra */
    if (axis === 'z') {
      spin += (Math.random() < 0.5 ? -1 : 1) * 0.004;
    }

    /* trava a velocidade angular de tombo */
    tiltVX = Math.max(-0.18, Math.min(0.18, tiltVX));
    tiltVY = Math.max(-0.18, Math.min(0.18, tiltVY));

    flash();
    playTick();
    animating = false;
    drainPending();
  }

  /* Um clique nunca cria fila infinita: executa no máximo 1 */
  function drainPending() {
    if (pending) { pending = false; adapt(); }
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

  /* ══ MOTOR CONTÍNUO ══════════════════════════════════════
     A roda NUNCA para. Ela gira sempre em Z e, quando o usuário
     clica, ganha um impulso em X/Y aleatório que a faz tombar
     como um disco pesado — nunca como papel dobrando.

     speed  = rotação base em Z (deg/ms)
     tiltX/tiltY = tombamento amortecido (velocidade angular)
     blur   = rastro por clones com opacidade proporcional à velocidade
     sparks = faíscas atrás da roda quando a velocidade sobe
  ══════════════════════════════════════════════════════════ */
  /* Calibrado para ficar LENTO e legível.
     SPIN_BASE 0.006 deg/ms = 6°/s  → 60s por volta, quase parado
     SPIN_MAX  0.030 deg/ms = 30°/s → impulso perceptível, nunca frenético
     TILT_CLAMP limita o tombamento para ~14°: nunca vira de lado
     (virar de lado = sumir = "não dá pra ver nada"). */
  var SPIN_BASE = 0.006;
  var SPIN_MAX = 0.030;
  var TILT_CLAMP = 14;      /* graus — o disco nunca chega a 90° */
  var TILT_DAMP = 0.94;
  var spin = SPIN_BASE;
  var tiltVX = 0, tiltVY = 0;
  var tiltX = 0, tiltY = 0;
  var lastT = 0;
  var spinRaf = 0;
  var GHOSTS = 4;

  function ghosts() {
    return stage ? stage.querySelectorAll('.hw-ghost') : [];
  }

  /*Um disco pesado: gira em Z e tomba em X/Y com inércia. */
  function spinFrame(now) {
    spinRaf = requestAnimationFrame(spinFrame);
    if (hidden) { lastT = now; return; }
    if (!lastT) { lastT = now; return; }
    var dt = Math.min(48, now - lastT);   /* limita salto ao voltar a aba */
    lastT = now;

    /* decai de volta à velocidade base (amortecimento) */
    spin += (SPIN_BASE - spin) * 0.012 * (dt / 16);

    rot.z += spin * dt;
    rot.x += tiltX * dt;
    rot.y += tiltY * dt;

    /* tombamento volta ao eixo com atrito — disco pesado */
    tiltVX *= TILT_DAMP; tiltVY *= TILT_DAMP;
    tiltX += tiltVX * dt;
    tiltY += tiltVY * dt;
    tiltX -= tiltX * 0.06 * (dt / 16);
    tiltY -= tiltY * 0.06 * (dt / 16);

    /* CLAMP DURO: o disco nunca vira de perfil.
       Passar de ~90° em rotateX/rotateY deixa a roda invisível
       (ela fica de fio). Aqui o limite é 14°. */
    if (tiltX > TILT_CLAMP) { tiltX = TILT_CLAMP; if (tiltVX > 0) tiltVX = 0; }
    if (tiltX < -TILT_CLAMP) { tiltX = -TILT_CLAMP; if (tiltVX < 0) tiltVX = 0; }
    if (tiltY > TILT_CLAMP) { tiltY = TILT_CLAMP; if (tiltVY > 0) tiltVY = 0; }
    if (tiltY < -TILT_CLAMP) { tiltY = -TILT_CLAMP; if (tiltVY < 0) tiltVY = 0; }

    applyTransform();
    applySpeedFX(dt);
  }

  /*Blur: a cópia principal fica nítida; clones deslocados
     no sentido do giro criam a sensação de disco girando. */
  var ghostEls = [];
  function applySpeedFX(dt) {
    if (!wheel) return;
    var v = Math.abs(spin) / SPIN_MAX;          /* 0..1 velocidade */
    var tiltV = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 0.35);

    /* Rastro do blur: SOMENTE no eixo Z.
       Rastro em X/Y vira borrão e esconde a roda.
       Opacidade máxima 6% — é um traço, não uma névoa. */
    if (ghostEls.length) {
      var show = v > 0.3 ? Math.min(1, (v - 0.3) / 0.7) : 0;
      for (var i = 0; i < ghostEls.length; i++) {
        var g = ghostEls[i];
        var k = (i + 1) / ghostEls.length;
        g.style.transform = 'rotateZ(' + (rot.z - spin * k * 7).toFixed(2) + 'deg)';
        g.style.opacity = (show * 0.06 * (1 - k)).toFixed(3);
      }
    }

    /* brilho proporcional à velocidade */
    svgEl.style.filter = 'drop-shadow(0 0 ' +
      (2 + v * 5).toFixed(1) + 'px rgba(139,26,43,' + (0.18 + v * 0.3).toFixed(2) + '))';

    /* opacidade base alta o bastante para a roda ser vista */
    wheel.style.opacity = (0.14 + v * 0.06).toFixed(3);
    core.style.opacity = (0.25 + v * 0.45).toFixed(3);

    /* acende o "fogo" no anel quando está rápido */
    if (stage) {
      if (v > 0.55) stage.classList.add('is-hot');
      else stage.classList.remove('is-hot');
    }

    /* faíscas atrás quando acelera */
    if (v > 0.5) {
      var n = Math.min(2, Math.floor((v - 0.5) * 4));
      for (var s = 0; s < n; s++) {
        if (particleCtx) {
          var a = Math.random() * Math.PI * 2;
          var r = 150 + Math.random() * 70;
          spawnParticle(
            window.innerWidth / 2 + Math.cos(a) * r,
            window.innerHeight / 2 + Math.sin(a) * r
          );
        }
      }
    }
  }

  function buildGhosts() {
    if (!wheel || isNarrow || reduced) return;
    for (var i = 0; i < GHOSTS; i++) {
      var g = wheel.cloneNode(true);
      g.className = 'hanork-adaptation-wheel hw-ghost';
      g.style.opacity = '0';
      var coreG = g.querySelector('.hanork-adaptation-core');
      if (coreG) coreG.style.display = 'none';
      stage.querySelector('.hanork-adaptation-parallax').appendChild(g);
      ghostEls.push(g);
    }
  }

  mount();
  buildGhosts();

  /* ── giro permanente ──
     Em reduced-motion a roda não gira; um clique ainda dá
     um pulso curto de brilho, sem rotação. */
  if (!reduced) {
    spinRaf = requestAnimationFrame(spinFrame);
  } else if (svgEl) {
    svgEl.style.opacity = '0.07';
  }

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
