# ==============================================================================
# Multi-stage Dockerfile for Cafetería CGAO SENA
# Optimized for Coolify and production environments
# ==============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init curl wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3589

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3589

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3589/api/health || wget --no-verbose --tries=1 --spider http://127.0.0.1:3589/api/health || exit 1

CMD ["dumb-init", "node", "dist/server.cjs"]