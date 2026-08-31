(function (global) {
  'use strict';

  const Mono = global.Hats444Mono || {
    toMonoMath: function (s) { return s; },
    toMonoMathHtml: function (s) { return s; },
  };
  const M = Mono.toMonoMath;
  const MH = Mono.toMonoMathHtml;

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
        '<span class="btn-card is-locked">' + (ICONS.lock || '') + ' ' + esc(M(card.buttonLabel)) + '</span>';
    } else {
      buttonHtml =
        '<a href="' +
        esc(card.buttonUrl || '#') +
        '" target="_blank" rel="noopener" class="btn-card">' +
        icon +
        ' ' +
        esc(M(card.buttonLabel || 'ABRIR')) +
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
      esc(M(card.name)) +
      ' <span class="tag">' +
      esc(M(card.tag)) +
      '</span></h3>' +
      '<p class="card-status' +
      statusClass +
      '">' +
      esc(M(card.status)) +
      '</p>' +
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
    const introTitle = document.querySelector('.intro h2');
    if (introTitle && meta.introTitle) introTitle.innerHTML = MH(meta.introTitle);
    const introText = document.querySelector('.intro-text');
    if (introText && meta.introText) introText.textContent = M(meta.introText);
    const gateDesc = document.querySelector('.gate-desc');
    if (gateDesc && meta.gateDesc) gateDesc.textContent = M(meta.gateDesc);
    const gateVer = document.getElementById('gate-version');
    if (gateVer && meta.gateVersion) gateVer.textContent = M('VER: ' + meta.gateVersion);
  }

  const CAP_GROUPS = [
    {
      label: 'WhatsApp / Telegram',
      items: [
        'WhatsApp + Telegram',
        'Multi-sessao Baileys',
        'Pareamento QR / codigo',
        'Prefixo live no Zap',
        'Menus com botoes',
        'Frase natural',
        'XP / niveis / quotas',
      ],
    },
    {
      label: 'Pagamentos',
      items: [
        'PIX Mercado Pago',
        'Cartao e boleto',
        'Starter R$29/mes',
        'Pro R$49/mes',
        'Enterprise R$99/mes',
        'Trimestral / anual',
        'Day pass R$1',
        'Afiliado com VIP',
      ],
    },
    {
      label: 'Seguranca',
      items: [
        'Antilink / anti-flood',
        'Anti-admin / anti-delete',
        'Anti-ataque (defesa)',
        'Painel .gpseguranca',
      ],
    },
    {
      label: 'Divulgacao',
      items: [
        'Divulgacao em grupos',
        'Gerenciador de convites',
        'Ocupacao META',
        'Grupo morto auto-repor',
      ],
    },
    {
      label: 'Downloads / Intel',
      items: [
        'Downloads (YT, TT, IG, SP)',
        'Figurinhas e canal',
        'Consultas CPF / nome / placa',
        'API Hanork (~750 cmds)',
        'OSINT publico completo',
      ],
    },
    {
      label: 'Host',
      items: ['Host / backup', 'Entrega do zip sem .env'],
    },
  ];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function renderFocus(items) {
    const grid = document.getElementById('focus-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    grid.innerHTML = items
      .map(function (item, i) {
        return (
          '<article class="focus-item" style="--i:' +
          i +
          '">' +
          '<span class="focus-glyph" aria-hidden="true">// ' +
          pad2(i + 1) +
          '</span>' +
          '<h3>' +
          esc(M(item.title)) +
          '</h3>' +
          '<p>' +
          esc(M(item.text)) +
          '</p>' +
          '</article>'
        );
      })
      .join('');
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
      .map(function (g) {
        return (
          '<div class="caps-group">' +
          '<p class="caps-cat">' +
          esc(M(g.label)) +
          '</p>' +
          '<div class="chip-row">' +
          g.items.map(function (s) {
            return '<span class="chip">' + esc(M(s)) + '</span>';
          }).join('') +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderChips(elId, items) {
    const el = document.getElementById(elId);
    if (!el || !Array.isArray(items) || !items.length) return;
    el.innerHTML = items.map(function (s) { return '<span>' + esc(M(s)) + '</span>'; }).join('');
  }

  function render(data) {
    const grid = document.getElementById('cards-grid');
    if (grid && Array.isArray(data.cards)) {
      const bust = data.updatedAt || Date.now();
      grid.innerHTML = data.cards.map(function (c) { return renderCard(c, bust); }).join('');
    }
    applyMeta(data);
    renderFocus(data.focus);
    renderCapabilities(data.capabilities);
    renderChips('stack-grid', data.stack);
    renderChips('partners-row', data.partners);
    if (Mono.applyToTree) {
      Mono.applyToTree(document.getElementById('gate'));
      Mono.applyToTree(document.getElementById('app'));
    }
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

  global.Hats444SiteContent = { load: load, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
