import { createSessionCookie, clearSessionCookie, isAuthenticated, requireAuth, verifyPassword } from "../_lib/auth.js";
import { asHttpError, error, HttpError, ok, readJson } from "../_lib/http.js";
import { handleDashboard, handleGetProblem, handleListProblems, handleTechniques } from "../_handlers/read.js";
import { handleCreateAttempt, handleCreateProblem, handleImage } from "../_handlers/write.js";
import { handleAnalytics } from "../_handlers/analytics.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    if (path === "/api/health" && request.method === "GET") {
      return ok({ service: "putnam-journal", time: new Date().toISOString() });
    }

    if (path === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request, env);
    }

    if (path === "/api/auth/logout" && request.method === "POST") {
      return ok({}, { headers: { "set-cookie": clearSessionCookie() } });
    }

    if (path === "/api/auth/session" && request.method === "GET") {
      return ok({ authenticated: await isAuthenticated(request, env) });
    }

    await requireAuth(request, env);

    if (path === "/api/dashboard" && request.method === "GET") return handleDashboard(env);
    if (path === "/api/techniques" && request.method === "GET") return handleTechniques(env);
    if (path === "/api/problems" && request.method === "GET") return handleListProblems(env, url);
    if (path === "/api/problems" && request.method === "POST") return handleCreateProblem(request, env);
    if (path === "/api/analytics" && request.method === "GET") return handleAnalytics(env);
    if (path.startsWith("/api/images/") && request.method === "GET") return handleImage(path, env);

    const attemptMatch = path.match(/^\/api\/problems\/([^/]+)\/attempts$/);
    if (attemptMatch && request.method === "POST") {
      return handleCreateAttempt(request, env, decodeURIComponent(attemptMatch[1]));
    }

    const problemMatch = path.match(/^\/api\/problems\/([^/]+)$/);
    if (problemMatch && request.method === "GET") {
      return handleGetProblem(env, decodeURIComponent(problemMatch[1]));
    }

    throw new HttpError(404, "API route not found");
  } catch (caught) {
    const httpError = asHttpError(caught);
    return error(httpError.message, httpError.status, httpError.details);
  }
}

async function handleLogin(request, env) {
  const body = await readJson(request);
  if (!(await verifyPassword(env, body.password))) {
    return error("Incorrect password", 401);
  }
  return ok(
    { authenticated: true },
    { headers: { "set-cookie": await createSessionCookie(env) } },
  );
}
