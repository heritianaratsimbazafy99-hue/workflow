"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useTransition,
  type ComponentType,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Mail,
  MessageSquareDot,
  RadioTower,
  Search,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import type {
  ConversationMessage,
  ConversationPreview,
  CurrentUser,
} from "@/lib/workflow/types";

type RuntimeMode = "demo" | "live" | "connecting";

type MessagesWorkspaceApiResponse = {
  mode: "demo" | "live";
  actor?: {
    id: string;
  };
  conversations?: ConversationPreview[];
  activeConversationId?: string | null;
  messages?: ConversationMessage[];
};

export function MessagesWorkspace({
  currentUser,
  initialConversations,
  initialActiveConversationId,
  initialMessages,
}: {
  currentUser: CurrentUser;
  initialConversations: ConversationPreview[];
  initialActiveConversationId: string | null;
  initialMessages: ConversationMessage[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(
    initialActiveConversationId ?? initialConversations[0]?.id ?? null,
  );
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ConversationMessage[]>
  >({
    ...(initialActiveConversationId ? { [initialActiveConversationId]: initialMessages } : {}),
  });
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("demo");
  const [runtimeActorId, setRuntimeActorId] = useState(currentUser.id);
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const [isPending, startTransition] = useTransition();

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[0];
  const activeConversationKey = activeConversation?.id ?? null;
  const messages = messagesByConversation[activeConversation?.id ?? ""] ?? [];

  const filteredConversations = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();

    if (!needle) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      [
        conversation.title,
        conversation.context,
        conversation.lastMessage,
        ...conversation.participants,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [conversations, deferredSearch]);

  const refreshWorkspace = useEffectEvent(async (conversationId: string | null) => {
    const query = conversationId
      ? `?conversation=${encodeURIComponent(conversationId)}`
      : "";

    try {
      const response = await fetch(`/api/messages/workspace${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as MessagesWorkspaceApiResponse;
      const nextConversations = Array.isArray(data.conversations)
        ? data.conversations
        : initialConversations;
      const nextActiveConversationId =
        data.activeConversationId ?? conversationId ?? nextConversations[0]?.id ?? null;

      setConversations(nextConversations);
      setActiveConversationId(nextActiveConversationId);

      if (nextActiveConversationId && Array.isArray(data.messages)) {
        setMessagesByConversation((current) => ({
          ...current,
          [nextActiveConversationId]: data.messages ?? [],
        }));
      }

      if (data.actor?.id) {
        setRuntimeActorId(data.actor.id);
      }

      setRuntimeMode(data.mode);
    } catch {
      setRuntimeMode("demo");
    }
  });

  useEffect(() => {
    if (!activeConversationKey) {
      return;
    }

    void refreshWorkspace(activeConversationKey);
  }, [activeConversationKey]);

  useEffect(() => {
    if (!hasPublicSupabaseEnv() || !activeConversationKey) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let isDisposed = false;

    async function connectRealtime() {
      setRuntimeMode((current) => (current === "live" ? current : "connecting"));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isDisposed) {
        setRuntimeMode((current) => (current === "live" ? current : "demo"));
        return;
      }

      const channel = supabase
        .channel(`messages:${activeConversationKey}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${activeConversationKey}`,
          },
          (payload) => {
            const incoming = mapRealtimeMessage(payload.new, runtimeActorId);
            applyIncomingMessage(
              incoming,
              activeConversationKey,
              setMessagesByConversation,
              setConversations,
            );
            void refreshWorkspace(activeConversationKey);
            setRuntimeMode("live");
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRuntimeMode("live");
          }
        });

      return channel;
    }

    const activeChannelPromise = connectRealtime();

    return () => {
      isDisposed = true;
      void activeChannelPromise.then((channel) => {
        if (channel) {
          void supabase.removeChannel(channel);
        }
      });
    };
  }, [activeConversationKey, runtimeActorId]);

  useEffect(() => {
    if (!hasPublicSupabaseEnv()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let isDisposed = false;

    async function connectNotificationBridge() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isDisposed) {
        return;
      }

      const channel = supabase
        .channel(`message-notifications:${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const category = payload.new.category;

            if (category === "message" || category === "mention") {
              void refreshWorkspace(activeConversationId ?? activeConversationKey);
              setRuntimeMode("live");
            }
          },
        )
        .subscribe();

      return channel;
    }

    const channelPromise = connectNotificationBridge();

    return () => {
      isDisposed = true;
      void channelPromise.then((channel) => {
        if (channel) {
          void supabase.removeChannel(channel);
        }
      });
    };
  }, [activeConversationId, activeConversationKey, currentUser.id]);

  function switchConversation(nextConversationId: string) {
    startTransition(() => {
      setActiveConversationId(nextConversationId);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === nextConversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      );
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = composer.trim();

    if (!body || !activeConversation) {
      return;
    }

    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: ConversationMessage = {
      id: optimisticId,
      conversationId: activeConversation.id,
      author: currentUser.fullName,
      body,
      createdAt: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      kind: "text",
      isOwn: true,
      mentionLabels: [],
      readCount: 1,
    };

    setComposer("");
    applyIncomingMessage(
      optimisticMessage,
      activeConversation.id,
      setMessagesByConversation,
      setConversations,
    );

    startTransition(() => {
      void sendMessage(body, optimisticId, activeConversation.id);
    });
  }

  async function sendMessage(
    body: string,
    optimisticId: string,
    conversationId: string,
  ) {
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          body,
          sendEmail,
        }),
      });

      if (!response.ok) {
        removeMessage(conversationId, optimisticId, setMessagesByConversation);
        setComposer(body);
        return;
      }

      const data = (await response.json()) as {
        mode: "demo" | "live";
        actor?: {
          id: string;
        };
        item?: ConversationMessage;
      };

      if (data.actor?.id) {
        setRuntimeActorId(data.actor.id);
      }
      setRuntimeMode(data.mode);

      if (data.item) {
        replaceMessage(
          conversationId,
          optimisticId,
          data.item,
          setMessagesByConversation,
          setConversations,
        );
      }
    } catch {
      removeMessage(conversationId, optimisticId, setMessagesByConversation);
      setComposer(body);
    }
  }

  if (!activeConversation) {
    return (
      <section className="rounded-[32px] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center shadow-[0_18px_50px_rgba(19,33,31,0.08)]">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Messagerie
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
          Aucun canal actif
        </h2>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Les conversations apparaîtront ici dès qu’une demande créera son canal
          dossier ou qu’un échange interne sera ouvert.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
      <aside className="space-y-4">
        <div className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_18px_50px_rgba(19,33,31,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Coordination
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                Hub conversations
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                runtimeMode === "live"
                  ? "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                  : runtimeMode === "connecting"
                    ? "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]"
                    : "bg-white/90 text-[color:var(--muted)]"
              }`}
            >
              <RadioTower className="h-3.5 w-3.5" />
              {runtimeMode === "live"
                ? "Supabase live"
                : runtimeMode === "connecting"
                  ? "Connexion"
                  : "Démo locale"}
            </span>
          </div>

          <div className="mt-4 rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-[color:var(--muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un canal, un dossier, un participant..."
                className="w-full bg-transparent text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <StatTile
              icon={MessageSquareDot}
              label="Canaux"
              value={String(conversations.length)}
              detail="Actifs"
            />
            <StatTile
              icon={Users}
              label="Participants"
              value={String(
                new Set(conversations.flatMap((conversation) => conversation.participants))
                  .size,
              )}
              detail="internes"
            />
            <StatTile
              icon={ShieldCheck}
              label="Non lus"
              value={String(
                conversations.reduce(
                  (total, conversation) => total + conversation.unreadCount,
                  0,
                ),
              )}
              detail="à absorber"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredConversations.map((conversation) => {
            const isActive = conversation.id === activeConversation.id;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => switchConversation(conversation.id)}
                className={`w-full rounded-[28px] border p-4 text-left shadow-[0_12px_34px_rgba(19,33,31,0.06)] ${
                  isActive
                    ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                    : "border-[color:var(--line)] bg-white/80 text-[color:var(--foreground)]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-base font-medium">{conversation.title}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      isActive
                        ? "bg-white/10 text-white/75"
                        : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                    }`}
                  >
                    {conversation.unreadCount}
                  </span>
                </div>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    isActive ? "text-white/72" : "text-[color:var(--muted)]"
                  }`}
                >
                  {conversation.context}
                </p>
                <p
                  className={`mt-4 text-sm ${
                    isActive ? "text-white/88" : "text-[color:var(--foreground)]"
                  }`}
                >
                  {conversation.lastMessage}
                </p>
                <div
                  className={`mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.16em] ${
                    isActive ? "text-white/55" : "text-[color:var(--muted)]"
                  }`}
                >
                  <span>{conversation.lastAt}</span>
                  <span>{conversation.tone}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-[760px] flex-col rounded-[32px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_18px_50px_rgba(19,33,31,0.08)]">
        <div className="border-b border-[color:var(--line)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Canal actif
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                {activeConversation.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
                {activeConversation.context}
              </p>
            </div>
            <div
              title={activeConversation.participants.join(" · ")}
              className="rounded-[24px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]"
            >
              <p className="max-w-full truncate">
                {activeConversation.participants.join(" · ")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[24px] border border-[color:var(--line)] bg-white/85 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
                <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
                Messagerie dossier + historique centralisé
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Chaque message reste attaché au workflow, au contexte métier et à la
                piste d’audit. Plus de dispersion entre email, chat et commentaire
                séparé.
              </p>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  Email immédiat
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                  Envoie aussi une notification email serveur aux autres membres du canal.
                </p>
              </div>
              <div
                className={`flex h-7 w-12 items-center rounded-full p-1 ${
                  sendEmail ? "bg-[color:var(--foreground)]" : "bg-white"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-[color:var(--surface-strong)] transition-transform ${
                    sendEmail ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <input
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                type="checkbox"
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-[26px] p-4 ${
                message.kind === "system"
                  ? "border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                  : message.isOwn
                    ? "ml-auto max-w-[90%] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                    : "max-w-[90%] border border-[color:var(--line)] bg-white/90"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="max-w-[65%] truncate font-medium" title={message.author}>
                  {message.author}
                </p>
                <span
                  className={`font-mono text-xs ${
                    message.isOwn && message.kind !== "system"
                      ? "text-white/62"
                      : "text-[color:var(--muted)]"
                  }`}
                >
                  {message.createdAt}
                </span>
              </div>
              <p
                className={`mt-2 text-sm leading-7 ${
                  message.isOwn && message.kind !== "system"
                    ? "text-white/88"
                    : "text-[color:var(--muted)]"
                }`}
              >
                {message.body}
              </p>
              {message.kind !== "system" &&
              (message.mentionLabels.length > 0 || message.readCount > 0) ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {message.mentionLabels.map((label) => (
                    <span
                      key={`${message.id}-${label}`}
                      className={`rounded-full px-2 py-1 ${
                        message.isOwn
                          ? "bg-white/10 text-white/72"
                          : "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]"
                      }`}
                    >
                      @{label}
                    </span>
                  ))}
                  <span
                    className={`rounded-full px-2 py-1 ${
                      message.isOwn
                        ? "bg-white/10 text-white/72"
                        : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                    }`}
                  >
                    Lu par {message.readCount}
                  </span>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-[color:var(--line)] px-5 py-5 sm:px-6"
        >
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/85 p-4 shadow-[0_12px_32px_rgba(19,33,31,0.06)]">
            <textarea
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              placeholder="Coordination terrain, précision budgétaire, décision rapide, mention d’un collègue..."
              rows={4}
              className="w-full resize-none bg-transparent text-sm leading-7 text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
            />
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
                <Mail className="h-4 w-4" />
                {sendEmail
                  ? "L’email immédiat est activé pour ce message."
                  : "Le message restera live dans l’app et journalisé dans le dossier."}
              </div>
              <button
                type="submit"
                disabled={isPending || composer.trim().length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <SendHorizonal className="h-4 w-4" />
                {isPending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[color:var(--muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[color:var(--muted)]" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {detail}
      </p>
    </div>
  );
}

function applyIncomingMessage(
  incoming: ConversationMessage,
  conversationId: string,
  setMessagesByConversation: Dispatch<
    SetStateAction<Record<string, ConversationMessage[]>>
  >,
  setConversations: Dispatch<SetStateAction<ConversationPreview[]>>,
) {
  setMessagesByConversation((current) => {
    const thread = current[conversationId] ?? [];
    const nextThread = thread.some((message) => message.id === incoming.id)
      ? thread.map((message) =>
          message.id === incoming.id ? incoming : message,
        )
      : [...thread, incoming];

    return {
      ...current,
      [conversationId]: nextThread,
    };
  });

  setConversations((current) =>
    current.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            lastMessage: incoming.body,
            lastAt: incoming.createdAt,
          }
        : conversation,
    ),
  );
}

function replaceMessage(
  conversationId: string,
  optimisticId: string,
  incoming: ConversationMessage,
  setMessagesByConversation: Dispatch<
    SetStateAction<Record<string, ConversationMessage[]>>
  >,
  setConversations: Dispatch<SetStateAction<ConversationPreview[]>>,
) {
  setMessagesByConversation((current) => {
    const thread = current[conversationId] ?? [];
    const withoutOptimistic = thread.filter((message) => message.id !== optimisticId);
    const nextThread = withoutOptimistic.some((message) => message.id === incoming.id)
      ? withoutOptimistic.map((message) =>
          message.id === incoming.id ? incoming : message,
        )
      : [...withoutOptimistic, incoming];

    return {
      ...current,
      [conversationId]: nextThread,
    };
  });

  setConversations((current) =>
    current.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            lastMessage: incoming.body,
            lastAt: incoming.createdAt,
          }
        : conversation,
    ),
  );
}

function removeMessage(
  conversationId: string,
  optimisticId: string,
  setMessagesByConversation: Dispatch<
    SetStateAction<Record<string, ConversationMessage[]>>
  >,
) {
  setMessagesByConversation((current) => ({
    ...current,
    [conversationId]: (current[conversationId] ?? []).filter(
      (message) => message.id !== optimisticId,
    ),
  }));
}

function mapRealtimeMessage(
  payload: Record<string, unknown>,
  actorId: string,
): ConversationMessage {
  const metadata =
    typeof payload.metadata === "object" && payload.metadata !== null
      ? (payload.metadata as Record<string, unknown>)
      : {};

  return {
    id: String(payload.id),
    conversationId: String(payload.conversation_id),
    author:
      typeof metadata.sender_name === "string"
        ? metadata.sender_name
        : payload.kind === "system"
          ? "Workflow Engine"
          : "Collaborateur",
    body: String(payload.body ?? ""),
    createdAt: formatClockValue(payload.created_at),
    kind: payload.kind === "system" ? "system" : "text",
    isOwn: payload.sender_id === actorId,
    mentionLabels: Array.isArray(metadata.mentions)
      ? metadata.mentions.filter((item): item is string => typeof item === "string")
      : [],
    readCount:
      typeof metadata.read_count === "number" && Number.isFinite(metadata.read_count)
        ? metadata.read_count
        : 0,
  };
}

function formatClockValue(value: unknown) {
  if (typeof value !== "string") {
    return "Maintenant";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
