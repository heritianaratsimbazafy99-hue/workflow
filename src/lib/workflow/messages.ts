import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  conversationMessages,
  conversationPreviews,
} from "@/lib/workflow/mock-data";
import {
  canUseSupabaseLiveMode,
  deriveUserLabel,
  mapMessageRowToView,
  resolveRuntimeActor,
  truncateText,
  type RuntimeActor,
  type RuntimeMode,
} from "@/lib/workflow/runtime";
import type {
  ConversationMessage,
  ConversationPreview,
} from "@/lib/workflow/types";

type ConversationRow = {
  id: string;
  type: "group" | "direct" | "request";
  request_id: string | null;
  title: string | null;
};

type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type MessageReadRow = {
  message_id: string;
  user_id: string;
};

type MessageMentionRow = {
  message_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
};

type RequestRow = {
  id: string;
  reference: string;
  title: string;
};

export type MessagesWorkspaceData = {
  mode: RuntimeMode;
  actor: RuntimeActor;
  conversations: ConversationPreview[];
  activeConversationId: string | null;
  messages: ConversationMessage[];
};

export async function getMessagesWorkspaceData(
  selectedConversationId?: string,
): Promise<MessagesWorkspaceData> {
  const actor = await resolveRuntimeActor();

  if (!canUseSupabaseLiveMode(actor)) {
    const activeConversation =
      conversationPreviews.find((conversation) => conversation.id === selectedConversationId) ??
      conversationPreviews[0] ??
      null;

    return {
      mode: "demo",
      actor,
      conversations: conversationPreviews,
      activeConversationId: activeConversation?.id ?? null,
      messages: activeConversation
        ? conversationMessages.filter(
            (message) => message.conversationId === activeConversation.id,
          )
        : [],
    };
  }

  const service = createSupabaseServiceRoleClient();

  const { data: membershipRows } = await service
    .from("conversation_members")
    .select("conversation_id, user_id")
    .eq("user_id", actor.id);

  const membershipData =
    (membershipRows as ConversationMemberRow[] | null) ?? [];
  const conversationIds = uniqueValues(
    membershipData.map((item) => item.conversation_id),
  );

  if (conversationIds.length === 0) {
    return {
      mode: "live",
      actor,
      conversations: [],
      activeConversationId: null,
      messages: [],
    };
  }

  const [
    conversationsResult,
    allMembershipsResult,
    messagesResult,
    profilesResult,
  ] = await Promise.all([
    service
      .from("conversations")
      .select("id, type, request_id, title")
      .in("id", conversationIds),
    service
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds),
    service
      .from("messages")
      .select("id, conversation_id, sender_id, kind, body, metadata, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true }),
    service
      .from("profiles")
      .select("id, email, full_name, display_name, username"),
  ]);

  const conversationRows =
    (conversationsResult.data as ConversationRow[] | null) ?? [];
  const allMemberships =
    (allMembershipsResult.data as ConversationMemberRow[] | null) ?? [];
  const messageRows = (messagesResult.data as MessageRow[] | null) ?? [];
  const profilesById = toMap(
    (profilesResult.data as ProfileRow[] | null) ?? [],
    (item) => item.id,
  );
  const messageIds = messageRows.map((item) => item.id);
  const requestIds = conversationRows
    .map((item) => item.request_id)
    .filter((item): item is string => Boolean(item));

  const [readsResult, mentionsResult, requestsResult] = await Promise.all([
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
    requestIds.length > 0
      ? service.from("requests").select("id, reference, title").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const readRows = (readsResult.data as MessageReadRow[] | null) ?? [];
  const mentionRows = (mentionsResult.data as MessageMentionRow[] | null) ?? [];
  const requestsById = toMap(
    (requestsResult.data as RequestRow[] | null) ?? [],
    (item) => item.id,
  );

  const membershipsByConversation = groupBy(
    allMemberships,
    (item) => item.conversation_id,
  );
  const messagesByConversation = groupBy(
    messageRows,
    (item) => item.conversation_id,
  );
  const readsByMessage = groupBy(readRows, (item) => item.message_id);
  const mentionsByMessage = groupBy(mentionRows, (item) => item.message_id);

  const conversations = conversationRows
    .map((conversation) => {
      const members = membershipsByConversation[conversation.id] ?? [];
      const participantLabels = uniqueValues(
        members
          .map((member) => deriveUserLabel(profilesById[member.user_id], { compact: true }))
          .filter(Boolean),
      );
      const conversationMessages = messagesByConversation[conversation.id] ?? [];
      const latestMessage = conversationMessages[conversationMessages.length - 1] ?? null;
      const unreadCount = conversationMessages.filter((message) => {
        if (message.sender_id === actor.id) {
          return false;
        }

        return !(readsByMessage[message.id] ?? []).some(
          (read) => read.user_id === actor.id,
        );
      }).length;

      const linkedRequest = conversation.request_id
        ? requestsById[conversation.request_id] ?? null
        : null;
      const fallbackTitle =
        linkedRequest?.reference && linkedRequest?.title
          ? `${linkedRequest.reference} · ${linkedRequest.title}`
          : participantLabels.join(" · ") || "Canal interne";

      return {
        id: conversation.id,
        title: conversation.title ?? truncateText(fallbackTitle, 56),
        context: linkedRequest
          ? `${linkedRequest.reference} · ${linkedRequest.title}`
          : participantLabels.join(" · ") || "Conversation interne",
        participants: participantLabels,
        unreadCount,
        lastMessage: latestMessage
          ? truncateText(latestMessage.body, 96)
          : "Aucun message pour le moment.",
        lastAt: latestMessage
          ? formatConversationClock(latestMessage.created_at)
          : "—",
        tone:
          conversation.request_id
            ? "request"
            : participantLabels.length <= 2
              ? "direct"
              : "ops",
        _lastTimestamp: latestMessage?.created_at ?? null,
      } satisfies ConversationPreview & { _lastTimestamp: string | null };
    })
    .sort((left, right) => {
      const leftValue = left._lastTimestamp
        ? new Date(left._lastTimestamp).getTime()
        : 0;
      const rightValue = right._lastTimestamp
        ? new Date(right._lastTimestamp).getTime()
        : 0;
      return rightValue - leftValue;
    })
    .map((item) => {
      const { _lastTimestamp, ...conversation } = item;
      void _lastTimestamp;
      return conversation;
    });

  const activeConversationId =
    conversations.find((conversation) => conversation.id === selectedConversationId)?.id ??
    conversations[0]?.id ??
    null;

  const messages = activeConversationId
    ? buildConversationMessages(
        messagesByConversation[activeConversationId] ?? [],
        actor.id,
        profilesById,
        mentionsByMessage,
        readsByMessage,
      )
    : [];

  return {
    mode: "live",
    actor,
    conversations,
    activeConversationId,
    messages,
  };
}

function buildConversationMessages(
  rows: MessageRow[],
  actorId: string,
  profilesById: Record<string, ProfileRow>,
  mentionsByMessage: Record<string, MessageMentionRow[]>,
  readsByMessage: Record<string, MessageReadRow[]>,
) {
  return rows.map((row) => {
    const sender = row.sender_id ? profilesById[row.sender_id] : null;
    const mentionLabels = uniqueValues(
      (mentionsByMessage[row.id] ?? [])
        .map((mention) => deriveUserLabel(profilesById[mention.user_id], { compact: true }))
        .filter(Boolean),
    );

    return mapMessageRowToView(
      {
        ...row,
        metadata: {
          ...(row.metadata ?? {}),
          sender_name:
            row.kind === "system"
              ? "Workflow Engine"
              : deriveUserLabel(sender, { compact: true }),
          mentions: mentionLabels,
          read_count: (readsByMessage[row.id] ?? []).length,
        },
      },
      actorId,
    );
  });
}
function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {});
}

function toMap<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[getKey(item)] = item;
    return accumulator;
  }, {});
}

function uniqueValues<T>(items: T[]) {
  return Array.from(new Set(items));
}

function formatConversationClock(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
