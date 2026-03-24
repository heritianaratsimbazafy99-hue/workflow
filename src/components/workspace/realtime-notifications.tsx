"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { BellRing, CheckCheck, RadioTower } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import type { CurrentUser, NotificationItem } from "@/lib/workflow/types";

type RuntimeMode = "idle" | "live" | "connecting";

export function RealtimeNotifications({
  currentUser,
  initialItems,
}: {
  currentUser: CurrentUser;
  initialItems: NotificationItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("idle");
  const [unreadCount, setUnreadCount] = useState(
    initialItems.filter((item) => !item.isRead).length,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const hasUnreadItems = useMemo(() => unreadCount > 0, [unreadCount]);

  const loadInbox = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/notifications?limit=8", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        mode: "live";
        unreadCount?: number;
        items?: NotificationItem[];
      };

      setItems(Array.isArray(data.items) ? data.items : initialItems);
      setUnreadCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.items ?? initialItems).filter((item) => !item.isRead).length,
      );
      setRuntimeMode(data.mode);
    } catch {
      setRuntimeMode("idle");
    }
  });

  useEffect(() => {
    void loadInbox();
  }, [initialItems]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!hasPublicSupabaseEnv()) {
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
        setRuntimeMode((current) => (current === "live" ? current : "idle"));
        return;
      }

      const channel = supabase
        .channel(`notifications:${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadInbox();
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
  }, [currentUser.id]);

  async function markAllAsRead() {
    const ids = items.filter((item) => !item.isRead).map((item) => item.id);

    if (ids.length === 0) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
    } catch {
      return;
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative inline-flex h-12 items-center gap-3 rounded-[20px] border border-[color:var(--line)] bg-white/85 px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[0_8px_24px_rgba(19,33,31,0.08)]"
      >
        <BellRing className="h-4 w-4" />
        <span className="hidden sm:inline">Notifications</span>
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[color:var(--foreground)] px-2 py-1 text-xs text-[color:var(--surface-strong)]">
          {unreadCount}
        </span>
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Flux de notifications"
          className="absolute right-0 top-full z-50 mt-3 w-[min(26rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,250,245,0.98),rgba(255,255,255,0.98))] shadow-[0_24px_64px_rgba(19,33,31,0.18)]"
        >
          <div className="border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Centre live
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                  Flux de notifications
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  runtimeMode === "live"
                    ? "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                    : runtimeMode === "connecting"
                      ? "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]"
                      : "bg-white text-[color:var(--muted)]"
                }`}
              >
                <RadioTower className="h-3.5 w-3.5" />
                {runtimeMode === "live"
                  ? "Supabase live"
                  : runtimeMode === "connecting"
                    ? "Connexion"
                    : "Veille"}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-[22px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p
                  title={currentUser.fullName}
                  className="truncate font-medium text-[color:var(--foreground)]"
                >
                  {currentUser.fullName}
                </p>
                <p className="text-[color:var(--muted)]">{currentUser.roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={!hasUnreadItems}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2 font-medium text-[color:var(--foreground)] disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Tout lire
              </button>
            </div>
          </div>

          <div className="max-h-[min(60vh,30rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {items.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucune notification à afficher pour le moment.
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.requestReference ? `/requests/${item.requestReference}` : "/notifications"}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-[24px] border px-4 py-4 transition ${
                    item.isRead
                      ? "border-[color:var(--line)] bg-white"
                      : "border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!item.isRead ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--brand)]" />
                        ) : null}
                        <p
                          title={item.title}
                          className="line-clamp-2 text-sm font-semibold text-[color:var(--foreground)]"
                        >
                          {item.title}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-[color:var(--muted)]">
                      {item.createdAt}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm leading-6 text-[color:var(--muted)]">
                    {item.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    <span className="rounded-full border border-[color:var(--line)] bg-white/90 px-2.5 py-1">
                      {item.channel === "email" ? "Email" : "In-app"}
                    </span>
                    <span className="rounded-full border border-[color:var(--line)] bg-white/90 px-2.5 py-1">
                      {labelForNotificationCategory(item.category)}
                    </span>
                    {item.requestReference ? (
                      <span className="rounded-full border border-[color:var(--line)] bg-white/90 px-2.5 py-1 font-medium text-[color:var(--foreground)]">
                        {item.requestReference}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-[color:var(--line)] bg-white/88 px-4 py-3 sm:px-5">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex text-sm font-medium text-[color:var(--foreground)]"
            >
              Ouvrir le centre complet
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function labelForNotificationCategory(category: NotificationItem["category"]) {
  switch (category) {
    case "approval":
      return "Approval";
    case "message":
      return "Message";
    case "mention":
      return "Mention";
    case "sla":
      return "SLA";
    case "system":
      return "Système";
    case "digest":
      return "Digest";
    default:
      return "Général";
  }
}
