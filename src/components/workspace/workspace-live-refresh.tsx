"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPublicSupabaseEnv } from "@/lib/supabase/config";

export function WorkspaceLiveRefresh({ actorId }: { actorId: string }) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useEffectEvent(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
      refreshTimerRef.current = null;
    }, 220);
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
        .channel(`workspace-live:${actorId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "request_step_instances",
            filter: `approver_id=eq.${user.id}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workflow_sla_events",
            filter: `recipient_id=eq.${user.id}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "requests",
            filter: `requester_id=eq.${user.id}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "requests",
            filter: `current_assignee_id=eq.${user.id}`,
          },
          scheduleRefresh,
        )
        .subscribe();

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
  }, [actorId, router]);

  return null;
}
