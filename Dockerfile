# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile

FROM deps AS api-build
RUN pnpm --filter @workspace/api-server run build

FROM deps AS web-build
ENV PORT=5173
ENV BASE_PATH=/
RUN pnpm --filter @workspace/trancify run build

FROM base AS api
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=deps /app /app
COPY --from=api-build /app/artifacts/api-server/dist /app/artifacts/api-server/dist
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]

FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/artifacts/trancify/dist/public /usr/share/nginx/html
EXPOSE 80
