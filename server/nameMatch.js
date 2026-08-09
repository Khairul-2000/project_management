/**
 * Match short names used on projects (e.g. "Arman") to full user names.
 */

export function normalizePersonName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extra short-name aliases keyed by normalized full user name */
export const DEFAULT_NAME_ALIASES = {
  "khairul islam": ["khairul"],
  "sifat rahman": ["sifat"],
  "ovie rahaman sheikh": ["ovie"],
  "pritom banerjee": ["pritom"],
  "pronay debnath": ["pronay"],
  "riaz mahmood": ["riaz"],
  "iman emon": ["emon", "iman"],
  "fardin ahammed siam": ["fardin", "siam"],
  "galib mahmud": ["galib"],
  "hossain ahamed khan": ["hossain"],
  "kawsar al hasan": ["kawsar"],
  "md sawjal sikder": ["sawjal", "md sawjal"],
  "miraz or rashid alvee": ["alvee", "alvi", "miraz"],
  "md arman hosen": ["arman", "md arman"],
  "bayajit islam": ["bayajit"],
  "faysal hasan": ["faysal"],
  sishir: ["sishir"],
};

export function collectProjectMemberNames(project) {
  const names = [];
  if (project?.supervisor) names.push(project.supervisor);
  if (Array.isArray(project?.teamMembers)) {
    for (const m of project.teamMembers) {
      if (m?.name) names.push(m.name);
    }
  }
  if (project?.membersRaw) {
    String(project.membersRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((n) => names.push(n));
  }
  return names;
}

export function buildUserMatchIndex(users) {
  /** @type {Map<string, string>} normalized key -> userId */
  const index = new Map();
  const members = (users || []).filter((u) => u?.id && u.role !== "admin");

  // 1) Full names + explicit aliases
  for (const user of members) {
    const full = normalizePersonName(user.name);
    if (!full) continue;
    index.set(full, user.id);
    const defaults = DEFAULT_NAME_ALIASES[full] || [];
    for (const a of [...defaults, ...(user.aliases || [])]) {
      const key = normalizePersonName(a);
      if (key) index.set(key, user.id);
    }
  }

  // 2) First-name tokens only when unique among members
  const firstCounts = new Map();
  for (const user of members) {
    const first = normalizePersonName(user.name).split(" ").filter(Boolean)[0];
    if (!first) continue;
    firstCounts.set(first, (firstCounts.get(first) || 0) + 1);
  }
  for (const user of members) {
    const first = normalizePersonName(user.name).split(" ").filter(Boolean)[0];
    if (first && firstCounts.get(first) === 1 && !index.has(first)) {
      index.set(first, user.id);
    }
  }

  return index;
}

export function resolveUserIdForName(name, matchIndex) {
  const n = normalizePersonName(name);
  if (!n) return null;
  if (matchIndex.has(n)) return matchIndex.get(n);
  const first = n.split(" ")[0];
  if (first && matchIndex.has(first)) return matchIndex.get(first);
  return null;
}

/**
 * Build map userId -> projectId[] from project team fields.
 * Prefers explicit teamMembers[].userId when present.
 */
export function assignmentsFromProjects(projects, users) {
  const matchIndex = buildUserMatchIndex(users);
  const knownIds = new Set((users || []).filter((u) => u?.id && u.role !== "admin").map((u) => u.id));
  /** @type {Map<string, Set<string>>} */
  const byUser = new Map();
  const unmatched = new Map();

  function link(userId, projectId) {
    if (!userId || !knownIds.has(userId)) return false;
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    byUser.get(userId).add(projectId);
    return true;
  }

  for (const project of projects || []) {
    const projectId = String(project?.id || "");
    if (!projectId) continue;

    if (Array.isArray(project?.teamMembers)) {
      for (const m of project.teamMembers) {
        if (m?.userId && link(String(m.userId), projectId)) continue;
        const rawName = m?.name;
        if (!rawName) continue;
        const userId = resolveUserIdForName(rawName, matchIndex);
        if (!link(userId, projectId)) {
          const key = normalizePersonName(rawName);
          unmatched.set(key, (unmatched.get(key) || 0) + 1);
        }
      }
    }

    if (project?.supervisor) {
      const userId = resolveUserIdForName(project.supervisor, matchIndex);
      if (!link(userId, projectId)) {
        const key = normalizePersonName(project.supervisor);
        unmatched.set(key, (unmatched.get(key) || 0) + 1);
      }
    }

    if (project?.membersRaw) {
      for (const rawName of String(project.membersRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const userId = resolveUserIdForName(rawName, matchIndex);
        if (!link(userId, projectId)) {
          const key = normalizePersonName(rawName);
          unmatched.set(key, (unmatched.get(key) || 0) + 1);
        }
      }
    }
  }

  return { byUser, unmatched: Object.fromEntries(unmatched) };
}
