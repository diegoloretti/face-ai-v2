# face-ai v2

Reescrita do face-ai conforme [docs/superpowers/specs/2026-05-19-face-ai-v2-design.md](../docs/superpowers/specs/2026-05-19-face-ai-v2-design.md).

## Requisitos

- Node 22 (use `nvm use`)
- pnpm 9.15.4 (pinada via `packageManager` no package.json - basta `corepack enable`)

## Estrutura

- `apps/web` - Frontend React 19 + Vite + TS + Tailwind
- `apps/api` - Backend Node 22 + Hono + TS (deploy em Fly.io)
- `packages/shared` - Schemas Zod + tipos + utilitários compartilhados

## Comandos

```bash
pnpm install              # primeira vez
pnpm dev:web              # dev server frontend (porta 5173)
pnpm dev:api              # dev server backend (porta 8080)
pnpm -r build             # build tudo
pnpm -r test              # roda Vitest em tudo
pnpm -r lint              # ESLint em tudo
pnpm -r typecheck         # tsc --noEmit em tudo
pnpm download-models      # baixa modelos Human pro apps/web/public/models/ (manual, uma vez)
```

## Validação local

Pra confirmar que tudo está OK após clone:

```bash
pnpm install
pnpm download-models   # primeira vez, baixa ~12MB de modelos Human (pode pular se já em git)
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm -r build
pnpm dev:web           # http://localhost:5173 - deve mostrar "face-ai v2" cyberpunk
pnpm dev:api           # http://localhost:8080/ - retorna JSON {message, status:ok}
```

## apps/api

Backend Node 22 + Hono. Detalhes em [apps/api/README.md](apps/api/README.md).

- Dev: `pnpm --filter @face-ai/api dev` (porta 8080)
- Deploy: `flyctl deploy -a face-ai-v2 --config apps/api/fly.toml`
- Prod: `https://face-ai-v2.fly.dev`

## Fases concluídas

- **Plano 1 (Setup):** Monorepo pnpm + Vite + Tailwind + ESLint flat + Vitest + workspace `packages/shared`. Hello world cyberpunk em apps/web.
- **Plano 2 (Frontend Fase 2):** Telas reais (Consent, Privacy, Instructions, Camera, DeclarationRequired, Result, ThankYou), `useCamera`/`useHuman`/`BlinkChallenge`, integração `@vladmandic/human@3.3.6` no client pra blink detection.
- **Plano 3 (Backend Fase 3):** Backend Node 22 + Hono em Fly.io com 4 rotas, decision engine 4 camadas, Postgres via `@supabase/supabase-js`, JWT ES256, JWKS, rate limit RPC.

## Próximas fases

- **Plano 4 (deploy frontend + CI):** Deploy de `apps/web` com HTTPS (Vercel/Netlify/Fly), GitHub Actions pra typecheck/lint/test/build em PR e auto-deploy de api e web em merge na main.
