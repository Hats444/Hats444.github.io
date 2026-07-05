/**
 * Analytics config — copy to js/config.js and fill in your Supabase project.
 * Only SUPABASE_URL and SUPABASE_ANON_KEY belong here (public, RLS-protected).
 * Admin password lives in Supabase Edge Function secrets, NOT in this file.
 */
window.HATS444_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'your-anon-key-here',

  /** Edge function base — defaults to supabaseUrl/functions/v1 */
  functionsUrl: '',

  /** Client-side enter debounce (seconds) — also enforced server-side */
  enterDebounceSeconds: 30,

  /** Presence heartbeat interval (ms) */
  heartbeatIntervalMs: 25000,

  /** Consider user offline after this many ms without heartbeat */
  presenceTimeoutMs: 60000,
};
