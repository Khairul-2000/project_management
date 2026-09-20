import { isAdminRole } from "./roles";
import {
  getStoredUsers,
  saveStoredUsers,
  getStoredCurrentUser,
  saveStoredCurrentUser,
  switchClientUserRole,
  getClientProjects,
} from "./clientStorage";

const opts = { credentials: "include", cache: "no-store" };

export async function fetchMe() {
  try {
    const res = await fetch("/api/auth/me", opts);
    if (res.status === 401) {
      return null;
    }
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        await saveStoredCurrentUser(data.user);
        return data.user;
      }
    }
  } catch (err) {
    console.warn("[auth] /api/auth/me failed, checking client storage:", err.message);
  }

  // Graceful client fallback
  try {
    const user = await getStoredCurrentUser();
    return user || null;
  } catch {
    return null;
  }
}

export async function login(username, password) {
  try {
    const res = await fetch("/api/auth/login", {
      ...opts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.user) {
      await saveStoredCurrentUser(data.user);
      return data.user;
    }
    if (res.status === 401) {
      throw new Error(data.error || "Invalid username or password");
    }
  } catch (err) {
    if (err.message && !err.message.includes("fetch")) {
      throw err;
    }
    console.warn("[auth] /api/auth/login server error, attempting client storage fallback:", err.message);
  }

  // Fallback to client users
  const users = await getStoredUsers();
  const match = users.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() ||
      u.name.toLowerCase() === username.trim().toLowerCase()
  );

  if (!match) {
    throw new Error("Invalid username or password");
  }

  await saveStoredCurrentUser(match);
  return match;
}

export async function switchRole(targetRole) {
  return await switchClientUserRole(targetRole);
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      ...opts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    /* ignore server error */
  }

  // Reset client session
  await saveStoredCurrentUser(null);
}

export async function listUsers() {
  try {
    const res = await fetch("/api/users", opts);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        await saveStoredUsers(data.users);
        return data.users;
      }
    }
  } catch (err) {
    console.warn("[auth] /api/users failed, using client storage:", err.message);
  }

  return await getStoredUsers();
}

/** Active users for project team dropdowns */
export async function listTeamDirectory({ includeStaff = false } = {}) {
  const users = await listUsers();
  return users.filter((u) => {
    if (u.active === false) return false;
    if (!includeStaff && isAdminRole(u)) return false;
    return true;
  });
}

export async function createUser(payload) {
  try {
    const res = await fetch("/api/users", {
      ...opts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.user) {
      return data.user;
    }
    if (!res.ok) throw new Error(data.error || "Failed to create user");
  } catch (err) {
    if (err.message && !err.message.includes("fetch")) {
      throw err;
    }
    console.warn("[auth] Server createUser failed, saving to client storage:", err.message);
  }

  const users = await getStoredUsers();
  const newUser = {
    id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name.trim(),
    username: payload.username.trim().toLowerCase(),
    role: payload.role || "member",
    active: true,
    assignedProjectIds: [],
    hasPassword: Boolean(payload.password),
    githubUsername: payload.githubUsername || "",
    gitlabUsername: payload.gitlabUsername || "",
  };

  const nextUsers = [...users, newUser];
  await saveStoredUsers(nextUsers);
  return newUser;
}

export async function patchUser(id, payload) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      ...opts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.user) {
      return data.user;
    }
    if (!res.ok) throw new Error(data.error || "Failed to update user");
  } catch (err) {
    if (err.message && !err.message.includes("fetch")) {
      throw err;
    }
    console.warn("[auth] Server patchUser failed, updating client storage:", err.message);
  }

  const users = await getStoredUsers();
  let updated = null;
  const nextUsers = users.map((u) => {
    if (u.id === id) {
      updated = { ...u, ...payload };
      return updated;
    }
    return u;
  });

  if (!updated) throw new Error("User not found");
  await saveStoredUsers(nextUsers);

  const current = await getStoredCurrentUser();
  if (current?.id === id) {
    await saveStoredCurrentUser(updated);
  }

  return updated;
}

export async function deleteUser(id) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      ...opts,
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to delete user");
  } catch (err) {
    if (err.message && !err.message.includes("fetch")) {
      throw err;
    }
    console.warn("[auth] Server deleteUser failed, updating client storage:", err.message);
  }

  const users = await getStoredUsers();
  const nextUsers = users.filter((u) => u.id !== id);
  await saveStoredUsers(nextUsers);
  return { ok: true, id };
}

export async function syncAssignmentsFromProjects() {
  try {
    const res = await fetch("/api/users/sync-assignments", {
      ...opts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
  } catch (err) {
    console.warn("[auth] Server sync-assignments failed, running client-side sync:", err.message);
  }

  const [users, projects] = await Promise.all([getStoredUsers(), getClientProjects()]);

  let totalLinks = 0;
  let updatedMembers = 0;

  const nextUsers = users.map((u) => {
    if (isAdminRole(u)) return u;

    const uName = u.name.trim().toLowerCase();
    const uUsername = u.username.trim().toLowerCase();

    const matchingProjectIds = [];
    for (const p of projects) {
      const team = Array.isArray(p.teamMembers) ? p.teamMembers : [];
      const hasMember = team.some((m) => {
        const mName = String(m.name || "").trim().toLowerCase();
        return mName === uName || mName === uUsername;
      });

      if (hasMember) {
        matchingProjectIds.push(p.id);
      }
    }

    if (matchingProjectIds.length > 0) {
      updatedMembers++;
      totalLinks += matchingProjectIds.length;
    }

    return {
      ...u,
      assignedProjectIds: [...new Set([...(u.assignedProjectIds || []), ...matchingProjectIds])],
    };
  });

  await saveStoredUsers(nextUsers);
  return { users: nextUsers, totalLinks, updatedMembers };
}
