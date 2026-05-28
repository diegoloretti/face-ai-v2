# face-ai v2

Verificação de idade por câmera pra pontos de venda de produtos controlados (tabaco). Usuário aceita o consentimento, encara a câmera, pisca quando o app pede, e o backend devolve um veredito assinado (`aprovado`, `requer_declaracao` ou `recusado`) baseado em estimativa de idade + anti-spoofing + liveness + blink challenge ativo.

API em produção: https://face-ai-v2.fly.dev. Frontend ainda não deployado.

---

## Diferenças vs v1

| Aspecto | v1 (`face-ai-v1`) | v2 (este repo) |
|---|---|---|
| **Onde a decisão acontece** | 100% no cliente. Threshold `idade >= 21` hardcoded no React. | Server-side. Cliente manda features, backend Hono roda o decision engine e assina JWT ES256. |
| **Stack frontend** | React 19 + Vite + JS puro, CSS global único. | React 19 + Vite 8 + **TypeScript** + Tailwind v4 + Vitest + Playwright E2E. |
| **Backend** | Não existe. JSON de saída era só download local. | Node 22 + Hono + `@vladmandic/human` server-side rodando em Fly.io, Postgres via Supabase, JWT ES256 com JWKS público. |
| **Modelo de detecção** | `@vladmandic/face-api` (TinyFaceDetector + ageGenderNet + faceExpressionNet), modelos de CDN. | `@vladmandic/human@3.3.6` no cliente E no servidor. Modelos versionados em `apps/web/public/models/` (sem dependência de CDN externo). |
| **Anti-spoof / liveness** | Não existe. | Anti-spoof passivo (`Human f.real`) + liveness passivo + **blink challenge ativo** ("pisque agora") com state machine de valley detection. |
| **Decision engine** | `idade >= 21` simples. | 4 camadas: gate de blink, score fusion ponderado (modo `composite`), gate de faixa etária, tamper detection comparando features client vs server. Pesos e threshold ajustáveis via env. |
| **Persistência** | Só download de JSON. | Postgres (`sessoes`, `verification_scores`, `rate_limit_buckets`) + JWT ES256 + JWKS público pra verificação offline + download de JSON com `jwt` embutido. |
| **Anti-fraude** | Nenhum. | Rate limit por IP hasheado, JWT com `jti` único (PK de `sessoes`, replay impossível), CORS por allowlist, tamper detection client vs server. |
| **LGPD** | Nada explícito. | Foto nunca sai do cliente, só features. `sessionStorage`/`localStorage` proibidos por CI guard. IP e UA chegam só como hash SHA-256. Política de privacidade no fluxo. |
| **Build / repo** | Pasta única. | Monorepo pnpm com `apps/web`, `apps/api`, `packages/shared`. |
| **Testes** | Nenhum. | Vitest unit + integração (api e web), Playwright E2E, smoke scripts. |

O que **se manteve do v1**: o fluxo de telas (Consent → Instructions → Camera → Result/Declaration/ThankYou) e a ideia de download de JSON como artefato pro ponto de venda.

---

## O que o app faz

Caso de uso: ponto de venda de produto controlado por idade (tabaco). O vendedor abre a página num tablet/celular, o cliente passa pela verificação, e o vendedor decide a venda baseado no veredito.

### Fluxo do usuário

1. **Consent** - aceita ou recusa o consentimento (LGPD). Recusa baixa JSON `recusado_inicial` e termina.
2. **Privacy** - opcional, abre a política de privacidade antes de aceitar.
3. **Instructions** - como se posicionar na câmera.
4. **Camera** - frontend abre `getUserMedia`, carrega Human, mostra preview espelhado, dispara o **blink challenge** ("pisque agora") e captura quando o blink é confirmado.
5. **POST /verify** - cliente envia `sessionId` + `local` + features client-side + imagem. Backend reanalisa com Human, roda decision engine, persiste em `sessoes` + `verification_scores`, assina JWT e devolve.
6. **Result** - mostra `aprovado` / `requer_declaracao` / `recusado` + motivo, oferece download do JSON com JWT embutido.
7. **Declaration (16-21)** - se a faixa etária ficar no limite, o app pede declaração "sou maior de 18" antes de aprovar com flag.
8. **ThankYou** - quando o usuário recusa consentimento ou recusa declaração.

A foto nunca sai do cliente como arquivo persistido. Só viaja como base64 dentro do POST e o backend não armazena - só extrai features e descarta.

### Veredito + JWT

A resposta de `/verify` é um JWT ES256 assinado pelo servidor com claims `{ session_id, decisao, faixa_etaria, motivo, jti, iat, exp }`. JWKS público em `/.well-known/jwks.json` pra qualquer parte (PDV, auditoria, fiscal) verificar offline sem precisar bater na API.

---

## Stack

### Frontend (`apps/web`)

- React 19.2 + Vite 8 + TypeScript 5.5
- Tailwind CSS v4 (postcss plugin) - estética cyberpunk neon
- `@vladmandic/human@3.3.6` no client pra detectar blink em tempo real (não envia frames; só usa a câmera local)
- `zod` pra validar respostas da API
- Vitest + Testing Library pra unit, Playwright pra E2E
- Estado de sessão em `useReducer` puro - **proibido sessionStorage/localStorage** (CI guarda isso)

### Backend (`apps/api`)

- Node 22 + Hono 4 + TypeScript
- `@vladmandic/human@3.3.6` server-side com `@tensorflow/tfjs-node` (binário nativo, Linux only - Windows falha silencioso, vide nota em [apps/api/README.md](apps/api/README.md))
- `@supabase/supabase-js` pra Postgres (service role, RLS bypass)
- `jose` pra ES256 + JWKS
- `zod@4` validando env + bodies
- Vitest unit + integração
- Deploy Fly.io (`face-ai-v2`, região `gru`, shared-cpu 512MB, 2 machines com auto-stop)

### Shared (`packages/shared`)

- Schemas Zod (`VerifyRequest`, `VerifyResponse`, `VerificationJson`)
- Tipos (`AgeTier`, `Decision`, etc.)
- Funções puras (`classifyAge`, `sanitizeLocal`)

### Infra

- **Hospedagem API:** Fly.io (`face-ai-v2.fly.dev`)
- **Banco:** Supabase Postgres (tabelas: `sessoes`, `verification_scores`, `rate_limit_buckets`)
- **Crypto:** ES256, chaves geradas via `scripts/generate-jwt-keys.mjs`, viajam em base64 em Fly secrets
- **Package manager:** pnpm 9 (workspace), Node 22 mínimo

---

## Decision engine

Implementado em [apps/api/src/services/decisionEngine.ts](apps/api/src/services/decisionEngine.ts). 4 camadas, nessa ordem:

1. **Gate de blink** (se `REQUIRE_BLINK=true`): blink não detectado → `recusado/blink_missing`. Hoje desligado em prod (decision engine assume o blink só como evidência forte de liveness via composite).
2. **Modo de decisão:**
   - `legacy_and` (default do código, **não usado em prod**): AND de `liveness >= LIVENESS_THRESHOLD` e `antiSpoof >= ANTISPOOF_THRESHOLD`. Recusa se qualquer um falhar.
   - `composite` (**ativo em prod**): score fusion ponderado.
     ```
     composite = W_ANTISPOOF * antiSpoof + W_LIVENESS * liveness + W_FACE_DETECTION * faceDetection
     aprovar se composite >= COMPOSITE_THRESHOLD_SHADOW
     ```
3. **Gate de faixa etária:** classifica `age` em `<13` / `13-15` / `16-21` / `22+`. 22+ aprova direto, 16-21 vai pra declaração, abaixo recusa.
4. **Tamper detection:** compara features que o cliente reportou com o que o servidor mediu. Delta de idade > 10 anos ou liveness > 0.3 marca a sessão com `tamper_detected=true` (não bloqueia hoje, só fica registrado).

Os pesos do composite e o threshold são env vars (vide [apps/api/src/env.ts](apps/api/src/env.ts)). Calibração é ajustável sem redeploy via `flyctl secrets set` - útil pra apertar/afrouxar conforme observação dos vereditos em campo.

---

## Como rodar

### Pré-requisitos

- Node 22+ (`nvm use 22` se você usa nvm)
- pnpm 9.15.4 (basta `corepack enable`)
- Pra rodar o backend: conta Supabase com as migrations aplicadas + par de chaves ES256

### Setup inicial

```bash
git clone https://github.com/diegoloretti/face-ai-v2.git
cd face-ai-v2
pnpm install
pnpm download-models        # baixa ~12MB de modelos Human pra apps/web/public/models/
```

### Frontend isolado (sem backend)

```bash
pnpm dev:web                 # http://localhost:5173
pnpm --filter @face-ai/web dev:mock   # usa mock da API, útil pra UI sem subir o servidor
```

### Backend local

```bash
# 1. gerar par de chaves ES256
pnpm --filter @face-ai/api exec node scripts/generate-jwt-keys.mjs

# 2. copiar apps/api/.env.example pra apps/api/.env.local e preencher
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN,
#    JWT_PRIVATE_KEY_PEM, JWT_PUBLIC_KEY_PEM (em base64)

# 3. sincronizar modelos Human pro apps/api/models/
pnpm --filter @face-ai/api prepare:models

# 4. subir
pnpm dev:api                 # http://localhost:8080
```

> **Windows:** o binário nativo do `@tensorflow/tfjs-node` não compila no Windows. Typecheck, lint e testes unitários rodam normalmente; integração real (Human server-side) só roda em Linux/Docker/Fly. Tem gate condicional que pula esses testes em Windows.

### Verificação completa

```bash
pnpm -r typecheck            # tsc --noEmit em tudo
pnpm -r lint                 # ESLint --max-warnings=0
pnpm -r test                 # Vitest em todos os pacotes
pnpm -r build                # build de tudo
```

> Em Windows, alguns testes de integração do servidor (que dependem do binário nativo `@tensorflow/tfjs-node`) são pulados via gate condicional. Rodar em Linux/Docker pra suite completa.

---

## Estrutura do monorepo

```
face-ai-v2/
├── apps/
│   ├── web/                 # Frontend React + Vite + TS
│   │   ├── src/
│   │   │   ├── pages/       # Consent, Privacy, Instructions, Camera, Result, etc.
│   │   │   ├── components/  # BlinkChallenge, CameraView, StatusBadge, etc.
│   │   │   ├── hooks/       # useCamera, useHuman, useSession
│   │   │   ├── services/    # api.ts, jwtDownload.ts
│   │   │   └── App.tsx
│   │   ├── public/models/   # Modelos Human (~12MB, gitignored, baixar via script)
│   │   └── tests/           # Playwright E2E
│   │
│   └── api/                 # Backend Node + Hono + TS
│       ├── src/
│       │   ├── routes/      # verify, verifyDeclaration, verifyJwt, wellKnownJwks, metricsScores, metricsBlinkDebug, metricsCalibration
│       │   ├── services/    # decisionEngine, humanRunner, jwt, db, rateLimit, scoresTelemetry, calibrationQuery
│       │   ├── lib/         # cors, hashIp, log, errors, compositeWeightsCheck
│       │   ├── env.ts       # Validação Zod das env vars
│       │   ├── app.ts       # Hono app
│       │   └── server.ts    # Boot
│       ├── migrations/      # SQL versionado (init, RLS, indexes, verification_scores)
│       ├── scripts/         # generate-jwt-keys.mjs, copy-models.mjs
│       ├── Dockerfile       # Multi-stage builder + runtime
│       └── fly.toml
│
├── packages/
│   └── shared/              # Schemas Zod + tipos + utils compartilhados
│       └── src/
│           ├── schemas/
│           └── lib/
│
├── scripts/                 # download-models.mjs, smoke-frontend.mjs
├── pnpm-workspace.yaml
└── package.json
```

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/verify` | Recebe `sessionId`, `local`, features client-side + imagem. Roda Human server-side, decision engine, persiste, assina JWT, retorna `VerifyResponse`. |
| `POST` | `/verify-declaration` | Para `faixa_etaria=16-21`: cliente confirma declaração de maioridade, servidor atualiza `sessoes` e devolve novo JWT com `aprovado_com_declaracao`. |
| `POST` | `/verify-jwt` | Verifica um JWT recebido (útil pra terceiros validarem o artefato baixado). |
| `GET`  | `/.well-known/jwks.json` | JWKS público pra verificação offline. |
| `GET`  | `/metrics/scores` | Telemetria agregada (protegido por `ADMIN_METRICS_TOKEN`). |
| `GET`  | `/metrics/blink-debug` | Histograma de blinks pra debugar o challenge. |
| `GET`  | `/metrics/calibration` | Snapshot dos pesos/threshold em uso pra confirmar deploy. |

Schemas em [packages/shared/src/schemas/](packages/shared/src/schemas/).

---

## Banco

Migrations versionadas em [apps/api/migrations/](apps/api/migrations/):

- `20260520000000_init.sql` - `sessoes`, `rate_limit_buckets`, função `increment_rate_limit`
- `20260520000001_rls.sql` - Row Level Security
- `20260520000002_indexes.sql`
- `20260521000000_verification_scores.sql` - tabela de telemetria pra calibração contínua

`sessoes` é PK por `id` (UUID gerado pelo cliente). `jwt_jti` é UNIQUE - garante que o JWT não é falsificável nem reusável. `ip_hash` e `user_agent_hash` são SHA-256 - LGPD compliance.

Aplicar migrations: `supabase db push` (o `supabase` CLI é o caminho agora - binário em `Personal/bin/supabase.exe`; plugin MCP Supabase desativado em 2026-05-28). Este projeto usa a conta Supabase da BAT (ref `fwtguovxmnbvcjqwmkxd`); CLI precisa estar autenticado/linkado nessa conta.

---

## Deploy

### API (Fly.io)

```bash
# Secrets (uma vez por chave nova; persistem entre deploys)
flyctl secrets set \
  "SUPABASE_URL=..." \
  "SUPABASE_SERVICE_ROLE_KEY=..." \
  "JWT_PRIVATE_KEY_PEM=BASE64_DA_CHAVE_PRIVADA" \
  "JWT_PUBLIC_KEY_PEM=BASE64_DA_CHAVE_PUBLICA" \
  "ALLOWED_ORIGIN=https://seu-frontend.exemplo" \
  -a face-ai-v2

# Calibração do decision engine (opcional, override dos defaults do código)
flyctl secrets set \
  DECISION_MODE=composite \
  COMPOSITE_W_ANTISPOOF=... \
  COMPOSITE_W_LIVENESS=... \
  COMPOSITE_W_FACE_DETECTION=... \
  COMPOSITE_THRESHOLD_SHADOW=... \
  -a face-ai-v2

flyctl deploy -a face-ai-v2 --config apps/api/fly.toml
flyctl logs   -a face-ai-v2          # tail
flyctl status -a face-ai-v2          # estado das machines
```

> PEMs em base64 porque `flyctl secrets import` truncava `\n` literais. `src/lib/jwt.ts` detecta base64 e decoda automaticamente.

### Frontend

Ainda não deployado. Próximo passo: Vercel ou Fly Static + GitHub Actions pra CI/CD.

---

## Pontos de atenção pra novos contribuidores

- **Modelos Human:** `apps/web/public/models/` é gitignored. Roda `pnpm download-models` no setup. O backend reusa esses mesmos modelos via `pnpm --filter @face-ai/api prepare:models` (script copia pra `apps/api/models/`).
- **Emotion e gear são desabilitados:** Human v3.3.6 carrega esses modelos por default; eles não vêm no `public/models/` e crasham no boot do servidor. [humanRunner.ts](apps/api/src/services/humanRunner.ts) desabilita explicitamente.
- **sessionId é PK:** se quiser tentar de novo após uma recusa, o frontend tem que gerar UUID novo (`useSession` faz isso no `RETRY`).
- **Memória do Fly:** 512MB é o piso pra tfjs-node + Human warmup eager. Se um deploy começar a OOM, sobe pra 1024 no `fly.toml`.
- **CI guard contra storage:** `.github/workflows/ci.yml` rejeita PRs que adicionem `sessionStorage` ou `localStorage` em `apps/web/src` (minimização LGPD).

---

## Status

Funcionando em produção:

- Monorepo, frontend completo (consent, instructions, camera com blink challenge, result, declaration, thankyou)
- Backend Hono em Fly.io com decision engine, Supabase, JWT ES256, JWKS, rate limit
- Decision engine rodando em modo composite, calibrável via env sem redeploy

Em aberto:

- Deploy do frontend com HTTPS (Vercel ou Fly Static) e GitHub Actions de CI/CD (typecheck/lint/test/build em PR, auto-deploy em merge na main)
- Persistir blink debug numa tabela (buffer do log do Fly é curto demais pra diagnosticar reclamação de "não detectou a piscada" em campo)
- Recalibrar threshold com mais dados acumulados em `verification_scores`

---

## Licença

Privado.
