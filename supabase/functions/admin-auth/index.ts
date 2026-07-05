// Supabase Edge Function: admin-auth — password login, returns session token

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const passwordHash = Deno.env.get('ADMIN_PASSWORD_HASH');
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!passwordHash || !tokenSecret || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const password = body.password || '';
  const inputHash = await sha256Hex(password);

  if (inputHash !== passwordHash) {
    return jsonResponse({ error: 'invalid_credentials' }, 401);
  }

  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const payloadStr = JSON.stringify({ exp: expiresAt, role: 'admin' });
  const sigHex = await hmacSign(tokenSecret, payloadStr);
  const token = btoa(payloadStr) + '.' + sigHex;

  const supabase = createClient(supabaseUrl, serviceKey);
  const tokenHash = await sha256Hex(token);

  await supabase.from('admin_sessions').upsert({
    token_hash: tokenHash,
    expires_at: new Date(expiresAt).toISOString(),
  });

  return jsonResponse({ ok: true, token, expires_at: expiresAt });
});
