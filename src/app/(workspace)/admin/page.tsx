import { Settings2 } from "lucide-react";
import { AdminControlTower } from "@/components/admin/admin-control-tower";
import { PageHeader, PillLink } from "@/components/workspace/ui";
import { getAdminControlTowerData } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminControlTowerData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Contrôle des workflows et du référentiel"
        description="Gère les rôles, les types de demandes, les champs dynamiques et les templates sans repasser par le SQL pour chaque ajustement."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
          </>
        }
      />

      <div className="rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-5 py-4 text-sm text-[color:var(--foreground)]">
        <div className="flex items-center gap-2 font-medium">
          <Settings2 className="h-4 w-4" />
          Runtime {data.mode === "live" ? "Supabase live" : "démo"}
        </div>
        <p className="mt-2 leading-6 text-[color:var(--muted)]">
          Cet espace couvre les lots 4 à 6 du plan: administration socle, builder
          workflow v1 et formulaires dynamiques v1.
        </p>
      </div>

      <AdminControlTower data={data} />
    </div>
  );
}
