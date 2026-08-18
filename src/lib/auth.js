import { isAdminRole } from "./roles";

const opts = { credentials: "include", cache: "no-store" };

export async function fetchMe() {
  const res = await fetch("/api/auth/me", opts);
  if (res.status === 401) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load session");
  }
  const data = await res.json();
  return data.user || null;
}

export async function login(username, password) {
  const res = await fetch("/api/auth/login", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.user;
}

export async function logout() {
  await fetch("/api/auth/logout", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export async function listUsers() {
  const res = await fetch("/api/users", opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load users");
  return data.users || [];
}

/** Active users for project team dropdowns (available to any signed-in user). */
export async function listTeamDirectory({ includeStaff = false } = {}) {
  const users = await listUsers();
  return users.filter((u) => {
    if (u.active === false) return false;
    if (!includeStaff && isAdminRole(u)) return false;
    return true;
  });
}

export async function createUser(payload) {
  const res = await fetch("/api/users", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create user");
  return data.user;
}

export async function patchUser(id, payload) {
  const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
    ...opts,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data.user;
}

export async function syncAssignmentsFromProjects() {
  const res = await fetch("/api/users/sync-assignments", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to sync assignments");
  return data;
}
