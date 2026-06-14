export function getBackendApiUrl() {
  return (process.env.WORKNEX_BACKEND_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");
}

export function getCorsOrigins() {
  return (process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function normalizeBearerToken(value = "") {
  const token = String(value || "").trim();
  if (!token) return "";
  return token.replace(/^Bearer\s+/i, "");
}
