# Edge Functions API (Supabase)

Base URL: `{SUPABASE_URL}/functions/v1`

All requests require headers:

```
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {SUPABASE_ANON_KEY}
Content-Type: application/json
```

## POST /track-enter

Registra clique em **ENTRAR** (não page view).

**Body:**
```json
{
  "visitor_uuid": "uuid",
  "session_id": "uuid",
  "timestamp": "2026-07-05T12:00:00.000Z",
  "user_agent": "...",
  "browser": "Chrome",
  "os": "Windows",
  "device": "Desktop",
  "referer": "https://..."
}
```

**Server-side:** IP (`x-forwarded-for`), geo (ip-api.com), debounce 30s/visitor.

**Response:** `{ "ok": true, "stats": { "online", "visitors", "accesses" } }`

---

## POST /presence

**Heartbeat:** `{ "action": "heartbeat", "visitor_uuid", "session_id", "page_visible": true }`

**Leave:** `{ "action": "leave", "visitor_uuid", "session_id }` (use `keepalive` no unload)

---

## POST /admin-auth

`{ "password": "..." }` → `{ "ok": true, "token": "...", "expires_at": 1234567890 }`

Senha validada contra `ADMIN_PASSWORD_HASH` (secret Supabase).

---

## GET /admin-data?days=30

Header: `X-Admin-Token: {token}`

Retorna KPIs, `by_day`, `by_hour`, `breakdown`, `recent` (últimos 50 acessos).
