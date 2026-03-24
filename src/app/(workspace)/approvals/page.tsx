import Link from "next/link";
import { AlertTriangle, Clock3, Filter, ShieldCheck } from "lucide-react";
import { getApprovalsInboxData } from "@/lib/workflow/engine";
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
          detail="Demandes à traiter"
        />
        <SummaryStat
          label="En retard"
          value={String(overdueCount)}
          icon={AlertTriangle}
          detail="SLA dépassés"
        />
        <SummaryStat
          label="Critiques"
          value={String(criticalCount)}
          icon={Clock3}
          detail="Priorité haute"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionTitle
            title="File unifiée"
            description="Chaque ligne reflète l’étape courante de la demande et le SLA associé."
          />
          <div className="mb-4 flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <Filter className="h-4 w-4" />
            <div className="flex flex-wrap gap-2">
              {["Critique", "Montant > 10k", "Hors SLA", "Retour demandeur"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--line)] bg-white/78 px-3 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          {items.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/76 p-5 text-sm leading-6 text-[color:var(--muted)]">
              Ta file d’approbation est vide. Les prochaines étapes actives remonteront ici
              automatiquement.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-[color:var(--line)] bg-white/82 p-5 shadow-[0_10px_28px_rgba(19,33,31,0.04)]"
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
                        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                          {item.typeName} · {item.department} · Demandeur{" "}
                          <span title={item.requester}>{item.requester}</span>
                          {item.amount ? ` · ${item.amount}` : ""}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <LabeledValue label="Demandeur" value={item.requester} />
                        <LabeledValue label="Étape courante" value={item.currentStep} />
                        <LabeledValue label="Département" value={item.department} />
                      </div>
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
          )}
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
                  <p
                    title={event.action}
                    className="line-clamp-2 font-medium text-[color:var(--foreground)]"
                  >
                    {event.action}
                  </p>
                  <span className="font-mono text-xs text-[color:var(--muted)]">
                    {event.at}
                  </span>
                </div>
                <p
                  title={event.actor}
                  className="mt-1 truncate text-sm text-[color:var(--muted)]"
                >
                  {event.actor}
                </p>
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
