import { getEmailConfig } from "@/lib/env/server";

export type ImmediateEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type ImmediateEmailResult =
  | { status: "sent"; provider: "resend" }
  | { status: "logged"; provider: "console" }
  | { status: "skipped"; reason: string };

export async function sendImmediateEmail(
  payload: ImmediateEmailPayload,
): Promise<ImmediateEmailResult> {
  const config = getEmailConfig();

  if (config.EMAIL_PROVIDER === "console" || !config.RESEND_API_KEY || !config.EMAIL_FROM) {
    console.info("[email:console]", {
      to: payload.to,
      subject: payload.subject,
      preview: payload.text,
    });

    return {
      status: "logged",
      provider: "console",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: config.EMAIL_REPLY_TO,
    }),
  });

  if (!response.ok) {
    return {
      status: "skipped",
      reason: `resend-${response.status}`,
    };
  }

  return {
    status: "sent",
    provider: "resend",
  };
}

export function buildImmediateNotificationEmail(args: {
  recipientName: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
}) {
  const config = getEmailConfig();
  const actionUrl =
    config.APP_BASE_URL && args.actionPath
      ? new URL(args.actionPath, config.APP_BASE_URL).toString()
      : null;
  const actionLabel = args.actionLabel ?? "Ouvrir dans Noria";
  const intro = `Bonjour ${args.recipientName},`;
  const actionBlock = actionUrl
    ? `<p style="margin:24px 0 0;"><a href="${actionUrl}" style="display:inline-block;border-radius:999px;padding:12px 18px;background:#13211f;color:#fff7eb;text-decoration:none;font-weight:600;">${actionLabel}</a></p>`
    : "";

  return {
    subject: args.title,
    text: [intro, "", args.body, actionUrl ? `${actionLabel}: ${actionUrl}` : ""]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:'Space Grotesk',Arial,sans-serif;background:#f5efe3;padding:28px;color:#13211f;">
        <div style="max-width:620px;margin:0 auto;background:#fff7eb;border:1px solid rgba(19,33,31,0.08);border-radius:28px;padding:28px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#5f6a67;">Noria</p>
          <h1 style="margin:0;font-size:28px;line-height:1.1;">${escapeHtml(args.title)}</h1>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.7;">${escapeHtml(intro)}</p>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.8;color:#42504d;">${escapeHtml(args.body)}</p>
          ${actionBlock}
        </div>
      </div>
    `,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
