-- Hats444 Portfolio Analytics — Supabase schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- access_logs — one row per successful "Entrar" click
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_uuid  text NOT NULL,
  session_id    text NOT NULL,
  entered_at    timestamptz NOT NULL DEFAULT now(),
  ip_address    inet,
  user_agent    text,
  browser       text,
  os            text,
  device        text,
  country       text,
  city          text,
  referer       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_entered_at ON public.access_logs (entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_visitor_uuid ON public.access_logs (visitor_uuid);
CREATE INDEX IF NOT EXISTS idx_access_logs_session_id ON public.access_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_browser ON public.access_logs (browser);
CREATE INDEX IF NOT EXISTS idx_access_logs_os ON public.access_logs (os);
CREATE INDEX IF NOT EXISTS idx_access_logs_device ON public.access_logs (device);
CREATE INDEX IF NOT EXISTS idx_access_logs_country ON public.access_logs (country);

-- ─────────────────────────────────────────────────────────────
-- online_users — presence heartbeat (pruned after ~60s idle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.online_users (
  visitor_uuid  text PRIMARY KEY,
  session_id    text NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  page_visible  boolean NOT NULL DEFAULT true,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON public.online_users (last_seen_at DESC);

-- ─────────────────────────────────────────────────────────────
-- site_stats — singleton row for fast public reads + realtime
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_stats (
  id               smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_accesses   bigint NOT NULL DEFAULT 0,
  unique_visitors  bigint NOT NULL DEFAULT 0,
  online_count     integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- admin_sessions — optional server-side session tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token_hash  text PRIMARY KEY,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions (expires_at);

-- ─────────────────────────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────────────────────────

-- Recount online users active in the last 60 seconds
CREATE OR REPLACE FUNCTION public.refresh_online_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  DELETE FROM public.online_users
  WHERE last_seen_at < now() - interval '60 seconds';

  SELECT count(*)::integer INTO cnt FROM public.online_users;

  UPDATE public.site_stats
  SET online_count = cnt, updated_at = now()
  WHERE id = 1;
END;
$$;

-- Recompute unique visitors from access_logs
CREATE OR REPLACE FUNCTION public.refresh_unique_visitors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt bigint;
BEGIN
  SELECT count(DISTINCT visitor_uuid) INTO cnt FROM public.access_logs;

  UPDATE public.site_stats
  SET unique_visitors = cnt, updated_at = now()
  WHERE id = 1;
END;
$$;

-- Public aggregates (safe for anon SELECT)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'online', COALESCE((
      SELECT count(*)::integer FROM public.online_users
      WHERE last_seen_at >= now() - interval '60 seconds'
    ), 0),
    'visitors', COALESCE((SELECT unique_visitors FROM public.site_stats WHERE id = 1), 0),
    'accesses', COALESCE((SELECT total_accesses FROM public.site_stats WHERE id = 1), 0),
    'updated_at', (SELECT updated_at FROM public.site_stats WHERE id = 1)
  );
$$;

-- Trigger: increment totals on new access
CREATE OR REPLACE FUNCTION public.on_access_log_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_new_visitor boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.access_logs
    WHERE visitor_uuid = NEW.visitor_uuid AND id <> NEW.id
  ) INTO is_new_visitor;

  UPDATE public.site_stats
  SET
    total_accesses = total_accesses + 1,
    unique_visitors = CASE WHEN is_new_visitor THEN unique_visitors + 1 ELSE unique_visitors END,
    updated_at = now()
  WHERE id = 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_log_insert ON public.access_logs;
CREATE TRIGGER trg_access_log_insert
  AFTER INSERT ON public.access_logs
  FOR EACH ROW EXECUTE FUNCTION public.on_access_log_insert();

-- Trigger: refresh online count on presence changes
CREATE OR REPLACE FUNCTION public.on_online_users_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_online_count();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_online_users_change ON public.online_users;
CREATE TRIGGER trg_online_users_change
  AFTER INSERT OR UPDATE OR DELETE ON public.online_users
  FOR EACH ROW EXECUTE FUNCTION public.on_online_users_change();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Public read: site_stats + RPC get_public_stats
CREATE POLICY "anon_read_site_stats"
  ON public.site_stats FOR SELECT
  TO anon, authenticated
  USING (true);

-- No direct anon writes — edge functions use service_role
CREATE POLICY "deny_anon_access_logs"
  ON public.access_logs FOR ALL
  TO anon, authenticated
  USING (false);

CREATE POLICY "deny_anon_online_users"
  ON public.online_users FOR ALL
  TO anon, authenticated
  USING (false);

CREATE POLICY "deny_anon_admin_sessions"
  ON public.admin_sessions FOR ALL
  TO anon, authenticated
  USING (false);

-- Realtime: enable replication for live counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users;

-- Grant execute on public RPC
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
