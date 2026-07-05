// Supabase Edge Function: presence — heartbeat + leave

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const action = body.action;
  const visitorUuid = (body.visitor_uuid || '').slice(0, 64);
  const sessionId = (body.session_id || '').slice(0, 64);

  if (!visitorUuid || !sessionId) {
    return jsonResponse({ error: 'invalid_ids' }, 400);
  }

  if (action === 'leave') {
    await supabase.from('online_users').delete().eq('visitor_uuid', visitorUuid);
    await supabase.rpc('refresh_online_count');
    return jsonResponse({ ok: true });
  }

  if (action === 'heartbeat') {
    const { error } = await supabase.from('online_users').upsert(
      {
        visitor_uuid: visitorUuid,
        session_id: sessionId,
        last_seen_at: new Date().toISOString(),
        page_visible: body.page_visible !== false,
        user_agent: (body.user_agent || '').slice(0, 512),
      },
      { onConflict: 'visitor_uuid' }
    );

    if (error) {
      console.error('heartbeat error', error);
      return jsonResponse({ error: 'heartbeat_failed' }, 500);
    }

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'invalid_action' }, 400);
});
