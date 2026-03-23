import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { dispatchNotifications } from "@/lib/notifications/service";
import {
  canUseSupabaseLiveMode,
  createDemoMessage,
  getDemoConversationMessages,
  mapMessageRowToView,
  resolveRuntimeActor,
  truncateText,
} from "@/lib/workflow/runtime";

export const dynamic = "force-dynamic";

const createMessageSchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim().min(1).max(4000),
  sendEmail: z.boolean().optional().default(false),
});

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ConversationRow = {
  id: string;
  title: string | null;
  request_id: string | null;
};

type MemberRow = {
  user_id: string;
};

type ProfileRecipientRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId query parameter." },
      { status: 400 },
    );
  }

  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      items: getDemoConversationMessages(conversationId),
    });
  }

  const service = createSupabaseServiceRoleClient();
  const { data: membership } = await service
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", actor.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Conversation inaccessible pour cet utilisateur." },
      { status: 403 },
    );
  }

  const { data, error } = await service
    .from("messages")
    .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Unable to load conversation messages." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mode: "live",
    actor,
    items: ((data as MessageRow[] | null) ?? []).map((item) =>
      mapMessageRowToView(item, actor.id),
    ),
  });
}

export async function POST(request: Request) {
  const actor = await resolveRuntimeActor();

  let payload: z.infer<typeof createMessageSchema>;

  try {
    payload = createMessageSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid message payload." },
      { status: 400 },
    );
  }

  if (!canUseSupabaseLiveMode(actor)) {
    return NextResponse.json({
      mode: "demo",
      actor,
      item: createDemoMessage(actor, payload.conversationId, payload.body),
      notificationsInserted: 0,
      emailsSent: 0,
    });
  }

  const service = createSupabaseServiceRoleClient();

  const { data: membership } = await service
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", payload.conversationId)
    .eq("user_id", actor.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Conversation inaccessible pour cet utilisateur." },
      { status: 403 },
    );
  }

  const { data, error } = await service
    .from("messages")
    .insert({
      conversation_id: payload.conversationId,
      sender_id: actor.id,
      kind: "text",
      body: payload.body,
      metadata: {
        sender_name: actor.fullName,
        sender_role: actor.roleLabel,
      },
    })
    .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Unable to insert message." },
      { status: 500 },
    );
  }

  const { data: conversationData } = await service
    .from("conversations")
    .select("id, title, request_id")
    .eq("id", payload.conversationId)
    .maybeSingle();
  const conversation = (conversationData as ConversationRow | null) ?? null;

  const { data: memberRows } = await service
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", payload.conversationId)
    .neq("user_id", actor.id);
  const memberIds = ((memberRows as MemberRow[] | null) ?? []).map(
    (item) => item.user_id,
  );

  let notificationsInserted = 0;
  let emailsSent = 0;

  if (memberIds.length > 0) {
    const { data: profileRows } = await service
      .from("profiles")
      .select("id, email, full_name")
      .in("id", memberIds);

    const recipients =
      (profileRows as ProfileRecipientRow[] | null)?.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        fullName: recipient.full_name,
      })) ?? [];

    const dispatchResult = await dispatchNotifications({
      recipients,
      title: `Nouveau message · ${conversation?.title ?? "Canal dossier"}`,
      body: `${actor.fullName} : ${truncateText(payload.body, 120)}`,
      requestId: conversation?.request_id ?? null,
      sendEmail: payload.sendEmail,
      actionPath: `/messages`,
      actionLabel: "Voir la conversation",
    });

    notificationsInserted = dispatchResult.inserted;
    emailsSent = dispatchResult.emailed;
  }

  return NextResponse.json({
    mode: "live",
    actor,
    item: mapMessageRowToView(data as MessageRow, actor.id),
    notificationsInserted,
    emailsSent,
  });
}
