/**
 * HATS444 — Scroll FX (reveal bidirecional + parallax por seção).
 *
 * O conteúdo "sai" e "volta" conforme o scroll, sem nunca
 * ficar invisível: opacidade e deslocamento são contínuos.
 * Usa rAF + cache de métricas (sem ler layout a cada quadro).
 */
(function (global) {
  'use strict';

  var doc = global.document;

  var reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── estado ── */
  var items = [];          /* { el, top, h, pad } */
  var ticking = false;
  var vh = 0;
  var scrollY = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── coleta os blocos que participates do efeito ── */
  function collect() {
    var sel = '.reveal, .focus-item, .dkc-card, .price-card, .caps-group, .chip, .rule';
    var nodes = doc.querySelectorAll(sel);
    items = [];
    for (var i = 0; i < nodes.length; i++) {
      items.push({ el: nodes[i], top: 0, h: 0, pad: 0 });
    }
    measure();
  }

  /* Mede UMA vez (e no resize) — evita layout thrashing no scroll */
  function measure() {
    vh = global.innerHeight || 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var r = it.el.getBoundingClientRect();
      it.h = r.height;
      it.top = r.top + scrollY;
      /* stagger:brothers closer get a small progressive delay */
      it.pad = 60 + (i % 5) * 34;
    }
  }

  /* ── quadro ── */
  function frame() {
    ticking = false;
    scrollY = global.scrollY || global.pageYOffset || 0;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var el = it.el;

      /* posição relativa ao centro da viewport: 0 = topo, 1 = base */
      var p = (scrollY + vh - it.top) / (vh + it.h);   /* -n..1+ */
      var rel = clamp(p, 0, 1);

      /* entra: 0 → 1 ; sai pelo topo: 1 → 0 */
      var fadeIn = clamp(rel / 0.22, 0, 1);
      var fadeOut = clamp((1 - rel) / 0.14, 0, 1);
      var vis = Math.min(fadeIn, fadeOut);

      /* smoothstep para não ficar linear */
      var e = vis * vis * (3 - 2 * vis);

      var dy = (1 - e) * 26;
      var dyBack = rel < 0 ? (1 - fadeIn) * -40 : 0;
      var dyTotal = dy + dyBack;

      var s = 0.985 + e * 0.015;

      el.style.opacity = e.toFixed(3);
      el.style.transform = 'translate3d(0,' + dyTotal.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  function mount() {
    if (!items.length) collect();
    if (reduced) {
      /* reduced-motion: apenas garante visibilidade, sem animação */
      for (var i = 0; i < items.length; i++) {
        items[i].el.style.opacity = '1';
        items[i].el.style.transform = 'none';
      }
      return;
    }
    frame();
    global.addEventListener('scroll', onScroll, { passive: true });
    global.addEventListener('resize', function () {
      measure();
      frame();
    }, { passive: true });
    doc.addEventListener('visibilitychange', function () {
      if (!doc.hidden) onScroll();
    });
    /* siteContent.js renderiza via innerHTML: recoleta depois */
    global.setTimeout(function () { collect(); frame(); }, 400);
    global.setTimeout(function () { collect(); frame(); }, 1600);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.Hats444ScrollFX = { refresh: function () { collect(); frame(); } };
})(window);