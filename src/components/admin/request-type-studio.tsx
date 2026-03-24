"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Blocks,
  BriefcaseBusiness,
  FileText,
  LayoutTemplate,
  PenSquare,
  Plus,
} from "lucide-react";
import type {
  AdminControlTowerData,
  AdminRequestType,
} from "@/lib/admin/service";
import type { FormSection } from "@/lib/workflow/types";
import { LabeledValue, SectionTitle, SurfaceCard } from "@/components/workspace/ui";

type RequestTypeStudioProps = {
  data: AdminControlTowerData;
  initialRequestTypeId?: string | null;
};

type RequestTypeDraft = {
  name: string;
  description: string;
  departmentId: string;
  defaultSlaHours: number;
};

type FieldDraft = {
  label: string;
  fieldType: "text" | "textarea" | "select" | "currency" | "date" | "checkbox";
  sectionTitle: string;
  helperText: string;
  placeholder: string;
  required: boolean;
  width: "full" | "half";
  optionsText: string;
  sortOrder: number;
};

export function RequestTypeStudio({
  data,
  initialRequestTypeId = null,
}: RequestTypeStudioProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();
  const [newRequestType, setNewRequestType] = useState<RequestTypeDraft>({
    name: "",
    description: "",
    departmentId: "",
    defaultSlaHours: 24,
  });

  const selectedRequestTypeId = initialRequestTypeId ?? data.requestTypes[0]?.id ?? "";
  const selectedRequestType =
    data.requestTypes.find((requestType) => requestType.id === selectedRequestTypeId) ?? null;
  const fieldCount = selectedRequestType ? countRequestTypeFields(selectedRequestType) : 0;
  const templateCount = selectedRequestType
    ? data.templates.filter((template) => template.requestTypeId === selectedRequestType.id).length
    : 0;
  const sectionTitles = useMemo(() => {
    const titles = new Set([
      "Informations principales",
      "Informations complémentaires",
      ...(selectedRequestType?.formSections.map((section) => section.title) ?? []),
    ]);

    return Array.from(titles);
  }, [selectedRequestType]);

  const [newFieldDraft, setNewFieldDraft] = useState<FieldDraft>(() =>
    createEmptyFieldDraft((selectedRequestType?.formSections.length ?? 0) + 1),
  );

  function replaceStudioParams(nextRequestTypeId: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextRequestTypeId) {
      params.set("requestType", nextRequestTypeId);
    } else {
      params.delete("requestType");
    }

    params.delete("template");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleAsync(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  async function handleCreateRequestType() {
    const name = newRequestType.name.trim();

    if (name.length < 2) {
      setFeedbackTone("error");
      setFeedback("Renseigne au minimum le nom du type de demande.");
      return;
    }

    const response = await fetch("/api/admin/request-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: createRequestTypeCode(name, data.requestTypes),
        name,
        description: newRequestType.description.trim(),
        departmentId: emptyToNull(newRequestType.departmentId),
        defaultSlaHours: newRequestType.defaultSlaHours,
        isActive: true,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      requestTypeId?: string;
    };

    if (!response.ok || !payload.requestTypeId) {
      setFeedbackTone("error");
      setFeedback(payload.error ?? "Impossible de créer le type de demande.");
      return;
    }

    setFeedbackTone("success");
    setFeedback("Type de demande créé. Tu peux maintenant définir son formulaire puis son flux.");
    setNewRequestType({
      name: "",
      description: "",
      departmentId: "",
      defaultSlaHours: 24,
    });
    replaceStudioParams(payload.requestTypeId);
    router.refresh();
  }

  async function handleSaveRequestType(formData: FormData) {
    if (!selectedRequestType) {
      return;
    }

    const response = await fetch(`/api/admin/request-types/${selectedRequestType.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: selectedRequestType.code,
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        departmentId: stringOrNull(formData.get("departmentId")),
        defaultSlaHours: Number(formData.get("defaultSlaHours") ?? selectedRequestType.defaultSlaHours),
        isActive: formData.get("isActive") === "on",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setFeedbackTone("error");
      setFeedback(payload.error ?? "Impossible de mettre à jour ce type de demande.");
      return;
    }

    setFeedbackTone("success");
    setFeedback("Type de demande mis à jour.");
    router.refresh();
  }

  async function handleAddField() {
    if (!selectedRequestType) {
      setFeedbackTone("error");
      setFeedback("Choisis d’abord un type de demande.");
      return;
    }

    if (newFieldDraft.label.trim().length < 2) {
      setFeedbackTone("error");
      setFeedback("Donne un libellé au champ.");
      return;
    }

    if (newFieldDraft.sectionTitle.trim().length < 2) {
      setFeedbackTone("error");
      setFeedback("Choisis la zone du formulaire.");
      return;
    }

    const response = await fetch(`/api/admin/request-types/${selectedRequestType.id}/fields`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildNewFieldPayload(newFieldDraft, selectedRequestType),
      ),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setFeedbackTone("error");
      setFeedback(payload.error ?? "Impossible d’ajouter le champ.");
      return;
    }

    setFeedbackTone("success");
    setFeedback("Champ ajouté au formulaire.");
    setNewFieldDraft(createEmptyFieldDraft(fieldCount + 2));
    router.refresh();
  }

  if (!data.canManage) {
    return (
      <SurfaceCard>
        <SectionTitle
          title="Accès admin requis"
          description="Le Workflow Studio est réservé aux administrateurs applicatifs."
        />
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          Attribue le rôle `admin` dans `public.profiles` pour créer les types, les champs et les flux.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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

        <SurfaceCard>
          <SectionTitle
            title="1. Nouveau type de demande"
            description="Crée d’abord la famille métier. Le code interne est généré automatiquement pour garder la configuration propre."
          />
          <div className="space-y-4">
            <FieldBlock label="Nom métier">
              <input
                value={newRequestType.name}
                onChange={(event) =>
                  setNewRequestType((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Achat opérationnel"
                className={fieldClassName}
              />
            </FieldBlock>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock label="Département porteur">
                <select
                  value={newRequestType.departmentId}
                  onChange={(event) =>
                    setNewRequestType((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                  className={fieldClassName}
                >
                  <option value="">Sans département</option>
                  {data.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </FieldBlock>

              <FieldBlock label="SLA cible (heures)">
                <input
                  value={String(newRequestType.defaultSlaHours)}
                  onChange={(event) =>
                    setNewRequestType((current) => ({
                      ...current,
                      defaultSlaHours: Number(event.target.value) || 24,
                    }))
                  }
                  type="number"
                  min={1}
                  className={fieldClassName}
                />
              </FieldBlock>
            </div>

            <FieldBlock label="Résumé d’usage">
              <textarea
                value={newRequestType.description}
                onChange={(event) =>
                  setNewRequestType((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Utilisé pour les achats courants avec validation manager puis finance."
                className={`${fieldClassName} min-h-[112px] py-3`}
              />
            </FieldBlock>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledValue
                label="Code interne généré"
                value={
                  newRequestType.name.trim().length > 1
                    ? createRequestTypeCode(newRequestType.name, data.requestTypes)
                    : "Sera généré à la création"
                }
              />
              <LabeledValue
                label="Parcours attendu"
                value="Formulaire puis flux"
                detail="étapes 2 et 3 du studio"
              />
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAsync(handleCreateRequestType)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Créer le type
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionTitle
            title="Catalogue des demandes"
            description="Choisis le type à configurer. La sélection pilote automatiquement le formulaire et le flux plus bas."
          />
          <div className="space-y-3">
            {data.requestTypes.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/78 p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucun type de demande n’est encore configuré.
              </div>
            ) : (
              data.requestTypes.map((requestType) => {
                const isActive = requestType.id === selectedRequestTypeId;
                const requestTypeFieldCount = countRequestTypeFields(requestType);
                const requestTypeTemplateCount = data.templates.filter(
                  (template) => template.requestTypeId === requestType.id,
                ).length;

                return (
                  <button
                    key={requestType.id}
                    type="button"
                    onClick={() => replaceStudioParams(requestType.id)}
                    className={`w-full rounded-[24px] border p-4 text-left ${
                      isActive
                        ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                        : "border-[color:var(--line)] bg-white/82 text-[color:var(--foreground)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-base font-medium">{requestType.name}</p>
                        <p
                          className={`mt-2 text-sm leading-6 ${
                            isActive ? "text-white/74" : "text-[color:var(--muted)]"
                          }`}
                        >
                          {requestType.description || "Type prêt à être utilisé dans les demandes internes."}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                          isActive
                            ? "bg-white/12 text-white/80"
                            : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                        }`}
                      >
                        {requestType.isActive ? "Actif" : "Pause"}
                      </span>
                    </div>
                    <div
                      className={`mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] ${
                        isActive ? "text-white/62" : "text-[color:var(--muted)]"
                      }`}
                    >
                      <span>{requestType.departmentName}</span>
                      <span>· {requestTypeFieldCount} champ(s)</span>
                      <span>· {requestTypeTemplateCount} flux</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="space-y-6">
        {selectedRequestType ? (
          <>
            <SurfaceCard>
              <SectionTitle
                title={`2. Type sélectionné · ${selectedRequestType.name}`}
                description="Ajuste ici les informations métier du type, puis construis le formulaire visible dans la création de demande."
              />
              <div className="grid gap-4 md:grid-cols-4">
                <StudioMetric
                  icon={FileText}
                  label="Code"
                  value={selectedRequestType.code}
                />
                <StudioMetric
                  icon={BriefcaseBusiness}
                  label="Département"
                  value={selectedRequestType.departmentName}
                />
                <StudioMetric
                  icon={Blocks}
                  label="Champs"
                  value={String(fieldCount)}
                />
                <StudioMetric
                  icon={LayoutTemplate}
                  label="Flux"
                  value={String(templateCount)}
                />
              </div>

              <form
                className="mt-5 grid gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  handleAsync(async () => handleSaveRequestType(formData));
                }}
              >
                <FieldBlock label="Nom métier">
                  <input
                    name="name"
                    defaultValue={selectedRequestType.name}
                    className={fieldClassName}
                  />
                </FieldBlock>
                <FieldBlock label="Département porteur">
                  <select
                    name="departmentId"
                    defaultValue={selectedRequestType.departmentId ?? ""}
                    className={fieldClassName}
                  >
                    <option value="">Sans département</option>
                    {data.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
                <FieldBlock label="SLA cible (heures)">
                  <input
                    name="defaultSlaHours"
                    defaultValue={String(selectedRequestType.defaultSlaHours)}
                    type="number"
                    min={1}
                    className={fieldClassName}
                  />
                </FieldBlock>
                <label className="flex items-center gap-3 rounded-[16px] border border-[color:var(--line)] bg-white px-3 py-3 text-sm text-[color:var(--foreground)]">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={selectedRequestType.isActive}
                  />
                  Type actif
                </label>
                <FieldBlock label="Résumé d’usage" className="md:col-span-2">
                  <textarea
                    name="description"
                    defaultValue={selectedRequestType.description}
                    rows={4}
                    className={`${fieldClassName} min-h-[112px] py-3`}
                  />
                </FieldBlock>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
                  >
                    <PenSquare className="h-4 w-4" />
                    Enregistrer le type
                  </button>
                  <span className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Le code interne reste stable pour éviter les ruptures côté données.
                  </span>
                </div>
              </form>
            </SurfaceCard>

            <SurfaceCard>
              <SectionTitle
                title="Formulaire du type"
                description="Ajoute les champs visibles dans la création de demande. Les clés techniques sont générées automatiquement."
              />

              <div className="mb-4 flex flex-wrap gap-2">
                {fieldPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        fieldType: preset.fieldType,
                        label: current.label || preset.label,
                        helperText: current.helperText || preset.helperText,
                        placeholder: current.placeholder || preset.placeholder,
                        optionsText:
                          preset.fieldType === "select" && !current.optionsText
                            ? "Standard, Prioritaire, Critique"
                            : current.optionsText,
                      }))
                    }
                    className="rounded-full border border-[color:var(--line)] bg-white/84 px-4 py-2 text-sm font-medium text-[color:var(--foreground)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label="Libellé du champ">
                  <input
                    value={newFieldDraft.label}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Montant estimé"
                    className={fieldClassName}
                  />
                </FieldBlock>
                <FieldBlock label="Type de champ">
                  <select
                    value={newFieldDraft.fieldType}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        fieldType: event.target.value as FieldDraft["fieldType"],
                      }))
                    }
                    className={fieldClassName}
                  >
                    <option value="text">Texte court</option>
                    <option value="textarea">Texte long</option>
                    <option value="select">Liste</option>
                    <option value="currency">Montant</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Case à cocher</option>
                  </select>
                </FieldBlock>
                <FieldBlock label="Zone du formulaire">
                  <input
                    list="workflow-studio-section-titles"
                    value={newFieldDraft.sectionTitle}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        sectionTitle: event.target.value,
                      }))
                    }
                    placeholder="Informations principales"
                    className={fieldClassName}
                  />
                  <datalist id="workflow-studio-section-titles">
                    {sectionTitles.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </FieldBlock>
                <FieldBlock label="Position">
                  <input
                    value={String(newFieldDraft.sortOrder)}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        sortOrder: Number(event.target.value) || 1,
                      }))
                    }
                    type="number"
                    min={1}
                    className={fieldClassName}
                  />
                </FieldBlock>
                <FieldBlock label="Aide affichée">
                  <input
                    value={newFieldDraft.helperText}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        helperText: event.target.value,
                      }))
                    }
                    placeholder="Visible sous le champ pour guider le demandeur"
                    className={fieldClassName}
                  />
                </FieldBlock>
                <FieldBlock label="Placeholder">
                  <input
                    value={newFieldDraft.placeholder}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        placeholder: event.target.value,
                      }))
                    }
                    placeholder="Exemple de saisie"
                    className={fieldClassName}
                  />
                </FieldBlock>
                {newFieldDraft.fieldType === "select" ? (
                  <FieldBlock label="Options de liste">
                    <input
                      value={newFieldDraft.optionsText}
                      onChange={(event) =>
                        setNewFieldDraft((current) => ({
                          ...current,
                          optionsText: event.target.value,
                        }))
                      }
                      placeholder="Standard, Prioritaire, Critique"
                      className={fieldClassName}
                    />
                  </FieldBlock>
                ) : null}
                <FieldBlock label="Largeur d’affichage">
                  <div className="flex gap-2">
                    {(["full", "half"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setNewFieldDraft((current) => ({
                            ...current,
                            width: value,
                          }))
                        }
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                          newFieldDraft.width === value
                            ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                            : "border border-[color:var(--line)] bg-white text-[color:var(--foreground)]"
                        }`}
                      >
                        {value === "full" ? "Pleine largeur" : "Demi largeur"}
                      </button>
                    ))}
                  </div>
                </FieldBlock>
                <label className="flex items-center gap-3 rounded-[16px] border border-[color:var(--line)] bg-white px-3 py-3 text-sm text-[color:var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={newFieldDraft.required}
                    onChange={(event) =>
                      setNewFieldDraft((current) => ({
                        ...current,
                        required: event.target.checked,
                      }))
                    }
                  />
                  Champ obligatoire
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <LabeledValue
                  label="Clé du champ générée"
                  value={
                    newFieldDraft.label.trim().length > 1
                      ? createFieldKey(newFieldDraft.label, selectedRequestType)
                      : "Sera générée à l’ajout"
                  }
                />
                <LabeledValue
                  label="Zone technique"
                  value={
                    newFieldDraft.sectionTitle.trim().length > 1
                      ? slugify(newFieldDraft.sectionTitle)
                      : "Sera générée"
                  }
                />
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAsync(handleAddField)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Ajouter au formulaire
              </button>

              <div className="mt-6 space-y-4">
                {selectedRequestType.formSections.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/78 p-4 text-sm leading-6 text-[color:var(--muted)]">
                    Aucun champ dynamique pour ce type. Ajoute les informations utiles avant de construire le flux.
                  </div>
                ) : (
                  selectedRequestType.formSections.map((section) => (
                    <RequestTypeSectionEditor
                      key={`${selectedRequestType.id}-${section.key}`}
                      section={section}
                      isPending={isPending}
                      onSave={(fieldId, payload) =>
                        handleAsync(async () => {
                          const response = await fetch(`/api/admin/request-type-fields/${fieldId}`, {
                            method: "PATCH",
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
                            setFeedback(result.error ?? "Impossible de mettre à jour ce champ.");
                            return;
                          }

                          setFeedbackTone("success");
                          setFeedback("Champ mis à jour.");
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
              title="Choisis un type de demande"
              description="Le formulaire métier et le circuit d’approbation s’ouvrent dès qu’un type est sélectionné."
            />
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Commence par créer ou sélectionner un type dans la colonne de gauche.
            </p>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}

function RequestTypeSectionEditor({
  section,
  isPending,
  onSave,
}: {
  section: FormSection;
  isPending: boolean;
  onSave: (fieldId: string, payload: ReturnType<typeof buildExistingFieldPayload>) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-white/82 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-medium text-[color:var(--foreground)]">{section.title}</p>
          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{section.description}</p>
        </div>
        <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {section.fields.length} champ(s)
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {section.fields.map((field, index) => (
          <RequestFieldEditor
            key={`${field.id}:${field.label}:${field.type}:${field.required}:${section.title}:${index + 1}`}
            field={field}
            section={section}
            defaultSortOrder={index + 1}
            isPending={isPending}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

function RequestFieldEditor({
  field,
  section,
  defaultSortOrder,
  isPending,
  onSave,
}: {
  field: FormSection["fields"][number];
  section: FormSection;
  defaultSortOrder: number;
  isPending: boolean;
  onSave: (fieldId: string, payload: ReturnType<typeof buildExistingFieldPayload>) => void;
}) {
  const [draft, setDraft] = useState<FieldDraft>(() =>
    createFieldDraftFromExistingField(field, section.title, defaultSortOrder),
  );

  return (
    <div className="rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)]/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {draft.label}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {humanizeFieldType(draft.fieldType)}
            {draft.required ? " · requis" : " · optionnel"}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--line)] bg-white/86 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {field.key}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock label="Libellé">
          <input
            value={draft.label}
            onChange={(event) =>
              setDraft((current) => ({ ...current, label: event.target.value }))
            }
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Type">
          <select
            value={draft.fieldType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                fieldType: event.target.value as FieldDraft["fieldType"],
              }))
            }
            className={fieldClassName}
          >
            <option value="text">Texte court</option>
            <option value="textarea">Texte long</option>
            <option value="select">Liste</option>
            <option value="currency">Montant</option>
            <option value="date">Date</option>
            <option value="checkbox">Case à cocher</option>
          </select>
        </FieldBlock>
        <FieldBlock label="Zone du formulaire">
          <input
            value={draft.sectionTitle}
            onChange={(event) =>
              setDraft((current) => ({ ...current, sectionTitle: event.target.value }))
            }
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Position">
          <input
            value={String(draft.sortOrder)}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sortOrder: Number(event.target.value) || 1,
              }))
            }
            type="number"
            min={1}
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Aide affichée">
          <input
            value={draft.helperText}
            onChange={(event) =>
              setDraft((current) => ({ ...current, helperText: event.target.value }))
            }
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Placeholder">
          <input
            value={draft.placeholder}
            onChange={(event) =>
              setDraft((current) => ({ ...current, placeholder: event.target.value }))
            }
            className={fieldClassName}
          />
        </FieldBlock>
        {draft.fieldType === "select" ? (
          <FieldBlock label="Options de liste">
            <input
              value={draft.optionsText}
              onChange={(event) =>
                setDraft((current) => ({ ...current, optionsText: event.target.value }))
              }
              placeholder="Option A, Option B"
              className={fieldClassName}
            />
          </FieldBlock>
        ) : null}
        <FieldBlock label="Largeur">
          <div className="flex gap-2">
            {(["full", "half"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    width: value,
                  }))
                }
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  draft.width === value
                    ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                    : "border border-[color:var(--line)] bg-white text-[color:var(--foreground)]"
                }`}
              >
                {value === "full" ? "Pleine largeur" : "Demi largeur"}
              </button>
            ))}
          </div>
        </FieldBlock>
        <label className="flex items-center gap-3 rounded-[16px] border border-[color:var(--line)] bg-white px-3 py-3 text-sm text-[color:var(--foreground)]">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(event) =>
              setDraft((current) => ({ ...current, required: event.target.checked }))
            }
          />
          Champ obligatoire
        </label>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => onSave(field.id, buildExistingFieldPayload(draft, field.key, section.key))}
        className="mt-5 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
      >
        Enregistrer le champ
      </button>
    </div>
  );
}

function StudioMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
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
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldClassName =
  "h-11 w-full rounded-[16px] border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--foreground)] outline-none";

const fieldPresets = [
  {
    key: "text",
    label: "Texte court",
    fieldType: "text",
    helperText: "Une réponse courte en une ligne.",
    placeholder: "Saisir une valeur",
  },
  {
    key: "textarea",
    label: "Description",
    fieldType: "textarea",
    helperText: "Permet une réponse détaillée.",
    placeholder: "Décrire le besoin",
  },
  {
    key: "currency",
    label: "Montant",
    fieldType: "currency",
    helperText: "Montant estimé ou engagé.",
    placeholder: "25000",
  },
  {
    key: "select",
    label: "Liste de choix",
    fieldType: "select",
    helperText: "Choix parmi plusieurs options.",
    placeholder: "",
  },
  {
    key: "date",
    label: "Date",
    fieldType: "date",
    helperText: "Date attendue ou date d’effet.",
    placeholder: "",
  },
] as const;

function createEmptyFieldDraft(sortOrder: number): FieldDraft {
  return {
    label: "",
    fieldType: "text",
    sectionTitle: "Informations principales",
    helperText: "",
    placeholder: "",
    required: false,
    width: "full",
    optionsText: "",
    sortOrder,
  };
}

function createFieldDraftFromExistingField(
  field: FormSection["fields"][number],
  sectionTitle: string,
  sortOrder: number,
): FieldDraft {
  return {
    label: field.label,
    fieldType: normalizeEditableFieldType(field.type),
    sectionTitle,
    helperText: field.helper,
    placeholder: field.placeholder ?? "",
    required: field.required,
    width: field.width,
    optionsText: field.options.join(", "),
    sortOrder,
  };
}

function countRequestTypeFields(requestType: AdminRequestType) {
  return requestType.formSections.reduce((total, section) => total + section.fields.length, 0);
}

function createRequestTypeCode(name: string, requestTypes: AdminRequestType[]) {
  const base = slugify(name).slice(0, 40).replace(/^-+|-+$/g, "");
  const existingCodes = new Set(requestTypes.map((requestType) => requestType.code));

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

function createFieldKey(label: string, requestType: AdminRequestType) {
  const base = slugify(label).slice(0, 60).replace(/^-+|-+$/g, "");
  const existingKeys = new Set(
    requestType.formSections.flatMap((section) => section.fields.map((field) => field.key)),
  );

  if (!existingKeys.has(base)) {
    return base;
  }

  let index = 2;
  let candidate = `${base}-${index}`;

  while (existingKeys.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  return candidate;
}

function buildNewFieldPayload(draft: FieldDraft, requestType: AdminRequestType) {
  return {
    sectionKey: slugify(draft.sectionTitle),
    sectionTitle: draft.sectionTitle.trim(),
    fieldKey: createFieldKey(draft.label, requestType),
    label: draft.label.trim(),
    fieldType: draft.fieldType,
    helperText: draft.helperText.trim(),
    placeholder: emptyToNull(draft.placeholder),
    required: draft.required,
    width: draft.width,
    options: parseOptions(draft.optionsText),
    sortOrder: draft.sortOrder,
    isActive: true,
  };
}

function buildExistingFieldPayload(
  draft: FieldDraft,
  fieldKey: string,
  existingSectionKey: string,
) {
  return {
    sectionKey: draft.sectionTitle.trim().length > 0 ? slugify(draft.sectionTitle) : existingSectionKey,
    sectionTitle: draft.sectionTitle.trim(),
    fieldKey,
    label: draft.label.trim(),
    fieldType: draft.fieldType,
    helperText: draft.helperText.trim(),
    placeholder: emptyToNull(draft.placeholder),
    required: draft.required,
    width: draft.width,
    options: parseOptions(draft.optionsText),
    sortOrder: draft.sortOrder,
    isActive: true,
  };
}

function humanizeFieldType(fieldType: FieldDraft["fieldType"]) {
  switch (fieldType) {
    case "text":
      return "Texte court";
    case "textarea":
      return "Texte long";
    case "select":
      return "Liste";
    case "currency":
      return "Montant";
    case "date":
      return "Date";
    case "checkbox":
      return "Case à cocher";
  }
}

function normalizeEditableFieldType(fieldType: FormSection["fields"][number]["type"]): FieldDraft["fieldType"] {
  return fieldType === "file" ? "text" : fieldType;
}

function parseOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function stringOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
