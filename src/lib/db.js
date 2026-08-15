import { normalizeProjects } from "./utils";

const opts = { credentials: "include", cache: "no-store" };

export async function loadProjectsFromDb() {
  const res = await fetch("/api/projects", opts);
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not load projects database");
  }
  return { projects: normalizeProjects(await res.json()), canWrite: true };
}

export async function saveProjectsToDb(projects) {
  const res = await fetch("/api/projects", {
    ...opts,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projects, null, 2),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save database");
  }
}

export async function getGoogleStatus() {
  const res = await fetch("/api/google/status", opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not read Google status");
  }
  return res.json();
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Sheet sync failed");
  }
  return {
    projects: normalizeProjects(data.projects || []),
    lastSyncAt: data.lastSyncAt || null,
    count: data.count ?? 0,
    sheetTitle: data.sheetTitle || "",
    sheetTitles: Array.isArray(data.sheetTitles) ? data.sheetTitles : [],
  };
}

export async function loadClientProjects() {
  const res = await fetch("/api/client-projects", opts);
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not load client projects");
  }
  const data = await res.json();
  return Array.isArray(data.clientProjects) ? data.clientProjects : [];
}

export async function patchClientProject(id, payload) {
  const res = await fetch(`/api/client-projects/${encodeURIComponent(id)}`, {
    ...opts,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update client project");
  return {
    clientProject: data.clientProject,
    phasesUpdated: data.phasesUpdated ?? 0,
  };
}
