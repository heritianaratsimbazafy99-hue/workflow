import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { hasSupabaseServiceRoleKey } from "@/lib/env/server";
import {
  buildImmediateNotificationEmail,
  sendImmediateEmail,
} from "@/lib/notifications/email";

export type NotificationRecipient = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export async function dispatchNotifications(args: {
  recipients: NotificationRecipient[];
  title: string;
  body: string;
  channel?: "in_app" | "email";
  requestId?: string | null;
  sendEmail?: boolean;
  actionPath?: string;
  actionLabel?: string;
}) {
  let inserted = 0;
  let emailed = 0;

  if (args.recipients.length === 0) {
    return { inserted, emailed };
  }

  if (hasSupabaseServiceRoleKey()) {
    const service = createSupabaseServiceRoleClient();
    const rows = args.recipients.map((recipient) => ({
      user_id: recipient.id,
      request_id: args.requestId ?? null,
      channel: args.channel ?? "in_app",
      title: args.title,
      body: args.body,
      sent_at: args.channel === "email" ? new Date().toISOString() : null,
    }));

    const { error } = await service.from("notifications").insert(rows);

    if (error) {
      throw error;
    }

    inserted = rows.length;
  }

  if (!args.sendEmail) {
    return { inserted, emailed };
  }

  for (const recipient of args.recipients) {
    if (!recipient.email) {
      continue;
    }

    const payload = buildImmediateNotificationEmail({
      recipientName: recipient.fullName || "équipe",
      title: args.title,
      body: args.body,
      actionLabel: args.actionLabel,
      actionPath: args.actionPath,
    });

    const result = await sendImmediateEmail({
      to: recipient.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (result.status === "sent" || result.status === "logged") {
      emailed += 1;
    }
  }

  return { inserted, emailed };
}
