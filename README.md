# face-ai v2

Reescrita do face-ai conforme [docs/superpowers/specs/2026-05-19-face-ai-v2-design.md](../docs/superpowers/specs/2026-05-19-face-ai-v2-design.md).

## Requisitos

- Node 22 (use `nvm use`)
- pnpm 9.15.4 (pinada via `packageManager` no package.json - basta `corepack enable`)

## Estrutura

- `apps/web` - Frontend React 19 + Vite + TS + Tailwind
- `apps/api` - Backend Node 22 + Hono + TS (deploy em Fly.io)
- `packages/shared` - Schemas Zod + tipos + utilitarios compartilhados

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

## Validacao local

Pra confirmar que tudo esta OK apos clone:

```bash
pnpm install
pnpm download-models   # primeira vez, baixa ~12MB de modelos Human (pode pular se ja em git)
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm -r build
pnpm dev:web           # http://localhost:5173 - deve mostrar "face-ai v2" cyberpunk
pnpm dev:api           # http://localhost:8080/ - retorna JSON {message, status:ok}
```

## Proximas fases

- **Plano 2 (Frontend Fase 2):** Substituir hello world por telas reais (Consent, Camera, Result, etc.), useCamera/useHuman/BlinkChallenge, integracao com `@vladmandic/human@3.3.6`.
- **Plano 3 (Backend Fase 3):** Adicionar rotas `/verify`, `/verify-declaration`, `/verify-jwt`, `/.well-known/jwks.json`, decision engine, Postgres via `@supabase/supabase-js`, JWT ES256, deploy Fly.io.
