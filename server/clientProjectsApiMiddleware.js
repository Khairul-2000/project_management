import { getRequestUser, requireAdmin } from "./authApiMiddleware.js";
import { isAdminRole } from "./roles.js";
import { pathnameOf, readJsonBody, sendJson } from "./httpHelpers.js";
import {
  applyClientTeamToPhases,
  findClientProjectById,
  interconnectClientAndPhases,
  updateClientProject,
  writePhasesJson,
  projectNameKey,
} from "./clientProjectsStore.js";
import { syncAssignmentsFromProjects } from "./usersStore.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_PATH = path.resolve(__dirname, "../public/data/projects.json");

function readPhases() {
  try {
    const raw = JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function filterClientProjectsForUser(clientProjects, phases, user) {
  if (!user) return [];
  if (isAdminRole(user)) return clientProjects;

  const allowedPhaseIds = new Set((user.assignedProjectIds || []).map(String));
  const allowedKeys = new Set();
  for (const p of phases) {
    if (allowedPhaseIds.has(String(p.id))) {
      allowedKeys.add(projectNameKey(p.projectName));
    }
  }
  return clientProjects.filter((cp) =>
    allowedKeys.has(cp.projectNameKey || projectNameKey(cp.projectName))
  );
}

export function clientProjectsApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);
  if (pathname !== "/api/client-projects" && !pathname.startsWith("/api/client-projects/")) {
    if (typeof next === "function") return next();
    return false;
  }

  const handled = handle(req, res).catch((err) => {
    console.error("[client-projects-api]", err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || "Client projects API error" });
  });
  return handled.then(() => true);
}

export async function handleClientProjectsApi(req, res) {
  const pathname = pathnameOf(req);
  if (pathname !== "/api/client-projects" && !pathname.startsWith("/api/client-projects/")) {
    return false;
  }
  await clientProjectsApiMiddleware(req, res, () => {});
  return true;
}

async function handle(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const pathname = pathnameOf(req);
  let phases = readPhases();

  if (pathname === "/api/client-projects" && req.method === "GET") {
    // Seed client teams from phase teams + stamp clientProjectId on phases
    const { clientProjects, phases: linked, linksChanged } = interconnectClientAndPhases(phases, {
      writePhases: true,
    });
    phases = linked;
    try {
      syncAssignmentsFromProjects(phases);
    } catch (err) {
      console.error("[client-projects] assignment sync failed:", err.message);
    }
    const visible = filterClientProjectsForUser(clientProjects, phases, user);
    sendJson(res, 200, { clientProjects: visible, linksChanged: Boolean(linksChanged) });
    return;
  }

  const patchMatch = pathname.match(/^\/api\/client-projects\/([^/]+)$/);
  if (patchMatch && req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(patchMatch[1]);
    const body = await readJsonBody(req);
    const prev = findClientProjectById(id);
    const updated = updateClientProject(id, body);
    const teamChanged = JSON.stringify(prev?.teamMembers || []) !== JSON.stringify(updated.teamMembers || []);

    // Push role-matched client team onto phases. When roles are edited, replace
    // instead of merge so members move to the phases that match their new roles.
    const { phases: nextPhases, changed } = applyClientTeamToPhases(phases, updated, {
      syncRoles: teamChanged,
    });
    const stamped = nextPhases.map((p) =>
      projectNameKey(p.projectName) === (updated.projectNameKey || projectNameKey(updated.projectName))
        ? { ...p, clientProjectId: updated.id }
        : p
    );
    writePhasesJson(stamped);
    try {
      syncAssignmentsFromProjects(stamped);
    } catch (err) {
      console.error("[client-projects] assignment sync failed:", err.message);
    }
    sendJson(res, 200, { clientProject: updated, phasesUpdated: changed });
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}
