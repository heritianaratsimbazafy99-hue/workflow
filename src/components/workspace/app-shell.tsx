import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Command,
  FolderClock,
  LogIn,
  LogOut,
  MessageSquareMore,
  RadioTower,
  Search,
  Workflow,
} from "lucide-react";
import { RealtimeNotifications } from "@/components/workspace/realtime-notifications";
import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";
import {
  approvalInbox,
  notificationInbox,
} from "@/lib/workflow/mock-data";

export async function WorkspaceFrame({ children }: { children: ReactNode }) {
  const actor = await resolveRuntimeActor();
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
          <WorkspaceSidebar />
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
                      initialItems={notificationInbox}
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
                      {actor.mode === "live" ? (
                        <form action="/auth/logout" method="post">
                          <button
                            type="submit"
                            className="inline-flex h-12 items-center gap-2 rounded-[20px] border border-[color:var(--line)] bg-white/85 px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[0_8px_24px_rgba(19,33,31,0.08)]"
                          >
                            <LogOut className="h-4 w-4" />
                            Déconnexion
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/login"
                          className="inline-flex h-12 items-center gap-2 rounded-[20px] border border-[color:var(--line)] bg-white/85 px-4 text-sm font-medium text-[color:var(--foreground)] shadow-[0_8px_24px_rgba(19,33,31,0.08)]"
                        >
                          <LogIn className="h-4 w-4" />
                          Connexion live
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {actor.mode === "demo" ? (
                <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-[color:var(--brand)]/25 bg-[color:var(--brand-soft)] px-4 py-4 text-sm text-[color:var(--foreground)] md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Mode démo actif</p>
                    <p className="mt-1 text-[color:var(--muted)]">
                      Connecte un utilisateur Supabase pour créer de vraies demandes, agir
                      sur les approbations et recevoir les notifications live.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-[18px] bg-[color:var(--foreground)] px-4 text-sm font-medium text-[color:var(--surface-strong)]"
                  >
                    Ouvrir la connexion
                  </Link>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[24px] border border-[color:var(--line)] bg-white/78 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Approbations
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                        {approvalInbox.length}
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
                        {notificationInbox.filter((item) => !item.isRead).length}
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
                        {actor.mode === "live" ? "Supabase connecté" : "Live-ready"}
                      </p>
                    </div>
                    <RadioTower className="h-5 w-5 text-[color:var(--brand)]" />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    Realtime front, emails immédiats serveur et cron séparé pour les SLA.
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
