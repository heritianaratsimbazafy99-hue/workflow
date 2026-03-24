import { Settings2 } from "lucide-react";
import { AdminControlTower } from "@/components/admin/admin-control-tower";
import { PageHeader, PillLink, SummaryStat } from "@/components/workspace/ui";
import { getAdminControlTowerData } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminControlTowerData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Administration ops et référentiel"
        description="Gère les rôles, les profils, la configuration email et les contrôles d’exploitation. La conception des types, formulaires et flux passe désormais par Workflow Studio."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/workflow-studio" label="Workflow Studio" />
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
          </>
        }
      />

      <div className="rounded-[26px] border border-[color:var(--line)] bg-white/80 px-5 py-4 text-sm text-[color:var(--foreground)]">
        <p className="font-medium">Nouveau studio workflow</p>
        <p className="mt-2 leading-6 text-[color:var(--muted)]">
          La création des types de demandes, des formulaires et des flux d’approbation passe désormais par un parcours unifié dans la sidebar : Workflow Studio.
        </p>
        <div className="mt-4">
          <PillLink href="/workflow-studio" label="Ouvrir Workflow Studio" tone="primary" />
        </div>
      </div>

      <div className="rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-5 py-4 text-sm text-[color:var(--foreground)]">
        <div className="flex items-center gap-2 font-medium">
          <Settings2 className="h-4 w-4" />
          Runtime {data.mode === "live" ? "Supabase live" : "Configuration requise"}
        </div>
        <p className="mt-2 leading-6 text-[color:var(--muted)]">
          Cet espace reste dédié au socle d’administration et aux opérations. La configuration métier des demandes a été déplacée dans Workflow Studio pour éviter les doublons.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat
          label="Profils"
          value={String(data.profiles.length)}
          icon={Settings2}
          detail="Comptes gérés"
        />
        <SummaryStat
          label="Types de demandes"
          value={String(data.requestTypes.length)}
          icon={Settings2}
          detail="Catalogue métier"
        />
        <SummaryStat
          label="Templates workflow"
          value={String(data.templates.length)}
          icon={Settings2}
          detail="Flux configurés"
        />
        <SummaryStat
          label="Alertes config email"
          value={String(data.ops.emailIssues.length + data.ops.emailWarnings.length)}
          icon={Settings2}
          detail="Points ops"
        />
      </div>

      <AdminControlTower data={data} />
    </div>
  );
}
