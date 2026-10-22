FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

FROM base AS production-dependencies

RUN pnpm install --frozen-lockfile --prod --filter @collectigo/backend...

FROM base AS build

RUN pnpm install --frozen-lockfile --filter @collectigo/backend...

COPY apps/backend apps/backend
COPY packages/shared packages/shared

RUN pnpm --filter @collectigo/backend... build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /workspace

COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=production-dependencies /workspace/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /workspace/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /workspace/packages/shared/dist ./packages/shared/dist

USER node

EXPOSE 8080

CMD ["node", "apps/backend/dist/main.js"]
