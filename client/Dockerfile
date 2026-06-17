FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server ./server
COPY client ./client

RUN pnpm install --frozen-lockfile
RUN pnpm --filter client build

FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
