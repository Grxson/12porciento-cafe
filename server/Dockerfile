FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json ./
RUN npm run build
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --accept-data-loss && node /app/prisma/seed.js 2>&1 || true && node dist/src/index.js"]
