/**
 * Analytics API — Supabase RPC (GitHub Pages) with optional Edge Function fallback.
 */
(function (global) {
  'use strict';

  function getConfig() {
    return global.HATS444_CONFIG || {};
  }

  function isConfigured() {
    const cfg = getConfig();
    return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  }

  function functionsBase() {
    const cfg = getConfig();
    if (cfg.functionsUrl) return cfg.functionsUrl.replace(/\/$/, '');
    return cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1';
  }

  function getClient() {
    if (!isConfigured() || !global.supabase || !global.supabase.createClient) return null;
    if (!getClient._instance) {
      const cfg = getConfig();
      getClient._instance = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return getClient._instance;
  }

  async function callFunction(name, body, options) {
    const cfg = getConfig();
    if (!isConfigured()) {
      return { ok: false, error: 'not_configured' };
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
      Authorization: 'Bearer ' + cfg.supabaseAnonKey,
    };

    if (options && options.adminToken) {
      headers['X-Admin-Token'] = options.adminToken;
    }

    try {
      const res = await fetch(functionsBase() + '/' + name, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        keepalive: options && options.keepalive,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || res.statusText, status: res.status, data };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  }

  async function rpc(name, params) {
    const client = getClient();
    if (!client) return { ok: false, error: 'not_configured' };

    try {
      const { data, error } = await client.rpc(name, params);
      if (error) {
        return { ok: false, error: error.message || 'rpc_error', data };
      }
      if (data && data.ok === false) {
        return { ok: false, error: data.error || 'rpc_failed', data };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || 'network_error' };
    }
  }

  function trackEnter(payload) {
    return rpc('api_track_enter', {
      p_visitor_uuid: payload.visitor_uuid,
      p_session_id: payload.session_id,
      p_user_agent: payload.user_agent,
      p_browser: payload.browser,
      p_os: payload.os,
      p_device: payload.device,
      p_referer: payload.referer,
      p_timestamp: payload.timestamp,
    });
  }

  function sendHeartbeat(payload) {
    return rpc('api_presence', {
      p_action: 'heartbeat',
      p_visitor_uuid: payload.visitor_uuid,
      p_session_id: payload.session_id,
      p_page_visible: payload.page_visible !== false,
      p_user_agent: payload.user_agent,
    });
  }

  function sendLeave(payload) {
    const client = getClient();
    if (!client) return Promise.resolve({ ok: false, error: 'not_configured' });

    const body = {
      p_action: 'leave',
      p_visitor_uuid: payload.visitor_uuid,
      p_session_id: payload.session_id,
      p_page_visible: false,
      p_user_agent: payload.user_agent,
    };

    if (navigator.sendBeacon && typeof URLSearchParams !== 'undefined') {
      try {
        const cfg = getConfig();
        const url =
          cfg.supabaseUrl.replace(/\/$/, '') +
          '/rest/v1/rpc/api_presence?apikey=' +
          encodeURIComponent(cfg.supabaseAnonKey);
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return Promise.resolve({ ok: true });
      } catch {
        /* fallback */
      }
    }

    return rpc('api_presence', body);
  }

  function adminLogin(password) {
    return rpc('api_admin_login', { p_password: password });
  }

  async function fetchAdminData(adminToken, query) {
    const days = (query && query.days) || 30;
    const result = await rpc('api_admin_data', {
      p_token: adminToken,
      p_days: parseInt(days, 10) || 30,
    });

    if (!result.ok) return result;

    const data = result.data || {};
    const byDayObj = data.by_day || {};
    const byDay = Object.entries(byDayObj)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      ok: true,
      data: {
        ...data,
        by_day: byDay,
      },
    };
  }

  global.Hats444AnalyticsApi = {
    isConfigured,
    getConfig,
    getClient,
    trackEnter,
    sendHeartbeat,
    sendLeave,
    adminLogin,
    fetchAdminData,
    callFunction,
  };
})(window);
