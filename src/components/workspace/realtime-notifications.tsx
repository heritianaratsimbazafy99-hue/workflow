"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { BellRing, CheckCheck, RadioTower } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";
import type { CurrentUser, NotificationItem } from "@/lib/workflow/types";

type RuntimeMode = "demo" | "live" | "connecting";

export function RealtimeNotifications({
  currentUser,
  initialItems,
}: {
  currentUser: CurrentUser;
  initialItems: NotificationItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("demo");
  const [unreadCount, setUnreadCount] = useState(
    initialItems.filter((item) => !item.isRead).length,
  );

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
        mode: "demo" | "live";
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
      setRuntimeMode("demo");
    }
  });

  useEffect(() => {
    void loadInbox();
  }, [initialItems]);

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
        setRuntimeMode((current) => (current === "live" ? current : "demo"));
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
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-12 items-center gap-3 rounded-[20px] border border-[color:var(--line)] bg-white/85 px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[0_8px_24px_rgba(19,33,31,0.08)]"
      >
        <BellRing className="h-4 w-4" />
        <span className="hidden sm:inline">Notifications</span>
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[color:var(--foreground)] px-2 py-1 text-xs text-[color:var(--surface-strong)]">
          {unreadCount}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-3 w-[360px] rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Centre live
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                Flux de notifications
              </p>
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

          <div className="mt-4 flex items-center justify-between rounded-[22px] border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm">
            <p className="text-[color:var(--muted)]">
              {currentUser.fullName} · {currentUser.roleLabel}
            </p>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!hasUnreadItems}
              className="inline-flex items-center gap-2 font-medium text-[color:var(--foreground)]"
            >
              <CheckCheck className="h-4 w-4" />
              Tout lire
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/65 p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucune notification à afficher pour le moment.
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.requestReference ? `/requests/${item.requestReference}` : "/notifications"}
                  className={`rounded-[24px] border p-4 ${
                    item.isRead
                      ? "border-[color:var(--line)] bg-white/70"
                      : "border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[color:var(--foreground)]">
                      {item.title}
                    </p>
                    <span className="font-mono text-xs text-[color:var(--muted)]">
                      {item.createdAt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {item.body}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    <span>{item.channel === "email" ? "Email" : "In-app"}</span>
                    <span>· {labelForNotificationCategory(item.category)}</span>
                    {item.requestReference ? <span>· {item.requestReference}</span> : null}
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            className="mt-4 inline-flex text-sm font-medium text-[color:var(--foreground)]"
          >
            Ouvrir le centre complet
          </Link>
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
