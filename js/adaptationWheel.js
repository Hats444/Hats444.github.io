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
  var lastParticle = 0;

  function svgMarkup() {
    var i;
    var blades = '';
    var ticks = '';
    var bolts = '';
    var inner = '';
    for (i = 0; i < 12; i++) {
      blades +=
        '<g transform="rotate(' +
        i * 30 +
        ' 200 200)">' +
        '<path d="M198 28 L202 28 L204 86 L200 94 L196 86 Z"/>' +
        '<rect x="197.4" y="102" width="5.2" height="18"/>' +
        '</g>';
    }
    for (i = 0; i < 72; i++) {
      ticks +=
        '<line transform="rotate(' +
        i * 5 +
        ' 200 200)" x1="200" y1="18" x2="200" y2="' +
        (i % 6 === 0 ? 32 : 24) +
        '"/>';
    }
    for (i = 0; i < 8; i++) {
      bolts +=
        '<circle transform="rotate(' +
        (22.5 + i * 45) +
        ' 200 200)" cx="200" cy="64" r="2.4"/>';
      inner +=
        '<path transform="rotate(' +
        i * 45 +
        ' 200 200)" d="M200 132 L206 158 L200 166 L194 158 Z"/>';
    }
    return (
      '<svg class="hanork-adaptation-svg" viewBox="0 0 400 400" focusable="false" aria-hidden="true">' +
      '<g fill="none" stroke="#c4c8ce" stroke-linejoin="miter" stroke-linecap="square">' +
      '<g class="ring-outer">' +
      '<circle cx="200" cy="200" r="188" stroke-width="1.4"/>' +
      '<circle cx="200" cy="200" r="176" stroke-width="0.55" stroke-dasharray="1 7"/>' +
      ticks +
      '</g>' +
      '<g class="ring-mid" stroke="#8d949e">' +
      '<circle cx="200" cy="200" r="148" stroke-width="1.1"/>' +
      blades +
      bolts +
      '</g>' +
      '<g stroke="#8b1e2d" stroke-opacity="0.9">' +
      '<path d="M200 12 V36 M200 364 V388 M12 200 H36 M364 200 H388"/>' +
      '</g>' +
      '<circle cx="200" cy="200" r="78" stroke-width="1.2"/>' +
      '<circle cx="200" cy="200" r="58" stroke-width="0.6"/>' +
      inner +
      '<rect x="178" y="178" width="44" height="44" transform="rotate(45 200 200)" stroke-width="0.7"/>' +
      '<circle cx="200" cy="200" r="18" stroke-width="1.3"/>' +
      '<circle cx="200" cy="200" r="8" stroke-width="0.8"/>' +
      '</g>' +
      '<circle class="hanork-adaptation-nucleus" cx="200" cy="200" r="4.2" fill="#8b1e2d"/>' +
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
    var host = document.getElementById('hero-wheel-host');
    if (host) {
      host.appendChild(stage);
    } else {
      stage.classList.add('is-global');
      var grain = document.querySelector('.grain');
      if (grain && grain.parentNode) {
        grain.parentNode.insertBefore(stage, grain.nextSibling);
      } else {
        document.body.insertBefore(stage, document.body.firstChild);
      }
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
      particleCtx.fillStyle = p.gold ? '#c4c8ce' : '#8b1a2b';
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
    applySpeedFX(dt, now);
  }

  /*Blur: a cópia principal fica nítida; clones deslocados
     no sentido do giro criam a sensação de disco girando. */
  var ghostEls = [];
  function applySpeedFX(dt) {
    if (!wheel) return;
    var v = Math.abs(spin) / SPIN_MAX;          /* 0..1 velocidade */
    var tiltV = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 0.35);

    /* Cache: escrever style.filter e style.opacity a 60fps obriga o
     navegador a repintar o SVG inteiro todo quadro. Só escrevo quando
     o valor MUDA de fato (arredondado). */
    var lastFilter = '';
    var lastWheelOp = '';
    var lastCoreOp = '';
    var lastHot = null;
    var lastGhostOp = [];
    var lastSpark = 0;

    function applySpeedFX(dt, now2) {
      if (!wheel) return;
      var v = Math.abs(spin) / SPIN_MAX;          /* 0..1 velocidade */

      /* Rastro do blur: SOMENTE no eixo Z.
         Rastro em X/Y vira borrão e esconde a roda.
         Opacidade máxima 6% — é um traço, não uma névoa. */
      if (ghostEls.length) {
        var show = v > 0.3 ? Math.min(1, (v - 0.3) / 0.7) : 0;
        for (var i = 0; i < ghostEls.length; i++) {
          var g = ghostEls[i];
          var k = (i + 1) / ghostEls.length;
          g.style.transform = 'rotateZ(' + (rot.z - spin * k * 7).toFixed(2) + 'deg)';
          var op = (show * 0.06 * (1 - k)).toFixed(3);
          if (op !== lastGhostOp[i]) { g.style.opacity = op; lastGhostOp[i] = op; }
        }
      }

      /* brilho proporcional à velocidade — só escreve se mudou */
      var blurPx = (2 + v * 5).toFixed(1);
      var alpha = (0.18 + v * 0.3).toFixed(2);
      var f = 'drop-shadow(0 0 ' + blurPx + 'px rgba(139,26,43,' + alpha + '))';
      if (f !== lastFilter) { svgEl.style.filter = f; lastFilter = f; }

      var wo = (0.14 + v * 0.06).toFixed(3);
      if (wo !== lastWheelOp) { wheel.style.opacity = wo; lastWheelOp = wo; }

      var co = (0.25 + v * 0.45).toFixed(3);
      if (co !== lastCoreOp) { core.style.opacity = co; lastCoreOp = co; }

      /* acende o "fogo" no anel quando está rápido */
      var hot = v > 0.55;
      if (hot !== lastHot) {
        if (stage) { if (hot) stage.classList.add('is-hot'); else stage.classList.remove('is-hot'); }
        lastHot = hot;
      }

      /* faíscas atrás quando acelera.
         Limitado a ~10/s (antes era por frame = 60/s), senão o canvas
         vira o gargalo do site inteiro. */
      if (v > 0.5) {
        var n = Math.min(2, Math.floor((v - 0.5) * 4));
        for (var s = 0; s < n; s++) {
          if (!particleCtx) break;
          if (now2 - lastSpark > 100) {
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
