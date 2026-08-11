(function (global) {
  'use strict';

  /** Mathematical Monospace: A-Z U+1D670, a-z U+1D68A, 0-9 U+1D7F6 */
  const ACCENT = {
    Á: 'A', À: 'A', Ã: 'A', Â: 'A', Ä: 'A',
    É: 'E', È: 'E', Ê: 'E', Ë: 'E',
    Í: 'I', Ì: 'I', Î: 'I', Ï: 'I',
    Ó: 'O', Ò: 'O', Õ: 'O', Ô: 'O', Ö: 'O',
    Ú: 'U', Ù: 'U', Û: 'U', Ü: 'U',
    Ç: 'C', Ñ: 'N',
    á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a',
    é: 'e', è: 'e', ê: 'e', ë: 'e',
    í: 'i', ì: 'i', î: 'i', ï: 'i',
    ó: 'o', ò: 'o', õ: 'o', ô: 'o', ö: 'o',
    ú: 'u', ù: 'u', û: 'u', ü: 'u',
    ç: 'c', ñ: 'n',
  };

  function toMonoMath(input) {
    const s = String(input == null ? '' : input);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      let ch = s[i];
      if (ACCENT[ch]) ch = ACCENT[ch];
      const code = ch.codePointAt(0);
      if (code >= 0x41 && code <= 0x5a) {
        out += String.fromCodePoint(0x1d670 + (code - 0x41));
      } else if (code >= 0x61 && code <= 0x7a) {
        out += String.fromCodePoint(0x1d68a + (code - 0x61));
      } else if (code >= 0x30 && code <= 0x39) {
        out += String.fromCodePoint(0x1d7f6 + (code - 0x30));
      } else {
        out += ch;
      }
    }
    return out;
  }

  /** Converte texto; preserva tags HTML (ex.: &lt;br&gt;). */
  function toMonoMathHtml(html) {
    return String(html || '').replace(/(<[^>]+>)|([^<]+)/g, function (_, tag, text) {
      return tag || toMonoMath(text);
    });
  }

  const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'CANVAS', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

  function applyToTree(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const p = node.parentElement;
        if (!p || SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('svg')) return NodeFilter.FILTER_REJECT;
        const t = node.nodeValue;
        if (!t || !/[A-Za-z0-9À-ÿ]/.test(t)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      n.nodeValue = toMonoMath(n.nodeValue);
    });
  }

  global.Hats444Mono = { toMonoMath: toMonoMath, toMonoMathHtml: toMonoMathHtml, applyToTree: applyToTree };
})(typeof window !== 'undefined' ? window : globalThis);
