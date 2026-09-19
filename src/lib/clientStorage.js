/**
 * Zero-dependency client-side local storage engine using IndexedDB with localStorage fallback.
 * Allows Delivery Ops Console to operate 100% in-browser without any server or database.
 */

const DB_NAME = "delivery_ops_db";
const DB_VERSION = 1;
const STORE_NAME = "app_state";

const DEFAULT_USERS = [
  {
    id: "u-admin",
    name: "Khairul",
    username: "khairul",
    role: "super_admin",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "khairul",
    gitlabUsername: "",
  },
  {
    id: "u-pritom",
    name: "Pritom Banerjee",
    username: "pritom.banerjee",
    role: "admin",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-sifat",
    name: "Sifat Rahman",
    username: "sifat.rahman",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-ovie",
    name: "Ovie Rahaman Sheikh",
    username: "ovie.rahaman.sheikh",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-pronay",
    name: "Pronay Debnath",
    username: "pronay.debnath",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-riaz",
    name: "Riaz Mahmood",
    username: "riaz.mahmood",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-arman",
    name: "Md. Arman Hosen",
    username: "md.arman.hosen",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
  {
    id: "u-faysal",
    name: "Faysal Hasan",
    username: "faysal.hasan",
    role: "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: true,
    githubUsername: "",
    gitlabUsername: "",
  },
];

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const local = localStorage.getItem(`${DB_NAME}_${key}`);
    return local ? JSON.parse(local) : null;
  }
}

async function idbSet(key, value) {
  try {
    const db = await openIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* fallback to localStorage */
  }
  try {
    localStorage.setItem(`${DB_NAME}_${key}`, JSON.stringify(value));
  } catch {
    /* ignore quota exceptions */
  }
}

export function projectNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

/**
 * Builds or refreshes client projects grouped by project name
 */
export function buildClientProjectsFromPhases(phases, existingClientProjects = []) {
  const existingMap = new Map(
    (existingClientProjects || []).map((cp) => [
      cp.projectNameKey || projectNameKey(cp.projectName),
      cp,
    ])
  );

  const phaseGroups = new Map();
  for (const p of phases || []) {
    const key = projectNameKey(p.projectName);
    if (!key) continue;
    if (!phaseGroups.has(key)) phaseGroups.set(key, []);
    phaseGroups.get(key).push(p);
  }

  const result = [];
  for (const [key, kids] of phaseGroups.entries()) {
    const existing = existingMap.get(key) || {};
    const first = kids[0];

    // Collect team members across phases
    const allMembers = [];
    const seenNames = new Set();
    kids.forEach((k) => {
      if (Array.isArray(k.teamMembers)) {
        k.teamMembers.forEach((m) => {
          const mName = String(m.name || "").trim().toLowerCase();
          if (mName && !seenNames.has(mName)) {
            seenNames.add(mName);
            allMembers.push(m);
          }
        });
      }
    });

    result.push({
      id: existing.id || `cp-${key.replace(/[^a-z0-9]+/g, "-")}`,
      projectName: existing.projectName || first.projectName,
      projectNameKey: key,
      teamMembers: existing.teamMembers?.length ? existing.teamMembers : allMembers,
      supervisor: existing.supervisor || first.supervisor || "",
      membersRaw: existing.membersRaw || first.membersRaw || "",
      notes: existing.notes || "",
      githubUrl: existing.githubUrl || first.githubUrl || "",
      gitlabUrl: existing.gitlabUrl || first.gitlabUrl || "",
    });
  }

  return result.sort((a, b) => a.projectName.localeCompare(b.projectName));
}

/**
 * Initializes client-side data store. Seeds from /data/projects.json if empty.
 */
export async function initClientStorage() {
  let storedProjects = await idbGet("projects");
  let storedUsers = await idbGet("users");
  let storedClientProjects = await idbGet("clientProjects");
  let currentUser = await idbGet("currentUser");

  if (!Array.isArray(storedUsers) || storedUsers.length === 0) {
    storedUsers = DEFAULT_USERS;
    await idbSet("users", storedUsers);
  }

  if (!currentUser) {
    currentUser = storedUsers[0] || DEFAULT_USERS[0];
    await idbSet("currentUser", currentUser);
  }

  if (!Array.isArray(storedProjects) || storedProjects.length === 0) {
    // Attempt to seed from /api/projects first, then fallback to /data/projects.json
    try {
      const res = await fetch("/api/projects", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          storedProjects = data;
        }
      }
    } catch {
      /* ignore */
    }
    if (!storedProjects || storedProjects.length === 0) {
      try {
        const res = await fetch("/data/projects.json");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            storedProjects = data;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (Array.isArray(storedProjects) && storedProjects.length > 0) {
      await idbSet("projects", storedProjects);
    } else {
      storedProjects = [];
    }
  }

  if (!Array.isArray(storedClientProjects) || storedClientProjects.length === 0) {
    storedClientProjects = buildClientProjectsFromPhases(storedProjects);
    await idbSet("clientProjects", storedClientProjects);
  }

  return {
    projects: storedProjects,
    users: storedUsers,
    clientProjects: storedClientProjects,
    currentUser,
  };
}

export async function getClientProjects() {
  const list = await idbGet("projects");
  return Array.isArray(list) ? list : [];
}

export async function saveClientProjects(projects) {
  await idbSet("projects", projects);
  const existingCps = (await idbGet("clientProjects")) || [];
  const updatedCps = buildClientProjectsFromPhases(projects, existingCps);
  await idbSet("clientProjects", updatedCps);
  return { projects, clientProjects: updatedCps };
}

export async function getStoredClientProjects() {
  const list = await idbGet("clientProjects");
  return Array.isArray(list) ? list : [];
}

export async function updateSingleClientProject(id, patch) {
  const list = await getStoredClientProjects();
  let updatedCp = null;
  const next = list.map((cp) => {
    if (cp.id === id) {
      updatedCp = { ...cp, ...patch };
      return updatedCp;
    }
    return cp;
  });
  await idbSet("clientProjects", next);
  return updatedCp;
}

export async function getStoredUsers() {
  const list = await idbGet("users");
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_USERS;
}

export async function saveStoredUsers(users) {
  await idbSet("users", users);
  return users;
}

export async function getStoredCurrentUser() {
  const user = await idbGet("currentUser");
  return user || DEFAULT_USERS[0];
}

export async function saveStoredCurrentUser(user) {
  await idbSet("currentUser", user);
  return user;
}

export async function switchClientUserRole(targetRole) {
  const users = await getStoredUsers();
  let currentUser = await getStoredCurrentUser();

  // Find a matching user with this role or mutate current
  const match = users.find((u) => u.role === targetRole);
  if (match) {
    currentUser = match;
  } else {
    currentUser = { ...currentUser, role: targetRole };
  }
  await saveStoredCurrentUser(currentUser);
  return currentUser;
}

export async function exportFullDatabaseBackup() {
  const projects = (await idbGet("projects")) || [];
  const clientProjects = (await idbGet("clientProjects")) || [];
  const users = (await idbGet("users")) || [];

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    totalProjects: projects.length,
    projects,
    clientProjects,
    users,
  };
}

export async function importFullDatabaseBackup(backupData) {
  if (!backupData || !Array.isArray(backupData.projects)) {
    throw new Error("Invalid backup format: missing projects array");
  }
  await idbSet("projects", backupData.projects);
  if (Array.isArray(backupData.clientProjects)) {
    await idbSet("clientProjects", backupData.clientProjects);
  } else {
    await idbSet("clientProjects", buildClientProjectsFromPhases(backupData.projects));
  }
  if (Array.isArray(backupData.users) && backupData.users.length > 0) {
    await idbSet("users", backupData.users);
  }
  return {
    projectsCount: backupData.projects.length,
    clientProjectsCount: backupData.clientProjects?.length || 0,
    usersCount: backupData.users?.length || 0,
  };
}
