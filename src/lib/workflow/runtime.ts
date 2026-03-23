import { hasSupabaseServiceRoleKey } from "@/lib/env/server";
import { currentUser, getConversationMessages, notificationInbox } from "@/lib/workflow/mock-data";
import type {
  ConversationMessage,
  CurrentUser,
  NotificationItem,
} from "@/lib/workflow/types";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RuntimeMode = "demo" | "live";

type SupabaseProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  role: string | null;
};

type SupabaseMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SupabaseNotificationRow = {
  id: string;
  user_id: string;
  request_id: string | null;
  channel: "in_app" | "email";
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type RuntimeActor = CurrentUser & {
  mode: RuntimeMode;
};

export function canUseSupabaseLiveMode(actor: RuntimeActor) {
  return actor.mode === "live" && hasPublicSupabaseEnv() && hasSupabaseServiceRoleKey();
}

export async function resolveRuntimeActor(): Promise<RuntimeActor> {
  if (!hasPublicSupabaseEnv()) {
    return {
      ...currentUser,
      mode: "demo",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...currentUser,
        mode: "demo",
      };
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, job_title, role")
      .eq("id", user.id)
      .maybeSingle();

    const profile = (data as SupabaseProfileRow | null) ?? null;

    return {
      id: user.id,
      fullName:
        profile?.full_name ||
        user.user_metadata.full_name ||
        user.email?.split("@")[0] ||
        currentUser.fullName,
      email: profile?.email || user.email || currentUser.email,
      roleLabel: profile?.job_title || humanizeRole(profile?.role) || "Utilisateur interne",
      mode: "live",
    };
  } catch {
    return {
      ...currentUser,
      mode: "demo",
    };
  }
}

export function getDemoConversationMessages(conversationId: string) {
  return getConversationMessages(conversationId);
}

export function getDemoNotifications(userId: string) {
  return notificationInbox.filter((item) => item.userId === userId);
}

export function createDemoMessage(
  actor: CurrentUser,
  conversationId: string,
  body: string,
): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    author: actor.fullName,
    body,
    createdAt: formatUiTime(new Date().toISOString()),
    kind: "text",
    isOwn: true,
  };
}

export function createDemoNotification(args: {
  userId: string;
  title: string;
  body: string;
  channel?: "in_app" | "email";
  requestReference?: string | null;
}): NotificationItem {
  return {
    id: crypto.randomUUID(),
    userId: args.userId,
    title: args.title,
    body: args.body,
    createdAt: formatUiTime(new Date().toISOString()),
    isRead: false,
    channel: args.channel ?? "in_app",
    requestReference: args.requestReference ?? null,
  };
}

export function mapMessageRowToView(
  row: SupabaseMessageRow,
  actorId: string,
): ConversationMessage {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const senderName =
    readString(metadata.sender_name) ||
    readString(metadata.author) ||
    (row.kind === "system" ? "Workflow Engine" : "Collaborateur");

  return {
    id: row.id,
    conversationId: row.conversation_id,
    author: senderName,
    body: row.body,
    createdAt: formatUiTime(row.created_at),
    kind: row.kind === "system" ? "system" : "text",
    isOwn: row.sender_id === actorId,
  };
}

export function mapNotificationRowToView(
  row: SupabaseNotificationRow,
): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: formatUiTime(row.created_at),
    isRead: Boolean(row.read_at),
    channel: row.channel,
    requestReference: row.request_id,
  };
}

export function formatUiTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function humanizeRole(role: string | null | undefined) {
  if (!role) {
    return null;
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
