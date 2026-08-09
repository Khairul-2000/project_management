import {
  exchangeCode,
  getAuthUrl,
  getGoogleStatus,
  isGoogleConfigured,
  syncProjectsFromSheet,
} from "./googleSheets.js";

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
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

function pathnameOf(req) {
  const raw = req.url || "/";
  return raw.split("?")[0];
}

function queryOf(req) {
  const raw = req.url || "/";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  return new URLSearchParams(q);
}

/**
 * Connect-style middleware for Google Sheets OAuth + sync.
 * Also usable from Node's http.Server by calling it with (req, res, next).
 */
export function sheetsApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);

  if (!pathname.startsWith("/api/google") && pathname !== "/api/sheets/sync") {
    if (typeof next === "function") return next();
    return false;
  }

  const handled = handle(req, res, pathname).catch((err) => {
    console.error("[sheets-api]", err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err.message || "Sheets API error" });
    }
  });

  return handled.then(() => true);
}

async function handle(req, res, pathname) {
  if (pathname === "/api/google/status" && req.method === "GET") {
    sendJson(res, 200, getGoogleStatus());
    return;
  }

  if (pathname === "/api/google/auth" && req.method === "GET") {
    if (!isGoogleConfigured()) {
      sendJson(res, 400, {
        error: "Google OAuth is not configured. Copy .env.example to .env and add client credentials.",
      });
      return;
    }
    redirect(res, getAuthUrl());
    return;
  }

  if (pathname === "/api/google/callback" && req.method === "GET") {
    const params = queryOf(req);
    const error = params.get("error");
    if (error) {
      redirect(res, `/?google=error&message=${encodeURIComponent(error)}`);
      return;
    }
    const code = params.get("code");
    if (!code) {
      redirect(res, "/?google=error&message=missing_code");
      return;
    }
    try {
      await exchangeCode(code);
      redirect(res, "/?google=connected");
    } catch (err) {
      redirect(
        res,
        `/?google=error&message=${encodeURIComponent(err.message || "oauth_failed")}`
      );
    }
    return;
  }

  if (pathname === "/api/sheets/sync" && (req.method === "POST" || req.method === "GET")) {
    // Allow empty body on POST
    if (req.method === "POST") await readBody(req).catch(() => "");
    if (!isGoogleConfigured()) {
      sendJson(res, 400, { error: "Google OAuth is not configured in .env" });
      return;
    }
    const result = await syncProjectsFromSheet();
    sendJson(res, 200, {
      ok: true,
      count: result.count,
      lastSyncAt: result.lastSyncAt,
      sheetTitle: result.sheetTitle,
      projects: result.projects,
    });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}

/** Native http.Server helper: returns true if the request was handled. */
export async function handleSheetsApi(req, res) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/google") && pathname !== "/api/sheets/sync") {
    return false;
  }
  await sheetsApiMiddleware(req, res, () => {});
  return true;
}
