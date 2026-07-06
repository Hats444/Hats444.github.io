(function () {
  'use strict';

  const ICONS = {
    chat:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    telegram:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    lock:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  };

  const AVATAR_STYLE =
    'width:88px;height:88px;min-width:88px;max-width:88px;min-height:88px;max-height:88px;overflow:hidden;flex-shrink:0';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(card, cacheBust) {
    const v = cacheBust || Date.now();
    const img = esc(card.image || '') + '?v=' + v;
    const statusClass = card.statusPrivate ? ' is-private' : '';
    const icon = ICONS[card.buttonIcon] || ICONS.chat;
    let buttonHtml;
    if (card.buttonType === 'locked') {
      buttonHtml =
        '<span class="btn-card is-locked">' + (ICONS.lock || '') + ' ' + esc(card.buttonLabel) + '</span>';
    } else {
      buttonHtml =
        '<a href="' +
        esc(card.buttonUrl || '#') +
        '" target="_blank" rel="noopener" class="btn-card">' +
        icon +
        ' ' +
        esc(card.buttonLabel || 'ABRIR') +
        '</a>';
    }
    return (
      '<article class="dkc-card">' +
      '<div class="card-avatar ' +
      esc(card.avatarClass || '') +
      '" style="' +
      AVATAR_STYLE +
      '">' +
      '<img src="' +
      img +
      '" alt="' +
      esc(card.imageAlt || card.name) +
      '" class="avatar-img" loading="lazy" width="88" height="88" style="width:88px;height:88px;object-fit:contain;display:block">' +
      '</div>' +
      '<h3 class="card-name">' +
      esc(card.name) +
      ' <span class="tag">' +
      esc(card.tag) +
      '</span></h3>' +
      '<p class="card-status' +
      statusClass +
      '">' +
      esc(card.status) +
      '</p>' +
      '<p class="card-desc">' +
      esc(card.desc) +
      '</p>' +
      buttonHtml +
      '</article>'
    );
  }

  function applyMeta(data) {
    const meta = data.meta || {};
    if (meta.title) document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && meta.description) desc.setAttribute('content', meta.description);
    const introTitle = document.querySelector('.intro h2');
    if (introTitle && meta.introTitle) introTitle.innerHTML = meta.introTitle;
    const introText = document.querySelector('.intro-text');
    if (introText && meta.introText) introText.textContent = meta.introText;
  }

  function render(data) {
    const grid = document.getElementById('cards-grid');
    if (!grid || !Array.isArray(data.cards)) return;
    const bust = data.updatedAt || Date.now();
    grid.innerHTML = data.cards.map((c) => renderCard(c, bust)).join('');
    applyMeta(data);
  }

  async function load() {
    try {
      const res = await fetch('/data/site-content.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      render(data);
    } catch (_) {
      /* fallback: HTML estático permanece */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }

  global.Hats444SiteContent = { load, render };
})();
