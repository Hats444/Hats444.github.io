# Aplica secrets das Edge Functions no Supabase (lê .env na raiz do projeto).
# Uso: .\scripts\apply-supabase-secrets.ps1
# Requer Supabase CLI: https://supabase.com/docs/guides/cli

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
  Write-Error "Arquivo .env não encontrado em $root"
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if ($value) { Set-Item -Path "env:$name" -Value $value }
  }
}

$required = @(
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_PASSWORD_HASH',
  'ADMIN_TOKEN_SECRET'
)

foreach ($key in $required) {
  if (-not (Get-Item "env:$key" -ErrorAction SilentlyContinue).Value) {
    Write-Error "Preencha $key no .env antes de rodar este script."
  }
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "Supabase CLI não instalado. Cole manualmente em:" -ForegroundColor Yellow
  Write-Host "  Dashboard → Project Settings → Edge Functions → Secrets" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY"
  Write-Host "ADMIN_PASSWORD_HASH = $env:ADMIN_PASSWORD_HASH"
  Write-Host "ADMIN_TOKEN_SECRET = $env:ADMIN_TOKEN_SECRET"
  Write-Host "ENTER_DEBOUNCE_SECONDS = $($env:ENTER_DEBOUNCE_SECONDS ?? '30')"
  Write-Host ""
  exit 0
}

Push-Location $root
try {
  supabase secrets set `
    "SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY" `
    "ADMIN_PASSWORD_HASH=$env:ADMIN_PASSWORD_HASH" `
    "ADMIN_TOKEN_SECRET=$env:ADMIN_TOKEN_SECRET" `
    "ENTER_DEBOUNCE_SECONDS=$($env:ENTER_DEBOUNCE_SECONDS ?? '30')"

  Write-Host "Secrets aplicados. Faça redeploy das functions se já estiverem no ar:" -ForegroundColor Green
  Write-Host "  supabase functions deploy admin-auth --no-verify-jwt"
  Write-Host "  supabase functions deploy admin-data --no-verify-jwt"
}
finally {
  Pop-Location
}
