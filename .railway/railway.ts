import { defineRailway, project, service, postgres, volume, ref } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("cafe-db");

  const uploads = volume("uploads", { sizeMb: 1024 });

  const server = service("12porciento-server", {
    rootDirectory: ".",
    variables: {
      RAILWAY_DOCKERFILE_PATH: "./server/Dockerfile",
      DATABASE_URL: ref(db, "DATABASE_URL"),
      NODE_ENV: "production",
      PORT: "3001",
      UPLOAD_DIR: "/app/data/uploads",
    },
    volumeMounts: { uploads: { mountPath: "/app/data/uploads" } },
    healthcheckPath: "/api/health",
  });

  const client = service("12porciento-client", {
    rootDirectory: ".",
    variables: {
      RAILWAY_DOCKERFILE_PATH: "./client/Dockerfile",
      VITE_API_URL: "/api",
    },
  });

  return project("12porciento-cafe", {
    resources: [db, uploads, server, client],
  });
});
