import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  const { createViteMiddleware } = await import("./scripts/api.js");

  return {
    plugins: [
      react(),
      {
      name: "local-api",
      configureServer(server) {
        server.middlewares.use(createViteMiddleware());
      }
    }
  ]
  };
});
