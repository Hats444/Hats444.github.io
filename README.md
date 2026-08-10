# Hats444 — Portfolio

Site pessoal no **GitHub Pages**, com analytics em tempo real via **Supabase**.

**https://hats444.github.io** · Admin: `/admin.html`

## Stack

| Item | Valor |
|------|--------|
| Front | HTML / CSS / JS |
| Host | GitHub Pages |
| Analytics | Supabase (Edge Functions + Realtime) |

## Estrutura

- `index.html` — gate + portfolio
- `admin.html` — dashboard (senha)
- `js/` — config, main, analytics
- `css/` — estilos
- `database/` — schema SQL
- `supabase/functions/` — track-enter, presence, admin
- `.env.example` — secrets de edge (nunca no Pages)

## Setup rápido

```bash
cp js/config.example.js js/config.js
# edite supabaseUrl + supabaseAnonKey (anon e publica; RLS protege writes)
```

1. Crie projeto no Supabase  
2. Rode `database/schema.sql`  
3. Configure secrets das Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, etc.)  
4. Deploy das functions + Pages  

Detalhes de hash admin e secrets: veja `.env.example`.

## Aviso

Nunca commitar service role, senha admin em claro ou `ADMIN_TOKEN_SECRET`.  
A anon key no client e intencional (RLS).
