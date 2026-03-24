"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Blocks,
  BriefcaseBusiness,
  CircleArrowRight,
  Plus,
  ShieldUser,
  Sparkles,
  TimerReset,
  UserRound,
  Waypoints,
} from "lucide-react";
import type {
  AdminControlTowerData,
  AdminDepartment,
  AdminProfile,
  AdminWorkflowStep,
  AdminWorkflowTemplate,
} from "@/lib/admin/service";
import { LabeledValue, SectionTitle, SurfaceCard } from "@/components/workspace/ui";

type WorkflowBuilderStudioProps = {
  data: AdminControlTowerData;
  initialTemplateId?: string | null;
  initialRequestTypeId?: string | null;
};

type StepDraft = {
  stepOrder: number;
  name: string;
  kind: AdminWorkflowStep["kind"];
  approverMode: AdminWorkflowStep["approverMode"];
  approverUserId: string;
  approverDepartmentId: string;
  slaHours: number;
  minApprovals: number;
  conditionMode: "always" | "min_amount" | "priority_high";
  minAmount: string;
};

export function WorkflowBuilderStudio({
  data,
  initialTemplateId = null,
  initialRequestTypeId = null,
}: WorkflowBuilderStudioProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  const requestTypeById = useMemo(
    () =>
      data.requestTypes.reduce<Record<string, AdminControlTowerData["requestTypes"][number]>>(
        (accumulator, requestType) => {
          accumulator[requestType.id] = requestType;
          return accumulator;
        },
        {},
      ),
    [data.requestTypes],
  );
  const initialSelectedTemplate =
    data.templates.find((template) => template.id === initialTemplateId) ??
    (initialRequestTypeId
      ? data.templates.find((template) => template.requestTypeId === initialRequestTypeId)
      : null) ??
    data.templates[0] ??
    null;
  const [internalSelectedRequestTypeId, setInternalSelectedRequestTypeId] = useState(
    initialSelectedTemplate?.requestTypeId ?? initialRequestTypeId ?? data.requestTypes[0]?.id ?? "",
  );
  const [internalSelectedTemplateId, setInternalSelectedTemplateId] = useState<string | null>(
    initialSelectedTemplate?.id ?? null,
  );
  const selectedRequestTypeId =
    initialRequestTypeId ?? internalSelectedRequestTypeId;
  const selectedTemplateId =
    initialTemplateId ?? internalSelectedTemplateId;
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!selectedRequestTypeId) {
      return data.templates;
    }

    return data.templates.filter((template) => template.requestTypeId === selectedRequestTypeId);
  }, [data.templates, selectedRequestTypeId]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ??
    filteredTemplates[0] ??
    null;
  const selectedRequestType =
    data.requestTypes.find((requestType) => requestType.id === selectedRequestTypeId) ?? null;

  const [newStepDraft, setNewStepDraft] = useState<StepDraft>(() =>
    createEmptyStepDraft(
      (initialSelectedTemplate?.steps.length ?? 0) + 1,
      requestTypeById[initialSelectedTemplate?.requestTypeId ?? ""]?.departmentId ?? null,
    ),
  );

  if (!data.canManage) {
    return (
      <SurfaceCard>
        <SectionTitle
          title="Accès admin requis"
          description="Le studio workflow est réservé aux administrateurs applicatifs."
        />
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          Attribue le rôle `admin` dans `public.profiles` pour créer ou ajuster les flux.
        </p>
      </SurfaceCard>
    );
  }

  function replaceStudioParams(next: {
    requestTypeId?: string | null;
    templateId?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.requestTypeId) {
      params.set("requestType", next.requestTypeId);
    } else {
      params.delete("requestType");
    }

    if (next.templateId) {
      params.set("template", next.templateId);
    } else {
      params.delete("template");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectTemplate(templateId: string | null) {
    setInternalSelectedTemplateId(templateId);
    const template = data.templates.find((item) => item.id === templateId) ?? null;
    const requestTypeId = template?.requestTypeId ?? selectedRequestTypeId;

    if (requestTypeId) {
      setInternalSelectedRequestTypeId(requestTypeId);
    }

    setNewStepDraft((current) => ({
      ...current,
      stepOrder: (template?.steps.length ?? 0) + 1,
      approverDepartmentId:
        current.approverMode === "department_role"
          ? current.approverDepartmentId ||
            requestTypeById[requestTypeId]?.departmentId ||
            ""
          : current.approverDepartmentId,
    }));
    replaceStudioParams({
      requestTypeId,
      templateId,
    });
  }

  function handleSelectRequestType(nextRequestTypeId: string) {
    setInternalSelectedRequestTypeId(nextRequestTypeId);
    const firstMatchingTemplate =
      data.templates.find((template) => template.requestTypeId === nextRequestTypeId) ?? null;
    setInternalSelectedTemplateId(firstMatchingTemplate?.id ?? null);
    setNewStepDraft(
      createEmptyStepDraft(
        (firstMatchingTemplate?.steps.length ?? 0) + 1,
        requestTypeById[nextRequestTypeId]?.departmentId ?? null,
      ),
    );

    replaceStudioParams({
      requestTypeId: nextRequestTypeId,
      templateId: firstMatchingTemplate?.id ?? null,
    });
  }

  function handleAsync(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  async function handleCreateTemplate() {
    if (!selectedRequestTypeId) {
      setFeedbackTone("error");
      setFeedback("Choisis d’abord un type de demande.");
      return;
    }

    const requestType = requestTypeById[selectedRequestTypeId];
    const trimmedName = newTemplateName.trim();

    if (!requestType || trimmedName.length < 2) {
      setFeedbackTone("error");
      setFeedback("Renseigne au minimum le nom du flux.");
      return;
    }

    const response = await fetch("/api/admin/workflow-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: createTemplateCode(trimmedName, requestType.code, data.templates),
        name: trimmedName,
        description:
          newTemplateDescription.trim() || `Flux ${trimmedName} pour ${requestType.name}.`,
        requestTypeId: requestType.id,
        version: 1,
        isActive: true,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      templateId?: string;
    };

    if (!response.ok || !payload.templateId) {
      setFeedbackTone("error");
      setFeedback(payload.error ?? "Impossible de créer le flux.");
      return;
    }

    setFeedbackTone("success");
    setFeedback("Flux créé. Tu peux maintenant composer ses étapes.");
    setNewTemplateName("");
    setNewTemplateDescription("");
    setInternalSelectedRequestTypeId(requestType.id);
    selectTemplate(payload.templateId);
    router.refresh();
  }

  async function handleAddStep() {
    if (!selectedTemplate) {
      setFeedbackTone("error");
      setFeedback("Crée ou sélectionne d’abord un flux.");
      return;
    }

    const payload = buildStepPayload(newStepDraft);

    if (!payload.name) {
      setFeedbackTone("error");
      setFeedback("Donne un intitulé à l’étape.");
      return;
    }

    if (payload.approverMode === "user" && !payload.approverUserId) {
      setFeedbackTone("error");
      setFeedback("Choisis l’approbateur ciblé.");
      return;
    }

    if (payload.approverMode === "department_role" && !payload.approverDepartmentId) {
      setFeedbackTone("error");
      setFeedback("Choisis le département à couvrir.");
      return;
    }

    const response = await fetch(`/api/admin/workflow-templates/${selectedTemplate.id}/steps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setFeedbackTone("error");
      setFeedback(result.error ?? "Impossible d’ajouter l’étape.");
      return;
    }

    setFeedbackTone("success");
    setFeedback("Étape ajoutée au flux.");
    setNewStepDraft(
      createEmptyStepDraft(
        newStepDraft.stepOrder + 1,
        selectedRequestType?.departmentId ?? null,
      ),
    );
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <SurfaceCard>
          <SectionTitle
            title="3. Nouveau flux d’approbation"
            description="Le type de demande sélectionné alimente automatiquement cette partie. Tu n’as plus qu’à nommer le flux et composer les étapes."
          />
          <div className="space-y-4">
            <FieldBlock label="Type de demande">
              <select
                value={selectedRequestTypeId}
                onChange={(event) => handleSelectRequestType(event.target.value)}
                className={fieldClassName}
              >
                <option value="">Sélectionner</option>
                {data.requestTypes.map((requestType) => (
                  <option key={requestType.id} value={requestType.id}>
                    {requestType.name}
                  </option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock label="Nom du flux">
              <input
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="Validation achats standard"
                className={fieldClassName}
              />
            </FieldBlock>

            <FieldBlock label="Résumé opératoire">
              <textarea
                value={newTemplateDescription}
                onChange={(event) => setNewTemplateDescription(event.target.value)}
                rows={4}
                placeholder="Manager puis finance. Utilisé pour les achats courants."
                className={`${fieldClassName} min-h-[112px] py-3`}
              />
            </FieldBlock>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledValue
                label="Code généré"
                value={
                  selectedRequestType
                    ? createTemplateCode(
                        newTemplateName || "nouveau-flux",
                        selectedRequestType.code,
                        data.templates,
                      )
                    : "Choisir un type"
                }
              />
              <LabeledValue
                label="Département"
                value={selectedRequestType?.departmentName ?? "Non défini"}
                detail="hérité du type de demande"
              />
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAsync(handleCreateTemplate)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Créer le flux
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Flux existants"
            description="Sélectionne un flux pour ajuster ses étapes sans parcourir toute l’administration."
          />
          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/76 p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucun flux n’est encore rattaché à ce type de demande.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                  className={`w-full rounded-[24px] border p-4 text-left ${
                    selectedTemplate?.id === template.id
                      ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                      : "border-[color:var(--line)] bg-white/82 text-[color:var(--foreground)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-base font-medium">{template.name}</p>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          selectedTemplate?.id === template.id
                            ? "text-white/72"
                            : "text-[color:var(--muted)]"
                        }`}
                      >
                        {template.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                        selectedTemplate?.id === template.id
                          ? "bg-white/12 text-white/78"
                          : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                      }`}
                    >
                      {template.steps.length} étape(s)
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="space-y-6">
        {feedback ? (
          <div
            className={`rounded-[22px] border px-4 py-3 text-sm ${
              feedbackTone === "error"
                ? "border-[#f3b7a8] bg-[#fff1ed] text-[#8f3c25]"
                : "border-[#bfe2d6] bg-[#eefaf5] text-[#35513f]"
            }`}
          >
            {feedback}
          </div>
        ) : null}

        {selectedTemplate ? (
          <>
            <SurfaceCard>
              <SectionTitle
                title={selectedTemplate.name}
                description="Le studio simplifie la composition des étapes, l’ordre de validation et le choix des approbateurs."
              />
              <div className="grid gap-4 md:grid-cols-3">
                <BuilderStat
                  icon={Blocks}
                  label="Type rattaché"
                  value={selectedTemplate.requestTypeName}
                />
                <BuilderStat
                  icon={Waypoints}
                  label="Étapes"
                  value={String(selectedTemplate.steps.length)}
                />
                <BuilderStat
                  icon={TimerReset}
                  label="Version"
                  value={`v${selectedTemplate.version}`}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionTitle
                title="Ajouter une étape"
                description="Utilise un preset si tu veux aller vite, puis ajuste seulement l’approbateur et le SLA."
              />
              <div className="mb-4 flex flex-wrap gap-2">
                {stepPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() =>
                      setNewStepDraft(
                        applyPreset(
                          preset.key,
                          newStepDraft.stepOrder,
                          selectedRequestType?.departmentId ?? null,
                        ),
                      )
                    }
                    className="rounded-full border border-[color:var(--line)] bg-white/84 px-4 py-2 text-sm font-medium text-[color:var(--foreground)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <StepEditorFields
                draft={newStepDraft}
                onChange={setNewStepDraft}
                profiles={data.profiles}
                departments={data.departments}
                defaultDepartmentId={selectedRequestType?.departmentId ?? null}
                showOrder
              />

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAsync(handleAddStep)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
              >
                <CircleArrowRight className="h-4 w-4" />
                Ajouter l’étape au flux
              </button>
            </SurfaceCard>

            <SurfaceCard>
              <SectionTitle
                title="Étapes du flux"
                description="Chaque carte reste éditable, mais sans exposer les champs techniques du moteur."
              />
              <div className="space-y-4">
                {selectedTemplate.steps.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/76 p-4 text-sm leading-6 text-[color:var(--muted)]">
                    Ce flux n’a encore aucune étape. Commence par une validation manager ou une validation département.
                  </div>
                ) : (
                  selectedTemplate.steps.map((step) => (
                    <WorkflowStepEditor
                      key={step.id}
                      step={step}
                      profiles={data.profiles}
                      departments={data.departments}
                      defaultDepartmentId={selectedRequestType?.departmentId ?? null}
                      isPending={isPending}
                      onSave={(payload) =>
                        handleAsync(async () => {
                          const response = await fetch(
                            `/api/admin/workflow-template-steps/${step.id}`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(payload),
                            },
                          );
                          const result = (await response.json().catch(() => ({}))) as {
                            error?: string;
                          };

                          if (!response.ok) {
                            setFeedbackTone("error");
                            setFeedback(result.error ?? "Impossible de mettre à jour l’étape.");
                            return;
                          }

                          setFeedbackTone("success");
                          setFeedback("Étape mise à jour.");
                          router.refresh();
                        })
                      }
                    />
                  ))
                )}
              </div>
            </SurfaceCard>
          </>
        ) : (
          <SurfaceCard>
            <SectionTitle
              title="Sélectionne ou crée un flux"
              description="Le studio te montre ensuite les étapes actives et leurs approbateurs."
            />
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Crée d’abord un flux rattaché à un type de demande, puis ajoute tes étapes de validation.
            </p>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}

function WorkflowStepEditor({
  step,
  profiles,
  departments,
  defaultDepartmentId,
  isPending,
  onSave,
}: {
  step: AdminWorkflowStep;
  profiles: AdminProfile[];
  departments: AdminDepartment[];
  defaultDepartmentId: string | null;
  isPending: boolean;
  onSave: (payload: ReturnType<typeof buildStepPayload>) => void;
}) {
  const [draft, setDraft] = useState<StepDraft>(() => createDraftFromStep(step, defaultDepartmentId));

  useEffect(() => {
    setDraft(createDraftFromStep(step, defaultDepartmentId));
  }, [defaultDepartmentId, step]);

  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-white/84 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Étape {step.stepOrder} · {step.name}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {describeApproverSelection(draft, profiles, departments)}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {humanizeStepKind(draft.kind)}
        </span>
      </div>

      <StepEditorFields
        draft={draft}
        onChange={setDraft}
        profiles={profiles}
        departments={departments}
        defaultDepartmentId={defaultDepartmentId}
        showOrder
      />

      <button
        type="button"
        disabled={isPending}
        onClick={() => onSave(buildStepPayload(draft))}
        className="mt-5 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
      >
        Enregistrer l’étape
      </button>
    </div>
  );
}

function StepEditorFields({
  draft,
  onChange,
  profiles,
  departments,
  defaultDepartmentId,
  showOrder = false,
}: {
  draft: StepDraft;
  onChange: (value: StepDraft) => void;
  profiles: AdminProfile[];
  departments: AdminDepartment[];
  defaultDepartmentId: string | null;
  showOrder?: boolean;
}) {
  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((left, right) => left.fullName.localeCompare(right.fullName, "fr")),
    [profiles],
  );

  function patch(patchValue: Partial<StepDraft>) {
    onChange({ ...draft, ...patchValue });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {showOrder ? (
          <FieldBlock label="Position">
            <input
              value={String(draft.stepOrder)}
              onChange={(event) =>
                patch({
                  stepOrder: Number(event.target.value) || 1,
                })
              }
              type="number"
              min={1}
              className={fieldClassName}
            />
          </FieldBlock>
        ) : null}
        <FieldBlock label="Nom de l’étape">
          <input
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Validation manager"
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Nature">
          <select
            value={draft.kind}
            onChange={(event) =>
              patch({
                kind: event.target.value as StepDraft["kind"],
              })
            }
            className={fieldClassName}
          >
            <option value="approval">Validation</option>
            <option value="review">Relecture</option>
            <option value="task">Tâche</option>
            <option value="payment">Paiement</option>
            <option value="notification">Notification</option>
          </select>
        </FieldBlock>
        <FieldBlock label="SLA (heures)">
          <input
            value={String(draft.slaHours)}
            onChange={(event) =>
              patch({
                slaHours: Number(event.target.value) || 1,
              })
            }
            type="number"
            min={1}
            className={fieldClassName}
          />
        </FieldBlock>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          Qui approuve ?
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {approverOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                patch({
                  approverMode: option.value,
                  approverUserId: option.value === "user" ? draft.approverUserId : "",
                  approverDepartmentId:
                    option.value === "department_role"
                      ? draft.approverDepartmentId || defaultDepartmentId || ""
                      : "",
                })
              }
              className={`rounded-[20px] border p-4 text-left ${
                draft.approverMode === option.value
                  ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                  : "border-[color:var(--line)] bg-white/82 text-[color:var(--foreground)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <p className="text-sm font-medium">{option.label}</p>
              </div>
              <p
                className={`mt-2 text-sm leading-6 ${
                  draft.approverMode === option.value
                    ? "text-white/75"
                    : "text-[color:var(--muted)]"
                }`}
              >
                {option.detail}
              </p>
            </button>
          ))}
        </div>
      </div>

      {draft.approverMode === "user" ? (
        <FieldBlock label="Approbateur nommé">
          <select
            value={draft.approverUserId}
            onChange={(event) => patch({ approverUserId: event.target.value })}
            className={fieldClassName}
          >
            <option value="">Sélectionner une personne</option>
            {sortedProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
                {profile.jobTitle ? ` · ${profile.jobTitle}` : ""}
              </option>
            ))}
          </select>
        </FieldBlock>
      ) : null}

      {draft.approverMode === "department_role" ? (
        <FieldBlock label="Département couvert">
          <select
            value={draft.approverDepartmentId}
            onChange={(event) => patch({ approverDepartmentId: event.target.value })}
            className={fieldClassName}
          >
            <option value="">Sélectionner un département</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </FieldBlock>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          Condition d’activation
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {conditionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => patch({ conditionMode: option.value })}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                draft.conditionMode === option.value
                  ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                  : "border border-[color:var(--line)] bg-white text-[color:var(--foreground)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {draft.conditionMode === "min_amount" ? (
        <FieldBlock label="Montant minimum déclencheur">
          <input
            value={draft.minAmount}
            onChange={(event) => patch({ minAmount: event.target.value })}
            inputMode="decimal"
            placeholder="10000"
            className={fieldClassName}
          />
        </FieldBlock>
      ) : null}
    </div>
  );
}

function BuilderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Blocks;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--line)] bg-white/82 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[color:var(--muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[color:var(--muted)]" />
      </div>
      <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const approverOptions = [
  {
    value: "manager",
    label: "Manager du demandeur",
    detail: "Le responsable direct valide l’étape.",
    icon: ShieldUser,
  },
  {
    value: "department_role",
    label: "Responsable département",
    detail: "Le manager du département choisi prend la main.",
    icon: BriefcaseBusiness,
  },
  {
    value: "user",
    label: "Personne précise",
    detail: "Choisis un approbateur nommé.",
    icon: UserRound,
  },
  {
    value: "dynamic",
    label: "Règle automatique",
    detail: "Le moteur choisit selon le contexte et le montant.",
    icon: Sparkles,
  },
] as const;

const conditionOptions = [
  { value: "always", label: "Toujours" },
  { value: "min_amount", label: "Montant minimum" },
  { value: "priority_high", label: "Priorité haute / critique" },
] as const;

const stepPresets = [
  { key: "manager", label: "Validation manager" },
  { key: "department", label: "Validation département" },
  { key: "named", label: "Approbateur nommé" },
  { key: "escalation", label: "Escalade montant" },
] as const;

const fieldClassName =
  "h-11 w-full rounded-[16px] border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--foreground)] outline-none";

function createEmptyStepDraft(stepOrder: number, defaultDepartmentId: string | null): StepDraft {
  return {
    stepOrder,
    name: "Validation manager",
    kind: "approval",
    approverMode: "manager",
    approverUserId: "",
    approverDepartmentId: defaultDepartmentId ?? "",
    slaHours: 24,
    minApprovals: 1,
    conditionMode: "always",
    minAmount: "",
  };
}

function applyPreset(
  preset: (typeof stepPresets)[number]["key"],
  stepOrder: number,
  defaultDepartmentId: string | null,
): StepDraft {
  if (preset === "department") {
    return {
      ...createEmptyStepDraft(stepOrder, defaultDepartmentId),
      name: "Validation département",
      approverMode: "department_role",
      approverDepartmentId: defaultDepartmentId ?? "",
    };
  }

  if (preset === "named") {
    return {
      ...createEmptyStepDraft(stepOrder, defaultDepartmentId),
      name: "Validation ciblée",
      approverMode: "user",
      approverUserId: "",
    };
  }

  if (preset === "escalation") {
    return {
      ...createEmptyStepDraft(stepOrder, defaultDepartmentId),
      name: "Escalade direction",
      approverMode: "dynamic",
      slaHours: 12,
      conditionMode: "min_amount",
      minAmount: "10000",
    };
  }

  return createEmptyStepDraft(stepOrder, defaultDepartmentId);
}

function createDraftFromStep(step: AdminWorkflowStep, defaultDepartmentId: string | null): StepDraft {
  const condition = step.conditionJson ?? {};
  const priorities = Array.isArray(condition.priorities)
    ? condition.priorities.filter((value): value is string => typeof value === "string")
    : [];

  return {
    stepOrder: step.stepOrder,
    name: step.name,
    kind: step.kind,
    approverMode: step.approverMode,
    approverUserId: step.approverUserId ?? "",
    approverDepartmentId: step.approverDepartmentId ?? defaultDepartmentId ?? "",
    slaHours: step.slaHours,
    minApprovals: step.minApprovals,
    conditionMode:
      typeof condition.minAmount === "number"
        ? "min_amount"
        : priorities.includes("high") || priorities.includes("critical")
          ? "priority_high"
          : "always",
    minAmount:
      typeof condition.minAmount === "number" ? String(condition.minAmount) : "",
  };
}

function buildStepPayload(draft: StepDraft) {
  return {
    stepOrder: draft.stepOrder,
    name: draft.name.trim(),
    kind: draft.kind,
    approverMode: draft.approverMode,
    approverUserId: draft.approverMode === "user" ? emptyToNull(draft.approverUserId) : null,
    approverDepartmentId:
      draft.approverMode === "department_role"
        ? emptyToNull(draft.approverDepartmentId)
        : null,
    minApprovals: draft.minApprovals,
    slaHours: draft.slaHours,
    conditionJson:
      draft.conditionMode === "min_amount" && draft.minAmount.trim().length > 0
        ? { minAmount: Number(draft.minAmount) }
        : draft.conditionMode === "priority_high"
          ? { priorities: ["high", "critical"] }
          : {},
  };
}

function createTemplateCode(
  name: string,
  requestTypeCode: string,
  existingTemplates: AdminWorkflowTemplate[],
) {
  const base = `${requestTypeCode}-${slugify(name).slice(0, 42)}`.replace(/^-+|-+$/g, "");
  const existingCodes = new Set(existingTemplates.map((template) => template.code));

  if (!existingCodes.has(base)) {
    return base;
  }

  let index = 2;
  let candidate = `${base}-${index}`;

  while (existingCodes.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  return candidate;
}

function describeApproverSelection(
  draft: StepDraft,
  profiles: AdminProfile[],
  departments: AdminDepartment[],
) {
  if (draft.approverMode === "user") {
    const profile = profiles.find((item) => item.id === draft.approverUserId);
    return profile ? `Approbateur ciblé · ${profile.fullName}` : "Choisir un approbateur nommé";
  }

  if (draft.approverMode === "department_role") {
    const department = departments.find((item) => item.id === draft.approverDepartmentId);
    return department
      ? `Responsable du département ${department.name}`
      : "Choisir le département approbateur";
  }

  if (draft.approverMode === "dynamic") {
    return "Règle automatique pilotée par le moteur";
  }

  return "Manager direct du demandeur";
}

function humanizeStepKind(kind: AdminWorkflowStep["kind"]) {
  switch (kind) {
    case "approval":
      return "Validation";
    case "review":
      return "Relecture";
    case "task":
      return "Tâche";
    case "payment":
      return "Paiement";
    case "notification":
      return "Notification";
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function emptyToNull(value: string) {
  return value.trim().length > 0 ? value.trim() : null;
}
