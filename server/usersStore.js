import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { assignmentsFromProjects } from "./nameMatch.js";
import { listClientProjects } from "./clientProjectsStore.js";
import { isAdminRole, isSuperAdmin, normalizeAccountRole } from "./roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

export const USERS_PATH = path.resolve(ROOT, "data/users.json");

const SEED_MEMBERS = [
  "Sifat Rahman",
  "Ovie Rahaman Sheikh",
  "Pritom Banerjee",
  "Pronay Debnath",
  "Riaz Mahmood",
  "Iman Emon",
  "Fardin Ahammed Siam",
  "Galib Mahmud",
  "Hossain Ahamed Khan",
  "Kawsar Al Hasan",
  "Md Sawjal Sikder",
  "Miraz Or Rashid Alvee",
  "Md. Arman Hosen",
  "Bayajit Islam",
  "Faysal Hasan",
  "Sishir",
];

function slugUsername(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 32);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof passwordHash !== "string") return false;
  const parts = passwordHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function newId(prefix = "u") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: Boolean(user.active),
    assignedProjectIds: Array.isArray(user.assignedProjectIds) ? user.assignedProjectIds : [],
    hasPassword: Boolean(user.passwordHash),
  };
}

function ensureDir() {
  fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
}

function loadUsersRaw() {
  ensureDir();
  if (!fs.existsSync(USERS_PATH)) {
    return seedUsersFile();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
    if (!raw || !Array.isArray(raw.users)) return seedUsersFile();
    return raw;
  } catch {
    return seedUsersFile();
  }
}

function migrateSuperAdmin(data) {
  let changed = false;
  const khairul = (data.users || []).find(
    (user) => user?.id === "u-admin" || String(user?.username || "").toLowerCase() === "khairul"
  );
  if (khairul && khairul.role !== "super_admin") {
    khairul.role = "super_admin";
    changed = true;
  }
  if (!(data.users || []).some((user) => isSuperAdmin(user))) {
    const firstAdmin = (data.users || []).find((user) => user?.role === "admin");
    if (firstAdmin) {
      firstAdmin.role = "super_admin";
      changed = true;
    }
  }
  return changed;
}

export function readUsersFile() {
  const data = loadUsersRaw();
  let changed = migrateSuperAdmin(data);
  const byName = new Set(data.users.map((u) => String(u.name).toLowerCase()));
  const usedUsernames = new Set(data.users.map((u) => u.username.toLowerCase()));
  let added = 0;

  for (const name of SEED_MEMBERS) {
    if (byName.has(name.toLowerCase())) continue;
    let username = slugUsername(name) || `user${data.users.length}`;
    let base = username;
    let n = 2;
    while (usedUsernames.has(username)) {
      username = `${base}${n++}`;
    }
    usedUsernames.add(username);
    data.users.push({
      id: newId("u"),
      name,
      username,
      passwordHash: null,
      role: "member",
      active: true,
      assignedProjectIds: [],
    });
    added += 1;
    changed = true;
  }

  if (changed) writeUsersFile(data);
  return data;
}

export function writeUsersFile(data) {
  ensureDir();
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function seedUsersFile() {
  const bootstrap = process.env.ADMIN_BOOTSTRAP_PASSWORD || "admin123";
  const users = [
    {
      id: "u-admin",
      name: "Khairul Islam",
      username: "khairul",
      passwordHash: hashPassword(bootstrap),
      role: "super_admin",
      active: true,
      assignedProjectIds: [],
    },
  ];

  const used = new Set(["khairul"]);
  for (const name of SEED_MEMBERS) {
    let username = slugUsername(name);
    if (!username) username = `user${users.length}`;
    let base = username;
    let n = 2;
    while (used.has(username)) {
      username = `${base}${n++}`;
    }
    used.add(username);
    users.push({
      id: newId("u"),
      name,
      username,
      passwordHash: null,
      role: "member",
      active: true,
      assignedProjectIds: [],
    });
  }

  const data = { users };
  writeUsersFile(data);
  return data;
}

/** Add any missing seed members (e.g. Sishir) without resetting passwords. */
export function ensureSeedMembers() {
  const before = loadUsersRaw().users.length;
  const data = readUsersFile();
  return { added: Math.max(0, data.users.length - before), users: data.users.map(publicUser) };
}

export function listUsers() {
  return readUsersFile().users.map(publicUser);
}

export function findUserByUsername(username) {
  const u = String(username || "").trim().toLowerCase();
  return readUsersFile().users.find((x) => x.username.toLowerCase() === u) || null;
}

export function findUserById(id) {
  return readUsersFile().users.find((x) => x.id === id) || null;
}

export function authenticate(username, password) {
  const user = findUserByUsername(username);
  if (!user || !user.active) return null;
  if (!user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function createUser({ name, username, password, role = "member" }) {
  const data = readUsersFile();
  const uname = String(username || "").trim().toLowerCase();
  if (!uname) throw new Error("Username is required");
  if (data.users.some((u) => u.username.toLowerCase() === uname)) {
    throw new Error("Username already exists");
  }
  const user = {
    id: newId("u"),
    name: String(name || "").trim() || uname,
    username: uname,
    passwordHash: password ? hashPassword(password) : null,
    role: normalizeAccountRole(role),
    active: true,
    assignedProjectIds: [],
  };
  data.users.push(user);
  writeUsersFile(data);
  return publicUser(user);
}

export function updateUser(id, patch) {
  const data = readUsersFile();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const user = { ...data.users[idx] };

  if (patch.name != null) user.name = String(patch.name).trim() || user.name;
  if (patch.username != null) {
    const uname = String(patch.username).trim().toLowerCase();
    if (!uname) throw new Error("Username is required");
    if (data.users.some((u) => u.id !== id && u.username.toLowerCase() === uname)) {
      throw new Error("Username already exists");
    }
    user.username = uname;
  }
  if (patch.role != null) user.role = normalizeAccountRole(patch.role);
  if (patch.active != null) user.active = Boolean(patch.active);
  if (Array.isArray(patch.assignedProjectIds)) {
    user.assignedProjectIds = [...new Set(patch.assignedProjectIds.map(String))];
  }
  if (patch.password != null && String(patch.password).length > 0) {
    user.passwordHash = hashPassword(patch.password);
  }
  if (patch.clearPassword) user.passwordHash = null;

  data.users[idx] = user;
  writeUsersFile(data);
  return publicUser(user);
}

export function replaceUsers(users) {
  if (!Array.isArray(users)) throw new Error("users must be an array");
  const data = readUsersFile();
  const byId = new Map(data.users.map((u) => [u.id, u]));
  const next = users.map((incoming) => {
    const prev = byId.get(incoming.id);
    if (!prev) throw new Error(`Unknown user id ${incoming.id}`);
    const merged = {
      ...prev,
      name: incoming.name ?? prev.name,
      username: String(incoming.username || prev.username).trim().toLowerCase(),
      role: normalizeAccountRole(incoming.role ?? prev.role),
      active: incoming.active != null ? Boolean(incoming.active) : prev.active,
      assignedProjectIds: Array.isArray(incoming.assignedProjectIds)
        ? [...new Set(incoming.assignedProjectIds.map(String))]
        : prev.assignedProjectIds || [],
      passwordHash: prev.passwordHash,
    };
    if (incoming.password) merged.passwordHash = hashPassword(incoming.password);
    return merged;
  });
  // keep any users not in payload
  const keptIds = new Set(next.map((u) => u.id));
  for (const u of data.users) {
    if (!keptIds.has(u.id)) next.push(u);
  }
  writeUsersFile({ users: next });
  return next.map(publicUser);
}

/**
 * Rebuild member assignedProjectIds from projects.json team fields
 * (supervisor, teamMembers, membersRaw), matching short names via aliases.
 */
export function syncAssignmentsFromProjects(projects) {
  const data = readUsersFile();
  const clientProjects = listClientProjects();
  const { byUser, unmatched } = assignmentsFromProjects(projects, data.users, clientProjects);
  let updatedMembers = 0;
  let totalLinks = 0;

  data.users = data.users.map((user) => {
    if (isAdminRole(user)) {
      return { ...user, assignedProjectIds: [] };
    }
    const fromProjects = byUser.get(user.id);
    const ids = fromProjects ? [...fromProjects] : [];
    totalLinks += ids.length;
    const prev = user.assignedProjectIds || [];
    const changed =
      prev.length !== ids.length || prev.some((id) => !ids.includes(id)) || ids.some((id) => !prev.includes(id));
    if (changed) updatedMembers += 1;
    return { ...user, assignedProjectIds: ids };
  });

  writeUsersFile(data);
  return {
    updatedMembers,
    totalLinks,
    unmatched,
    users: data.users.map(publicUser),
  };
}
