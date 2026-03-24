import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCheck,
  CircleAlert,
  FolderClock,
  Mail,
  TimerReset,
  Workflow,
} from "lucide-react";
import {
  DueBadge,
  LabeledValue,
  PageHeader,
  PillLink,
  PriorityBadge,
  SectionTitle,
  StatusBadge,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";
import { getWorkspaceDashboardData } from "@/lib/workflow/engine";

export default async function WorkspaceDashboardPage() {
  const dashboard = await getWorkspaceDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage central"
        title="Tableau de bord des demandes internes"
        description="Tu as ici le coeur opératoire du produit: demandes ouvertes, files d'approbation, alertes moteur et journal live."
        actions={
          <>
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
            <PillLink href="/approvals" label="Voir les approvals" />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        {dashboard.metrics.map((metric, index) => {
          const Icon = [FolderClock, CheckCheck, BellRing, CircleAlert][index];

          return (
            <SummaryStat
              key={metric.label}
              label={`${metric.label} · ${metric.trend}`}
              value={metric.value}
              icon={Icon}
              detail="Vue instantanée"
            />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <SurfaceCard>
          <SectionTitle
            title="Demandes à suivre maintenant"
            description="Les lignes prioritaires du moment, prêtes à être ouvertes ou traitées."
            actionHref="/approvals"
            actionLabel="Ouvrir l'inbox"
          />
          {dashboard.items.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-5 text-sm leading-6 text-[color:var(--muted)]">
              Aucune approbation active pour le moment. Le cockpit est bien branché, mais
              ta file personnelle est vide.
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/requests/${item.id}`}
                  className="group block rounded-[24px] border border-[color:var(--line)] bg-white/82 p-5 shadow-[0_10px_28px_rgba(19,33,31,0.04)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[color:var(--muted)]">
                          {item.id}
                        </span>
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <div>
                        <p
                          title={item.title}
                          className="line-clamp-2 text-lg font-medium text-[color:var(--foreground)]"
                        >
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                          {item.typeName} · {item.department} ·{" "}
                          <span title={item.requester}>{item.requester}</span>
                          {item.amount ? ` · ${item.amount}` : ""}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <LabeledValue label="Demandeur" value={item.requester} />
                        <LabeledValue label="Type" value={item.typeName} />
                        <LabeledValue label="Étape active" value={item.currentStep} />
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 xl:items-end">
                      <DueBadge state={item.dueState} label={item.dueLabel} />
                      <span className="text-sm text-[color:var(--muted)]">
                        Étape: {item.currentStep}
                      </span>
                      <span className="text-sm font-medium text-[color:var(--foreground)]">
                        Ouvrir le dossier
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Alertes moteur"
            description="Ce qui mérite ton attention immédiate côté SLA, charge et blocages."
          />
          {dashboard.alerts.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-5 text-sm leading-6 text-[color:var(--muted)]">
              Aucun signal urgent. Le moteur ne remonte actuellement ni SLA en retard
              ni surcharge approbateur notable.
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-[22px] border p-4 ${
                    alert.tone === "critical"
                      ? "border-[#f3b7a8] bg-[#fff1ed]"
                      : alert.tone === "warning"
                        ? "border-[#eadcb7] bg-[#fff8e7]"
                        : "border-[#bfe2d6] bg-[#eefaf5]"
                  }`}
                >
                  <p className="text-base font-medium text-[color:var(--foreground)]">
                    {alert.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {alert.detail}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Journal récent
            </p>
            <div className="mt-4 space-y-3">
              {dashboard.history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4 text-sm text-[color:var(--muted)]">
                  Aucune activité récente à afficher pour le moment.
                </div>
              ) : (
                dashboard.history.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3"
                  >
                    <div>
                      <p
                        title={`${event.actor} · ${event.action}`}
                        className="line-clamp-2 font-medium text-[color:var(--foreground)]"
                      >
                        {event.actor} · {event.action}
                      </p>
                      <p className="text-sm text-[color:var(--muted)]">{event.detail}</p>
                    </div>
                    <span className="font-mono text-xs text-[color:var(--muted)]">
                      {event.at}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard>
          <SectionTitle
            title="Catalogue de demandes"
            description="Les premiers modules métier prêts à être activés et adaptés."
            actionHref="/requests/new"
            actionLabel="Créer une demande"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.requestTypes.map((requestType) => (
              <div
                key={requestType.id}
                className="rounded-[22px] border border-[color:var(--line)] bg-white/82 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p
                    title={requestType.name}
                    className="line-clamp-2 text-lg font-medium text-[color:var(--foreground)]"
                  >
                    {requestType.name}
                  </p>
                  <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {requestType.department}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--muted)]">
                  {requestType.description}
                </p>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  SLA moyen {requestType.averageSlaHours} h
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Chaîne opératoire active"
            description="Les briques V1 qui font vivre le produit en production, sans écran temporaire ni fallback utilisateur."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {[
                {
                  icon: Workflow,
                  title: "Workflow personnalisé",
                  detail:
                    "Les types de demandes, sections dynamiques et templates d'approbation se configurent depuis l'admin et alimentent directement la création de dossier.",
                  href: "/admin",
                  action: "Ouvrir l’admin",
                },
                {
                  icon: Mail,
                  title: "Notifications et emails",
                  detail:
                    "Chaque approbation, mention ou message peut déclencher une notification in-app et un email transactionnel immédiat côté serveur.",
                  href: "/notifications",
                  action: "Voir les notifications",
                },
                {
                  icon: TimerReset,
                  title: "SLA et relances",
                  detail:
                    "Le scheduler externe appelle le moteur de relance, journalise les runs et pousse les escalades métier sans intervention manuelle.",
                  href: "/reports",
                  action: "Consulter les rapports",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--surface-strong)]">
                        <Icon className="h-4 w-4 text-[color:var(--foreground)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[color:var(--foreground)]">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                          {item.detail}
                        </p>
                        <Link
                          href={item.href}
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
                        >
                          {item.action}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {dashboard.history.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p
                      title={`${event.actor} · ${event.action}`}
                      className="line-clamp-2 font-medium text-[color:var(--foreground)]"
                    >
                      {event.actor} · {event.action}
                    </p>
                    <span className="font-mono text-xs text-[color:var(--muted)]">
                      {event.at}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {event.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionTitle
          title="Base technique live"
          description="Le cockpit, les approvals, la messagerie, les emails transactionnels et l'endpoint cron SLA sont maintenant prêts dans le produit."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Migration SQL versionnée pour workflow, notifications, audit et messagerie.",
            "Cockpit live branché à Supabase pour demandes, approvals et journal.",
            "Endpoint cron prêt pour scheduler externe avec journalisation des runs.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4 text-sm leading-6 text-[color:var(--foreground)]"
            >
              {item}
            </div>
          ))}
        </div>
        <Link
          href="/messages"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
        >
          Explorer la messagerie de dossier
          <ArrowRight className="h-4 w-4" />
        </Link>
      </SurfaceCard>
    </div>
  );
}
