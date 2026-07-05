/**
 * Lightweight user-agent parsing (no external deps).
 */
(function (global) {
  'use strict';

  function detectBrowser(ua) {
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/MSIE|Trident/i.test(ua)) return 'IE';
    return 'Outro';
  }

  function detectOS(ua) {
    if (/Windows NT/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Outro';
  }

  function detectDevice(ua) {
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function getClientInfo() {
    const ua = navigator.userAgent || '';
    return {
      userAgent: ua,
      browser: detectBrowser(ua),
      os: detectOS(ua),
      device: detectDevice(ua),
      referer: document.referrer || '',
      language: navigator.language || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    };
  }

  global.Hats444Device = { getClientInfo, detectBrowser, detectOS, detectDevice };
})(window);
