# NovaCart backend — production image
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
# Vercel container images receive traffic on port 80 by default (the PORT env
# var is not injected). The app defaults to 4000, which made every /api/*
# request fail with INTERNAL_FUNCTION_INVOCATION_FAILED.
# docker-compose overrides PORT=4000 for local dev, so local is unchanged.
ENV PORT=80
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 80
# Migrations are applied during deployment (see README "Deployment"); running
# them on every cold start made container init exceed Vercel's start timeout.
CMD ["node", "dist/src/server.js"]
