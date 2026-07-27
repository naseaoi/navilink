FROM node:20-alpine AS builder
WORKDIR /app

ARG APP_VERSION=dev
ARG GIT_SHA=unknown
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_GIT_SHA=$GIT_SHA

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
RUN mkdir -p ./data && chown -R node:node /app

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server.js ./server.js
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/api/_shared ./api/_shared

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
