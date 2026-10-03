/**
 * Hanork adaptation wheel — CSS spin only.
 * No 3D tilt, ghosts, click impulse, or particles (those broke desktop).
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  var stage = document.createElement('div');
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

  if (reduced) {
    stage.classList.add('is-still');
  }
})();
