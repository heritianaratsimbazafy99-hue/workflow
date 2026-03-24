import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { NotificationPreference } from "@/lib/workflow/types";

type PreferenceRow = {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  approvals_in_app: boolean;
  approvals_email: boolean;
  messages_in_app: boolean;
  messages_email: boolean;
  mentions_in_app: boolean;
  mentions_email: boolean;
  sla_in_app: boolean;
  sla_email: boolean;
  digest_enabled: boolean;
  digest_frequency: "daily" | "weekly";
};

export type NotificationCategory =
  | "general"
  | "approval"
  | "message"
  | "mention"
  | "sla"
  | "system"
  | "digest";

export const defaultNotificationPreference: NotificationPreference = {
  inAppEnabled: true,
  emailEnabled: true,
  approvalsInApp: true,
  approvalsEmail: true,
  messagesInApp: true,
  messagesEmail: false,
  mentionsInApp: true,
  mentionsEmail: true,
  slaInApp: true,
  slaEmail: true,
  digestEnabled: false,
  digestFrequency: "daily",
};

export async function getNotificationPreferencesForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return {} as Record<string, NotificationPreference>;
  }

  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("notification_preferences")
    .select(
      "user_id, in_app_enabled, email_enabled, approvals_in_app, approvals_email, messages_in_app, messages_email, mentions_in_app, mentions_email, sla_in_app, sla_email, digest_enabled, digest_frequency",
    )
    .in("user_id", userIds);

  return ((data as PreferenceRow[] | null) ?? []).reduce<
    Record<string, NotificationPreference>
  >((accumulator, item) => {
    accumulator[item.user_id] = mapPreferenceRow(item);
    return accumulator;
  }, {});
}

export function canReceiveInApp(
  preference: NotificationPreference | undefined,
  category: NotificationCategory,
) {
  const resolved = preference ?? defaultNotificationPreference;

  if (!resolved.inAppEnabled) {
    return false;
  }

  switch (category) {
    case "approval":
      return resolved.approvalsInApp;
    case "message":
      return resolved.messagesInApp;
    case "mention":
      return resolved.mentionsInApp;
    case "sla":
      return resolved.slaInApp;
    case "digest":
      return resolved.digestEnabled;
    default:
      return true;
  }
}

export function canReceiveEmail(
  preference: NotificationPreference | undefined,
  category: NotificationCategory,
) {
  const resolved = preference ?? defaultNotificationPreference;

  if (!resolved.emailEnabled) {
    return false;
  }

  switch (category) {
    case "approval":
      return resolved.approvalsEmail;
    case "message":
      return resolved.messagesEmail;
    case "mention":
      return resolved.mentionsEmail;
    case "sla":
      return resolved.slaEmail;
    case "digest":
      return resolved.digestEnabled;
    default:
      return true;
  }
}

export function mapPreferenceRow(row: PreferenceRow): NotificationPreference {
  return {
    inAppEnabled: row.in_app_enabled,
    emailEnabled: row.email_enabled,
    approvalsInApp: row.approvals_in_app,
    approvalsEmail: row.approvals_email,
    messagesInApp: row.messages_in_app,
    messagesEmail: row.messages_email,
    mentionsInApp: row.mentions_in_app,
    mentionsEmail: row.mentions_email,
    slaInApp: row.sla_in_app,
    slaEmail: row.sla_email,
    digestEnabled: row.digest_enabled,
    digestFrequency: row.digest_frequency,
  };
}
