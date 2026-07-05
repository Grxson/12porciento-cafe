import { defineRailway, postgres, project, service } from 'railway/iac';

export default defineRailway(() => {
  const db = postgres('Postgres');

  // Backend API server
  // IMPORTANT: Add these secrets via Railway UI (not in code):
  // - JWT_SECRET
  // - STRIPE_SECRET_KEY
  // - STRIPE_WEBHOOK_SECRET
  const server = service('12porciento-server', {
    source: { type: 'github' },
    rootDirectory: '.',
    variables: {
      DATABASE_URL: db.env.DATABASE_URL,
      NODE_ENV: 'production',
      PORT: '3001',
      UPLOAD_DIR: '/app/data/uploads',
      RAILWAY_DOCKERFILE_PATH: './server/Dockerfile',
      CLIENT_URL:
        'https://12porciento-web-production.up.railway.app,https://12porciento-admin-production.up.railway.app',
    },
    healthcheckPath: '/api/health',
  });

  // Public storefront (tienda)
  const web = service('12porciento-web', {
    source: { type: 'github' },
    rootDirectory: '.',
    variables: {
      RAILWAY_DOCKERFILE_PATH: './client/Dockerfile',
      VITE_API_URL: '/api',
      VITE_STRIPE_PUBLISHABLE_KEY:
        'pk_test_51SDU5OK5XTakJuYbJd3LwWdLT2cE16wb8f2lzKoYeydLalbF7DAwwbwPeLlzWSJC6NjfY4n9EV2jUo9r5nN9a50m00AhZXrD7X',
      VITE_VAPID_PUBLIC_KEY:
        'BM4FTpXG9SiZFsSNZm9IGHpiBoiW2SXTZvPJ4Z9iEk9V0bpAoyGzCrMBl4eMKAcL1pX1sc9TMHg8qmJXptVJJoY',
      API_URL: 'http://12porciento-server.railway.internal:3001',
      PORT: '80',
    },
  });

  // Admin dashboard
  const admin = service('12porciento-admin', {
    source: { type: 'github' },
    rootDirectory: '.',
    variables: {
      RAILWAY_DOCKERFILE_PATH: './apps/admin/Dockerfile',
      VITE_API_URL: '/api',
      API_URL: 'http://12porciento-server.railway.internal:3001',
      PORT: '80',
    },
  });

  return project('12porciento-cafe', {
    resources: [db, server, web, admin],
  });
});
