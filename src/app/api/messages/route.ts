import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { dispatchNotifications } from "@/lib/notifications/service";
import {
  canUseSupabaseLiveMode,
  createDemoMessage,
  deriveUserLabel,
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
  display_name: string | null;
  username: string | null;
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

  const rows = (data as MessageRow[] | null) ?? [];
  const messageIds = rows.map((item) => item.id);
  const { data: memberRows } = await service
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const profileIds = uniqueValues(
    ((memberRows as MemberRow[] | null) ?? []).map((item) => item.user_id),
  );

  if (messageIds.length > 0) {
    await service.from("message_reads").upsert(
      rows
        .filter((item) => item.sender_id !== actor.id)
        .map((item) => ({
          message_id: item.id,
          user_id: actor.id,
        })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
  }

  const [readsResult, mentionsResult, profilesResult] = await Promise.all([
    messageIds.length > 0
      ? service
          .from("message_reads")
          .select("message_id, user_id")
          .in("message_id", messageIds)
      : Promise.resolve({ data: [] }),
    messageIds.length > 0
      ? service
          .from("message_mentions")
          .select("message_id, user_id")
          .in("message_id", messageIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? service
          .from("profiles")
          .select("id, email, full_name, display_name, username")
          .in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    mode: "live",
    actor,
    items: mapConversationMessages(
      rows,
      actor.id,
      (profilesResult.data as ProfileRecipientRow[] | null) ?? [],
      ((mentionsResult.data as Array<{ message_id: string; user_id: string }> | null) ?? []),
      ((readsResult.data as Array<{ message_id: string; user_id: string }> | null) ?? []),
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
      metadata: {},
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

  const { data: allMemberProfilesRows } = await service
    .from("profiles")
    .select("id, email, full_name, display_name, username")
    .in("id", uniqueValues([actor.id, ...memberIds]));
  const allMemberProfiles =
    (allMemberProfilesRows as ProfileRecipientRow[] | null) ?? [];
  const mentionRecipients = resolveMentionRecipients(
    payload.body,
    allMemberProfiles.filter((profile) => profile.id !== actor.id),
  );
  const mentionRecipientIds = new Set(mentionRecipients.map((recipient) => recipient.id));
  const mentionLabels = mentionRecipients.map((recipient) =>
    deriveUserLabel(recipient, { compact: true }),
  );

  if (mentionRecipients.length > 0) {
    await service.from("message_mentions").upsert(
      mentionRecipients.map((recipient) => ({
        message_id: data.id,
        user_id: recipient.id,
      })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
  }

  await service.from("message_reads").upsert(
    {
      message_id: data.id,
      user_id: actor.id,
    },
    { onConflict: "message_id,user_id", ignoreDuplicates: true },
  );

  let notificationsInserted = 0;
  let emailsSent = 0;

  if (memberIds.length > 0) {
    const recipients = allMemberProfiles
      .filter((recipient) => recipient.id !== actor.id)
      .filter((recipient) => !mentionRecipientIds.has(recipient.id))
      .map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        fullName: recipient.full_name,
      }));

    if (recipients.length > 0) {
      const dispatchResult = await dispatchNotifications({
        recipients,
        title: `Nouveau message · ${conversation?.title ?? "Canal dossier"}`,
        body: `${actor.fullName} : ${truncateText(payload.body, 120)}`,
        category: "message",
        requestId: conversation?.request_id ?? null,
        sendEmail: payload.sendEmail,
        actionPath: `/messages?conversation=${payload.conversationId}`,
        actionLabel: "Voir la conversation",
      });

      notificationsInserted = dispatchResult.inserted;
      emailsSent = dispatchResult.emailed;
    }
  }

  if (mentionRecipients.length > 0) {
    const mentionDispatch = await dispatchNotifications({
      recipients: mentionRecipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        fullName: recipient.full_name,
      })),
      title: `Mention · ${conversation?.title ?? "Canal dossier"}`,
      body: `${actor.fullName} t’a mentionné dans un message.`,
      category: "mention",
      requestId: conversation?.request_id ?? null,
      sendEmail: payload.sendEmail,
      actionPath: `/messages?conversation=${payload.conversationId}`,
      actionLabel: "Voir la mention",
    });

    notificationsInserted += mentionDispatch.inserted;
    emailsSent += mentionDispatch.emailed;
  }

  return NextResponse.json({
    mode: "live",
    actor,
    item: mapMessageRowToView(
      {
        ...(data as MessageRow),
        metadata: {
          ...((data as MessageRow).metadata ?? {}),
          sender_name: actor.username ?? actor.fullName,
          sender_role: actor.roleLabel,
          mentions: mentionLabels,
          read_count: 1,
        },
      },
      actor.id,
    ),
    notificationsInserted,
    emailsSent,
  });
}

function mapConversationMessages(
  rows: MessageRow[],
  actorId: string,
  profiles: ProfileRecipientRow[],
  mentions: Array<{ message_id: string; user_id: string }>,
  reads: Array<{ message_id: string; user_id: string }>,
) {
  const profileById = profiles.reduce<Record<string, ProfileRecipientRow>>(
    (accumulator, profile) => {
      accumulator[profile.id] = profile;
      return accumulator;
    },
    {},
  );
  const mentionsByMessage = groupBy(mentions, (item) => item.message_id);
  const readsByMessage = groupBy(reads, (item) => item.message_id);

  return rows.map((row) =>
    mapMessageRowToView(
      {
        ...row,
        metadata: {
          ...(row.metadata ?? {}),
          sender_name:
            row.kind === "system"
              ? "Workflow Engine"
              : deriveUserLabel(
                  row.sender_id ? profileById[row.sender_id] : null,
                  { compact: true },
                ),
          mentions: uniqueValues(
            (mentionsByMessage[row.id] ?? [])
              .map((mention) =>
                deriveUserLabel(profileById[mention.user_id], { compact: true }),
              )
              .filter(Boolean),
          ),
          read_count: (readsByMessage[row.id] ?? []).length,
        },
      },
      actorId,
    ),
  );
}

function resolveMentionRecipients(
  body: string,
  recipients: ProfileRecipientRow[],
) {
  const handles = uniqueValues(
    Array.from(body.matchAll(/(^|\s)@([a-z0-9._-]{2,50})/gi)).map((match) =>
      match[2].toLowerCase(),
    ),
  );

  if (handles.length === 0) {
    return [];
  }

  return recipients.filter((recipient) => {
    const handle =
      recipient.username?.toLowerCase() ??
      recipient.email?.split("@")[0]?.toLowerCase() ??
      null;

    return handle ? handles.includes(handle) : false;
  });
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {});
}

function uniqueValues<T>(items: T[]) {
  return Array.from(new Set(items));
}
