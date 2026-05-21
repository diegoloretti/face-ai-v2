# @face-ai/web

Frontend React 19 + Vite + Tailwind do face-ai v2.

## Prod

URL: https://face-ai-v2.vercel.app

Deploy automático via Vercel git integration em push pra `main` (no repo).
PR aberto gera preview URL único (`face-ai-v2-git-<branch>-<team>.vercel.app`).

## Dev local

```bash
pnpm --filter @face-ai/web dev
```

Aponta pra backend Fly prod por default (`VITE_API_URL=https://face-ai-v2.fly.dev`).
Pra apontar pra api local: criar `apps/web/.env.local` com `VITE_API_URL=http://localhost:8080`.

Pra rodar dev server com mock decisions habilitadas (`?mockDecision=aprovado`,
etc. funcionam):

```bash
pnpm --filter @face-ai/web dev:mock
```

Esse script usa `cross-env VITE_USE_MOCK_API=true vite` - não mexe no `.env`
commitado.

## Smoke mobile

1. Abrir https://face-ai-v2.vercel.app/?local=smoke-mobile no celular.
2. Aceitar permissão de câmera quando solicitado.
3. Fluxo: Consent -> Aceitar -> Instructions -> Continuar -> Camera -> Blink challenge -> Capture.
4. Validar: download de `faceai-<session_id>.json` no celular contém JWT verificável via `/verify-jwt`.

Se antispoof recusar webcam de celular: anotar `motivo: antispoof_fail` e
abrir issue/PR pra ajustar `ANTISPOOF_THRESHOLD` no backend (fora do escopo
Plano 4).

## Smoke desktop (Playwright)

```bash
pnpm --filter @face-ai/web test:e2e
```

Roda contra `http://localhost:5173` (precisa `pnpm --filter @face-ai/web dev`
em outro terminal). Pra rodar contra prod:

```bash
BASE_URL=https://face-ai-v2.vercel.app pnpm --filter @face-ai/web test:e2e
```

Os mock decision tests são automaticamente skipped contra URLs `*.vercel.app`
(VITE_USE_MOCK_API=false em prod). Pra rodar mock tests local, usar
`dev:mock` em outro terminal + `RUN_MOCK_TESTS=true` na variável.

## Headers de segurança (vercel.json)

CSP com `script-src 'self' 'wasm-unsafe-eval'` (TFJS WASM em devices sem WebGL),
HSTS 1 ano, X-Frame-Options DENY, Permissions-Policy `camera=(self), microphone=()`,
X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.

Validar via:

```bash
curl -sI https://face-ai-v2.vercel.app
```
