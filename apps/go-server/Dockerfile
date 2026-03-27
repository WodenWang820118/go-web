FROM docker.io/node:lts-alpine AS builder

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm nx run go-server:prune

FROM docker.io/node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

RUN corepack enable

WORKDIR /app

COPY --from=builder /workspace/dist/apps/go-server/ ./

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

CMD ["node", "main.js"]
