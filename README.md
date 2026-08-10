# Hats444 — Portfolio

[![Site check](https://github.com/Hats444/Hats444.github.io/actions/workflows/site-check.yml/badge.svg)](https://github.com/Hats444/Hats444.github.io/actions/workflows/site-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Pages](https://img.shields.io/badge/GitHub%20Pages-live-success.svg)](https://hats444.github.io)

Site pessoal no **GitHub Pages**, com analytics em tempo real via **Supabase**.

**https://hats444.github.io** · Admin: `/admin.html`

## Stack

| Item | Valor |
|------|--------|
| Front | HTML / CSS / JS |
| Host | GitHub Pages |
| Analytics | Supabase Edge Functions + Realtime |
| CI | `.github/workflows/site-check.yml` |

## Estrutura

```
index.html              gate + portfolio
admin.html              dashboard (senha)
js/                     config, main, analytics
css/                    estilos
database/               schema SQL
supabase/functions/     track-enter, presence, admin
.env.example            secrets de edge (nunca no Pages)
```

## Setup

```bash
cp js/config.example.js js/config.js
# supabaseUrl + supabaseAnonKey (anon e publica; RLS protege writes)
```

1. Projeto no Supabase  
2. Rodar `database/schema.sql`  
3. Secrets das Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOKEN_SECRET`)  
4. Deploy functions + Pages  

## Segurança

- Service role, senha admin e HMAC **nunca** no front nem no Git
- `js/config.js` só leva URL + anon key (público por desenho)
- Veja `.env.example` para secrets de servidor
