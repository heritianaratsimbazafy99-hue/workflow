import { BarChart3 } from "lucide-react";
import {
  PageHeader,
  PillLink,
  SectionTitle,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";
import { getReportsData } from "@/lib/reports/service";

export default async function ReportsPage() {
  const data = await getReportsData();

  if (!data.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Reporting"
          title="Pilotage, charge et goulots d’étranglement"
          description="Le reporting global est réservé aux managers et admins afin d’éviter l’exposition transversale des volumes et délais."
          actions={<PillLink href="/workspace" label="Retour pilotage" />}
        />

        <SurfaceCard>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
              Accès reporting restreint
            </h2>
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Demande un rôle `manager` ou `admin` dans `public.profiles` pour accéder
              aux exports et aux agrégats globaux.
            </p>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reporting"
        title="Pilotage, charge et goulots d’étranglement"
        description="Le reporting live consolide les volumes, les délais, les statuts et la charge approbateur. Un export CSV est disponible immédiatement."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/api/reports/export" label="Exporter CSV" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {data.metrics.map((metric) => (
          <SummaryStat
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={BarChart3}
            valueTitle={metric.detail}
            detail="Agrégat live"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard>
          <SectionTitle
            title="Répartition par statut"
            description="Vue synthétique du volume par état courant."
          />
          <div className="mt-5 space-y-3">
            {data.byStatus.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3"
              >
                <span className="text-sm text-[color:var(--foreground)]">{item.label}</span>
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Répartition par type"
            description="Distribution des demandes selon les familles métier."
          />
          <div className="mt-5 space-y-3">
            {data.byType.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3"
              >
                <span className="text-sm text-[color:var(--foreground)]">{item.label}</span>
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionTitle
          title="Charge approbateur"
          description="Repère rapidement les personnes saturées ou exposées à un retard."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.approverLoad.map((item) => (
            <div
              key={item.approver}
              className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
            >
              <p
                title={item.approver}
                className="truncate font-medium text-[color:var(--foreground)]"
              >
                {item.approver}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {item.pendingCount} en attente
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {item.overdueCount} hors SLA
              </p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
