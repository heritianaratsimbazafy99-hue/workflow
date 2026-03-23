import Link from "next/link";
import { AlertTriangle, Clock3, Filter, ShieldCheck } from "lucide-react";
import { getApprovalsInboxData } from "@/lib/workflow/engine";
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

export default async function ApprovalsPage() {
  const { items, history } = await getApprovalsInboxData();
  const overdueCount = items.filter((item) => item.dueState === "overdue").length;
  const criticalCount = items.filter((item) => item.priority === "critical").length;
  const pendingCount = items.filter(
    (item) => item.status === "submitted" || item.status === "in_review",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox approbateur"
        title="Traiter, relancer, escalader"
        description="Cette vue lit maintenant les vraies étapes en attente quand le mode live est actif et retombe sur le mock sinon."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryStat
          label="En attente immédiate"
          value={String(pendingCount)}
          icon={ShieldCheck}
        />
        <SummaryStat label="En retard" value={String(overdueCount)} icon={AlertTriangle} />
        <SummaryStat label="Critiques" value={String(criticalCount)} icon={Clock3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionTitle
            title="File unifiée"
            description="Chaque ligne reflète l’étape courante de la demande et le SLA associé."
          />
          <div className="mb-4 flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <Filter className="h-4 w-4" />
            Filtres suggérés: critique, budget supérieur à 10k, en retard, retour demandeur
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4"
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
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {item.typeName} · {item.department} · Demandeur {item.requester}
                        {item.amount ? ` · ${item.amount}` : ""}
                      </p>
                    </div>
                    <p className="text-sm text-[color:var(--foreground)]">
                      Étape courante: {item.currentStep}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <DueBadge state={item.dueState} label={item.dueLabel} />
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/requests/${item.id}`}
                        className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)]"
                      >
                        Ouvrir le dossier
                      </Link>
                      <Link
                        href="/messages"
                        className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)]"
                      >
                        Voir les échanges
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Journal approbations"
            description="Les événements récents de workflow utiles pour comprendre les blocages."
          />
          <div className="space-y-3">
            {history.map((event) => (
              <div
                key={event.id}
                className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-[color:var(--foreground)]">
                    {event.action}
                  </p>
                  <span className="font-mono text-xs text-[color:var(--muted)]">
                    {event.at}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{event.actor}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {event.detail}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
