import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
export const CLIENT_PROJECTS_PATH = path.resolve(ROOT, "data/client-projects.json");
const PROJECTS_PATH = path.resolve(ROOT, "public/data/projects.json");
const DIST_PROJECTS_PATH = path.resolve(ROOT, "dist/data/projects.json");

export function projectNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

export function clientProjectIdFromName(name) {
  const key = projectNameKey(name);
  const slug =
    key
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "unknown";
  return `cp-${slug}`;
}

function ensureDir() {
  fs.mkdirSync(path.dirname(CLIENT_PROJECTS_PATH), { recursive: true });
}

function emptyStore() {
  return { clientProjects: [] };
}

export function readClientProjectsFile() {
  ensureDir();
  if (!fs.existsSync(CLIENT_PROJECTS_PATH)) {
    return emptyStore();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(CLIENT_PROJECTS_PATH, "utf8"));
    if (!parsed || !Array.isArray(parsed.clientProjects)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function writeClientProjectsFile(data) {
  ensureDir();
  const payload = {
    clientProjects: Array.isArray(data?.clientProjects) ? data.clientProjects : [],
  };
  fs.writeFileSync(CLIENT_PROJECTS_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return payload;
}

export function listClientProjects() {
  return readClientProjectsFile().clientProjects;
}

function makeClientProject(projectName) {
  const key = projectNameKey(projectName);
  const display = String(projectName || "").trim() || key;
  return {
    id: clientProjectIdFromName(display),
    projectName: display,
    projectNameKey: key,
    supervisor: "",
    teamMembers: [],
    membersRaw: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function clientProjectHasTeam(cp) {
  if (!cp) return false;
  if (String(cp.supervisor || "").trim()) return true;
  if (String(cp.membersRaw || "").trim()) return true;
  return Array.isArray(cp.teamMembers) && cp.teamMembers.length > 0;
}

export function phaseTeamIsEmpty(phase) {
  if (!phase) return true;
  if (String(phase.supervisor || "").trim()) return false;
  if (String(phase.membersRaw || "").trim()) return false;
  return !(Array.isArray(phase.teamMembers) && phase.teamMembers.length > 0);
}

export function copyTeamFromClient(cp) {
  return {
    supervisor: cp?.supervisor || "",
    teamMembers: Array.isArray(cp?.teamMembers)
      ? cp.teamMembers.map((m) => ({ ...m }))
      : [],
    membersRaw: cp?.membersRaw || "",
  };
}

export function deriveStackFromPhase(phase) {
  const p = String(phase || "").toLowerCase();
  if (!p) return "Other";

  // Backend always wins — "Mobile App Backend" / "AI App Backend" → Backend
  if (p.includes("backend")) return "Backend";

  // App frontends (not website) → App Development, not generic Frontend
  const isWebsite = p.includes("website") || p.includes("web site");
  const isAppFrontend =
    !isWebsite &&
    p.includes("frontend") &&
    (/\bmobile\s+app\b/.test(p) ||
      /\bai\s+app\b/.test(p) ||
      /\bapp\s+frontend\b/.test(p) ||
      /\bapp\b/.test(p) ||
      /\bmobile\b/.test(p));
  if (isAppFrontend) return "App Development";

  if (p.includes("frontend")) return "Frontend";
  if (p.includes("ui/ux") || p.includes("ui ux") || (/\bui\b/.test(p) && /\bux\b/.test(p))) return "UI/UX";
  if (p.includes("automation")) return "Automation";
  if (p.includes("deploy") || p.includes("publish")) return "Deploy";
  if (p.includes("app development")) return "App Development";
  return "Other";
}

/** Which stacks a client-team role should attach to ("*" = every phase). */
export function stacksForRole(role) {
  const r = String(role || "").toLowerCase().trim();
  if (!r) return ["*"];
  if (r.includes("supervisor") || r.includes("project lead") || r === "lead") return ["*"];
  if (r.includes("backend")) return ["Backend"];
  // App before frontend — "App Developer" must not fall through to Frontend
  if (r.includes("app")) return ["App Development"];
  if (r.includes("frontend")) return ["Frontend"];
  if (r.includes("ui") || r.includes("ux")) return ["UI/UX"];
  if (r.includes("devops") || r.includes("deploy")) return ["Deploy"];
  if (r.includes("automation") || r.includes("qa")) return ["Automation"];
  if (r.includes("ai")) return ["Automation", "App Development", "Backend", "Frontend", "UI/UX"];
  return ["*"];
}

function memberRoles(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [member?.role];
  return [...new Set(roles.map((role) => String(role || "").trim()).filter(Boolean))];
}

function rolesForStack(roles, stack) {
  const list = memberRoles({ roles });
  const matching = list.filter((role) => {
    const targets = stacksForRole(role);
    return targets.includes("*") || targets.includes(stack);
  });
  return matching.length ? matching : [];
}

function roleMatchesPhaseStack(roles, stack) {
  return rolesForStack(roles, stack).length > 0;
}

function phaseStack(phase) {
  if (phase?.stackLocked && phase?.stack) return phase.stack;
  return deriveStackFromPhase(phase?.phase) || phase?.stack || "Other";
}

function phaseHasMember(phase, member) {
  const team = Array.isArray(phase?.teamMembers) ? phase.teamMembers : [];
  const uid = member?.userId ? String(member.userId) : "";
  const name = String(member?.name || "")
    .trim()
    .toLowerCase();
  return team.some((m) => {
    if (uid && m?.userId && String(m.userId) === uid) return true;
    return (
      name &&
      String(m?.name || "")
        .trim()
        .toLowerCase() === name
    );
  });
}

/**
 * Attach role-matched client members onto one phase without removing existing people.
 * Supervisor/Project Lead → supervisor field if empty; also added to team when role is lead.
 * Only the roles that match this phase's stack are written onto the phase member.
 */
export function applyClientTeamToSinglePhase(phase, clientProject, options = {}) {
  if (!phase || !clientProject) return phase;
  const syncRoles = Boolean(options.syncRoles);
  const stack = phaseStack(phase);
  const clientMembers = Array.isArray(clientProject.teamMembers) ? clientProject.teamMembers : [];
  const next = {
    ...phase,
    stack,
    clientProjectId: clientProject.id || phase.clientProjectId || "",
    teamMembers: Array.isArray(phase.teamMembers) ? [...phase.teamMembers] : [],
    supervisor: phase.supervisor || "",
    membersRaw: phase.membersRaw || "",
  };

  const assignedSupervisor = String(clientProject.supervisor || "").trim();
  if (assignedSupervisor) {
    if (syncRoles || !String(next.supervisor || "").trim()) {
      next.supervisor = assignedSupervisor;
    }
  } else if (syncRoles) {
    next.supervisor = "";
  }

  let added = 0;
  for (const m of clientMembers) {
    if (!m?.name) continue;
    const allRoles = memberRoles(m);
    const isSupervisor = allRoles.some((role) => String(role || "").trim().toLowerCase() === "supervisor");
    const isLead = allRoles.some((role) => /supervisor|project lead|^lead$/i.test(role));

    if (isSupervisor) {
      next.supervisor = String(m.name).trim();
    } else if (isLead && !String(next.supervisor || "").trim()) {
      next.supervisor = m.name;
    }

    const matchedRoles = rolesForStack(allRoles, stack);
    const existingIndex = next.teamMembers.findIndex(
      (member) =>
        (m.userId && member?.userId && String(m.userId) === String(member.userId)) ||
        String(member?.name || "")
          .trim()
          .toLowerCase() ===
          String(m.name || "")
            .trim()
            .toLowerCase()
    );

    if (!matchedRoles.length) {
      if (syncRoles && existingIndex >= 0) {
        next.teamMembers.splice(existingIndex, 1);
      }
      continue;
    }

    if (existingIndex >= 0) {
      const nextRoles = syncRoles
        ? matchedRoles
        : [...new Set([...memberRoles(next.teamMembers[existingIndex]), ...matchedRoles])];
      next.teamMembers[existingIndex] = {
        ...next.teamMembers[existingIndex],
        roles: nextRoles,
        role: nextRoles[0] || "Member",
        userId: m.userId ? String(m.userId) : next.teamMembers[existingIndex].userId,
      };
      continue;
    }

    next.teamMembers.push({
      id: m.id || m.userId || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: m.userId ? String(m.userId) : undefined,
      name: String(m.name).trim(),
      roles: matchedRoles,
      role: matchedRoles[0] || "Member",
    });
    added += 1;
  }

  next._membersAdded = added;
  return next;
}

/**
 * Apply client team to all matching phases by role/stack.
 * Existing phase members are kept; missing role matches are added.
 */
export function applyClientTeamToEmptyPhases(phases, clientProject) {
  return applyClientTeamToPhases(phases, clientProject);
}

export function applyClientTeamToPhases(phases, clientProject, options = {}) {
  if (!clientProjectHasTeam(clientProject)) return { phases, changed: 0 };
  const key = clientProject.projectNameKey || projectNameKey(clientProject.projectName);
  let changed = 0;
  const next = (phases || []).map((p) => {
    if (projectNameKey(p.projectName) !== key) return p;
    const before = JSON.stringify({
      supervisor: p.supervisor || "",
      teamMembers: p.teamMembers || [],
      clientProjectId: p.clientProjectId || "",
    });
    const updated = applyClientTeamToSinglePhase(p, clientProject, options);
    delete updated._membersAdded;
    const after = JSON.stringify({
      supervisor: updated.supervisor || "",
      teamMembers: updated.teamMembers || [],
      clientProjectId: updated.clientProjectId || "",
    });
    if (before !== after) changed += 1;
    return updated;
  });
  return { phases: next, changed };
}

function memberKey(m) {
  if (m?.userId) return `uid:${String(m.userId)}`;
  return `name:${String(m?.name || "")
    .trim()
    .toLowerCase()}`;
}

function normalizeMemberRecord(m) {
  const roles = memberRoles(m);
  return {
    id: m.id || m.userId || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: m.userId ? String(m.userId) : undefined,
    name: String(m.name || "").trim(),
    roles,
    role: roles[0] || "Member",
  };
}

/** Union two team lists by userId/name and merge roles. */
export function mergeTeamMembers(base, incoming) {
  const map = new Map();
  for (const m of [...(base || []), ...(incoming || [])]) {
    if (!m?.name && !m?.userId) continue;
    const key = memberKey(m);
    if (!key || key === "name:") continue;
    if (!map.has(key)) {
      map.set(key, normalizeMemberRecord(m));
      continue;
    }
    const prev = map.get(key);
    const roles = [...new Set([...memberRoles(prev), ...memberRoles(m)])];
    map.set(key, {
      ...prev,
      ...normalizeMemberRecord(m),
      id: prev.id || m.id,
      userId: prev.userId || (m.userId ? String(m.userId) : undefined),
      name: prev.name || String(m.name || "").trim(),
      roles,
      role: roles[0] || "Member",
    });
  }
  return [...map.values()].filter((m) => m.name);
}

/** Merge unique team members + first supervisor / membersRaw from phase rows. */
export function aggregateTeamFromPhases(phases) {
  let supervisor = "";
  const rawParts = [];
  let teamMembers = [];

  for (const phase of phases || []) {
    if (!supervisor && String(phase?.supervisor || "").trim()) {
      supervisor = String(phase.supervisor).trim();
    }
    if (String(phase?.membersRaw || "").trim()) {
      rawParts.push(String(phase.membersRaw).trim());
    }
    teamMembers = mergeTeamMembers(teamMembers, phase?.teamMembers);
  }

  const membersRaw = [
    ...new Set(
      rawParts
        .join(",")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ].join(", ");
  return {
    supervisor,
    teamMembers,
    membersRaw,
  };
}

function groupPhasesByNameKey(phases) {
  const map = new Map();
  for (const phase of phases || []) {
    const name = String(phase?.projectName || "").trim();
    if (!name) continue;
    const key = projectNameKey(name);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(phase);
  }
  return map;
}

/**
 * Ensure a client project exists for every distinct projectName in phase rows.
 * Always merge phase-level teams up into the client project (union + role merge).
 * Stamps clientProjectId and normalized stack on phase objects. Returns client list.
 */
export function ensureClientProjectsFromPhases(phases) {
  const data = readClientProjectsFile();
  const byKey = new Map(
    data.clientProjects.map((cp) => [cp.projectNameKey || projectNameKey(cp.projectName), { ...cp }])
  );
  const phasesByKey = groupPhasesByNameKey(phases);

  for (const [key, group] of phasesByKey) {
    const name = String(group[0]?.projectName || "").trim() || key;
    if (!byKey.has(key)) {
      byKey.set(key, makeClientProject(name));
    }
    const existing = byKey.get(key);
    if (!existing.projectName) existing.projectName = name;

    // Always roll phase teams into the client project so phase assigns appear at project level
    const rolled = aggregateTeamFromPhases(group);
    existing.teamMembers = mergeTeamMembers(existing.teamMembers, rolled.teamMembers);
    if (!String(existing.supervisor || "").trim() && rolled.supervisor) {
      existing.supervisor = rolled.supervisor;
    }
    if (rolled.membersRaw) {
      const parts = `${existing.membersRaw || ""},${rolled.membersRaw}`
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      existing.membersRaw = [...new Set(parts)].join(", ");
    }

    // Link phases → client project; keep admin-locked department, else derive from phase title
    for (const phase of group) {
      phase.clientProjectId = existing.id;
      if (phase.stackLocked && phase.stack) {
        phase.stack = phase.stack;
      } else {
        phase.stack = phaseStack(phase);
        phase.stackLocked = false;
      }
    }
  }

  const next = [...byKey.values()].sort((a, b) =>
    String(a.projectName).localeCompare(String(b.projectName))
  );
  writeClientProjectsFile({ clientProjects: next });
  return next;
}

/** Write phase rows to projects.json (+ dist). */
export function writePhasesJson(projects) {
  const pretty = JSON.stringify(projects, null, 2) + "\n";
  fs.mkdirSync(path.dirname(PROJECTS_PATH), { recursive: true });
  fs.writeFileSync(PROJECTS_PATH, pretty, "utf8");
  try {
    fs.mkdirSync(path.dirname(DIST_PROJECTS_PATH), { recursive: true });
    fs.writeFileSync(DIST_PROJECTS_PATH, pretty, "utf8");
  } catch {
    /* dist may be missing */
  }
}

/**
 * Full interconnect: ensure parents, seed empty client teams from phases,
 * stamp clientProjectId, push role-matched client members onto phases,
 * optionally write phases back if anything changed.
 */
export function interconnectClientAndPhases(phases, { writePhases = false } = {}) {
  const list = Array.isArray(phases) ? phases.map((p) => ({ ...p })) : [];
  const before = JSON.stringify(
    list.map((p) => ({
      id: p.id,
      clientProjectId: p.clientProjectId || "",
      supervisor: p.supervisor || "",
      teamMembers: p.teamMembers || [],
      orderId: p.orderId || "",
    }))
  );

  // Normalize order ids (#FO… → FO…)
  for (const p of list) {
    const oid = String(p.orderId || "")
      .trim()
      .replace(/^#+/, "");
    if (oid && oid !== p.orderId) p.orderId = oid;
  }

  const clientProjects = ensureClientProjectsFromPhases(list);

  let next = list;
  let teamPushes = 0;
  for (const cp of clientProjects) {
    if (!clientProjectHasTeam(cp)) continue;
    const result = applyClientTeamToPhases(next, cp);
    next = result.phases;
    teamPushes += result.changed;
  }

  const after = JSON.stringify(
    next.map((p) => ({
      id: p.id,
      clientProjectId: p.clientProjectId || "",
      supervisor: p.supervisor || "",
      teamMembers: p.teamMembers || [],
      orderId: p.orderId || "",
    }))
  );
  const linksChanged = before !== after;
  if (writePhases && linksChanged) {
    writePhasesJson(next);
  }
  return { clientProjects, phases: next, linksChanged, teamPushes };
}

export function findClientProjectById(id) {
  return listClientProjects().find((cp) => String(cp.id) === String(id)) || null;
}

export function findClientProjectByNameKey(key) {
  const k = projectNameKey(key);
  return listClientProjects().find((cp) => cp.projectNameKey === k) || null;
}

export function updateClientProject(id, patch) {
  const data = readClientProjectsFile();
  const idx = data.clientProjects.findIndex((cp) => String(cp.id) === String(id));
  if (idx < 0) throw new Error("Client project not found");

  const prev = data.clientProjects[idx];
  const next = { ...prev };

  if (patch.supervisor !== undefined) next.supervisor = String(patch.supervisor || "");
  if (patch.membersRaw !== undefined) next.membersRaw = String(patch.membersRaw || "");
  if (patch.notes !== undefined) {
    const incoming = Array.isArray(patch.notes) ? patch.notes : String(patch.notes || "").trim() ? [{ id: "legacy-note", text: String(patch.notes).trim(), createdAt: "" }] : [];
    next.notes = incoming.map((note) => ({ id: String(note?.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`), text: String(note?.text || "").trim(), createdAt: note?.createdAt || "" })).filter((note) => note.text);
  }
  if (Array.isArray(patch.teamMembers)) {
    next.teamMembers = patch.teamMembers
      .map((m) => ({
        id: m.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: String(m.name || "").trim(),
        roles: memberRoles(m),
        role: memberRoles(m)[0] || "Member",
        userId: m.userId ? String(m.userId) : undefined,
      }))
      .filter((m) => m.name);
  }

  data.clientProjects[idx] = next;
  writeClientProjectsFile(data);
  return next;
}

export function getClientProjectMap() {
  const map = new Map();
  for (const cp of listClientProjects()) {
    map.set(cp.projectNameKey || projectNameKey(cp.projectName), cp);
  }
  return map;
}
