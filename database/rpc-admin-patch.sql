-- Patch: pgcrypto digest in admin RPCs (Supabase extensions schema)
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
  token_hash    text;
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
  token_hash := encode(digest(new_token, 'sha256'), 'hex');
  expires_at := now() + interval '24 hours';

  INSERT INTO admin_sessions (token_hash, expires_at)
  VALUES (token_hash, expires_at)
  ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  RETURN json_build_object(
    'ok', true,
    'token', new_token,
    'expires_at', (extract(epoch from expires_at) * 1000)::bigint
  );
END;
$$;

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
  token_hash text;
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

  token_hash := encode(digest(p_token, 'sha256'), 'hex');

  IF NOT EXISTS (
    SELECT 1 FROM admin_sessions s
    WHERE s.token_hash = token_hash AND s.expires_at > now()
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

  SELECT public.get_public_stats() INTO stats;

  SELECT COALESCE(json_object_agg(day::text, cnt), '{}'::json)
  INTO by_day
  FROM (
    SELECT date_trunc('day', entered_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
           count(*)::integer AS cnt
    FROM access_logs
    WHERE entered_at >= since
    GROUP BY 1
    ORDER BY 1
  ) sub;

  SELECT COALESCE(json_object_agg(hour::text, cnt), '{}'::json)
  INTO by_hour
  FROM (
    SELECT extract(hour from entered_at AT TIME ZONE 'America/Sao_Paulo')::integer AS hour,
           count(*)::integer AS cnt
    FROM access_logs
    WHERE entered_at >= since
    GROUP BY 1
    ORDER BY 1
  ) sub;

  SELECT json_build_object(
    'browsers', COALESCE((
      SELECT json_agg(json_build_object('name', browser, 'count', cnt))
      FROM (
        SELECT COALESCE(NULLIF(browser, ''), 'Desconhecido') AS browser, count(*)::integer AS cnt
        FROM access_logs WHERE entered_at >= since
        GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) b
    ), '[]'::json),
    'os', COALESCE((
      SELECT json_agg(json_build_object('name', os, 'count', cnt))
      FROM (
        SELECT COALESCE(NULLIF(os, ''), 'Desconhecido') AS os, count(*)::integer AS cnt
        FROM access_logs WHERE entered_at >= since
        GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) o
    ), '[]'::json),
    'devices', COALESCE((
      SELECT json_agg(json_build_object('name', device, 'count', cnt))
      FROM (
        SELECT COALESCE(NULLIF(device, ''), 'Desconhecido') AS device, count(*)::integer AS cnt
        FROM access_logs WHERE entered_at >= since
        GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) d2
    ), '[]'::json),
    'referers', COALESCE((
      SELECT json_agg(json_build_object('name', referer, 'count', cnt))
      FROM (
        SELECT COALESCE(NULLIF(referer, ''), 'Direto') AS referer, count(*)::integer AS cnt
        FROM access_logs WHERE entered_at >= since
        GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) r
    ), '[]'::json)
  ) INTO breakdown;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY entered_at DESC), '[]'::json)
  INTO recent
  FROM (
    SELECT id, visitor_uuid, session_id, entered_at, browser, os, device, country, city, referer
    FROM access_logs
    ORDER BY entered_at DESC
    LIMIT 50
  ) t;

  RETURN json_build_object(
    'ok', true,
    'stats', stats,
    'by_day', by_day,
    'by_hour', by_hour,
    'breakdown', breakdown,
    'recent', recent,
    'total_in_range', total
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
