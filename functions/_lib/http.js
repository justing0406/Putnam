export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function ok(data, init = {}) {
  return json({ ok: true, ...data }, init);
}

export function error(message, status = 400, details) {
  return json({ ok: false, error: message, ...(details ? { details } : {}) }, { status });
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Expected application/json");
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function asHttpError(errorValue) {
  if (errorValue instanceof HttpError) return errorValue;
  console.error(errorValue);
  return new HttpError(500, "Unexpected server error");
}
