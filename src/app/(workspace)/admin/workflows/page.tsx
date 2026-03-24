import {
  Blocks,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { WorkflowBuilderStudio } from "@/components/admin/workflow-builder-studio";
import { PageHeader, PillLink, SummaryStat } from "@/components/workspace/ui";
import { getAdminControlTowerData } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminWorkflowBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const data = await getAdminControlTowerData();
  const resolvedSearchParams = await searchParams;
  const initialTemplateId =
    typeof resolvedSearchParams.template === "string"
      ? resolvedSearchParams.template
      : null;
  const activeTemplates = data.templates.filter((template) => template.isActive).length;
  const totalSteps = data.templates.reduce(
    (total, template) => total + template.steps.length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio workflow"
        title="Créer un flux d’approbation personnalisé"
        description="Un écran dédié pour composer tes circuits de validation, choisir les approbateurs et régler les SLA sans manipuler de champs techniques."
        actions={
          <>
            <PillLink href="/admin" label="Retour admin" />
            <PillLink href="/requests/new" label="Tester la création" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryStat
          label="Types exploitables"
          value={String(data.requestTypes.length)}
          icon={Blocks}
          detail="Catalogue actif"
        />
        <SummaryStat
          label="Flux actifs"
          value={String(activeTemplates)}
          icon={Sparkles}
          detail="Templates publiés"
        />
        <SummaryStat
          label="Étapes configurées"
          value={String(totalSteps)}
          icon={TimerReset}
          detail="Parcours disponibles"
        />
      </div>

      <WorkflowBuilderStudio data={data} initialTemplateId={initialTemplateId} />
    </div>
  );
}
