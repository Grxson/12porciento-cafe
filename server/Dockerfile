FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace files
COPY server ./server
COPY client ./client

# Install deps
RUN pnpm install --frozen-lockfile

# Build server + client
RUN pnpm --filter server build && pnpm --filter server exec prisma generate

# Prisma migration at startup
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server/dist/src/index.js"]
