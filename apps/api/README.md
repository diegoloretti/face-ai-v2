# face-ai api (v2)

Backend Node 22 + Hono pro face-ai v2. Rotas `/verify`, `/verify-declaration`, `/verify-jwt`, `/.well-known/jwks.json`. Decisão server-side, JWT ES256, Postgres via Supabase, deploy Fly.io.

Prod: `https://face-ai-v2.fly.dev`.

## Dev local

Pré-requisitos: Node 22+, pnpm 9, conta Supabase com as migrations em `migrations/` aplicadas.

```bash
# 1. Gerar par de chaves ES256 e salvar em apps/api/.env.local
pnpm --filter @face-ai/api exec node scripts/generate-jwt-keys.mjs

# 2. Copiar .env.example pra .env.local e preencher SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#    ALLOWED_ORIGIN, mais as chaves geradas no passo 1 (formato base64, sem aspas).

# 3. Sincronizar modelos Human de apps/web/public/models/ pra apps/api/models/
pnpm --filter @face-ai/api prepare:models

# 4. Rodar (o script dev já dispara prepare:models e habilita --watch via tsx)
pnpm --filter @face-ai/api dev
# espera: { "message": "face-ai api v2", "status": "ok" } em http://localhost:8080/
```

> Windows: o binário nativo do `@tensorflow/tfjs-node` não compila no Windows e o `await import` em `humanRunner.ts` falha silenciosamente. Tudo que não toca em Human (typecheck, lint, unit tests) roda normalmente; integração real só em Docker/Fly Linux.

## Testes

```bash
pnpm --filter @face-ai/api test          # vitest unit + integração (gate Windows pula humanRunner)
pnpm --filter @face-ai/api typecheck     # tsc --noEmit
pnpm --filter @face-ai/api lint          # eslint --max-warnings=0
```

Esperado: 60 passed + 2 skipped (humanRunner integration gate em Windows ou sem fixture `test/fixtures/face-real.jpg`).

## Migrations

Versionadas em `migrations/` (3 arquivos: init, RLS, indexes). Aplicar via MCP Supabase (`apply_migration` em ordem) ou via CLI quando disponível (`supabase db push`).

## Deploy Fly.io

App `face-ai-v2`, região `gru`, 2 machines shared-cpu 512MB com auto-stop habilitado.

```bash
# Secrets (uma vez por chave nova; secrets persistem entre deploys)
flyctl secrets set "SUPABASE_URL=..." "SUPABASE_SERVICE_ROLE_KEY=..." \
  "JWT_PRIVATE_KEY_PEM=BASE64_DA_CHAVE_PRIVADA" \
  "JWT_PUBLIC_KEY_PEM=BASE64_DA_CHAVE_PUBLICA" \
  "ALLOWED_ORIGIN=https://seu-frontend.exemplo" \
  -a face-ai-v2

# Deploy
flyctl deploy -a face-ai-v2 --config apps/api/fly.toml
```

> Os PEMs viajam em base64 porque `flyctl secrets import` truncava `\n` literais. `src/lib/jwt.ts` detecta base64 e decoda automaticamente.

### Logs e debug

```bash
flyctl logs -a face-ai-v2 --no-tail   # snapshot
flyctl logs -a face-ai-v2             # tail ao vivo
flyctl status -a face-ai-v2           # estado das machines
```

## Estrutura

- `src/routes/` - 4 rotas Hono (`verify`, `verify-declaration`, `verify-jwt`, `jwks`)
- `src/services/` - `jwt`, `decisionEngine`, `humanRunner`, `db`, `rateLimit`
- `src/lib/` - `cors`, `hashIp`, `log`, `errors`
- `src/app.ts` + `src/server.ts` - compose + boot
- `migrations/` - SQL versionado (init + RLS + indexes)
- `scripts/` - `generate-jwt-keys.mjs`, `copy-models.mjs`
- `models/` - copiados de `apps/web/public/models` no build/dev (gitignored)
- `Dockerfile` (multi-stage builder + runtime) + `fly.toml`

## Variáveis de ambiente

Vide [.env.example](.env.example). Todas validadas via Zod em `src/env.ts` no boot - se faltar ou estiver malformada o server não sobe.

| Var                         | Descrição                                     |
| --------------------------- | --------------------------------------------- |
| `PORT`                      | Porta HTTP (8080 default)                     |
| `SUPABASE_URL`              | `https://<ref>.supabase.co`                   |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT do service role (server-side, RLS bypass) |
| `JWT_PRIVATE_KEY_PEM`       | Chave privada ES256 em base64                 |
| `JWT_PUBLIC_KEY_PEM`        | Chave pública ES256 em base64                 |
| `ALLOWED_ORIGIN`            | Lista CSV de origens CORS permitidas          |

## Pontos de atenção

- `pnpm rebuild @tensorflow/tfjs-node` no Dockerfile runtime tem que rodar dentro de `apps/api` (não no workspace root) pra disparar o install script que baixa o binário pra `lib/napi-v8/`.
- Human v3.3.6 carrega `emotion` por default; o modelo não vem em `apps/web/public/models/` e crasha no boot. `humanRunner.ts` desabilita `emotion` e `gear` explicitamente.
- `sessionId` é PK de `sessoes` no Postgres - frontend tem que gerar UUID novo a cada tentativa (vide [apps/web/src/hooks/useSession.ts](../web/src/hooks/useSession.ts) `case 'RETRY'`).
