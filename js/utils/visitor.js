/**
 * Visitor identity — persistent UUID + per-tab session id.
 */
(function (global) {
  'use strict';

  const VISITOR_KEY = 'hats444_visitor_uuid';
  const SESSION_KEY = 'hats444_session_id';

  function randomId() {
    if (global.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  function getVisitorUuid() {
    let id = readStorage(VISITOR_KEY);
    if (!id) {
      id = randomId();
      writeStorage(VISITOR_KEY, id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      try {
        sessionStorage.setItem(SESSION_KEY, id);
      } catch {
        /* ignore */
      }
    }
    return id;
  }

  function getLastEnterAt() {
    try {
      return parseInt(localStorage.getItem('hats444_last_enter_at') || '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function setLastEnterAt(ts) {
    try {
      localStorage.setItem('hats444_last_enter_at', String(ts));
    } catch {
      /* ignore */
    }
  }

  global.Hats444Visitor = {
    getVisitorUuid,
    getSessionId,
    getLastEnterAt,
    setLastEnterAt,
  };
})(window);
