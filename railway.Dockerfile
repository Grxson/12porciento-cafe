FROM node:24-bullseye AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server ./server
COPY client ./client

RUN pnpm install --frozen-lockfile
ARG VITE_API_URL=/api
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN pnpm --filter=cafe-12-client build
RUN pnpm --filter=cafe-12-server exec prisma generate && \
    pnpm --filter=cafe-12-server build

FROM node:24-bullseye
WORKDIR /app

# prisma global para migrate deploy (pnpm symlinks no sobreviven COPY multi-stage)
RUN npm install -g pnpm prisma@5.22.0 && \
    apt-get update && apt-get install -y --no-install-recommends libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY server/prisma ./server/prisma

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "prisma migrate deploy --schema=server/prisma/schema.prisma && node server/dist/src/index.js"]
