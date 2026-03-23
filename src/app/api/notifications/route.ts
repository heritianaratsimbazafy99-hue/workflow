import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { dispatchNotifications } from "@/lib/notifications/service";
import {
  canUseSupabaseLiveMode,
  createDemoNotification,
  getDemoNotifications,
  mapNotificationRowToView,
  resolveRuntimeActor,
} from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const createNotificationsSchema = z.object({
  userIds: z.array(z.uuid()).min(1),
  channel: z.enum(["in_app", "email"]).optional().default("in_app"),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1000),
  requestId: z.uuid().optional().nullable(),
  requestReference: z.string().optional().nullable(),
  sendEmail: z.boolean().optional().default(false),
  actionPath: z.string().optional(),
});

const markReadSchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

type NotificationRow = {
  id: string;
  user_id: string;
  request_id: string | null;
  channel: "in_app" | "email";
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type RecipientRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function GET(request: Request) {
  const actor = await resolveRuntimeActor();
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "8");

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      items: getDemoNotifications(actor.id).slice(0, limit),
    });
  }

  const service = createSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("notifications")
    .select("id, user_id, request_id, channel, title, body, read_at, created_at")
    .eq("user_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mode: "live",
    actor,
    items: ((data as NotificationRow[] | null) ?? []).map((item) =>
      mapNotificationRowToView(item),
    ),
  });
}

export async function POST(request: Request) {
  const actor = await resolveRuntimeActor();

  let payload: z.infer<typeof createNotificationsSchema>;

  try {
    payload = createNotificationsSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid notification payload." },
      { status: 400 },
    );
  }

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      items: payload.userIds.map((userId) =>
        createDemoNotification({
          userId,
          title: payload.title,
          body: payload.body,
          channel: payload.channel,
          requestReference: payload.requestReference ?? null,
        }),
      ),
      notificationsInserted: payload.userIds.length,
      emailsSent: payload.sendEmail ? payload.userIds.length : 0,
    });
  }

  const service = createSupabaseServiceRoleClient();
  const { data: recipientRows } = await service
    .from("profiles")
    .select("id, email, full_name")
    .in("id", payload.userIds);

  const recipients =
    (recipientRows as RecipientRow[] | null)?.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      fullName: recipient.full_name,
    })) ?? [];

  const dispatchResult = await dispatchNotifications({
    recipients,
    title: payload.title,
    body: payload.body,
    channel: payload.channel,
    requestId: payload.requestId ?? null,
    sendEmail: payload.sendEmail,
    actionPath: payload.actionPath,
  });

  return NextResponse.json({
    mode: "live",
    actor,
    notificationsInserted: dispatchResult.inserted,
    emailsSent: dispatchResult.emailed,
  });
}

export async function PATCH(request: Request) {
  const actor = await resolveRuntimeActor();

  let payload: z.infer<typeof markReadSchema>;

  try {
    payload = markReadSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid notification patch payload." },
      { status: 400 },
    );
  }

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      updatedIds: payload.ids,
    });
  }

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("user_id", actor.id)
    .in("id", payload.ids);

  if (error) {
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mode: "live",
    actor,
    updatedIds: payload.ids,
  });
}
