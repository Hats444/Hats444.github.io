(function (global) {
  'use strict';

  function M(s) { return String(s == null ? '' : s); }
  const MH = M;

  const ICONS = {
    chat:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    telegram:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    github:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>',
    lock:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  };

  const SYS_BY_TITLE = {
    'Multi-sessão': 'session',
    'Proteção de grupo': 'shield',
    'Vendas e PIX': 'pay',
    'Divulgação': 'div',
    'Downloads e consulta': 'dl',
    'Fontes públicas': 'osint',
    'Pareamento': 'pair',
    'Host e entrega': 'host',
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(card, cacheBust, index) {
    const v = cacheBust || Date.now();
    const img = esc(card.image || '') + '?v=' + v;
    const statusClass = card.statusPrivate ? ' is-private' : '';
    const icon = ICONS[card.buttonIcon] || ICONS.chat;
    const flag = index === 0 ? ' is-flagship' : '';
    let buttonHtml;
    if (card.buttonType === 'locked') {
      buttonHtml =
        '<span class="btn-card is-locked">' + (ICONS.lock || '') + ' ' + esc(M(card.buttonLabel)) + '</span>';
    } else {
      buttonHtml =
        '<a href="' +
        esc(card.buttonUrl || '#') +
        '" target="_blank" rel="noopener noreferrer" class="btn-card">' +
        icon +
        ' ' +
        esc(M(card.buttonLabel || 'ABRIR')) +
        '</a>';
    }
    const tech = index === 0
      ? '<p class="card-meta">Telegram + WhatsApp · Mercado Pago · Baileys</p>'
      : '';
    return (
      '<article class="dkc-card' + flag + '">' +
      '<div class="card-avatar ' +
      esc(card.avatarClass || '') +
      '">' +
      '<img src="' +
      img +
      '" alt="' +
      esc(card.imageAlt || card.name) +
      '" class="avatar-img" loading="lazy" width="88" height="88">' +
      '</div>' +
      '<h3 class="card-name">' +
      esc(M(card.name)) +
      ' <span class="tag">' +
      esc(M(card.tag)) +
      '</span></h3>' +
      '<p class="card-status' +
      statusClass +
      '">' +
      esc(M(card.status)) +
      '</p>' +
      tech +
      '<p class="card-desc">' +
      esc(M(card.desc)) +
      '</p>' +
      buttonHtml +
      '</article>'
    );
  }

  function applyMeta(data) {
    const meta = data.meta || {};
    if (meta.title) document.title = M(meta.title);
    const desc = document.querySelector('meta[name="description"]');
    if (desc && meta.description) desc.setAttribute('content', meta.description);
    const gateDesc = document.querySelector('.gate-desc');
    if (gateDesc && meta.gateDesc) gateDesc.textContent = M(meta.gateDesc);
    const gateVer = document.getElementById('gate-version');
    if (gateVer && meta.gateVersion) gateVer.textContent = M('VER: ' + meta.gateVersion);
    const introTitle = document.querySelector('.intro h2');
    if (introTitle && meta.introTitle) introTitle.innerHTML = MH(meta.introTitle);
    const introText = document.querySelector('.intro-text');
    if (introText && meta.introText) introText.textContent = M(meta.introText);
  }

  const CAP_GROUPS = [
    {
      label: 'Plataformas',
      items: [
        'WhatsApp + Telegram',
        'Multi-sessão Baileys',
        'Pareamento QR / código',
        'Prefixo live no Zap',
        'Menus com botões',
        'Frase natural',
        'XP / níveis / quotas',
      ],
    },
    {
      label: 'Pagamentos',
      items: [
        'PIX Mercado Pago',
        'Cartão e boleto',
        'Starter R$29/mês',
        'Pro R$49/mês',
        'Enterprise R$99/mês',
        'Trimestral / anual',
        'Day pass R$1',
        'Afiliado com VIP',
      ],
    },
    {
      label: 'Proteção',
      items: [
        'Antilink / anti-flood',
        'Anti-admin / anti-delete',
        'Anti-ataque (defesa)',
        'Painel .gpseguranca',
      ],
    },
    {
      label: 'Distribuição',
      items: [
        'Divulgação em grupos',
        'Gerenciador de convites',
        'Ocupação META',
        'Grupo morto auto-repõe',
      ],
    },
    {
      label: 'Consultas e mídia',
      items: [
        'Downloads (YT, TT, IG, SP)',
        'Figurinhas e canal',
        'Consultas e inteligência pública',
        'API Hanork (~750 cmds)',
        'Fontes públicas',
      ],
    },
    {
      label: 'Hospedagem',
      items: ['Host / backup', 'Entrega do zip sem .env'],
    },
  ];

  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  var LEAD_TITLES = ['Multi-sessão', 'Proteção de grupo', 'Vendas e PIX'];

  function focusArticle(item, i, lead) {
    var sys = SYS_BY_TITLE[item.title] || 'session';
    return (
      '<article class="focus-item' +
      (lead ? ' is-lead' : '') +
      '" data-numeral="' +
      (ROMAN[i] || String(i + 1)) +
      '" data-sys="' +
      sys +
      '" style="--i:' +
      i +
      '">' +
      '<span class="focus-glyph" aria-hidden="true">' +
      (ROMAN[i] || String(i + 1)) +
      '</span>' +
      '<h3>' +
      esc(M(item.title)) +
      '</h3>' +
      '<p>' +
      esc(M(item.text)) +
      '</p>' +
      '</article>'
    );
  }

  function renderFocus(items) {
    const grid = document.getElementById('focus-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    const indexed = items.map(function (item, i) { return { item: item, i: i }; });
    const lead = [];
    LEAD_TITLES.forEach(function (title) {
      indexed.forEach(function (row) {
        if (row.item.title === title) lead.push(row);
      });
    });
    const rest = indexed.filter(function (row) {
      return LEAD_TITLES.indexOf(row.item.title) === -1;
    });
    grid.innerHTML =
      '<div class="focus-lead">' +
      lead.map(function (row) { return focusArticle(row.item, row.i, true); }).join('') +
      '</div>' +
      '<div class="focus-rest">' +
      rest.map(function (row) { return focusArticle(row.item, row.i, false); }).join('') +
      '</div>';
  }

  function renderCapabilities(items) {
    const el = document.getElementById('caps-grid');
    if (!el || !Array.isArray(items) || !items.length) return;
    const leftover = items.slice();
    const groups = CAP_GROUPS.map(function (g) {
      const found = [];
      g.items.forEach(function (name) {
        const idx = leftover.indexOf(name);
        if (idx !== -1) found.push(leftover.splice(idx, 1)[0]);
      });
      return { label: g.label, items: found };
    }).filter(function (g) { return g.items.length; });
    if (leftover.length) groups.push({ label: 'Outros', items: leftover });
    el.innerHTML = groups
      .map(function (g, i) {
        return (
          '<details class="caps-group"' +
          (i === 0 ? ' open' : '') +
          '>' +
          '<summary class="caps-cat">' +
          esc(M(g.label)) +
          '</summary>' +
          '<div class="chip-row">' +
          g.items.map(function (s) {
            return '<span class="chip">' + esc(M(s)) + '</span>';
          }).join('') +
          '</div></details>'
        );
      })
      .join('');
    syncCapsAccordion();
  }

  function syncCapsAccordion() {
    var groups = document.querySelectorAll('#caps-grid details.caps-group');
    if (!groups.length) return;
    var desktop = window.matchMedia('(min-width: 720px)').matches;
    groups.forEach(function (node, i) {
      if (desktop) node.open = true;
      else if (i === 0 && !node.dataset.userToggled) node.open = true;
    });
  }

  function renderChips(elId, items) {
    const el = document.getElementById(elId);
    if (!el || !Array.isArray(items) || !items.length) return;
    el.innerHTML = items.map(function (s) {
      var opt = String(s).toLowerCase().indexOf('opcional') !== -1 ? ' class="is-optional"' : '';
      return '<span' + opt + '>' + esc(M(s)) + '</span>';
    }).join('');
  }

  function render(data) {
    const grid = document.getElementById('cards-grid');
    if (grid && Array.isArray(data.cards)) {
      const bust = data.updatedAt || Date.now();
      grid.innerHTML = data.cards.map(function (c, i) { return renderCard(c, bust, i); }).join('');
    }
    applyMeta(data);
    renderFocus(data.focus);
    renderCapabilities(data.capabilities);
    renderChips('stack-grid', data.stack);
    renderChips('partners-row', data.partners);
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

  window.addEventListener('resize', syncCapsAccordion);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }

  global.Hats444SiteContent = { load: load, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
