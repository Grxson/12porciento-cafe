# v2 - removed client build
FROM node:24-bullseye

WORKDIR /app

RUN npm install -g pnpm && \
    apt-get update && apt-get install -y --no-install-recommends libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY server ./server
COPY client ./client
COPY apps/admin ./apps/admin

RUN pnpm install --frozen-lockfile

RUN pnpm --filter=cafe-12-server build && \
    pnpm --filter=cafe-12-server exec prisma generate && \
    ls server/dist/src/

ENV NODE_ENV=production
ENV DATABASE_URL=$DATABASE_URL

EXPOSE 3001

COPY server/prisma/migrations ./server/prisma/migrations

CMD ["sh", "-c", "npx prisma migrate deploy && node server/dist/src/index.js"]
