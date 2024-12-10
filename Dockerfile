FROM node:22-alpine AS base

FROM base AS deps

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.json package.json yarn.lock ./

COPY src ./src

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs

RUN adduser --system --uid 1001 nodejs

USER nodejs

EXPOSE 3000

CMD ["yarn", "start"]
