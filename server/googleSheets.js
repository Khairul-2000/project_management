import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import dotenv from "dotenv";
import { syncAssignmentsFromProjects } from "./usersStore.js";
import {
  clientProjectHasTeam,
  ensureClientProjectsFromPhases,
  getClientProjectMap,
  projectNameKey,
  applyClientTeamToSinglePhase,
} from "./clientProjectsStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const DB_PATH = path.resolve(ROOT, "public/data/projects.json");
const DIST_DB_PATH = path.resolve(ROOT, "dist/data/projects.json");
const TOKEN_PATH = path.resolve(ROOT, ".google-tokens.json");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const HEADER_TO_FIELD = {
  "initial data": "date",
  "sales person": "salesPerson",
  "profile name": "profile",
  "teams name": "teamName",
  "project name": "projectName",
  "project price": "price",
  "phase name": "phase",
  "order id": "orderId",
  dateline: "dateline",
  "sales status": "salesStatus",
  "team lead status": "teamLeadStatus",
};

const LOCAL_ONLY_KEYS = [
  "supervisor",
  "shift",
  "possibility",
  "teamMembers",
  "subtasks",
  "notes",
  "membersRaw",
  "extensions",
  "deliveryDate",
];

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export function getSheetsConfig() {
  return {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: env("GOOGLE_REDIRECT_URI", "http://localhost:8079/api/google/callback"),
    sheetId: env("GOOGLE_SHEET_ID", "1ha_1ty00uNlMAqPeLe5Rg946IQl5GbYagAS5oRHzseE"),
    sheetGid: Number(env("GOOGLE_SHEET_GID", "1486932215")),
    // Match tabs like "STA Aug 2026", "STA July 2026". Empty = use GOOGLE_SHEET_GID only.
    tabPrefix: env("GOOGLE_SHEET_TAB_PREFIX", "STA"),
  };
}

export function isGoogleConfigured() {
  const { clientId, clientSecret } = getSheetsConfig();
  return Boolean(clientId && clientSecret);
}

function deriveStack(phase) {
  const p = (phase || "").toLowerCase();
  if (p.includes("backend")) return "Backend";
  if (p.includes("frontend")) return "Frontend";
  if (p.includes("ui/ux")) return "UI/UX";
  if (p.includes("automation")) return "Automation";
  if (p.includes("deploy")) return "Deploy";
  return "Other";
}

function extractOrderId(urlOrId) {
  let value = String(urlOrId || "").trim();
  if (!value) return "";
  const match = value.match(/\/orders\/([^/?#]+)/i);
  if (match) value = match[1];
  // Sheets sometimes prefix Fiverr ids with "#"
  value = value.replace(/^#+/, "").trim();
  return value;
}

function stableHash(input) {
  let h = 0;
  const s = String(input);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function defaultSubtasks() {
  return [
    { id: "1", text: "Requirements gathering & analysis", completed: false },
    { id: "2", text: "UI/UX Mockup design", completed: false },
    { id: "3", text: "Core API development", completed: false },
    { id: "4", text: "Frontend integration & testing", completed: false },
    { id: "5", text: "Client review & revisions", completed: false },
    { id: "6", text: "Final deployment & delivery", completed: false },
  ];
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeProjectsJson(projects) {
  // Re-seed client teams from final phase teams + stamp clientProjectId
  ensureClientProjectsFromPhases(projects);
  const pretty = JSON.stringify(projects, null, 2) + "\n";
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, pretty, "utf8");
  try {
    fs.mkdirSync(path.dirname(DIST_DB_PATH), { recursive: true });
    fs.writeFileSync(DIST_DB_PATH, pretty, "utf8");
  } catch {
    /* dist may be missing */
  }
  try {
    syncAssignmentsFromProjects(projects);
  } catch (err) {
    console.error("[sheets] assignment sync failed:", err.message);
  }
}

export function loadTokens() {
  return readJsonFile(TOKEN_PATH, null);
}

export function saveTokens(tokens) {
  const prev = loadTokens() || {};
  const next = { ...prev, ...tokens };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getSheetsConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email = "";
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email || "";
  } catch {
    /* userinfo optional; spreadsheets.readonly may not include email scope */
  }

  return saveTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || loadTokens()?.refresh_token,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
    token_type: tokens.token_type,
    email,
  });
}

async function getAuthedClient() {
  const stored = loadTokens();
  if (!stored?.refresh_token && !stored?.access_token) {
    throw new Error("Google not connected. Open Connect Google first.");
  }
  const client = createOAuthClient();
  client.setCredentials(stored);
  client.on("tokens", (tokens) => {
    saveTokens({
      access_token: tokens.access_token ?? stored.access_token,
      refresh_token: tokens.refresh_token ?? stored.refresh_token,
      expiry_date: tokens.expiry_date ?? stored.expiry_date,
    });
  });
  return client;
}

const MONTH_INDEX = {
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

async function listSheetTabs(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title,index)",
  });
  return (meta.data.sheets || [])
    .map((s) => ({
      gid: Number(s.properties?.sheetId),
      title: String(s.properties?.title || "").trim(),
      index: Number(s.properties?.index ?? 0),
    }))
    .filter((s) => s.title);
}

function tabSortKey(title) {
  const m = String(title).match(/\b([A-Za-z]+)\s+(\d{4})\b/);
  if (!m) return 0;
  const month = MONTH_INDEX[m[1].toLowerCase()] || 0;
  const year = Number(m[2]) || 0;
  return year * 100 + month;
}

function selectTabsToSync(tabs, { tabPrefix, sheetGid }) {
  const prefix = String(tabPrefix || "").trim().toLowerCase();
  let selected = [];

  if (prefix) {
    selected = tabs.filter((t) => t.title.toLowerCase().startsWith(prefix));
    // Prefer "STA Aug 2026" style monthly tabs; if prefix matches too broadly, keep STA + month/year
    const monthly = selected.filter((t) => tabSortKey(t.title) > 0);
    if (monthly.length) selected = monthly;
  }

  if (!selected.length && Number.isFinite(sheetGid)) {
    const byGid = tabs.find((t) => t.gid === Number(sheetGid));
    if (byGid) selected = [byGid];
  }

  // Newest month first so duplicates keep the freshest row
  return selected.sort((a, b) => tabSortKey(b.title) - tabSortKey(a.title) || a.index - b.index);
}

function mapValuesToProjects(values, sheetTitle) {
  if (!values?.length) return [];
  const headerIndex = buildHeaderIndex(values[0]);
  if (headerIndex.projectName == null) {
    const have = Object.keys(headerIndex).join(", ") || "(none)";
    throw new Error(
      `Tab "${sheetTitle}": could not map headers. Need Project Name. Mapped: ${have}`
    );
  }

  const mapped = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    if (!row.some((c) => String(c || "").trim())) continue;
    const item = mapSheetRow(row, headerIndex);
    if (item) {
      mapped.push({ ...item, sheetTab: sheetTitle });
    }
  }
  return mapped;
}

function dedupeMappedRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = matchKey(row);
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()];
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

function buildHeaderIndex(headerRow) {
  const index = {};
  (headerRow || []).forEach((raw, i) => {
    const key = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const field = HEADER_TO_FIELD[key];
    if (field) index[field] = i;
  });
  return index;
}

function cell(row, index, field) {
  const i = index[field];
  if (i == null) return "";
  return String(row[i] ?? "").trim();
}

function parsePrice(value) {
  const cleaned = String(value || "").replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function matchKey(project) {
  const orderId = extractOrderId(project.orderId || project.orderUrl);
  if (orderId) return `order:${orderId.toLowerCase()}`;
  return `name:${String(project.projectName || "")
    .trim()
    .toLowerCase()}|${String(project.date || "").trim().toLowerCase()}`;
}

/** Prefer richer local fields when collapsing #FO… vs FO… duplicates. */
function preferPhase(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aTeam = Array.isArray(a.teamMembers) ? a.teamMembers.length : 0;
  const bTeam = Array.isArray(b.teamMembers) ? b.teamMembers.length : 0;
  if (bTeam !== aTeam) return bTeam > aTeam ? b : a;
  const aNotes = String(a.notes || "").length;
  const bNotes = String(b.notes || "").length;
  if (bNotes !== aNotes) return bNotes > aNotes ? b : a;
  // Prefer id without "#" in sheet- prefix
  if (String(a.id).includes("#") && !String(b.id).includes("#")) return b;
  if (String(b.id).includes("#") && !String(a.id).includes("#")) return a;
  return a;
}

function dedupeExistingPhases(existing) {
  const byKey = new Map();
  for (const p of existing || []) {
    const key = matchKey(p);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, p);
      continue;
    }
    const winner = preferPhase(prev, p);
    const loser = winner === prev ? p : prev;
    // Keep winner id stable without hash when possible
    const orderId = extractOrderId(winner.orderId || winner.orderUrl);
    const merged = {
      ...loser,
      ...winner,
      orderId: orderId || winner.orderId,
      id: orderId ? `sheet-${orderId}` : winner.id,
      teamMembers: preferPhase(
        { teamMembers: winner.teamMembers },
        { teamMembers: loser.teamMembers }
      ).teamMembers || winner.teamMembers || loser.teamMembers || [],
      supervisor: winner.supervisor || loser.supervisor || "",
      membersRaw: winner.membersRaw || loser.membersRaw || "",
      notes: winner.notes || loser.notes || "",
      subtasks: winner.subtasks?.length ? winner.subtasks : loser.subtasks,
      extensions: winner.extensions?.length ? winner.extensions : loser.extensions,
      deliveryDate: winner.deliveryDate || loser.deliveryDate || "",
    };
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}

function mapSheetRow(row, index) {
  const orderRaw = cell(row, index, "orderId");
  const orderId = extractOrderId(orderRaw);
  const phase = cell(row, index, "phase");
  const projectName = cell(row, index, "projectName");
  const date = cell(row, index, "date");

  if (!projectName && !orderId) return null;

  const orderUrl = orderId
    ? orderRaw.includes("fiverr.com")
      ? orderRaw
      : `https://www.fiverr.com/orders/${orderId}/activities`
    : "";

  return {
    date,
    salesPerson: cell(row, index, "salesPerson"),
    profile: cell(row, index, "profile"),
    teamName: cell(row, index, "teamName"),
    projectName,
    price: parsePrice(cell(row, index, "price")),
    phase,
    stack: deriveStack(phase),
    orderId,
    orderUrl,
    dateline: cell(row, index, "dateline"),
    salesStatus: cell(row, index, "salesStatus") || "WIP",
    teamLeadStatus: normalizeStatus(cell(row, index, "teamLeadStatus")),
  };
}

function normalizeStatus(value) {
  const raw = String(value || "").trim();
  if (!raw) return "WIP";
  if (raw.toLowerCase() === "delivered") return "Delivered";
  if (raw.toLowerCase() === "wip") return "WIP";
  return raw;
}

function mergeProjects(sheetRows, existing) {
  const existingDeduped = dedupeExistingPhases(existing);
  const byKey = new Map();
  for (const p of existingDeduped) byKey.set(matchKey(p), p);

  // Ensure parent client projects exist for sheet + existing names
  ensureClientProjectsFromPhases([...existingDeduped, ...sheetRows]);
  const clientByKey = getClientProjectMap();

  return sheetRows.map((mapped) => {
    const key = matchKey(mapped);
    const prev = byKey.get(key);
    const nameKey = projectNameKey(mapped.projectName);
    const parent = clientByKey.get(nameKey);
    const orderId = extractOrderId(mapped.orderId || mapped.orderUrl);
    const id = prev?.id?.includes("#") && orderId
      ? `sheet-${orderId}`
      : prev?.id || (orderId ? `sheet-${orderId}` : `sheet-${stableHash(key)}`);

    const next = {
      ...mapped,
      id,
      orderId: orderId || mapped.orderId,
      clientProjectId: parent?.id || "",
      teamLeadStatus: mapped.teamLeadStatus || "WIP",
      supervisor: prev?.supervisor || "",
      shift: prev?.shift || "Day",
      possibility: prev?.possibility || "No",
      teamMembers: prev?.teamMembers,
      subtasks: prev?.subtasks,
      notes: prev?.notes ?? "",
      membersRaw: prev?.membersRaw || "",
    };

    if (!next.teamMembers) {
      next.teamMembers = [];
    }
    if (!next.subtasks) {
      next.subtasks = defaultSubtasks();
    }

    for (const k of LOCAL_ONLY_KEYS) {
      if (prev?.[k] !== undefined) next[k] = prev[k];
    }

    // Attach role-matched members from client project (keeps existing phase members)
    if (parent && clientProjectHasTeam(parent)) {
      const applied = applyClientTeamToSinglePhase(next, parent);
      delete applied._membersAdded;
      Object.assign(next, applied);
    }

    if (!next.clientProjectId && parent?.id) {
      next.clientProjectId = parent.id;
    }

    return next;
  });
}

export function getGoogleStatus() {
  const configured = isGoogleConfigured();
  const tokens = loadTokens();
  const connected = Boolean(configured && (tokens?.refresh_token || tokens?.access_token));
  const cfg = getSheetsConfig();
  return {
    configured,
    connected,
    email: tokens?.email || "",
    lastSyncAt: tokens?.lastSyncAt || null,
    sheetId: cfg.sheetId,
    sheetGid: cfg.sheetGid,
    tabPrefix: cfg.tabPrefix,
  };
}

export async function syncProjectsFromSheet() {
  const { sheetId, sheetGid, tabPrefix } = getSheetsConfig();
  if (!sheetId) throw new Error("Missing GOOGLE_SHEET_ID in .env");

  const auth = await getAuthedClient();
  const sheets = google.sheets({ version: "v4", auth });
  const tabs = await listSheetTabs(sheets, sheetId);
  const selected = selectTabsToSync(tabs, { tabPrefix, sheetGid });

  if (!selected.length) {
    const available = tabs.map((t) => t.title).join(", ") || "(none)";
    throw new Error(
      `No tabs matched prefix "${tabPrefix || "(none)"}" or gid ${sheetGid}. Available: ${available}`
    );
  }

  const allMapped = [];
  const syncedTitles = [];
  const errors = [];

  for (const tab of selected) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${quoteSheetTitle(tab.title)}!A:Z`,
        majorDimension: "ROWS",
      });
      const rows = mapValuesToProjects(res.data.values || [], tab.title);
      allMapped.push(...rows);
      syncedTitles.push(tab.title);
    } catch (err) {
      errors.push(`${tab.title}: ${err.message}`);
    }
  }

  if (!syncedTitles.length) {
    throw new Error(`Failed to read STA tabs. ${errors.join(" | ")}`);
  }

  const mapped = dedupeMappedRows(allMapped);
  const existing = readJsonFile(DB_PATH, []);
  const existingList = Array.isArray(existing) ? existing : [];
  const merged = mergeProjects(mapped, existingList);
  writeProjectsJson(merged);

  const lastSyncAt = new Date().toISOString();
  saveTokens({ lastSyncAt });

  return {
    projects: merged,
    lastSyncAt,
    count: merged.length,
    sheetTitle: syncedTitles.join(", "),
    sheetTitles: syncedTitles,
    tabErrors: errors,
  };
}
