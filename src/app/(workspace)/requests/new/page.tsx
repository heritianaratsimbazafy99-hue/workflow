import {
  FileStack,
  Paperclip,
  SendHorizonal,
} from "lucide-react";
import { RequestCreateForm } from "@/components/workspace/request-create-form";
import { getWorkflowCreationCatalog } from "@/lib/workflow/engine";
import {
  PageHeader,
  PillLink,
  SectionTitle,
  SurfaceCard,
} from "@/components/workspace/ui";

export default async function NewRequestPage() {
  const catalog = await getWorkflowCreationCatalog();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Création guidée"
        title="Nouvelle demande interne"
        description="Le formulaire crée maintenant une vraie demande workflow quand Supabase Auth et la base sont actifs. En mode démo, il reste testable sans casser le reste du produit."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/approvals" label="Voir les approvals" />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard>
          <SectionTitle
            title="Formulaire métier live"
            description="Type, priorité, montant, description et workflow appliqué. La création instancie les étapes et notifie le premier approbateur."
          />
          <RequestCreateForm
            mode={catalog.mode}
            requestTypes={catalog.requestTypes}
            templates={catalog.templates}
            formSectionsByRequestType={catalog.formSectionsByRequestType}
          />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <SectionTitle
              title="Effets automatiques"
              description="Ce que le moteur fait désormais au moment de la soumission."
            />
            <div className="space-y-3">
              {[
                {
                  icon: FileStack,
                  title: "Dossier + étapes",
                  detail:
                    "Création de `requests`, instanciation de `request_step_instances`, choix du template et activation de la première étape.",
                },
                {
                  icon: Paperclip,
                  title: "Historique",
                  detail:
                    "Insertion de commentaires système, journal d'audit et horodatage des décisions pour garder une vraie piste d'historique.",
                },
                {
                  icon: SendHorizonal,
                  title: "Notification du prochain approbateur",
                  detail:
                    "Alerte in-app + email immédiat côté serveur quand un approbateur est résolu.",
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
                      <div>
                        <p className="font-medium text-[color:var(--foreground)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Catalogue branché"
              description="Les types et templates affichés ici viennent désormais du moteur workflow quand le mode live est actif."
            />
            <div className="space-y-3">
              {catalog.requestTypes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-lg font-medium text-[color:var(--foreground)]">
                      {item.name}
                    </p>
                    <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {item.department}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {item.description}
                  </p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    SLA moyen {item.averageSlaHours} h
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
