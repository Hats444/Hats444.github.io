/**
 * DOM helpers for analytics counters — gate + session bar.
 */
(function (global) {
  'use strict';

  const IDS = {
    gate: {
      online: 'gate-stat-online',
      visitors: 'gate-stat-visitors',
      accesses: 'gate-stat-accesses',
    },
    session: {
      online: 'stat-online',
      visitors: 'stat-visitors',
      accesses: 'stat-accesses',
    },
  };

  function formatNum(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number(n).toLocaleString('pt-BR');
  }

  function mono(s) {
    return global.Hats444Mono && global.Hats444Mono.toMonoMath
      ? global.Hats444Mono.toMonoMath(s)
      : s;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateStats(stats) {
    const online = formatNum(stats.online);
    const visitors = formatNum(stats.visitors);
    const accesses = formatNum(stats.accesses);

    setText(IDS.gate.online, '👥 ' + mono(online));
    setText(IDS.gate.visitors, '👤 ' + mono(visitors));
    setText(IDS.gate.accesses, '📈 ' + mono(accesses));

    setText(IDS.session.online, mono('ONLINE: ' + online));
    setText(IDS.session.visitors, mono('VISITANTES: ' + visitors));
    setText(IDS.session.accesses, mono('ACESSOS: ' + accesses));
  }

  global.Hats444AnalyticsBar = { updateStats, formatNum };
})(window);
