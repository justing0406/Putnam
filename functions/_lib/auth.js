import { HttpError } from "./http.js";

const encoder = new TextEncoder();
const COOKIE_NAME = "putnam_session";

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function parseCookies(request) {
  const result = new Map();
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    result.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return result;
}

function assertAuthEnv(env) {
  if (!env.APP_PASSWORD || !env.SESSION_SECRET) {
    throw new HttpError(503, "Authentication is not configured");
  }
}

export async function verifyPassword(env, candidate) {
  assertAuthEnv(env);
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const [actual, expected] = await Promise.all([digest(candidate), digest(env.APP_PASSWORD)]);
  return constantTimeEqual(actual, expected);
}

export async function createSessionCookie(env) {
  assertAuthEnv(env);
  const days = Math.max(1, Number.parseInt(env.SESSION_DAYS || "30", 10) || 30);
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ iat: now, exp: now + days * 86400 })));
  const signature = base64UrlEncode(await hmac(env.SESSION_SECRET, payload));
  const token = `${payload}.${signature}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${days * 86400}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAuthenticated(request, env) {
  if (!env.SESSION_SECRET) return false;
  const token = parseCookies(request).get(COOKIE_NAME);
  if (!token) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  try {
    const expectedSignature = await hmac(env.SESSION_SECRET, payload);
    if (!constantTimeEqual(base64UrlDecode(suppliedSignature), expectedSignature)) return false;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return Number.isFinite(decoded.exp) && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAuth(request, env) {
  if (!(await isAuthenticated(request, env))) {
    throw new HttpError(401, "Authentication required");
  }
}
