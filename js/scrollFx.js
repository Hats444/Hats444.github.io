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

  /* ── coleta os blocos que participam do efeito ──
     Só nodes com altura > 0 entram na lista. Isso importa porque
     o #app começa com [hidden]: medir antes de abrir daria
     top=0 e h=0, quebrando toda a matemática. */
  function collect() {
    /* Só SECÇÕES E CARDS animam.
     Incluir .chip aqui significava escrever ~40 elementos por quadro
     de scroll com !important — era o maior custo do site no scroll. */
    var sel = '.reveal, .focus-item, .dkc-card, .price-card, .caps-group, .rule';
    var nodes = doc.querySelectorAll(sel);
    items = [];
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.height <= 0) continue;          /* ignora node ainda oculto */
      items.push({ el: nodes[i], top: 0, h: r.height, pad: 0 });
    }
    measure();
  }

  /* Mede UMA vez (e no resize) — evita layout thrashing no scroll */
  function measure() {
    vh = global.innerHeight || 0;
    scrollY = global.scrollY || global.pageYOffset || 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var r = it.el.getBoundingClientRect();
      it.h = r.height;
      it.top = r.top + scrollY;      /* posição absoluta no documento */
      it.pad = 60 + (i % 5) * 34;    /* stagger leve entre irmãos */
    }
  }

  /* ── quadro ──
     p = 0 quando o topo do elemento encosta na base da viewport
     p = 1 quando a base dele sai pelo topo.
     vis sobe de 0→1 ao entrar e desce 1→0 ao sair pelo topo. */
  /* Aplica uma classe na <html> para tirar o reveal estático do CSS
     (opacity:0 + transition 0.7s), que brigaria com o controle
     inline do scrollFx. Sem isto o JS escreve opacity e o CSS
     sobrescreve com transition — e nada anima. */
  function takeOverReveal() {
    var html = doc.documentElement;
    html.classList.add('hw-scrollfx');
  }

  function frame() {
    ticking = false;
    if (!items.length) return;
    scrollY = global.scrollY || global.pageYOffset || 0;
    var vhNow = global.innerHeight || vh;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var el = it.el;

      var p = (scrollY + vhNow - it.top) / (vhNow + it.h);
      var rel = clamp(p, 0, 1);

      var fadeIn = clamp(rel / 0.22, 0, 1);
      var fadeOut = clamp((1 - rel) / 0.14, 0, 1);
      var vis = Math.min(fadeIn, fadeOut);

      var e = vis * vis * (3 - 2 * vis);
      var dy = (1 - e) * 26;

      /* inline style ganha do CSS por ser mais específico */
      el.style.setProperty('opacity', (0.04 + e * 0.96).toFixed(3), 'important');
      el.style.setProperty('transform',
        'translate3d(0,' + dy.toFixed(2) + 'px,0) scale(' + (0.985 + e * 0.015).toFixed(4) + ')',
        'important');
      el.style.setProperty('transition', 'none', 'important');
    }
  }

  var lastScrollY = -1;

  function onScroll() {
    /* não recalcula se a posição não mudou de verdade */
    if (global.scrollY === lastScrollY) return;
    lastScrollY = global.scrollY;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  /* Espera o #app ficar visível.
     O site abre atrás de um gate: enquanto #app estiver [hidden],
     todo getBoundingClientRect() devolve altura 0. Sem esperar,
     a lista fica vazia ou com métricas inúteis e o efeito
     simplesmente nunca aparece. */
  function waitForApp(cb) {
    var app = doc.getElementById('app');
    if (!app || !app.hidden) { cb(); return; }

    var tries = 0;
    var iv = global.setInterval(function () {
      if (app.hidden === false) {
        global.clearInterval(iv);
        cb();
        return;
      }
      /* fallback: se nunca abrir (ex.: JS do gate falhou),
         força a ativação em 3s para o site não ficar sem efeito */
      if (++tries > 30) {
        global.clearInterval(iv);
        cb();
      }
    }, 100);
  }

  function mount() {
    if (reduced) {
      /* reduced-motion: nada some, nada move */
      waitForApp(function () {
        collect();
        for (var i = 0; i < items.length; i++) {
          items[i].el.style.opacity = '1';
          items[i].el.style.transform = 'none';
        }
      });
      return;
    }

    waitForApp(function () {
      collect();
      if (!items.length) return;

      takeOverReveal();
      frame();
      global.addEventListener('scroll', onScroll, { passive: true });
      global.addEventListener('resize', function () {
        collect();
        frame();
      }, { passive: true });
      doc.addEventListener('visibilitychange', function () {
        if (!doc.hidden) onScroll();
      });

      /* siteContent.js reescreve cards via innerHTML após o fetch:
         recoleta quando o conteúdo dinâmico chega */
      global.setTimeout(function () { collect(); frame(); }, 300);
      global.setTimeout(function () { collect(); frame(); }, 1200);
      global.setTimeout(function () { collect(); frame(); }, 3000);

      /* se o app já estava aberto (sessão), reativa ao voltar do gate */
      doc.addEventListener('hats444:app-shown', function () {
        collect(); frame();
      });
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.Hats444ScrollFX = { refresh: function () { collect(); frame(); } };
})(window);