import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Command,
  FolderClock,
  LogOut,
  MessageSquareMore,
  RadioTower,
  Search,
  Workflow,
} from "lucide-react";
import { mapNotificationRowsToItems, type NotificationViewRow } from "@/lib/notifications/view";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { RealtimeNotifications } from "@/components/workspace/realtime-notifications";
import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { getLiveModeIssue, resolveRuntimeActor } from "@/lib/workflow/runtime";

export async function WorkspaceFrame({ children }: { children: ReactNode }) {
  const actor = await resolveRuntimeActor();
  const liveModeIssue = getLiveModeIssue(actor);

  if (liveModeIssue?.kind === "auth") {
    redirect("/login");
  }

  if (liveModeIssue) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[920px] items-center justify-center overflow-hidden border border-[color:var(--line)] bg-white/75 p-8 text-center shadow-[var(--shadow)] backdrop-blur lg:rounded-[36px]">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Runtime V1
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              Configuration applicative incomplète
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
              {liveModeIssue.message} La V1 interne fonctionne uniquement en mode live avec
              Supabase branché côté public et service role.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)]"
              >
                Retour à l’accueil
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const service = createSupabaseServiceRoleClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [
    approvalsResult,
    latestNotificationsResult,
    unreadNotificationsResult,
    unreadMessageNotificationsResult,
    remindersTodayResult,
    criticalRequestsResult,
  ] = await Promise.all([
    service
      .from("request_step_instances")
      .select("id", { head: true, count: "exact" })
      .eq("approver_id", actor.id)
      .eq("status", "pending"),
    service
      .from("notifications")
      .select("id, user_id, request_id, channel, category, title, body, read_at, created_at")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(8),
    service
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", actor.id)
      .is("read_at", null),
    service
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", actor.id)
      .is("read_at", null)
      .in("category", ["message", "mention"]),
    service
      .from("workflow_sla_events")
      .select("id", { head: true, count: "exact" })
      .eq("recipient_id", actor.id)
      .gte("created_at", startOfDay.toISOString()),
    service
      .from("requests")
      .select("id", { head: true, count: "exact" })
      .eq("priority", "critical")
      .in("status", ["submitted", "in_review", "needs_changes"])
      .or(`requester_id.eq.${actor.id},current_assignee_id.eq.${actor.id}`),
  ]);
  const headerNotifications = await mapNotificationRowsToItems(
    service,
    (latestNotificationsResult.data as NotificationViewRow[] | null) ?? [],
  );
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px] rounded-none lg:p-4">
        <div className="flex min-h-screen w-full overflow-hidden border border-[color:var(--line)] bg-white/65 shadow-[var(--shadow)] backdrop-blur lg:min-h-[calc(100vh-2rem)] lg:rounded-[34px]">
          <WorkspaceSidebar
            stats={{
              criticalRequests: criticalRequestsResult.count ?? 0,
              unreadMessages: unreadMessageNotificationsResult.count ?? 0,
              remindersToday: remindersTodayResult.count ?? 0,
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[color:var(--surface)]/95 px-4 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href="/workspace"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--surface-strong)] lg:hidden"
                  >
                    <Workflow className="h-5 w-5" />
                  </Link>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                      Espace applicatif
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--foreground)]">
                      {formattedDate}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Cockpit unique pour demandes, approvals, messages et relances.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-3 rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)] shadow-[0_8px_24px_rgba(19,33,31,0.05)]">
                    <Search className="h-4 w-4" />
                    Rechercher une demande, un message, un approbateur...
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-[20px] border border-[color:var(--line)] bg-white/80 px-3 py-3 text-sm">
                      <CalendarDays className="h-4 w-4 text-[color:var(--muted)]" />
                      Sprint MVP
                    </div>
                    <div className="flex items-center gap-2 rounded-[20px] border border-[color:var(--line)] bg-white/80 px-3 py-3 text-sm">
                      <Command className="h-4 w-4 text-[color:var(--muted)]" />
                      Interne
                    </div>
                    <RealtimeNotifications
                      currentUser={actor}
                      initialItems={headerNotifications}
                    />
                    <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--line)] bg-[color:var(--foreground)] px-4 py-3 text-[color:var(--surface-strong)] shadow-[0_10px_24px_rgba(19,33,31,0.12)]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                        {actor.fullName
                          .split(" ")
                          .map((segment) => segment[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p
                          title={actor.fullName}
                          className="max-w-[12rem] truncate text-sm font-medium"
                        >
                          {actor.fullName}
                        </p>
                        <p
                          title={actor.roleLabel}
                          className="max-w-[12rem] truncate text-xs text-white/65"
                        >
                          {actor.roleLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <form action="/auth/logout" method="post">
                        <button
                          type="submit"
                          className="inline-flex h-12 items-center gap-2 rounded-[20px] border border-[color:var(--line)] bg-white/85 px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[0_8px_24px_rgba(19,33,31,0.08)]"
                        >
                          <LogOut className="h-4 w-4" />
                          Déconnexion
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[24px] border border-[color:var(--line)] bg-white/78 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Approbations
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                        {approvalsResult.count ?? 0}
                      </p>
                    </div>
                    <FolderClock className="h-5 w-5 text-[color:var(--muted)]" />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    Dossiers chauds visibles dès l’ouverture.
                  </p>
                </div>
                <div className="rounded-[24px] border border-[color:var(--line)] bg-white/78 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Messagerie
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                        {unreadMessageNotificationsResult.count ?? 0}
                      </p>
                    </div>
                    <MessageSquareMore className="h-5 w-5 text-[color:var(--muted)]" />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    Notifications non lues et échanges dossiers.
                  </p>
                </div>
                <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Runtime
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                        Supabase connecté
                      </p>
                    </div>
                    <RadioTower className="h-5 w-5 text-[color:var(--brand)]" />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {unreadNotificationsResult.count ?? 0} notification(s) non lue(s), realtime front
                    actif, emails immédiats serveur et cron SLA branché.
                  </p>
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
