import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sheetsApiMiddleware } from "./server/sheetsApiMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "public/data/projects.json");

function projectsApiMiddleware(req, res, next) {
  if (!req.url?.startsWith("/api/projects")) return next();

  if (req.method === "GET") {
    try {
      const data = fs.readFileSync(DB_PATH, "utf8");
      res.setHeader("Content-Type", "application/json");
      res.end(data);
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) {
          throw new Error("Database must be a JSON array");
        }
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf8");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  next();
}

function jsonDatabasePlugin() {
  return {
    name: "json-database",
    configureServer(server) {
      server.middlewares.use(sheetsApiMiddleware);
      server.middlewares.use(projectsApiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sheetsApiMiddleware);
      server.middlewares.use(projectsApiMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), jsonDatabasePlugin()],

  server: {
    host: true,
    port: 8079,
  },

  preview: {
    host: true,
    port: 8079,
  },
});
