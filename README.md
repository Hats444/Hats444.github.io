# Hats444 — Portfolio

Site pessoal hospedado no **GitHub Pages**, com analytics em tempo real via **Supabase**.

## URL

**https://hats444.github.io**

Painel admin: **https://hats444.github.io/admin.html**

## Estrutura

```
├── index.html              # Página principal (gate + portfolio)
├── admin.html              # Dashboard analytics (senha)
├── database/schema.sql     # Tabelas, triggers, RLS, realtime
├── supabase/functions/     # Edge Functions (track-enter, presence, admin)
├── js/
│   ├── config.js           # Supabase URL + anon key (público)
│   ├── config.example.js   # Template
│   ├── main.js             # Gate, matrix, música
│   ├── admin-dashboard.js  # Charts + tabelas (Chart.js só no admin)
│   ├── services/analyticsApi.js
│   ├── hooks/useAnalytics.js
│   ├── utils/visitor.js, device.js, debounce.js
│   └── components/AnalyticsBar.js
├── .env.example            # Referência para secrets (não usado no Pages)
└── README.md
```

## Analytics — o que mede

| Métrica | Quando conta |
|---------|----------------|
| **Acessos** | Apenas clique em **ENTRAR →** (não conta page view) |
| **Visitantes únicos** | UUID persistente no `localStorage` |
| **Online agora** | Heartbeat a cada 25s; remove após ~60s inativo |

Indicadores públicos na gate e na `session-bar` (👥 👤 📈).

---

## Setup Supabase (passo a passo)

### 1. Criar projeto

1. [supabase.com](https://supabase.com) → New project
2. Anote **Project URL** e **anon public key** (Settings → API)

### 2. Rodar o schema

1. SQL Editor → New query
2. Cole o conteúdo de `database/schema.sql` → Run
3. Database → Replication → confirme `site_stats` e `online_users` com Realtime **ON**

### 3. Configurar o site

```bash
cp js/config.example.js js/config.js
```

Edite `js/config.js`:

```js
window.HATS444_CONFIG = {
  supabaseUrl: 'https://SEU_REF.supabase.co',
  supabaseAnonKey: 'sua-anon-key',
  // ...
};
```

> A anon key é pública (RLS bloqueia writes diretos). Não coloque service role nem senha admin aqui.

### 4. Gerar hash da senha admin

```bash
# Linux / macOS / WSL
echo -n 'SuaSenhaForte' | sha256sum

# PowerShell
$bytes = [Text.Encoding]::UTF8.GetBytes('SuaSenhaForte')
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
-join ($hash | ForEach-Object { $_.ToString('x2') })
```

### 5. Deploy Edge Functions

Instale [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login:

```bash
cd Hats444.github.io
supabase link --project-ref SEU_REF

supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key \
  ADMIN_PASSWORD_HASH=hash-sha256-da-senha \
  ADMIN_TOKEN_SECRET=$(openssl rand -hex 32) \
  ENTER_DEBOUNCE_SECONDS=30

supabase functions deploy track-enter --no-verify-jwt
supabase functions deploy presence --no-verify-jwt
supabase functions deploy admin-auth --no-verify-jwt
supabase functions deploy admin-data --no-verify-jwt
```

> `--no-verify-jwt` permite chamadas com anon key do site estático. A segurança vem do service role **apenas** nas functions + RLS.

### 6. Testar localmente

```bash
npx serve .
# ou: python -m http.server 8080
```

1. Abra `http://localhost:3000` (ou porta usada)
2. Clique **ENTRAR** → verifique linha em `access_logs`
3. Abra `/admin.html` → login com sua senha

---

## Publicar no GitHub Pages

```bash
git add .
git commit -m "Analytics Supabase"
git push origin main
```

GitHub → Settings → Pages → **Deploy from branch: main / root**.

Após o deploy, confirme que `js/config.js` contém as credenciais Supabase (commit seguro: só URL + anon key).

---

## Variáveis de ambiente

| Variável | Onde | Uso |
|----------|------|-----|
| `SUPABASE_URL` | `js/config.js` + secrets | URL do projeto |
| `SUPABASE_ANON_KEY` | `js/config.js` | Cliente browser + chamadas functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | Edge functions (server-side) |
| `ADMIN_PASSWORD_HASH` | Supabase secrets | SHA-256 da senha admin |
| `ADMIN_TOKEN_SECRET` | Supabase secrets | Assina tokens de sessão admin |
| `ENTER_DEBOUNCE_SECONDS` | Supabase secrets | Anti-spam (default 30) |

Veja `.env.example` para referência completa.

---

## Segurança

- **Nunca** commite service role key, senha em texto ou `ADMIN_TOKEN_SECRET`
- Acessos só via Edge Function `track-enter` (IP/geo server-side, rate limit)
- RLS bloqueia INSERT/SELECT direto em `access_logs` e `online_users` para anon
- Admin protegido por senha + token HMAC com expiração 24h

---

## Personalizar conteúdo

- Nome e bio: `index.html` seção intro
- Projetos: seção `#projetos`
- Links: cards na grid
