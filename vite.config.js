import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sheetsApiMiddleware } from "./server/sheetsApiMiddleware.js";
import { authApiMiddleware } from "./server/authApiMiddleware.js";
import { projectsApiMiddleware } from "./server/projectsApiMiddleware.js";
import { getRequestUser } from "./server/authApiMiddleware.js";
import { sendJson } from "./server/httpHelpers.js";

function blockPublicProjectsJson(req, res, next) {
  const path = (req.url || "").split("?")[0];
  if (path === "/data/projects.json") {
    // Force clients through /api/projects (auth + ACL)
    if (!getRequestUser(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    sendJson(res, 403, { error: "Use /api/projects" });
    return;
  }
  next();
}

function apiPlugin() {
  return {
    name: "delivery-ops-api",
    configureServer(server) {
      server.middlewares.use(authApiMiddleware);
      server.middlewares.use(sheetsApiMiddleware);
      server.middlewares.use(projectsApiMiddleware);
      server.middlewares.use(blockPublicProjectsJson);
    },
    configurePreviewServer(server) {
      server.middlewares.use(authApiMiddleware);
      server.middlewares.use(sheetsApiMiddleware);
      server.middlewares.use(projectsApiMiddleware);
      server.middlewares.use(blockPublicProjectsJson);
    },
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],

  server: {
    host: true,
    port: 8079,
  },

  preview: {
    host: true,
    port: 8079,
  },
});
