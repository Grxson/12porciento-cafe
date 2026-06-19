FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server ./server
COPY client ./client

ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=cafe-12-client build && ls client/dist/

FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
