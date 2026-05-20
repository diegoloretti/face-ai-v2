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
