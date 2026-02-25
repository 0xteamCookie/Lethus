# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && cp -r src/generated dist/generated

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

# Prisma client (generated to src/generated/prisma, compiled to dist/generated)
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY prisma.config.ts ./

# Prisma 7.x needs tsx/ts-node to load prisma.config.ts at runtime (migrate deploy)
RUN npm i tsx

# Generate the Prisma client in production so query engine binaries match this OS
RUN npx prisma generate

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 8000

ENTRYPOINT ["sh", "entrypoint.sh"]
