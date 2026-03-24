import { Blocks, LayoutTemplate, Sparkles, TimerReset } from "lucide-react";
import { RequestTypeStudio } from "@/components/admin/request-type-studio";
import { WorkflowBuilderStudio } from "@/components/admin/workflow-builder-studio";
import { PageHeader, PillLink, SummaryStat } from "@/components/workspace/ui";
import { getAdminControlTowerData } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function WorkflowStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; requestType?: string }>;
}) {
  const data = await getAdminControlTowerData();
  const resolvedSearchParams = await searchParams;
  const initialTemplateId =
    typeof resolvedSearchParams.template === "string"
      ? resolvedSearchParams.template
      : null;
  const initialRequestTypeId =
    typeof resolvedSearchParams.requestType === "string"
      ? resolvedSearchParams.requestType
      : null;
  const activeTemplates = data.templates.filter((template) => template.isActive).length;
  const totalSteps = data.templates.reduce((total, template) => total + template.steps.length, 0);
  const totalFields = data.requestTypes.reduce(
    (total, requestType) =>
      total +
      requestType.formSections.reduce((sectionTotal, section) => sectionTotal + section.fields.length, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow Studio"
        title="Configurer un type, son formulaire et son circuit d’approbation"
        description="Parcours unifié pour créer les types de demandes, composer les champs visibles dans le formulaire et brancher le flux d’approbation sans naviguer entre plusieurs écrans."
        actions={
          <>
            <PillLink href="/admin" label="Retour admin" />
            <PillLink href="/requests/new" label="Tester la création" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryStat
          label="Types configurés"
          value={String(data.requestTypes.length)}
          icon={Blocks}
          detail="catalogue métier"
        />
        <SummaryStat
          label="Champs actifs"
          value={String(totalFields)}
          icon={Sparkles}
          detail="dans les formulaires"
        />
        <SummaryStat
          label="Flux actifs"
          value={String(activeTemplates)}
          icon={LayoutTemplate}
          detail="workflows publiés"
        />
        <SummaryStat
          label="Étapes configurées"
          value={String(totalSteps)}
          icon={TimerReset}
          detail="parcours disponibles"
        />
      </div>

      <div className="rounded-[28px] border border-[color:var(--line)] bg-white/82 px-5 py-4 text-sm leading-6 text-[color:var(--foreground)]">
        <p className="font-medium">Parcours unifié</p>
        <p className="mt-2 text-[color:var(--muted)]">
          1. Crée ou sélectionne un type de demande.
          2. Compose le formulaire métier sans toucher aux clés techniques.
          3. Branche le circuit d’approbation du même type juste en dessous.
        </p>
      </div>

      <RequestTypeStudio
        key={`request-type-studio:${initialRequestTypeId ?? "default"}`}
        data={data}
        initialRequestTypeId={initialRequestTypeId}
      />
      <WorkflowBuilderStudio
        key={`workflow-builder:${initialRequestTypeId ?? "default"}:${initialTemplateId ?? "default"}`}
        data={data}
        initialTemplateId={initialTemplateId}
        initialRequestTypeId={initialRequestTypeId}
      />
    </div>
  );
}
