import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  defaultNotificationPreference,
  mapPreferenceRow,
} from "@/lib/notifications/preferences";
import { mapNotificationRowsToItems, type NotificationViewRow } from "@/lib/notifications/view";
import {
  canUseSupabaseLiveMode,
  getDemoNotifications,
  resolveRuntimeActor,
} from "@/lib/workflow/runtime";
import type {
  CurrentUser,
  NotificationItem,
  NotificationPreference,
} from "@/lib/workflow/types";

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

export type NotificationCenterData = {
  mode: "demo" | "live";
  actor: CurrentUser & { mode: "demo" | "live" };
  items: NotificationItem[];
  preference: NotificationPreference;
};

export async function getNotificationCenterData(): Promise<NotificationCenterData> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return {
      mode: "demo",
      actor,
      items: getDemoNotifications(actor.id),
      preference: defaultNotificationPreference,
    };
  }

  const service = createSupabaseServiceRoleClient();
  const [notificationsResult, preferenceResult] = await Promise.all([
    service
      .from("notifications")
      .select("id, user_id, request_id, channel, category, title, body, read_at, created_at")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(30),
    service
      .from("notification_preferences")
      .select(
        "user_id, in_app_enabled, email_enabled, approvals_in_app, approvals_email, messages_in_app, messages_email, mentions_in_app, mentions_email, sla_in_app, sla_email, digest_enabled, digest_frequency",
      )
      .eq("user_id", actor.id)
      .maybeSingle(),
  ]);

  return {
    mode: "live",
    actor,
    items: await mapNotificationRowsToItems(
      service,
      (notificationsResult.data as NotificationViewRow[] | null) ?? [],
    ),
    preference: preferenceResult.data
      ? mapPreferenceRow(preferenceResult.data as PreferenceRow)
      : defaultNotificationPreference,
  };
}
