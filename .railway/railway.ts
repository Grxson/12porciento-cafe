import { defineRailway, postgres, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("Postgres");

  const server = service("12porciento-server", {
    source: { type: "github" },
    rootDirectory: ".",
    variables: {
      DATABASE_URL: db.env.DATABASE_URL,
      NODE_ENV: "production",
      PORT: "3001",
      UPLOAD_DIR: "/app/data/uploads",
      RAILWAY_DOCKERFILE_PATH: "./server/Dockerfile",
      CLIENT_URL:
        "https://12porciento-web-production.up.railway.app,https://12porciento-admin-production.up.railway.app",
    },
    healthcheckPath: "/api/health",
  });

  const web = service("12porciento-web", {
    source: { type: "github" },
    rootDirectory: ".",
    variables: {
      RAILWAY_DOCKERFILE_PATH: "./client/Dockerfile",
      VITE_API_URL: "/api",
      API_URL: "http://12porciento-server.railway.internal:3001",
      PORT: "80",
    },
  });

  const admin = service("12porciento-admin", {
    source: { type: "github" },
    rootDirectory: ".",
    variables: {
      RAILWAY_DOCKERFILE_PATH: "./apps/admin/Dockerfile",
      VITE_API_URL: "/api",
      API_URL: "http://12porciento-server.railway.internal:3001",
      PORT: "80",
    },
  });

  return project("12porciento-cafe", {
    resources: [db, server, web, admin],
  });
});
