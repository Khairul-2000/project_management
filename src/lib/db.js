import { normalizeProjects } from "./utils";

const DB_URL = "/api/projects";
const DB_FILE_URL = "/data/projects.json";

export async function loadProjectsFromDb() {
  try {
    const res = await fetch(DB_URL, { cache: "no-store" });
    if (res.ok) {
      return { projects: normalizeProjects(await res.json()), canWrite: true };
    }
  } catch {
    /* fall through to static JSON file */
  }

  const res = await fetch(DB_FILE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load projects database");
  return { projects: normalizeProjects(await res.json()), canWrite: false };
}

export async function saveProjectsToDb(projects) {
  const res = await fetch(DB_URL, {
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
  const res = await fetch("/api/google/status", { cache: "no-store" });
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
