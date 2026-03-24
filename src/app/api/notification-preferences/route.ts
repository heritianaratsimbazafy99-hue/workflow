import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { defaultNotificationPreference } from "@/lib/notifications/preferences";
import {
  canUseSupabaseLiveMode,
  resolveRuntimeActor,
} from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const preferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  approvalsInApp: z.boolean(),
  approvalsEmail: z.boolean(),
  messagesInApp: z.boolean(),
  messagesEmail: z.boolean(),
  mentionsInApp: z.boolean(),
  mentionsEmail: z.boolean(),
  slaInApp: z.boolean(),
  slaEmail: z.boolean(),
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["daily", "weekly"]),
});

export async function GET() {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      preference: defaultNotificationPreference,
    });
  }

  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("notification_preferences")
    .select(
      "in_app_enabled, email_enabled, approvals_in_app, approvals_email, messages_in_app, messages_email, mentions_in_app, mentions_email, sla_in_app, sla_email, digest_enabled, digest_frequency",
    )
    .eq("user_id", actor.id)
    .maybeSingle();

  return NextResponse.json({
    mode: "live",
    actor,
    preference: data
      ? {
          inAppEnabled: data.in_app_enabled,
          emailEnabled: data.email_enabled,
          approvalsInApp: data.approvals_in_app,
          approvalsEmail: data.approvals_email,
          messagesInApp: data.messages_in_app,
          messagesEmail: data.messages_email,
          mentionsInApp: data.mentions_in_app,
          mentionsEmail: data.mentions_email,
          slaInApp: data.sla_in_app,
          slaEmail: data.sla_email,
          digestEnabled: data.digest_enabled,
          digestFrequency: data.digest_frequency,
        }
      : defaultNotificationPreference,
  });
}

export async function PATCH(request: Request) {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      preference: defaultNotificationPreference,
    });
  }

  let payload: z.infer<typeof preferenceSchema>;

  try {
    payload = preferenceSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid notification preferences payload." },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceRoleClient();
  const { error } = await service.from("notification_preferences").upsert(
    {
      user_id: actor.id,
      in_app_enabled: payload.inAppEnabled,
      email_enabled: payload.emailEnabled,
      approvals_in_app: payload.approvalsInApp,
      approvals_email: payload.approvalsEmail,
      messages_in_app: payload.messagesInApp,
      messages_email: payload.messagesEmail,
      mentions_in_app: payload.mentionsInApp,
      mentions_email: payload.mentionsEmail,
      sla_in_app: payload.slaInApp,
      sla_email: payload.slaEmail,
      digest_enabled: payload.digestEnabled,
      digest_frequency: payload.digestFrequency,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
