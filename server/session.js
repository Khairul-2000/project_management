import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const COOKIE_NAME = "delivery_ops_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 days

function sessionSecret() {
  return process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me";
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSession(userId) {
  const payload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest();
  const actual = fromB64url(sig);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8"));
    if (!payload?.uid || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

export function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

export function setSessionCookie(res, token) {
  const secure = String(process.env.COOKIE_SECURE || "").toLowerCase() === "true";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  appendSetCookie(res, parts.join("; "));
}

export function clearSessionCookie(res) {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  appendSetCookie(res, parts.join("; "));
}

function appendSetCookie(res, value) {
  const prev = res.getHeader?.("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", value);
    return;
  }
  const list = Array.isArray(prev) ? prev : [prev];
  res.setHeader("Set-Cookie", [...list, value]);
}

export { COOKIE_NAME, MAX_AGE_SEC };
