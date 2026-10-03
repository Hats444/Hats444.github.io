/**
 * Enxame do dashboard HANORK vendas: dragão + centopeia no portfólio.
 */
(function () {
  var started = false;

  function shouldRun() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (window.matchMedia('(max-width: 719px)').matches) return false;
    if (document.documentElement.classList.contains('gate-open')) return false;
    return true;
  }

  function start() {
    if (started || !shouldRun()) return;
    var site = document.getElementById('creatures-site');
    var screen = document.querySelector('#dragon-svg #screen');
    var screenHybrid = document.querySelector('#dragon-svg #screen-hybrid');
    var canvas = document.getElementById('centipede-canvas');
    var canvasDragon = document.getElementById('centipede-dragon-canvas');
    var legsCanvas = document.getElementById('dragon-centipede-legs');
    if (!site || !screen || !screenHybrid || !canvas || !canvasDragon || !legsCanvas) return;
    if (typeof window.initCreatureSwarm !== 'function') return;
    var swarm = window.initCreatureSwarm({
      boundsEl: site,
      visualScale: 0.68,
      dragonScreen: screen,
      dragonHybridScreen: screenHybrid,
      centipedeCanvas: canvas,
      centipedeDragonCanvas: canvasDragon,
      dragonCentipedeLegsCanvas: legsCanvas
    });
    if (!swarm) return;
    started = true;
    site.classList.add('ready');
  }

  function boot() {
    start();
    document.addEventListener('hats444:app-shown', start);
    try {
      new MutationObserver(start).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
