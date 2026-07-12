import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { assertThreadOwner, createOwnedThreadId, verifyBackendJwt } from "../security/auth.js";

process.env.JWT_SECRET = "test-secret";

function token(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

test("verifies backend identity claims", () => {
  const jwt = token({ userId: "u1", organizationId: "o1", role: "EMPLOYEE", exp: Math.floor(Date.now() / 1000) + 60 });
  assert.deepEqual(verifyBackendJwt(`Bearer ${jwt}`), { token: jwt, userId: "u1", organizationId: "o1", role: "EMPLOYEE" });
});

test("thread identifiers are bound to both user and organization", () => {
  const owner = { userId: "u1", organizationId: "o1" };
  const threadId = createOwnedThreadId(owner);
  assert.equal(assertThreadOwner(threadId, owner), true);
  assert.equal(assertThreadOwner(threadId, { userId: "u2", organizationId: "o1" }), false);
  assert.equal(assertThreadOwner(threadId, { userId: "u1", organizationId: "o2" }), false);
});
