import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCheck,
  CircleAlert,
  FolderClock,
  MessageSquareMore,
} from "lucide-react";
import {
  approvalInbox,
  automationRules,
  auditTimeline,
  dashboardMetrics,
  requestDetails,
  requestTypes,
  workspaceAlerts,
} from "@/lib/workflow/mock-data";
import {
  DueBadge,
  PageHeader,
  PillLink,
  PriorityBadge,
  SectionTitle,
  StatusBadge,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";

export default function WorkspaceDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage central"
        title="Tableau de bord des demandes internes"
        description="Tu as ici le coeur opératoire du produit: demandes ouvertes, files d'approbation, alertes moteur, automatisations et conversations liées aux dossiers."
        actions={
          <>
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
            <PillLink href="/approvals" label="Voir les approvals" />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => {
          const Icon = [FolderClock, CheckCheck, BellRing, CircleAlert][index];

          return (
            <SummaryStat
              key={metric.label}
              label={`${metric.label} · ${metric.trend}`}
              value={metric.value}
              icon={Icon}
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
          <div className="space-y-3">
            {approvalInbox.map((item) => (
              <Link
                key={item.id}
                href={`/requests/${item.id}`}
                className="block rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[color:var(--muted)]">
                        {item.id}
                      </span>
                      <StatusBadge status={item.status} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-[color:var(--foreground)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        {item.typeName} · {item.department} · {item.requester}
                        {item.amount ? ` · ${item.amount}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 xl:items-end">
                    <DueBadge state={item.dueState} label={item.dueLabel} />
                    <span className="text-sm text-[color:var(--muted)]">
                      Étape: {item.currentStep}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Alertes moteur"
            description="Ce qui mérite ton attention immédiate côté SLA, charge et blocages."
          />
          <div className="space-y-3">
            {workspaceAlerts.map((alert) => (
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

          <div className="mt-6 rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
              Conversations en attente
            </p>
            <div className="mt-4 space-y-3">
              {requestDetails.slice(0, 3).map((request) => (
                <div
                  key={request.reference}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">
                      {request.title}
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {request.comments.length} commentaires · {request.participants.length} participants
                    </p>
                  </div>
                  <Link
                    href="/messages"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
                  >
                    <MessageSquareMore className="h-4 w-4" />
                    Ouvrir
                  </Link>
                </div>
              ))}
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
            {requestTypes.map((requestType) => (
              <div
                key={requestType.id}
                className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-medium text-[color:var(--foreground)]">
                    {requestType.name}
                  </p>
                  <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {requestType.department}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
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
            title="Automatisations et audit"
            description="Deux vues indispensables: les règles qui agissent et la preuve de ce qui s'est passé."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[color:var(--foreground)]">
                      {rule.name}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                        rule.status === "active"
                          ? "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                          : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {rule.trigger}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {rule.action}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {auditTimeline.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[color:var(--foreground)]">
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
          title="Base technique prête à brancher"
          description="Le repo est prêt pour la prochaine étape: connecter les pages à Supabase et remplacer progressivement les jeux de données mockés."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Migration SQL versionnée pour workflow, notifications et messagerie.",
            "Shell applicatif interne avec pages dédiées pilotage, approvals et messages.",
            "Cron sécurisé déjà exposé pour les relances et escalades.",
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
