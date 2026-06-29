FROM node:24-bullseye

WORKDIR /app

# Install pnpm + libssl1.1 (required by Prisma libquery_engine)
RUN npm install -g pnpm && \
    apt-get update && apt-get install -y --no-install-recommends libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Copy root package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace files
COPY server ./server
COPY client ./client

# Install deps
RUN pnpm install --frozen-lockfile

# Build client (needed for Express to serve SPA)
ARG VITE_API_URL=/api
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN pnpm --filter=cafe-12-client build && ls client/dist/

# Build server
RUN pnpm --filter=cafe-12-server build && pnpm --filter=cafe-12-server exec prisma generate && ls server/dist/src/

# Prisma migration at startup
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

EXPOSE 3001

COPY server/prisma/migrations ./server/prisma/migrations

CMD ["sh", "-c", "npx prisma migrate deploy && node server/dist/src/index.js"]
