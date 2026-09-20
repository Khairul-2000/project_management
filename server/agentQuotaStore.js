import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { isSuperAdmin } from "./roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

export const QUOTA_FILE_PATH = path.resolve(ROOT, "data/agent-quotas.json");

function ensureDir() {
  fs.mkdirSync(path.dirname(QUOTA_FILE_PATH), { recursive: true });
}

function parseBool(val, fallback = true) {
  if (val === undefined || val === null || val === "") return fallback;
  const cleaned = String(val).trim().toLowerCase().replace(/^['"]|['"]$/g, "");
  if (cleaned === "false" || cleaned === "0" || cleaned === "no" || cleaned === "off") return false;
  if (cleaned === "true" || cleaned === "1" || cleaned === "yes" || cleaned === "on") return true;
  return fallback;
}

function readEnvDirect() {
  const envMap = {};
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1).trim();
          }
          envMap[key] = val;
        }
      }
    } catch (err) {
      console.warn("[agent-quota] Failed reading .env file directly:", err.message);
    }
  }
  return envMap;
}

export function getQuotaConfig() {
  try {
    dotenv.config({ path: path.join(ROOT, ".env"), override: true });
  } catch {}

  const directEnv = readEnvDirect();
  const getVal = (key) => directEnv[key] ?? process.env[key];

  const windowHours = Math.max(0.1, parseFloat(getVal("AGENT_QUOTA_WINDOW_HOURS") || "5"));
  const workTaskLimit = Math.max(1, parseInt(getVal("AGENT_WORK_TASK_LIMIT") || "3", 10));
  const chatLimit = Math.max(1, parseInt(getVal("AGENT_CHAT_LIMIT") || "25", 10));
  const superAdminUnlimited = parseBool(getVal("AGENT_SUPERADMIN_UNLIMITED"), true);

  return {
    windowHours,
    windowMs: windowHours * 60 * 60 * 1000,
    workTaskLimit,
    chatLimit,
    superAdminUnlimited,
  };
}

function emptyStore() {
  return {
    version: 1,
    users: {},
  };
}

export function readQuotaStore() {
  ensureDir();
  if (!fs.existsSync(QUOTA_FILE_PATH)) {
    return emptyStore();
  }
  try {
    const raw = fs.readFileSync(QUOTA_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.users) {
      return emptyStore();
    }
    return parsed;
  } catch (err) {
    console.error("[agent-quota] Failed reading quota store:", err.message);
    return emptyStore();
  }
}

export function writeQuotaStore(store) {
  ensureDir();
  try {
    const tempPath = `${QUOTA_FILE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2) + "\n", "utf8");
    fs.renameSync(tempPath, QUOTA_FILE_PATH);
  } catch (err) {
    console.error("[agent-quota] Failed writing quota store:", err.message);
  }
}

function getUserKey(user) {
  if (!user) return "anonymous";
  return String(user.id || user.username || "anonymous").trim();
}

/**
 * Filter out timestamps older than current window cutoff
 */
function cleanUserQuota(userData, windowMs, now = Date.now()) {
  const cutoff = now - windowMs;
  const chatRequests = (userData.chatRequests || []).filter((ts) => typeof ts === "number" && ts > cutoff);
  const workTasks = (userData.workTasks || []).filter((t) => {
    const ts = typeof t === "number" ? t : t?.timestamp;
    return typeof ts === "number" && ts > cutoff;
  });

  return {
    chatRequests: chatRequests.sort((a, b) => a - b),
    workTasks: workTasks.sort((a, b) => {
      const tsA = typeof a === "number" ? a : a?.timestamp || 0;
      const tsB = typeof b === "number" ? b : b?.timestamp || 0;
      return tsA - tsB;
    }),
  };
}

/**
 * Get current quota status for a user
 */
export function getQuotaStatus(user) {
  const config = getQuotaConfig();
  const userKey = getUserKey(user);
  const store = readQuotaStore();
  const rawUser = store.users[userKey] || { chatRequests: [], workTasks: [] };
  const now = Date.now();

  const cleaned = cleanUserQuota(rawUser, config.windowMs, now);
  const isSuper = isSuperAdmin(user);
  const isUnlimited = isSuper && config.superAdminUnlimited;

  // Calculate chat reset
  const chatUsed = cleaned.chatRequests.length;
  const chatRemaining = isUnlimited ? 9999 : Math.max(0, config.chatLimit - chatUsed);
  let chatResetAt = null;
  let chatResetInSeconds = 0;
  if (cleaned.chatRequests.length > 0) {
    const slotIndex = chatUsed >= config.chatLimit ? chatUsed - config.chatLimit : 0;
    const earliest = cleaned.chatRequests[slotIndex];
    if (earliest) {
      chatResetAt = earliest + config.windowMs;
      chatResetInSeconds = Math.max(0, Math.ceil((chatResetAt - now) / 1000));
    }
  }

  // Calculate work task reset
  const workUsed = cleaned.workTasks.length;
  const workRemaining = isUnlimited ? 9999 : Math.max(0, config.workTaskLimit - workUsed);
  let workResetAt = null;
  let workResetInSeconds = 0;
  if (cleaned.workTasks.length > 0) {
    const slotIndex = workUsed >= config.workTaskLimit ? workUsed - config.workTaskLimit : 0;
    const oldestTask = cleaned.workTasks[slotIndex];
    const earliestTs = typeof oldestTask === "number" ? oldestTask : oldestTask?.timestamp;
    if (earliestTs) {
      workResetAt = earliestTs + config.windowMs;
      workResetInSeconds = Math.max(0, Math.ceil((workResetAt - now) / 1000));
    }
  }

  return {
    windowHours: config.windowHours,
    isSuperAdmin: isSuper,
    isUnlimited,
    chat: {
      limit: config.chatLimit,
      used: chatUsed,
      remaining: chatRemaining,
      resetAt: chatResetAt,
      resetInSeconds: chatResetInSeconds,
    },
    work: {
      limit: config.workTaskLimit,
      used: workUsed,
      remaining: workRemaining,
      resetAt: workResetAt,
      resetInSeconds: workResetInSeconds,
    },
  };
}

/**
 * Check if user can send a Chat message and consume 1 request credit if allowed
 */
export function checkAndConsumeChat(user) {
  const config = getQuotaConfig();
  const userKey = getUserKey(user);
  const store = readQuotaStore();
  const rawUser = store.users[userKey] || { chatRequests: [], workTasks: [] };
  const now = Date.now();

  const cleaned = cleanUserQuota(rawUser, config.windowMs, now);
  const isSuper = isSuperAdmin(user);
  const isUnlimited = isSuper && config.superAdminUnlimited;

  if (!isUnlimited && cleaned.chatRequests.length >= config.chatLimit) {
    const status = getQuotaStatus(user);
    const mins = Math.ceil(status.chat.resetInSeconds / 60);
    return {
      allowed: false,
      status,
      error: `Chat limit reached (${config.chatLimit}/${config.chatLimit} in ${config.windowHours}h window). Next slot available in ~${mins}m.`,
    };
  }

  // Consume
  cleaned.chatRequests.push(now);
  store.users[userKey] = cleaned;
  writeQuotaStore(store);

  return {
    allowed: true,
    status: getQuotaStatus(user),
  };
}

/**
 * Check if user can perform an operational task in Work Mode and consume 1 task credit if allowed
 */
export function checkAndConsumeWorkTask(user, actionType = "work_mode_task", summary = "") {
  const config = getQuotaConfig();
  const userKey = getUserKey(user);
  const store = readQuotaStore();
  const rawUser = store.users[userKey] || { chatRequests: [], workTasks: [] };
  const now = Date.now();

  const cleaned = cleanUserQuota(rawUser, config.windowMs, now);
  const isSuper = isSuperAdmin(user);
  const isUnlimited = isSuper && config.superAdminUnlimited;

  if (!isUnlimited && cleaned.workTasks.length >= config.workTaskLimit) {
    const status = getQuotaStatus(user);
    const mins = Math.ceil(status.work.resetInSeconds / 60);
    return {
      allowed: false,
      status,
      error: `Work task limit reached (${config.workTaskLimit}/${config.workTaskLimit} in ${config.windowHours}h window). Next task available in ~${mins}m.`,
    };
  }

  // Consume
  cleaned.workTasks.push({
    timestamp: now,
    actionType,
    summary: summary ? String(summary).slice(0, 150) : undefined,
  });
  store.users[userKey] = cleaned;
  writeQuotaStore(store);

  return {
    allowed: true,
    status: getQuotaStatus(user),
  };
}

/**
 * Reset quota for a specific user (admin utility)
 */
export function resetUserQuota(userId) {
  const store = readQuotaStore();
  if (store.users[userId]) {
    delete store.users[userId];
    writeQuotaStore(store);
    return true;
  }
  return false;
}
