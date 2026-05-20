# syntax=docker/dockerfile:1.7

FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /repo

# COPY seletivo: manifests + sources do shared antes do install.
# O shared tem `prepare` script (tsc) que pnpm dispara no install pra popular dist/.
# Sem tsconfig + src do shared aqui, o prepare quebra. Copiar shared inteiro antes
# do install custa cache layer quando shared/src muda, mas shared muda raramente.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Instala deps do api + shared (prepare do shared roda aqui e popula dist/).
RUN pnpm install --frozen-lockfile --filter @face-ai/api... --filter @face-ai/shared

# Sources do api (apps/web NÃO entra - bloqueado pelo .dockerignore + sem COPY)
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/
COPY apps/api/src apps/api/src
COPY apps/api/scripts apps/api/scripts

# Modelos vem do web (única dep cross-app). Só os modelos, nada mais do web.
COPY apps/web/public/models apps/web/public/models

# Re-build shared explícito (idempotente; garante dist atualizado se prepare foi pulado).
RUN pnpm --filter @face-ai/shared build

# Copia modelos pra apps/api/models e builda api
RUN cd apps/api && node scripts/copy-models.mjs && pnpm exec tsc -p tsconfig.build.json

# ====== runtime stage ======
FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
COPY --from=builder /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml ./
COPY --from=builder /repo/packages/shared/package.json packages/shared/package.json
COPY --from=builder /repo/packages/shared/dist packages/shared/dist
COPY --from=builder /repo/apps/api/package.json apps/api/package.json
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/models apps/api/models
# --ignore-scripts evita o prepare do shared (que chama tsc, ausente em --prod);
# dist do shared já vem do builder stage via COPY. Depois rodar rebuild do tfjs-node
# pra disparar SÓ o install script dele (baixa libtensorflow native).
RUN pnpm install --frozen-lockfile --filter @face-ai/api... --prod --ignore-scripts
RUN pnpm rebuild @tensorflow/tfjs-node

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
