import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getRequestUser } from "./authApiMiddleware.js";
import { pathnameOf, readJsonBody, sendJson } from "./httpHelpers.js";
import { syncAssignmentsFromProjects } from "./usersStore.js";
import { interconnectClientAndPhases } from "./clientProjectsStore.js";
import { isAdminRole } from "./roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.resolve(ROOT, "public/data/projects.json");
const DIST_DB_PATH = path.resolve(ROOT, "dist/data/projects.json");

function readProjects() {
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Database must be a JSON array");
  return parsed;
}

function writeProjects(projects) {
  // Keep client-projects.json in sync; push role-matched teams onto phases
  const { phases: linked } = interconnectClientAndPhases(projects, { writePhases: false });
  const pretty = JSON.stringify(linked, null, 2) + "\n";
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, pretty, "utf8");
  try {
    fs.mkdirSync(path.dirname(DIST_DB_PATH), { recursive: true });
    fs.writeFileSync(DIST_DB_PATH, pretty, "utf8");
  } catch {
    /* dist may be missing */
  }
  try {
    syncAssignmentsFromProjects(linked);
  } catch (err) {
    console.error("[projects-api] assignment sync failed:", err.message);
  }
}

function filterForUser(projects, user) {
  if (!user) return [];
  if (isAdminRole(user)) return projects;
  const allowed = new Set((user.assignedProjectIds || []).map(String));
  return projects.filter((p) => allowed.has(String(p.id)));
}

function assertMemberWriteAllowed(user, nextProjects, prevProjects) {
  if (isAdminRole(user)) return;
  const allowed = new Set((user.assignedProjectIds || []).map(String));
  const prevById = new Map(prevProjects.map((p) => [String(p.id), p]));
  const nextById = new Map(nextProjects.map((p) => [String(p.id), p]));

  // Members cannot add/remove projects
  if (prevProjects.length !== nextProjects.length) {
    throw new Error("Members cannot add or remove projects");
  }
  for (const id of prevById.keys()) {
    if (!nextById.has(id)) throw new Error("Members cannot delete projects");
  }
  for (const [id, next] of nextById) {
    if (!allowed.has(id)) {
      const prev = prevById.get(id);
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        throw new Error("Members can only edit assigned projects");
      }
    }
  }
}

/**
 * Authenticated projects API with member ACL.
 */
export function projectsApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);
  if (pathname !== "/api/projects" && !pathname.startsWith("/api/projects/")) {
    if (typeof next === "function") return next();
    return false;
  }

  const handled = handle(req, res).catch((err) => {
    console.error("[projects-api]", err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || "Projects API error" });
  });
  return handled.then(() => true);
}

export async function handleProjectsApi(req, res) {
  const pathname = pathnameOf(req);
  if (pathname !== "/api/projects" && !pathname.startsWith("/api/projects/")) {
    return false;
  }
  await projectsApiMiddleware(req, res, () => {});
  return true;
}

async function handle(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const projects = filterForUser(readProjects(), user);
    sendJson(res, 200, projects);
    return;
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = await readJsonBody(req);
    if (!Array.isArray(body)) {
      sendJson(res, 400, { error: "Database must be a JSON array" });
      return;
    }
    const prev = readProjects();
    try {
      assertMemberWriteAllowed(user, body, prev);
    } catch (err) {
      sendJson(res, 403, { error: err.message });
      return;
    }

    if (isAdminRole(user)) {
      writeProjects(body);
    } else {
      // Merge member edits into full DB for assigned ids only
      const allowed = new Set((user.assignedProjectIds || []).map(String));
      const nextById = new Map(body.map((p) => [String(p.id), p]));
      const merged = prev.map((p) => {
        const id = String(p.id);
        if (allowed.has(id) && nextById.has(id)) return nextById.get(id);
        return p;
      });
      writeProjects(merged);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}
