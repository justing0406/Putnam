import { onRequest as handleApiRequest } from "../functions/api/[[path]].js";
import reminderWorker from "../workers/reminder/src/index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApiRequest({ request, env, ctx });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    return reminderWorker.scheduled(controller, env, ctx);
  },
};
