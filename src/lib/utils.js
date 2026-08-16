export function deriveStack(phase) {
  const p = (phase || "").toLowerCase();
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

/** Prefer phase-derived department so taxonomy updates apply to synced projects.
 *  Admin lock (`stackLocked`) keeps a manually corrected department. */
export function getProjectStack(project) {
  if (project?.stackLocked && project?.stack) return project.stack;
  if (project?.phase) return deriveStack(project.phase);
  return project?.stack || "Other";
}

export function getDeveloperRole(stack) {
  const s = (stack || "").toLowerCase();
  if (s.includes("app")) return "App Developer";
  if (s.includes("backend")) return "Backend Developer";
  if (s.includes("frontend")) return "Frontend Developer";
  if (s.includes("ai") || s.includes("ml")) return "AI Engineer";
  if (s.includes("ui") || s.includes("ux")) return "UI/UX Designer";
  if (s.includes("automation")) return "QA Engineer";
  if (s.includes("deploy")) return "DevOps Engineer";
  return "Developer";
}

const MONTH_NAME_TO_NUM = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** Parse month/year from tab titles like "STA Aug 2026". */
export function getMonthYearFromSheetTab(sheetTab) {
  const value = String(sheetTab || "").trim();
  if (!value) return { month: null, year: null };
  const match = value.match(/\b([A-Za-z]+)\s+(\d{4})\b/);
  if (!match) return { month: null, year: null };
  const month = MONTH_NAME_TO_NUM[match[1].toLowerCase()] || null;
  const year = Number(match[2]) || null;
  if (!month || !year) return { month: null, year: null };
  return { month, year };
}

export function getProjectMonthYear(dateStr) {
  const value = String(dateStr || "").trim();
  if (!value) return { month: null, year: null };

  const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const year = parseInt(slashDate[3], 10);
    return { month: parseInt(slashDate[1], 10), year: year < 100 ? 2000 + year : year };
  }

  const isoDate = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) return { month: parseInt(isoDate[2], 10), year: parseInt(isoDate[1], 10) };

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };

  return { month: null, year: null };
}

/**
 * Month filter should follow the Google Sheet tab (STA Aug 2026),
 * not Initial Data — carry-over rows often keep an older date.
 */
export function getFilterMonthYear(project) {
  const fromTab = getMonthYearFromSheetTab(project?.sheetTab);
  if (fromTab.month && fromTab.year) return fromTab;
  return getProjectMonthYear(project?.date);
}

/** Normalize possibility flag to Yes | No. */
export function normalizePossibility(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "true" || v === "1") return "Yes";
  return "No";
}

export function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => ({
    ...p,
    stackLocked: Boolean(p.stackLocked),
    stack: getProjectStack(p),
    possibility: normalizePossibility(p.possibility),
    teamMembers: Array.isArray(p.teamMembers) ? p.teamMembers.map(normalizeTeamMember) : [
      { id: "m1", name: "Alex Chen", role: "Project Lead" },
      { id: "m2", name: "Elena Rostova", role: "UI/UX Designer" },
    ],
    subtasks: p.subtasks || [
      { id: "1", text: "Requirements gathering & analysis", completed: false },
      { id: "2", text: "UI/UX Mockup design", completed: false },
      { id: "3", text: "Core API development", completed: false },
      { id: "4", text: "Frontend integration & testing", completed: false },
      { id: "5", text: "Client review & revisions", completed: false },
      { id: "6", text: "Final deployment & delivery", completed: false },
    ],
    notes: normalizeNotes(p.notes),
    extensions: Array.isArray(p.extensions) ? p.extensions : [],
    deliveryDate: p.deliveryDate || "",
  }));
}

export function extractOrderId(urlOrId) {
  let value = String(urlOrId || "").trim();
  if (!value) return "";
  const match = value.match(/\/orders\/([^/?#]+)/i);
  if (match) value = match[1];
  // Sheets sometimes prefix Fiverr ids with "#"
  value = value.replace(/^#+/, "").trim();
  return value;
}

/** Parse Initial Date strings (M/D/YYYY or YYYY-MM-DD) into a local Date at midnight. */
export function parseProjectDate(dateStr) {
  const value = String(dateStr || "").trim();
  if (!value) return null;

  const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const month = parseInt(slashDate[1], 10);
    const day = parseInt(slashDate[2], 10);
    let year = parseInt(slashDate[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const isoDate = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) {
    const d = new Date(
      parseInt(isoDate[1], 10),
      parseInt(isoDate[2], 10) - 1,
      parseInt(isoDate[3], 10)
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function addDays(date, days) {
  if (!date) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

/** Calendar-day difference end - start. */
export function diffCalendarDays(start, end) {
  if (!start || !end) return null;
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

/** Format Date → YYYY-MM-DD for <input type="date">. */
export function toInputDate(date) {
  const d = date instanceof Date ? date : parseProjectDate(date);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar today at midnight. */
export function startOfToday(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/**
 * Sheet `dateline` is a live Fiverr countdown/status — NOT a duration from Initial Date.
 * Returns remaining whole days, -1 for Order Late (overdue), or null if unknown/done.
 */
export function getSheetRemainingDays(dateline) {
  const value = String(dateline || "").trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("order done") || lower.includes("cancelled") || lower === "done") return null;
  if (lower.includes("order late") || lower === "late") return -1;
  const daysMatch = value.match(/^(\d+)\s*days?\b/i);
  if (daysMatch) return parseInt(daysMatch[1], 10);
  const dMatch = value.match(/^(\d+)\s*d\b/i);
  if (dMatch) return parseInt(dMatch[1], 10);
  return null;
}

/** @deprecated Use getSheetRemainingDays — kept for call sites that only need numeric day counts. */
export function parseDatelineDays(dateline) {
  const remaining = getSheetRemainingDays(dateline);
  return remaining != null && remaining >= 0 ? remaining : null;
}

export function hasAdminSchedule(project) {
  if (parseProjectDate(project?.deliveryDate)) return true;
  return getProjectExtensions(project).length > 0;
}

/**
 * Suggested due date from live sheet countdown (today + remaining days).
 * Used to prefill admin date inputs — not Initial Date + dateline.
 */
export function getSuggestedDeliveryDate(project, today = new Date()) {
  const remaining = getSheetRemainingDays(project?.dateline);
  if (remaining == null || remaining < 0) return null;
  return addDays(startOfToday(today), remaining);
}

export function getProjectExtensions(project) {
  return Array.isArray(project?.extensions) ? project.extensions : [];
}

/** Admin-set original delivery date only (no sheet inference). */
export function getOriginalDeliveryDate(project) {
  return parseProjectDate(project?.deliveryDate);
}

function extensionToDate(ext, previousDue) {
  if (!ext) return null;
  if (ext.date) return parseProjectDate(ext.date);
  if (ext.days != null && previousDue) return addDays(previousDue, Number(ext.days) || 0);
  return null;
}

/**
 * Current due date:
 * - Admin schedule (deliveryDate + extensions) wins when present
 * - Else live sheet countdown → today + remaining days
 */
export function getCurrentDeliveryDate(project, today = new Date()) {
  const extensions = getProjectExtensions(project);
  const original = getOriginalDeliveryDate(project);

  if (original || extensions.length) {
    let current = original;
    for (const ext of extensions) {
      const next = extensionToDate(ext, current || startOfToday(today));
      if (next) current = next;
    }
    return current;
  }

  return getSuggestedDeliveryDate(project, today);
}

export function getTotalExtensionDays(project) {
  const extensions = getProjectExtensions(project);
  if (!extensions.length) return 0;
  const original = getOriginalDeliveryDate(project);
  const current = getCurrentDeliveryDate(project);
  if (!original || !current) return 0;
  return Math.max(0, diffCalendarDays(original, current) || 0);
}

/**
 * Days until current due.
 * Admin schedule → calendar math.
 * Sheet-only → live countdown / Order Late (-1).
 */
export function getDaysLeft(project, today = new Date()) {
  if (hasAdminSchedule(project)) {
    const due = getCurrentDeliveryDate(project, today);
    if (!due) return null;
    return diffCalendarDays(startOfToday(today), due);
  }
  return getSheetRemainingDays(project?.dateline);
}

/** WIP projects with 0–4 days left that have real schedule data (sheet countdown or admin date). */
export function isDueSoon(project, options = {}) {
  const threshold = Number.isFinite(options?.threshold) ? options.threshold : 4;
  const lead = String(project?.teamLeadStatus || "").trim().toLowerCase();
  if (lead === "delivered" || lead === "cancelled") return false;
  const sales = String(project?.salesStatus || "").trim().toLowerCase();
  if (sales === "delivered" || sales === "cancelled") return false;

  const daysLeft = getDaysLeft(project);
  // No schedule data, or already overdue / Order Late → do not alert
  if (daysLeft == null || daysLeft < 0) return false;
  return daysLeft <= threshold;
}

/** Calendar days since intake (`project.date`); null if unparseable or in the future. */
export function getDaysSinceIntake(project, today = new Date()) {
  const intake = parseProjectDate(project?.date);
  if (!intake) return null;
  const days = diffCalendarDays(intake, startOfToday(today));
  if (days == null || days < 0) return null;
  return days;
}

/**
 * Intake date within the last N calendar days (inclusive of today).
 * e.g. intake Aug 14 and today Aug 15 → new arrival (1 day ago).
 */
export function isNewArrival(project, options = {}) {
  const threshold = Number.isFinite(options?.threshold) ? options.threshold : 3;
  const daysSince = getDaysSinceIntake(project, options?.today);
  if (daysSince == null) return false;
  return daysSince <= threshold;
}

export function formatDaysSinceIntake(daysSince) {
  if (daysSince == null) return "—";
  if (daysSince === 0) return "Arrived today";
  if (daysSince === 1) return "1 day ago";
  return `${daysSince} days ago`;
}

export function formatDisplayDate(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : parseProjectDate(date);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDaysLeft(daysLeft) {
  if (daysLeft == null) return "—";
  if (daysLeft < 0) {
    const n = Math.abs(daysLeft);
    if (n === 1) return "Overdue";
    return `Overdue ${n}d`;
  }
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

export function statusOf(p) {
  const lead = String(p.teamLeadStatus || "").trim().toLowerCase();
  if (lead === "delivered") return "delivered";
  // Order Late / overdue = still in process → WIP (schedule urgency stays on dateline / days left)
  return "wip";
}

export function fmtMoney(n) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
import { normalizeNotes, normalizeTeamMember } from "./projectMetadata";
