# v2 - nginx http wrapper fix
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

ARG VITE_API_URL
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@12porciento/admin build && ls apps/admin/dist/

FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

COPY apps/admin/nginx.conf /etc/nginx/nginx.conf
COPY apps/admin/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
