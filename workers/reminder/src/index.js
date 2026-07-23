const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_REMINDER_HOUR = 8;

export default {
  async fetch() {
    return Response.json({ ok: true, service: "putnam-review-reminders" });
  },

  async scheduled(controller, env) {
    if (!hasReminderConfiguration(env)) {
      console.log("Skipping reminder run until DB, EMAIL, REMINDER_EMAIL, EMAIL_FROM, and APP_URL are configured");
      return;
    }

    const scheduledAt = new Date(controller.scheduledTime || Date.now());
    if (!isReminderHour(scheduledAt, env.TIMEZONE, env.REMINDER_HOUR)) {
      console.log("Skipping reminder run outside configured local hour", scheduledAt.toISOString());
      return;
    }

    const result = await sendDueReminder(env, scheduledAt);
    console.log("Reminder run completed", result);
  },
};

export async function sendDueReminder(env, now = new Date()) {
  assertConfiguration(env);
  const nowIso = now.toISOString();
  const dueResult = await env.DB.prepare(
    `SELECT p.id, p.title, p.level, p.area, p.next_review_at
     FROM problems p
     LEFT JOIN notification_log n
       ON n.problem_id = p.id
      AND n.review_at = p.next_review_at
      AND n.recipient = ?1
     WHERE p.next_review_at <= ?2
       AND n.id IS NULL
     ORDER BY p.next_review_at ASC, p.level ASC
     LIMIT 100`,
  ).bind(env.REMINDER_EMAIL, nowIso).all();

  const due = dueResult.results || [];
  if (!due.length) return { sent: false, due: 0 };

  const subject = due.length === 1
    ? `Putnam review due: ${due[0].title}`
    : `${due.length} Putnam problems are due for review`;

  const emailResult = await env.EMAIL.send({
    to: env.REMINDER_EMAIL,
    from: env.EMAIL_FROM,
    subject,
    text: buildTextEmail(due, env.APP_URL),
    html: buildHtmlEmail(due, env.APP_URL),
  });

  const sentAt = new Date().toISOString();
  await env.DB.batch(due.map((problem) => env.DB.prepare(
    `INSERT OR IGNORE INTO notification_log
      (id, problem_id, review_at, recipient, sent_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  ).bind(crypto.randomUUID(), problem.id, problem.next_review_at, env.REMINDER_EMAIL, sentAt)));

  return { sent: true, due: due.length, message_id: emailResult.messageId };
}

function isReminderHour(date, timezone = DEFAULT_TIMEZONE, configuredHour = DEFAULT_REMINDER_HOUR) {
  const hour = Number.parseInt(String(configuredHour), 10);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const localHour = Number.parseInt(parts.find((part) => part.type === "hour")?.value || "-1", 10);
  return localHour === (Number.isInteger(hour) ? hour : DEFAULT_REMINDER_HOUR);
}

function hasReminderConfiguration(env) {
  return Boolean(
    env.DB
      && env.EMAIL
      && env.REMINDER_EMAIL
      && env.EMAIL_FROM
      && env.APP_URL
      && !String(env.REMINDER_EMAIL).startsWith("replace@")
      && !String(env.EMAIL_FROM).startsWith("replace@")
      && !String(env.APP_URL).includes("your-"),
  );
}

function assertConfiguration(env) {
  const missing = ["DB", "EMAIL", "REMINDER_EMAIL", "EMAIL_FROM", "APP_URL"].filter((key) => !env[key] || String(env[key]).startsWith("replace@") || String(env[key]).includes("your-"));
  if (missing.length) throw new Error(`Reminder worker is missing configuration: ${missing.join(", ")}`);
}

function buildTextEmail(due, appUrl) {
  const lines = due.map((problem) => `• ${problem.level} · ${problem.title} (${problem.area})`);
  return [
    `You have ${due.length} Putnam ${due.length === 1 ? "problem" : "problems"} due for review today.`,
    "",
    ...lines,
    "",
    `Open your journal: ${appUrl}`,
  ].join("\n");
}

function buildHtmlEmail(due, appUrl) {
  const rows = due.map((problem) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb">
        <strong>${escapeHtml(problem.level)} · ${escapeHtml(problem.title)}</strong><br>
        <span style="color:#64748b">${escapeHtml(problem.area)}</span>
      </td>
    </tr>`).join("");

  return `<!doctype html>
  <html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#172033">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6d5dfc">Putnam Journal</div>
        <h1 style="font-size:24px;margin:10px 0 8px">${due.length} ${due.length === 1 ? "problem is" : "problems are"} ready to revisit</h1>
        <p style="color:#64748b;margin:0 0 18px">A clean reattempt is waiting. Your previous solution stays hidden until you choose to review it.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse">${rows}</table>
        <a href="${escapeAttribute(appUrl)}" style="display:inline-block;margin-top:24px;background:#172033;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Open today’s queue</a>
      </div>
    </div>
  </body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
