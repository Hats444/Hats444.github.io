/**
 * Analytics orchestrator — enter tracking, presence heartbeat, realtime stats.
 */
(function (global) {
  'use strict';

  const Api = () => global.Hats444AnalyticsApi;
  const Visitor = () => global.Hats444Visitor;
  const Device = () => global.Hats444Device;
  const Bar = () => global.Hats444AnalyticsBar;

  let supabaseClient = null;
  let heartbeatTimer = null;
  let statsChannel = null;
  let onlineChannel = null;
  let presenceActive = false;
  let currentStats = { online: 0, visitors: 0, accesses: 0 };

  function getConfig() {
    return global.HATS444_CONFIG || {};
  }

  function debounceSeconds() {
    const cfg = getConfig();
    return (cfg.enterDebounceSeconds || 30) * 1000;
  }

  function canTrackEnter() {
    const last = Visitor().getLastEnterAt();
    return Date.now() - last >= debounceSeconds();
  }

  function markEnterTracked() {
    Visitor().setLastEnterAt(Date.now());
  }

  function applyStats(partial) {
    currentStats = { ...currentStats, ...partial };
    if (Bar()) Bar().updateStats(currentStats);
  }

  async function fetchPublicStats() {
    if (!Api().isConfigured() || !supabaseClient) return;

    try {
      const { data, error } = await supabaseClient.rpc('get_public_stats');
      if (!error && data) {
        applyStats({
          online: data.online,
          visitors: data.visitors,
          accesses: data.accesses,
        });
      }
    } catch {
      /* ignore */
    }
  }

  function initSupabase() {
    if (!Api().isConfigured()) return null;
    if (supabaseClient) return supabaseClient;
    if (!global.supabase || !global.supabase.createClient) return null;

    const cfg = getConfig();
    supabaseClient = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 4 } },
    });
    return supabaseClient;
  }

  function subscribeRealtime() {
    const client = initSupabase();
    if (!client) return;

    if (statsChannel) client.removeChannel(statsChannel);

    statsChannel = client
      .channel('site-stats-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_stats' },
        (payload) => {
          const row = payload.new || payload.old;
          if (row) {
            applyStats({
              online: row.online_count,
              visitors: row.unique_visitors,
              accesses: row.total_accesses,
            });
          }
        }
      )
      .subscribe();

    if (onlineChannel) client.removeChannel(onlineChannel);

    onlineChannel = client
      .channel('online-users-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        () => {
          fetchPublicStats();
        }
      )
      .subscribe();
  }

  async function trackEnter() {
    if (!Api().isConfigured()) return { ok: false, skipped: 'not_configured' };
    if (!canTrackEnter()) return { ok: false, skipped: 'debounced' };

    const clientInfo = Device().getClientInfo();
    const payload = {
      visitor_uuid: Visitor().getVisitorUuid(),
      session_id: Visitor().getSessionId(),
      timestamp: new Date().toISOString(),
      ...clientInfo,
    };

    const result = await Api().trackEnter(payload);
    if (result.ok) {
      markEnterTracked();
      if (result.data && result.data.stats) {
        applyStats({
          online: result.data.stats.online,
          visitors: result.data.stats.visitors,
          accesses: result.data.stats.accesses,
        });
      } else {
        fetchPublicStats();
      }
    }
    return result;
  }

  async function sendHeartbeat() {
    if (!presenceActive || !Api().isConfigured()) return;

    await Api().sendHeartbeat({
      visitor_uuid: Visitor().getVisitorUuid(),
      session_id: Visitor().getSessionId(),
      page_visible: document.visibilityState === 'visible',
      user_agent: navigator.userAgent || '',
    });
  }

  function startPresence() {
    if (presenceActive) return;
    presenceActive = true;

    const cfg = getConfig();
    const interval = cfg.heartbeatIntervalMs || 25000;

    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, interval);

    document.addEventListener('visibilitychange', sendHeartbeat);

    window.addEventListener('pagehide', () => {
      Api().sendLeave({
        visitor_uuid: Visitor().getVisitorUuid(),
        session_id: Visitor().getSessionId(),
      });
    });
  }

  function stopPresence() {
    presenceActive = false;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function init() {
    if (!Api().isConfigured()) {
      if (Bar()) Bar().updateStats({ online: '—', visitors: '—', accesses: '—' });
      return;
    }

    initSupabase();
    fetchPublicStats();
    subscribeRealtime();

    // Poll fallback every 45s if realtime drops
    setInterval(fetchPublicStats, 45000);
  }

  global.Hats444Analytics = {
    init,
    trackEnter,
    startPresence,
    stopPresence,
    fetchPublicStats,
    getStats: () => ({ ...currentStats }),
  };
})(window);
