import { getDaysLeft, isDueSoon } from "./utils";

const STORAGE_KEY = "delivery-ops-ext-notify-v1";
const PERMISSION_PROMPTED_KEY = "delivery-ops-ext-notify-prompted";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getExtensionWarningProjects(projects) {
  return (Array.isArray(projects) ? projects : [])
    .filter((p) => isDueSoon(p))
    .map((p) => ({
      id: p.id,
      name: p.projectName || "Untitled",
      daysLeft: getDaysLeft(p),
    }))
    .sort((a, b) => {
      if (a.daysLeft == null && b.daysLeft == null) return 0;
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    });
}

function fingerprint(rows) {
  return rows.map((r) => `${r.id}:${r.daysLeft ?? "x"}`).join("|");
}

function loadNotifyState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function saveNotifyState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function notificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function wasNotificationPrompted() {
  try {
    return localStorage.getItem(PERMISSION_PROMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markNotificationPrompted() {
  try {
    localStorage.setItem(PERMISSION_PROMPTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export async function ensureNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  markNotificationPrompted();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function showViaServiceWorker(title, options) {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg?.showNotification) return false;
    await reg.showNotification(title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Notify when extension-warning projects exist.
 * Dedupes: same project set + days-left fingerprint only once per calendar day
 * (re-notifies if the list membership or days-left values change).
 */
export async function notifyExtensionWarnings(projects, { force = false } = {}) {
  if (!("Notification" in window)) return { shown: false, reason: "unsupported" };

  const rows = getExtensionWarningProjects(projects);
  if (!rows.length) return { shown: false, reason: "empty", count: 0 };

  if (Notification.permission !== "granted") {
    return { shown: false, reason: "permission", count: rows.length };
  }

  const fp = fingerprint(rows);
  const day = todayKey();
  const prev = loadNotifyState();
  if (!force && prev.fingerprint === fp && prev.day === day) {
    return { shown: false, reason: "deduped", count: rows.length };
  }

  const count = rows.length;
  const title =
    count === 1
      ? "Extension warning · 1 project"
      : `Extension warning · ${count} projects`;
  const names = rows
    .slice(0, 3)
    .map((r) => r.name)
    .join(", ");
  const more = count > 3 ? ` (+${count - 3} more)` : "";
  const body = `${names}${more} — 7 days or less until delivery.`;

  const options = {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "extension-warning",
    renotify: true,
    requireInteraction: false,
    data: { url: "/", type: "extension-warning" },
  };

  const viaSw = await showViaServiceWorker(title, options);
  if (!viaSw) {
    try {
      // Fallback when SW is unavailable
      new Notification(title, options);
    } catch (err) {
      return { shown: false, reason: err.message || "failed", count };
    }
  }

  saveNotifyState({ fingerprint: fp, day, count, at: new Date().toISOString() });
  return { shown: true, reason: "ok", count };
}
