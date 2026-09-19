import { normalizeProjects } from "./utils";
import {
  initClientStorage,
  getClientProjects,
  saveClientProjects,
  getStoredClientProjects,
  updateSingleClientProject,
} from "./clientStorage";

const opts = { credentials: "include", cache: "no-store" };

export async function loadProjectsFromDb() {
  try {
    const res = await fetch("/api/projects", opts);
    if (res.status === 401) {
      const err = new Error("Unauthorized");
      err.code = 401;
      throw err;
    }
    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeProjects(data);
      // Keep client storage in sync for offline/client fallback
      saveClientProjects(normalized).catch(() => {});
      return { projects: normalized, canWrite: true };
    }
  } catch (err) {
    if (err.code === 401) throw err;
    console.warn("[db] /api/projects request failed, attempting client fallback:", err.message);
  }

  // Graceful client fallback
  try {
    const { projects } = await initClientStorage();
    return { projects: normalizeProjects(projects), canWrite: true };
  } catch (err) {
    console.error("Failed to load local database:", err);
    return { projects: [], canWrite: true };
  }
}

export async function saveProjectsToDb(projects) {
  const normalized = normalizeProjects(projects);
  // Always update client storage
  await saveClientProjects(normalized);

  try {
    const res = await fetch("/api/projects", {
      ...opts,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized, null, 2),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save database to server");
    }
  } catch (err) {
    console.warn("[db] Server save failed, saved to client storage:", err.message);
  }
}

export async function getGoogleStatus() {
  try {
    const res = await fetch("/api/google/status", opts);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[db] Could not fetch /api/google/status:", err.message);
  }

  return {
    configured: false,
    connected: false,
    email: null,
    lastSyncAt: null,
  };
}

export function getGoogleAuthUrl() {
  return "/api/google/auth";
}

export async function syncFromSheets() {
  const res = await fetch("/api/sheets/sync", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (res.ok) {
    const data = await res.json();
    const normalized = normalizeProjects(data.projects || []);
    await saveClientProjects(normalized);
    return {
      ok: true,
      projects: normalized,
      lastSyncAt: data.lastSyncAt || new Date().toISOString(),
      count: data.count ?? normalized.length,
      sheetTitle: data.sheetTitle || "",
      sheetTitles: Array.isArray(data.sheetTitles) ? data.sheetTitles : [],
    };
  }
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || "Google Sheets sync failed");
}

export async function loadClientProjects() {
  try {
    const res = await fetch("/api/client-projects", opts);
    if (res.status === 401) {
      const err = new Error("Unauthorized");
      err.code = 401;
      throw err;
    }
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.clientProjects) ? data.clientProjects : [];
      return list;
    }
  } catch (err) {
    if (err.code === 401) throw err;
    console.warn("[db] /api/client-projects failed, using client storage:", err.message);
  }

  try {
    return await getStoredClientProjects();
  } catch (err) {
    console.error("Failed to load client projects:", err);
    return [];
  }
}

export async function patchClientProject(id, payload) {
  let updatedClientProject = null;
  let phasesUpdated = 0;

  try {
    const res = await fetch(`/api/client-projects/${encodeURIComponent(id)}`, {
      ...opts,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      updatedClientProject = data.clientProject;
      phasesUpdated = data.phasesUpdated ?? 0;
    }
  } catch (err) {
    console.warn("[db] Failed to patch on server, patching client storage:", err.message);
  }

  // Also update client storage
  try {
    const localUpdated = await updateSingleClientProject(id, payload);
    return {
      clientProject: updatedClientProject || localUpdated,
      phasesUpdated,
    };
  } catch (err) {
    console.error("Failed to patch client project in storage:", err);
    if (updatedClientProject) {
      return { clientProject: updatedClientProject, phasesUpdated };
    }
    throw new Error(err.message || "Failed to update client project");
  }
}
