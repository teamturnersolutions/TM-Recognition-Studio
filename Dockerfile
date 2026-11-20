# Stage 1: Deterministic frontend build (pinned Node Alpine version)
FROM node:22.14.0-alpine3.21 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src

RUN npm run build

# Stage 2: Hardened non-root Nginx Alpine runtime (pinned version)
FROM nginxinc/nginx-unprivileged:1.27.4-alpine3.21 AS runtime

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
