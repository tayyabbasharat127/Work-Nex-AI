import crypto from "crypto";

function decodeJson(segment) {
  try { return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")); }
  catch { return null; }
}

export function verifyBackendJwt(authorization) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error("JWT verification is not configured"), { statusCode: 503 });
  if (!authorization?.startsWith("Bearer ")) throw Object.assign(new Error("Bearer access token required"), { statusCode: 401 });
  const token = authorization.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Invalid access token"), { statusCode: 401 });
  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (!header || !claims || header.alg !== "HS256") throw Object.assign(new Error("Invalid access token"), { statusCode: 401 });
  const expected = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  let supplied;
  try { supplied = Buffer.from(parts[2], "base64url"); } catch { supplied = Buffer.alloc(0); }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) {
    throw Object.assign(new Error("Invalid access token"), { statusCode: 401 });
  }
  if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw Object.assign(new Error("Access token expired"), { statusCode: 401 });
  if (!claims.userId || !claims.organizationId || !claims.role) throw Object.assign(new Error("Access token is missing identity claims"), { statusCode: 401 });
  return { token, userId: String(claims.userId), organizationId: String(claims.organizationId), role: String(claims.role) };
}

export function authenticate(req, res, next) {
  try { req.principal = verifyBackendJwt(req.headers.authorization); next(); }
  catch (error) { res.status(error.statusCode || 401).json({ success: false, message: error.message }); }
}

export function createOwnedThreadId(principal) {
  const payload = Buffer.from(JSON.stringify({ u: principal.userId, o: principal.organizationId, r: crypto.randomUUID() })).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function assertThreadOwner(threadId, principal) {
  const [payload, signature] = String(threadId || "").split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", process.env.JWT_SECRET).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) return false;
  const owner = decodeJson(payload);
  return owner?.u === principal.userId && owner?.o === principal.organizationId;
}
