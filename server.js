import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { handleSheetsApi } from "./server/sheetsApiMiddleware.js";
import { handleAuthApi } from "./server/authApiMiddleware.js";
import { handleProjectsApi } from "./server/projectsApiMiddleware.js";
import { sendJson } from "./server/httpHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");
const PORT = Number(process.env.PORT) || 8079;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, normalized);
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];

  // Never expose projects DB as a static file
  if (urlPath === "/data/projects.json") {
    sendJson(res, 403, { error: "Use /api/projects" });
    return;
  }

  let filePath = safeJoin(DIST_DIR, urlPath);

  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found. Run npm run build first.");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

if (!fs.existsSync(DIST_DIR)) {
  console.error("Missing dist/. Run npm run build first.");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    if (await handleAuthApi(req, res)) return;
    if (await handleSheetsApi(req, res)) return;
    if (await handleProjectsApi(req, res)) return;
  } catch (err) {
    sendJson(res, 500, { error: err.message || "API error" });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Production server running at http://${HOST}:${PORT}`);
});
