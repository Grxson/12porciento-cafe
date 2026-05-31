# Build stage
FROM node:20-alpine AS builder
ARG VITE_API_URL=/api
ARG VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client ./client
COPY server ./server
RUN pnpm install --frozen-lockfile
WORKDIR /app/client
RUN pnpm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
