import {
  getEmailConfig,
  getEmailConfigHealth,
  parseConfiguredEmailAddress,
  resolveAppBaseUrl,
} from "@/lib/env/server";

export type ImmediateEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type ImmediateEmailResult =
  | { status: "sent"; provider: "resend"; messageId: string | null }
  | { status: "logged"; provider: "console" }
  | { status: "skipped"; provider: "config" | "resend"; reason: string; detail?: string };

export async function sendImmediateEmail(
  payload: ImmediateEmailPayload,
): Promise<ImmediateEmailResult> {
  const config = getEmailConfig();
  const configHealth = getEmailConfigHealth();
  const replyTo = config.EMAIL_REPLY_TO
    ? parseConfiguredEmailAddress(config.EMAIL_REPLY_TO)
    : null;

  if (!configHealth.emailFromAddress) {
    return {
      status: "skipped",
      provider: "config",
      reason: "email-from-invalid",
      detail: "EMAIL_FROM doit contenir une adresse email valide ou un format Nom <email@domaine>.",
    };
  }

  if (config.EMAIL_REPLY_TO && !replyTo) {
    return {
      status: "skipped",
      provider: "config",
      reason: "email-reply-to-invalid",
      detail: "EMAIL_REPLY_TO doit contenir une adresse email valide.",
    };
  }

  if (config.EMAIL_PROVIDER === "console") {
    console.info("[email:console]", {
      to: payload.to,
      subject: payload.subject,
      preview: payload.text,
      from: config.EMAIL_FROM,
      replyTo: config.EMAIL_REPLY_TO ?? null,
    });

    return {
      status: "logged",
      provider: "console",
    };
  }

  if (!config.RESEND_API_KEY) {
    return {
      status: "skipped",
      provider: "config",
      reason: "resend-api-key-missing",
      detail: "RESEND_API_KEY est requis quand EMAIL_PROVIDER=resend.",
    };
  }

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "noria-workflow/1.0",
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: replyTo ?? undefined,
      }),
    });
  } catch (error) {
    return {
      status: "skipped",
      provider: "resend",
      reason: "resend-network-error",
      detail: error instanceof Error ? error.message : "Erreur réseau pendant l'appel Resend.",
    };
  }

  if (!response.ok) {
    const detail = truncateForEmailDiagnostics(await response.text().catch(() => ""));
    return {
      status: "skipped",
      provider: "resend",
      reason: `resend-${response.status}`,
      detail: detail || "Resend a refusé la requête.",
    };
  }

  const data = (await response.json().catch(() => null)) as { id?: string } | null;

  return {
    status: "sent",
    provider: "resend",
    messageId: typeof data?.id === "string" ? data.id : null,
  };
}

export function buildImmediateNotificationEmail(args: {
  recipientName: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
  categoryLabel?: string;
  footerNote?: string;
}) {
  const actionUrl = resolveEmailActionUrl(args.actionPath);
  const actionLabel = args.actionLabel ?? "Ouvrir dans Noria";
  const intro = `Bonjour ${args.recipientName},`;
  const categoryLabel = args.categoryLabel ?? "Notification interne";
  const footerNote =
    args.footerNote ??
    (actionUrl
      ? "Si le bouton ne fonctionne pas, copie le lien brut dans ton navigateur."
      : "Définis APP_BASE_URL pour injecter un lien direct dans les emails.");
  const bodyParagraphs = splitParagraphs(args.body).map(
    (paragraph) =>
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#42504d;">${escapeHtml(paragraph)}</p>`,
  );
  const actionBlock = actionUrl
    ? `
      <div style="margin-top:28px;">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:999px;padding:14px 20px;background:#13211f;color:#fff7eb;text-decoration:none;font-weight:600;">
          ${escapeHtml(actionLabel)}
        </a>
        <p style="margin:12px 0 0;font-size:12px;line-height:1.7;color:#5f6a67;">
          Lien brut: <span style="word-break:break-all;">${escapeHtml(actionUrl)}</span>
        </p>
      </div>
    `
    : `
      <div style="margin-top:24px;border-radius:22px;border:1px dashed rgba(19,33,31,0.16);padding:16px;background:#fffaf1;">
        <p style="margin:0;font-size:13px;line-height:1.7;color:#5f6a67;">
          Aucun lien direct n’a été injecté dans cet email car APP_BASE_URL n’est pas exploitable.
        </p>
      </div>
    `;
  const preheader = truncateForEmailDiagnostics(args.body, 110);

  return {
    subject: args.title,
    actionUrl,
    text: [
      categoryLabel,
      "",
      intro,
      "",
      ...splitParagraphs(args.body),
      "",
      actionUrl ? `${actionLabel}: ${actionUrl}` : "Lien direct indisponible.",
      footerNote,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(preheader)}
      </div>
      <div style="font-family:'Space Grotesk',Arial,sans-serif;background:#f4efe6;padding:28px;color:#13211f;">
        <div style="max-width:640px;margin:0 auto;background:#fff9ef;border:1px solid rgba(19,33,31,0.08);border-radius:30px;padding:32px;box-shadow:0 18px 60px rgba(19,33,31,0.08);">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#5f6a67;">Noria</p>
          <p style="margin:0 0 18px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9a7e61;">${escapeHtml(categoryLabel)}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.1;">${escapeHtml(args.title)}</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;">${escapeHtml(intro)}</p>
          <div style="margin-top:18px;">
            ${bodyParagraphs.join("")}
          </div>
          ${actionBlock}
          <div style="margin-top:28px;border-top:1px solid rgba(19,33,31,0.08);padding-top:18px;">
            <p style="margin:0;font-size:12px;line-height:1.7;color:#5f6a67;">${escapeHtml(footerNote)}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function resolveEmailActionUrl(actionPath?: string) {
  const baseUrl = resolveAppBaseUrl();

  if (!baseUrl || !actionPath) {
    return null;
  }

  try {
    return new URL(actionPath, baseUrl).toString();
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitParagraphs(value: string) {
  return value
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function truncateForEmailDiagnostics(value: string, maxLength = 220) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
