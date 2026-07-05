import { defineRailway, postgres, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("Postgres");

  const uploads = volume("uploads", {});

  const server = service("12porciento-server", {
    source: {
      dockerfilePath: "./server/Dockerfile",
    },
    rootDirectory: ".",
    variables: {
      DATABASE_URL: db.env.DATABASE_URL,
      NODE_ENV: "production",
      PORT: "3001",
      UPLOAD_DIR: "/app/data/uploads",
    },
    volumeMounts: { uploads: { mountPath: "/app/data/uploads" } },
    healthcheckPath: "/api/health",
  });

  const web = service("12porciento-web", {
    source: {
      dockerfilePath: "./client/Dockerfile",
    },
    rootDirectory: ".",
    variables: {
      VITE_API_URL: "/api",
    },
  });

  const admin = service("12porciento-admin", {
    source: {
      dockerfilePath: "./apps/admin/Dockerfile",
    },
    rootDirectory: ".",
    variables: {
      VITE_API_URL: "/api",
    },
  });

  return project("12porciento-cafe", {
    resources: [db, uploads, server, web, admin],
  });
});
