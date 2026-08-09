import {
  authenticate,
  createUser,
  findUserById,
  listUsers,
  publicUser,
  replaceUsers,
  syncAssignmentsFromProjects,
  updateUser,
} from "./usersStore.js";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
  signSession,
  verifySession,
} from "./session.js";
import { pathnameOf, readJsonBody, sendJson } from "./httpHelpers.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_PATH = path.resolve(__dirname, "../public/data/projects.json");

function loadProjectsForSync() {
  const raw = JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf8"));
  if (!Array.isArray(raw)) throw new Error("projects.json must be an array");
  return raw;
}

export function getRequestUser(req) {
  const token = getSessionToken(req);
  const payload = verifySession(token);
  if (!payload?.uid) return null;
  const user = findUserById(payload.uid);
  if (!user || !user.active) return null;
  return user;
}

export function requireUser(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    sendJson(res, 403, { error: "Admin only" });
    return null;
  }
  return user;
}

/**
 * Auth + users management API middleware.
 */
export function authApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/auth") && !pathname.startsWith("/api/users")) {
    if (typeof next === "function") return next();
    return false;
  }

  const handled = handle(req, res, pathname).catch((err) => {
    console.error("[auth-api]", err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || "Auth API error" });
  });
  return handled.then(() => true);
}

export async function handleAuthApi(req, res) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/auth") && !pathname.startsWith("/api/users")) {
    return false;
  }
  await authApiMiddleware(req, res, () => {});
  return true;
}

async function handle(req, res, pathname) {
  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const user = authenticate(body.username, body.password);
    if (!user) {
      sendJson(res, 401, { error: "Invalid username or password" });
      return;
    }
    setSessionCookie(res, signSession(user.id));
    sendJson(res, 200, { ok: true, user: publicUser(user) });
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    await readJsonBody(req).catch(() => ({}));
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const user = getRequestUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    const users = listUsers();
    // Members get a directory for team dropdowns (no assignment lists)
    if (user.role !== "admin") {
      sendJson(res, 200, {
        users: users
          .filter((u) => u.active && u.role === "member")
          .map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: u.active })),
      });
      return;
    }
    sendJson(res, 200, { users });
    return;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const created = createUser({
      name: body.name,
      username: body.username,
      password: body.password,
      role: body.role,
    });
    sendJson(res, 201, { user: created });
    return;
  }

  if (pathname === "/api/users" && req.method === "PUT") {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody(req);
    const users = replaceUsers(body.users || body);
    sendJson(res, 200, { users });
    return;
  }

  if (pathname === "/api/users/sync-assignments" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    await readJsonBody(req).catch(() => ({}));
    const result = syncAssignmentsFromProjects(loadProjectsForSync());
    sendJson(res, 200, {
      ok: true,
      updatedMembers: result.updatedMembers,
      totalLinks: result.totalLinks,
      unmatched: result.unmatched,
      users: result.users,
    });
    return;
  }

  const patchMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (patchMatch && req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(patchMatch[1]);
    const body = await readJsonBody(req);
    const updated = updateUser(id, body);
    sendJson(res, 200, { user: updated });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}
