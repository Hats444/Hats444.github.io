-- Hats444 — RPC API (works with publishable/anon key on GitHub Pages)
-- Run after schema.sql. Edge Functions optional; these RPCs are the primary API.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- App settings (admin hash + token secret for HMAC-less session tokens)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO public.app_settings (key, value) VALUES
  ('admin_password_hash', '38a1a3fd9a39d2e73be80a315152900433ee2f5281e480a62ddf8bcc60c20a4a'),
  ('enter_debounce_seconds', '30')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_app_settings" ON public.app_settings;
CREATE POLICY "deny_anon_app_settings"
  ON public.app_settings FOR ALL TO anon, authenticated USING (false);

-- ── track enter ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.api_track_enter(
  p_visitor_uuid text,
  p_session_id   text,
  p_user_agent   text DEFAULT NULL,
  p_browser      text DEFAULT NULL,
  p_os           text DEFAULT NULL,
  p_device       text DEFAULT NULL,
  p_referer      text DEFAULT NULL,
  p_timestamp    timestamptz DEFAULT now()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  debounce_sec integer;
  since        timestamptz;
  stats        json;
BEGIN
  IF p_visitor_uuid IS NULL OR length(p_visitor_uuid) > 64 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_visitor_uuid');
  END IF;
  IF p_session_id IS NULL OR length(p_session_id) > 64 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_session_id');
  END IF;

  SELECT COALESCE(value::integer, 30) INTO debounce_sec
  FROM app_settings WHERE key = 'enter_debounce_seconds';

  since := now() - (debounce_sec || ' seconds')::interval;

  IF EXISTS (
    SELECT 1 FROM access_logs
    WHERE visitor_uuid = p_visitor_uuid AND entered_at >= since
    LIMIT 1
  ) THEN
    SELECT public.get_public_stats() INTO stats;
    RETURN json_build_object('ok', true, 'skipped', 'rate_limited', 'stats', stats);
  END IF;

  INSERT INTO access_logs (
    visitor_uuid, session_id, user_agent, browser, os, device, referer, entered_at
  ) VALUES (
    left(p_visitor_uuid, 64),
    left(p_session_id, 64),
    left(COALESCE(p_user_agent, ''), 512),
    left(COALESCE(p_browser, ''), 64),
    left(COALESCE(p_os, ''), 64),
    left(COALESCE(p_device, ''), 32),
    left(COALESCE(p_referer, ''), 512),
    COALESCE(p_timestamp, now())
  );

  SELECT public.get_public_stats() INTO stats;
  RETURN json_build_object('ok', true, 'stats', stats);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok', false, 'error', 'insert_failed');
END;
$$;

-- ── presence heartbeat / leave ───────────────────────────────
CREATE OR REPLACE FUNCTION public.api_presence(
  p_action       text,
  p_visitor_uuid text,
  p_session_id   text,
  p_page_visible boolean DEFAULT true,
  p_user_agent   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_visitor_uuid IS NULL OR length(p_visitor_uuid) > 64 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_ids');
  END IF;
  IF p_session_id IS NULL OR length(p_session_id) > 64 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_ids');
  END IF;

  IF p_action = 'leave' THEN
    DELETE FROM online_users WHERE visitor_uuid = left(p_visitor_uuid, 64);
    PERFORM public.refresh_online_count();
    RETURN json_build_object('ok', true);
  END IF;

  IF p_action = 'heartbeat' THEN
    INSERT INTO online_users (visitor_uuid, session_id, last_seen_at, page_visible, user_agent)
    VALUES (
      left(p_visitor_uuid, 64),
      left(p_session_id, 64),
      now(),
      COALESCE(p_page_visible, true),
      left(COALESCE(p_user_agent, ''), 512)
    )
    ON CONFLICT (visitor_uuid) DO UPDATE SET
      session_id   = EXCLUDED.session_id,
      last_seen_at = EXCLUDED.last_seen_at,
      page_visible = EXCLUDED.page_visible,
      user_agent   = EXCLUDED.user_agent;

    RETURN json_build_object('ok', true);
  END IF;

  RETURN json_build_object('ok', false, 'error', 'invalid_action');
END;
$$;

-- ── admin login ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.api_admin_login(p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  expected_hash text;
  input_hash    text;
  new_token     text;
  v_token_hash  text;
  expires_at    timestamptz;
BEGIN
  SELECT value INTO expected_hash FROM app_settings WHERE key = 'admin_password_hash';
  IF expected_hash IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'server_misconfigured');
  END IF;

  input_hash := encode(digest(COALESCE(p_password, ''), 'sha256'), 'hex');
  IF input_hash <> expected_hash THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  new_token  := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(new_token, 'sha256'), 'hex');
  expires_at := now() + interval '24 hours';

  INSERT INTO admin_sessions (token_hash, expires_at)
  VALUES (v_token_hash, expires_at)
  ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  RETURN json_build_object(
    'ok', true,
    'token', new_token,
    'expires_at', (extract(epoch from expires_at) * 1000)::bigint
  );
END;
$$;

-- ── admin dashboard data ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.api_admin_data(
  p_token text,
  p_days  integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_hash text;
  since      timestamptz;
  logs       json;
  stats      json;
  by_day     json;
  by_hour    json;
  breakdown  json;
  recent     json;
  total      integer;
  d          integer;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  IF NOT EXISTS (
    SELECT 1 FROM admin_sessions s
    WHERE s.token_hash = v_token_hash AND s.expires_at > now()
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  d := LEAST(GREATEST(COALESCE(p_days, 30), 1), 90);
  since := now() - (d || ' days')::interval;

  SELECT count(*)::integer INTO total
  FROM access_logs WHERE entered_at >= since;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY entered_at DESC), '[]'::json)
  INTO logs
  FROM (
    SELECT * FROM access_logs
    WHERE entered_at >= since
    ORDER BY entered_at DESC
    LIMIT 500
  ) t;

  SELECT json_object_agg(day_key, cnt ORDER BY day_key)
  INTO by_day
  FROM (
    SELECT to_char(entered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day_key, count(*)::integer AS cnt
    FROM access_logs WHERE entered_at >= since
    GROUP BY 1
  ) x;

  SELECT COALESCE(json_agg(json_build_object('hour', h, 'count', COALESCE(c.cnt, 0)) ORDER BY h), '[]'::json)
  INTO by_hour
  FROM generate_series(0, 23) AS h
  LEFT JOIN (
    SELECT extract(hour from entered_at AT TIME ZONE 'UTC')::integer AS hr, count(*)::integer AS cnt
    FROM access_logs WHERE entered_at >= since
    GROUP BY 1
  ) c ON c.hr = h;

  SELECT json_build_object(
    'browser', COALESCE((SELECT json_agg(json_build_object('name', COALESCE(browser, 'Desconhecido'), 'count', cnt)) FROM (
      SELECT browser, count(*)::integer cnt FROM access_logs WHERE entered_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) b), '[]'::json),
    'os', COALESCE((SELECT json_agg(json_build_object('name', COALESCE(os, 'Desconhecido'), 'count', cnt)) FROM (
      SELECT os, count(*)::integer cnt FROM access_logs WHERE entered_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) o), '[]'::json),
    'device', COALESCE((SELECT json_agg(json_build_object('name', COALESCE(device, 'Desconhecido'), 'count', cnt)) FROM (
      SELECT device, count(*)::integer cnt FROM access_logs WHERE entered_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) d), '[]'::json),
    'country', COALESCE((SELECT json_agg(json_build_object('name', COALESCE(country, 'Desconhecido'), 'count', cnt)) FROM (
      SELECT country, count(*)::integer cnt FROM access_logs WHERE entered_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) c), '[]'::json),
    'referer', COALESCE((SELECT json_agg(json_build_object('name', COALESCE(NULLIF(referer, ''), 'Direto'), 'count', cnt)) FROM (
      SELECT referer, count(*)::integer cnt FROM access_logs WHERE entered_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) r), '[]'::json)
  ) INTO breakdown;

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY entered_at DESC), '[]'::json)
  INTO recent
  FROM (SELECT * FROM access_logs WHERE entered_at >= since ORDER BY entered_at DESC LIMIT 50) r;

  SELECT public.get_public_stats() INTO stats;

  RETURN json_build_object(
    'ok', true,
    'stats', stats,
    'by_day', COALESCE(by_day, '{}'::json),
    'by_hour', by_hour,
    'breakdown', breakdown,
    'recent', recent,
    'total_in_range', total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_track_enter(text, text, text, text, text, text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_presence(text, text, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_admin_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_admin_data(text, integer) TO anon, authenticated;
