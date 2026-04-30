FROM docker.io/node:lts-alpine AS builder

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm nx run go-web:build:production

FROM docker.io/caddy:2-alpine

COPY apps/go-web/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /workspace/dist/apps/go-web/browser /srv

EXPOSE 80
