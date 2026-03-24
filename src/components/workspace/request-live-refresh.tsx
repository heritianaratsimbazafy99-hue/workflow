"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";

export function RequestLiveRefresh({
  requestId,
  conversationId,
}: {
  requestId: string;
  conversationId: string | null;
}) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useEffectEvent(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Debounce refreshes when several workflow tables emit during the same action.
    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
      refreshTimerRef.current = null;
    }, 180);
  });

  useEffect(() => {
    if (!hasPublicSupabaseEnv()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let isDisposed = false;

    async function connectRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isDisposed) {
        return;
      }

      const channel = supabase
        .channel(`request-live:${requestId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "requests",
            filter: `id=eq.${requestId}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "request_step_instances",
            filter: `request_id=eq.${requestId}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "request_comments",
            filter: `request_id=eq.${requestId}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "request_attachments",
            filter: `request_id=eq.${requestId}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workflow_sla_events",
            filter: `request_id=eq.${requestId}`,
          },
          scheduleRefresh,
        );

      if (conversationId) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          scheduleRefresh,
        );
      }

      await channel.subscribe();
      return channel;
    }

    const channelPromise = connectRealtime();

    return () => {
      isDisposed = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      void channelPromise.then((channel) => {
        if (channel) {
          void supabase.removeChannel(channel);
        }
      });
    };
  }, [conversationId, requestId, router]);

  return null;
}
