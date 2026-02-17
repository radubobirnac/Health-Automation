import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createViteMiddleware } from "./scripts/api.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-api",
      configureServer(server) {
        server.middlewares.use(createViteMiddleware());
      }
    }
  ]
});
