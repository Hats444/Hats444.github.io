// Supabase Edge Function: admin-data — protected analytics dashboard API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [payloadB64, sigHex] = token.split('.');
  let payloadStr;
  try {
    payloadStr = atob(payloadB64);
  } catch {
    return false;
  }
  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return false;
  }
  if (!payload.exp || Date.now() > payload.exp) return false;

  const expectedHex = await hmacSign(secret, payloadStr);
  return expectedHex === sigHex;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function groupCount(rows, field) {
  const map = {};
  for (const row of rows) {
    const key = row[field] || 'Desconhecido';
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!tokenSecret || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const adminToken = req.headers.get('x-admin-token');
  if (!adminToken || !(await verifyToken(adminToken, tokenSecret))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const tokenHash = await sha256Hex(adminToken);

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return jsonResponse({ error: 'session_expired' }, 401);
  }

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: logs, error } = await supabase
    .from('access_logs')
    .select('*')
    .gte('entered_at', since.toISOString())
    .order('entered_at', { ascending: false })
    .limit(500);

  if (error) {
    return jsonResponse({ error: 'query_failed' }, 500);
  }

  const all = logs || [];

  const byDay = {};
  const byHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

  for (const row of all) {
    const d = new Date(row.entered_at);
    const dayKey = d.toISOString().slice(0, 10);
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    byHour[d.getUTCHours()].count += 1;
  }

  const { data: stats } = await supabase.rpc('get_public_stats');

  return jsonResponse({
    ok: true,
    stats,
    by_day: Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    by_hour: byHour,
    breakdown: {
      browser: groupCount(all, 'browser'),
      os: groupCount(all, 'os'),
      device: groupCount(all, 'device'),
      country: groupCount(all, 'country'),
      referer: groupCount(all, 'referer'),
    },
    recent: all.slice(0, 50),
    total_in_range: all.length,
  });
});
