import { getBackendApiUrl } from "../config/runtime.js";

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function callWorkNexApi(path, { authToken, params } = {}) {
  if (!authToken) {
    return {
      ok: false,
      status: 401,
      error: "Missing user access token. The frontend must call this service with the same Authorization bearer token used for WorkNex backend APIs.",
    };
  }

  const url = `${getBackendApiUrl()}${path}${toQueryString(params)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { message: await response.text().catch(() => "") };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.message || payload?.error || `Backend request failed with HTTP ${response.status}`,
      payload,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload?.data ?? payload,
    meta: payload?.meta ?? null,
    message: payload?.message ?? "OK",
  };
}

export function formatApiResult(result) {
  if (!result?.ok) {
    return JSON.stringify({
      success: false,
      status: result?.status || 500,
      error: result?.error || "Unknown backend API error",
    });
  }

  return JSON.stringify({
    success: true,
    message: result.message,
    data: result.data,
    meta: result.meta,
  });
}
