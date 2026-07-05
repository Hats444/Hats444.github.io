// Supabase Edge Function: track-enter
// Registers access on "Entrar" click — IP/geo server-side, rate-limited.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEBOUNCE_SEC = parseInt(Deno.env.get('ENTER_DEBOUNCE_SECONDS') || '30', 10);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || null;
}

async function lookupGeo(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('::')) {
    return { country: null, city: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country || null, city: data.city || null };
    }
  } catch {
    /* ignore geo failures */
  }
  return { country: null, city: null };
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'invalid_body';
  if (!body.visitor_uuid || typeof body.visitor_uuid !== 'string' || body.visitor_uuid.length > 64) {
    return 'invalid_visitor_uuid';
  }
  if (!body.session_id || typeof body.session_id !== 'string' || body.session_id.length > 64) {
    return 'invalid_session_id';
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const ip = getClientIp(req);

  // Server-side debounce per visitor
  const since = new Date(Date.now() - DEBOUNCE_SEC * 1000).toISOString();
  const { data: recent } = await supabase
    .from('access_logs')
    .select('id')
    .eq('visitor_uuid', body.visitor_uuid)
    .gte('entered_at', since)
    .limit(1);

  if (recent && recent.length > 0) {
    const { data: stats } = await supabase.rpc('get_public_stats');
    return jsonResponse({ ok: true, skipped: 'rate_limited', stats });
  }

  const geo = await lookupGeo(ip);

  const row = {
    visitor_uuid: body.visitor_uuid.slice(0, 64),
    session_id: body.session_id.slice(0, 64),
    ip_address: ip,
    user_agent: (body.user_agent || '').slice(0, 512),
    browser: (body.browser || '').slice(0, 64),
    os: (body.os || '').slice(0, 64),
    device: (body.device || '').slice(0, 32),
    country: geo.country,
    city: geo.city,
    referer: (body.referer || '').slice(0, 512),
    entered_at: body.timestamp || new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from('access_logs').insert(row);

  if (insertError) {
    console.error('insert error', insertError);
    return jsonResponse({ error: 'insert_failed' }, 500);
  }

  const { data: stats } = await supabase.rpc('get_public_stats');

  return jsonResponse({ ok: true, stats });
});
