
# ─── Stage 1: build frontend ───────────────────────────────────────────────
FROM node:20-alpine AS web-build
WORKDIR /app

# Instalar dependencias del workspace completo primero (layer cache)
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci --workspace=apps/web --workspace=packages/shared --if-present

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
RUN npm run build --workspace=apps/web

# ─── Stage 2: build API ─────────────────────────────────────────────────────
FROM node:20-alpine AS api-build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared --if-present

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# tsconfig base necesaria para el build
COPY tsconfig.base.json ./
RUN npm run build --workspace=apps/api

# ─── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Solo dependencias de producción
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci --workspace=apps/api --omit=dev --if-present

# Artefactos compilados
COPY --from=api-build /app/apps/api/dist ./apps/api/dist
COPY --from=api-build /app/apps/api/migrations ./apps/api/migrations
COPY --from=web-build /app/apps/web/dist ./apps/api/public

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
