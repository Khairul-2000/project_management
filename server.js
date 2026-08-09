import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { handleSheetsApi } from "./server/sheetsApiMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");
const DB_PATH = path.resolve(__dirname, "public/data/projects.json");
const DIST_DB_PATH = path.resolve(DIST_DIR, "data/projects.json");
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

function sendJson(res, status, payload) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function handleProjectsApi(req, res) {
  if (req.method === "GET") {
    try {
      const data = fs.readFileSync(DB_PATH, "utf8");
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    readBody(req)
      .then((body) => {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) {
          throw new Error("Database must be a JSON array");
        }
        const pretty = JSON.stringify(parsed, null, 2) + "\n";
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, pretty, "utf8");
        try {
          fs.mkdirSync(path.dirname(DIST_DB_PATH), { recursive: true });
          fs.writeFileSync(DIST_DB_PATH, pretty, "utf8");
        } catch {
          /* ignore if dist is missing or read-only */
        }
        sendJson(res, 200, { ok: true });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return;
  }

  res.writeHead(405, { Allow: "GET, PUT, POST" });
  res.end("Method Not Allowed");
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, normalized);
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
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
  const pathname = (req.url || "/").split("?")[0];

  try {
    if (await handleSheetsApi(req, res)) return;
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Sheets API error" });
    return;
  }

  if (pathname === "/api/projects" || pathname.startsWith("/api/projects/")) {
    handleProjectsApi(req, res);
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
