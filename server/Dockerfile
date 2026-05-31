FROM node:20-alpine
RUN apk add --no-cache openssl && npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server ./server
COPY client ./client
RUN pnpm install --frozen-lockfile
WORKDIR /app/server
RUN pnpm run build
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && pnpm exec ts-node prisma/seed.ts 2>&1 || true && node dist/src/index.js"]
