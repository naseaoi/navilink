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
RUN npm ci --omit=dev
RUN mkdir -p ./data

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/api/_shared ./api/_shared

EXPOSE 3000
CMD ["node", "server.js"]
