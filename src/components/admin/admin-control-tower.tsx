"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Blocks,
  Mail,
  FileCog,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";
import type {
  AdminControlTowerData,
  AdminDepartment,
  AdminProfile,
  AdminRequestType,
  AdminWorkflowTemplate,
} from "@/lib/admin/service";
import { SurfaceCard } from "@/components/workspace/ui";

export function AdminControlTower({ data }: { data: AdminControlTowerData }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testEmailTarget, setTestEmailTarget] = useState(data.ops.actorEmail ?? "");
  const [isPending, startTransition] = useTransition();

  async function submitJson(url: string, method: string, body: unknown, successMessage: string) {
    setFeedback(null);

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      note?: string;
    };

    if (!response.ok) {
      setFeedback([payload.error, payload.detail].filter(Boolean).join(" · ") || "Opération impossible.");
      return;
    }

    setFeedback(payload.note ?? successMessage);
    router.refresh();
  }

  function handleAsync(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  if (!data.canManage) {
    return (
      <SurfaceCard>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[color:var(--foreground)]">
              Accès administration requis
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Donne au moins un rôle `admin` dans `public.profiles` pour déverrouiller
              le pilotage des templates, types de demandes et profils.
            </p>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <SurfaceCard>
        <SectionHeader
          icon={Radar}
          title="Ops readiness"
          detail="Etat de la configuration email, protection cron et point d'entrée de production."
        />
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <OpsTile
            label="Provider email"
            value={data.ops.emailProvider}
            detail={data.ops.emailConfigured ? "configuré" : "à compléter"}
          />
          <OpsTile
            label="Email cible"
            value={data.ops.actorEmail ?? "n/a"}
            detail="adresse du compte connecté"
          />
          <OpsTile
            label="EMAIL_FROM"
            value={data.ops.emailFrom ?? "n/a"}
            detail="expéditeur transactionnel"
          />
          <OpsTile
            label="EMAIL_REPLY_TO"
            value={data.ops.emailReplyTo ?? "n/a"}
            detail="boîte de réponse"
          />
          <OpsTile
            label="Cron protégé"
            value={data.ops.cronProtected ? "ON" : "OFF"}
            detail="contrôle par CRON_SECRET"
          />
          <OpsTile
            label="APP_BASE_URL"
            value={data.ops.appBaseUrl ?? "n/a"}
            detail="base des liens email"
          />
        </div>
        <div className="mt-5 rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Destinataire du test email
              </span>
              <input
                value={testEmailTarget}
                onChange={(event) => setTestEmailTarget(event.target.value)}
                placeholder="ops@entreprise.com"
                className="w-full rounded-[18px] border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleAsync(async () =>
                  submitJson(
                    "/api/admin/test-email",
                    "POST",
                    {
                      to: testEmailTarget.trim() || null,
                    },
                    "Email de test déclenché.",
                  ),
                )
              }
              className="rounded-full bg-[color:var(--foreground)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Envoyer un email de test
              </span>
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
            Utilise cette action pour valider le provider, le domaine d’envoi, le
            bouton d’action et l’adresse de réponse.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-start gap-3">
          <p className="text-sm text-[color:var(--muted)]">
            Endpoint cron prêt: <span className="font-mono">{data.ops.cronEndpoint}</span>
          </p>
        </div>
        {data.ops.emailIssues.length > 0 || data.ops.emailWarnings.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.ops.emailIssues.map((issue) => (
              <div
                key={issue}
                className="rounded-[20px] border border-[#f3b7a8] bg-[#fff1ed] px-4 py-3 text-sm text-[#8f3c25]"
              >
                {issue}
              </div>
            ))}
            {data.ops.emailWarnings.map((warning) => (
              <div
                key={warning}
                className="rounded-[20px] border border-[#eadcb7] bg-[#fff8e7] px-4 py-3 text-sm text-[#7b5f18]"
              >
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard>
          <SectionHeader
            icon={Users}
            title="Profils et rôles"
            detail="Alias courts, rôles, départements et intitulés visibles dans toute l’application."
          />
          <div className="space-y-4">
            {data.profiles.map((profile) => (
              <form
                key={profile.id}
                className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);

                  handleAsync(async () =>
                    submitJson(
                      `/api/admin/profiles/${profile.id}`,
                      "PATCH",
                      {
                        displayName: stringOrNull(formData.get("displayName")),
                        username: stringOrNull(formData.get("username")),
                        role: formData.get("role"),
                        departmentId: stringOrNull(formData.get("departmentId")),
                        jobTitle: stringOrNull(formData.get("jobTitle")),
                      },
                      "Profil mis à jour.",
                    ),
                  );
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">
                      {profile.fullName}
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {profile.email} {profile.handle ? `· @${profile.handle}` : ""}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <LabeledInput label="Nom affiché" name="displayName" defaultValue={profile.label} />
                  <LabeledInput
                    label="Username"
                    name="username"
                    defaultValue={profile.handle ?? ""}
                  />
                  <LabeledSelect label="Rôle" name="role" defaultValue={profile.role}>
                    <option value="employee">Employé</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </LabeledSelect>
                  <LabeledSelect
                    label="Département"
                    name="departmentId"
                    defaultValue={profile.departmentId ?? ""}
                  >
                    <option value="">Aucun</option>
                    {data.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </LabeledSelect>
                  <LabeledInput
                    className="md:col-span-2"
                    label="Intitulé"
                    name="jobTitle"
                    defaultValue={profile.jobTitle ?? ""}
                  />
                </div>
              </form>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            icon={FileCog}
            title="Types de demandes et formulaires"
            detail="Gère les familles de demandes et leurs champs métier dynamiques."
          />

          <CreateRequestTypeForm
            departments={data.departments}
            isPending={isPending}
            onSubmit={(body) =>
              handleAsync(async () =>
                submitJson("/api/admin/request-types", "POST", body, "Type de demande créé."),
              )
            }
          />

          <div className="mt-5 space-y-5">
            {data.requestTypes.map((requestType) => (
              <RequestTypeCard
                key={requestType.id}
                requestType={requestType}
                departments={data.departments}
                isPending={isPending}
                onSave={(body) =>
                  handleAsync(async () =>
                    submitJson(
                      `/api/admin/request-types/${requestType.id}`,
                      "PATCH",
                      body,
                      "Type de demande mis à jour.",
                    ),
                  )
                }
                onAddField={(body) =>
                  handleAsync(async () =>
                    submitJson(
                      `/api/admin/request-types/${requestType.id}/fields`,
                      "POST",
                      body,
                      "Champ dynamique ajouté.",
                    ),
                  )
                }
                onUpdateField={(fieldId, body) =>
                  handleAsync(async () =>
                    submitJson(
                      `/api/admin/request-type-fields/${fieldId}`,
                      "PATCH",
                      body,
                      "Champ dynamique mis à jour.",
                    ),
                  )
                }
              />
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeader
          icon={Waypoints}
          title="Templates et étapes workflow"
          detail="Versionne tes flux, choisis les modes d’approbation et règle les SLA étape par étape."
        />

        <CreateTemplateForm
          requestTypes={data.requestTypes}
          isPending={isPending}
          onSubmit={(body) =>
            handleAsync(async () =>
              submitJson("/api/admin/workflow-templates", "POST", body, "Template créé."),
            )
          }
        />

        <div className="mt-5 space-y-5">
          {data.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              requestTypes={data.requestTypes}
              profiles={data.profiles}
              departments={data.departments}
              isPending={isPending}
              onSave={(body) =>
                handleAsync(async () =>
                  submitJson(
                    `/api/admin/workflow-templates/${template.id}`,
                    "PATCH",
                    body,
                    "Template mis à jour.",
                  ),
                )
              }
              onAddStep={(body) =>
                handleAsync(async () =>
                  submitJson(
                    `/api/admin/workflow-templates/${template.id}/steps`,
                    "POST",
                    body,
                    "Étape ajoutée.",
                  ),
                )
              }
              onUpdateStep={(stepId, body) =>
                handleAsync(async () =>
                  submitJson(
                    `/api/admin/workflow-template-steps/${stepId}`,
                    "PATCH",
                    body,
                    "Étape mise à jour.",
                  ),
                )
              }
            />
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Users;
  title: string;
  detail: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)]/70 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white/85">
        <Icon className="h-4 w-4 text-[color:var(--foreground)]" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

function OpsTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </p>
      <p
        title={value}
        className="mt-3 break-words text-lg font-semibold text-[color:var(--foreground)]"
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
    </div>
  );
}

function CreateRequestTypeForm({
  departments,
  isPending,
  onSubmit,
}: {
  departments: AdminDepartment[];
  isPending: boolean;
  onSubmit: (body: {
    code: string;
    name: string;
    description: string;
    departmentId: string | null;
    defaultSlaHours: number;
    isActive: boolean;
  }) => void;
}) {
  return (
    <form
      className="rounded-[24px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          code: String(formData.get("code") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          departmentId: stringOrNull(formData.get("departmentId")),
          defaultSlaHours: Number(formData.get("defaultSlaHours") ?? 24),
          isActive: true,
        });
        event.currentTarget.reset();
      }}
    >
      <p className="text-sm font-medium text-[color:var(--foreground)]">Ajouter un type</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <LabeledInput label="Code" name="code" placeholder="legal" />
        <LabeledInput label="Nom" name="name" placeholder="Juridique" />
        <LabeledInput
          label="SLA (h)"
          name="defaultSlaHours"
          placeholder="48"
          type="number"
          defaultValue="24"
        />
        <LabeledSelect className="md:col-span-3" label="Département" name="departmentId">
          <option value="">Aucun</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </LabeledSelect>
        <LabeledInput
          className="md:col-span-3"
          label="Description"
          name="description"
          placeholder="Demandes juridiques, contrats, conformité..."
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
      >
        Ajouter
      </button>
    </form>
  );
}

function RequestTypeCard({
  requestType,
  departments,
  isPending,
  onSave,
  onAddField,
  onUpdateField,
}: {
  requestType: AdminRequestType;
  departments: AdminDepartment[];
  isPending: boolean;
  onSave: (body: {
    code: string;
    name: string;
    description: string;
    departmentId: string | null;
    defaultSlaHours: number;
    isActive: boolean;
  }) => void;
  onAddField: (body: Record<string, unknown>) => void;
  onUpdateField: (fieldId: string, body: Record<string, unknown>) => void;
}) {
  return (
    <div className="rounded-[26px] border border-[color:var(--line)] bg-white/80 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            code: String(formData.get("code") ?? ""),
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            departmentId: stringOrNull(formData.get("departmentId")),
            defaultSlaHours: Number(formData.get("defaultSlaHours") ?? 24),
            isActive: formData.get("isActive") === "on",
          });
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[color:var(--foreground)]">{requestType.name}</p>
            <p className="text-sm text-[color:var(--muted)]">
              {requestType.code} · {requestType.departmentName} · {requestType.formSections.length} section(s)
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] disabled:opacity-60"
          >
            Sauver
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <LabeledInput label="Code" name="code" defaultValue={requestType.code} />
          <LabeledInput label="Nom" name="name" defaultValue={requestType.name} />
          <LabeledInput
            label="SLA (h)"
            name="defaultSlaHours"
            type="number"
            defaultValue={String(requestType.defaultSlaHours)}
          />
          <LabeledSelect
            label="Département"
            name="departmentId"
            defaultValue={requestType.departmentId ?? ""}
          >
            <option value="">Aucun</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </LabeledSelect>
          <LabeledCheckbox
            label="Actif"
            name="isActive"
            defaultChecked={requestType.isActive}
          />
          <LabeledInput
            className="md:col-span-3"
            label="Description"
            name="description"
            defaultValue={requestType.description}
          />
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {requestType.formSections.map((section) => (
          <div key={section.key} className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface)]/75 p-4">
            <p className="text-sm font-medium text-[color:var(--foreground)]">{section.title}</p>
            <div className="mt-3 space-y-3">
              {section.fields.map((field, index) => (
                <form
                  key={field.id}
                  className="grid gap-3 rounded-[18px] border border-[color:var(--line)] bg-white/80 p-3 md:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    onUpdateField(field.id, {
                      sectionKey: String(formData.get("sectionKey") ?? ""),
                      sectionTitle: String(formData.get("sectionTitle") ?? ""),
                      fieldKey: String(formData.get("fieldKey") ?? ""),
                      label: String(formData.get("label") ?? ""),
                      fieldType: formData.get("fieldType"),
                      helperText: String(formData.get("helperText") ?? ""),
                      placeholder: stringOrNull(formData.get("placeholder")),
                      required: formData.get("required") === "on",
                      width: formData.get("width"),
                      options: splitOptions(String(formData.get("options") ?? "")),
                      sortOrder: Number(formData.get("sortOrder") ?? index + 1),
                      isActive: formData.get("isActive") === "on",
                    });
                  }}
                >
                  <LabeledInput label="Label" name="label" defaultValue={field.label} />
                  <LabeledInput label="Clé" name="fieldKey" defaultValue={field.key} />
                  <LabeledSelect label="Type" name="fieldType" defaultValue={field.type}>
                    <option value="text">Texte</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Liste</option>
                    <option value="currency">Montant</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Checkbox</option>
                  </LabeledSelect>
                  <LabeledInput label="Section key" name="sectionKey" defaultValue={section.key} />
                  <LabeledInput label="Section title" name="sectionTitle" defaultValue={section.title} />
                  <LabeledInput label="Ordre" name="sortOrder" type="number" defaultValue={String(index + 1)} />
                  <LabeledInput className="md:col-span-3" label="Helper" name="helperText" defaultValue={field.helper} />
                  <LabeledInput className="md:col-span-2" label="Placeholder" name="placeholder" defaultValue={field.placeholder ?? ""} />
                  <LabeledInput label="Options CSV" name="options" defaultValue={field.options.join(", ")} />
                  <LabeledSelect label="Largeur" name="width" defaultValue={field.width}>
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                  </LabeledSelect>
                  <LabeledCheckbox label="Requis" name="required" defaultChecked={field.required} />
                  <LabeledCheckbox label="Actif" name="isActive" defaultChecked />
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
                    >
                      Sauver le champ
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateFieldForm
        isPending={isPending}
        onSubmit={onAddField}
      />
    </div>
  );
}

function CreateFieldForm({
  isPending,
  onSubmit,
}: {
  isPending: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="mt-4 rounded-[22px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          sectionKey: String(formData.get("sectionKey") ?? ""),
          sectionTitle: String(formData.get("sectionTitle") ?? ""),
          fieldKey: String(formData.get("fieldKey") ?? ""),
          label: String(formData.get("label") ?? ""),
          fieldType: formData.get("fieldType"),
          helperText: String(formData.get("helperText") ?? ""),
          placeholder: stringOrNull(formData.get("placeholder")),
          required: formData.get("required") === "on",
          width: formData.get("width"),
          options: splitOptions(String(formData.get("options") ?? "")),
          sortOrder: Number(formData.get("sortOrder") ?? 1),
          isActive: true,
        });
        event.currentTarget.reset();
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
        <Sparkles className="h-4 w-4" />
        Ajouter un champ dynamique
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <LabeledInput label="Section key" name="sectionKey" placeholder="general" />
        <LabeledInput label="Section title" name="sectionTitle" placeholder="Informations complémentaires" />
        <LabeledInput label="Field key" name="fieldKey" placeholder="cost_center" />
        <LabeledInput label="Label" name="label" placeholder="Centre de coût" />
        <LabeledSelect label="Type" name="fieldType">
          <option value="text">Texte</option>
          <option value="textarea">Textarea</option>
          <option value="select">Liste</option>
          <option value="currency">Montant</option>
          <option value="date">Date</option>
          <option value="checkbox">Checkbox</option>
        </LabeledSelect>
        <LabeledInput label="Ordre" name="sortOrder" type="number" defaultValue="1" />
        <LabeledInput className="md:col-span-3" label="Helper" name="helperText" />
        <LabeledInput className="md:col-span-2" label="Placeholder" name="placeholder" />
        <LabeledInput label="Options CSV" name="options" placeholder="mineur, modere, majeur" />
        <LabeledSelect label="Largeur" name="width" defaultValue="full">
          <option value="full">Full</option>
          <option value="half">Half</option>
        </LabeledSelect>
        <LabeledCheckbox label="Requis" name="required" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
      >
        Ajouter le champ
      </button>
    </form>
  );
}

function CreateTemplateForm({
  requestTypes,
  isPending,
  onSubmit,
}: {
  requestTypes: AdminRequestType[];
  isPending: boolean;
  onSubmit: (body: {
    code: string;
    name: string;
    description: string;
    requestTypeId: string | null;
    version: number;
    isActive: boolean;
  }) => void;
}) {
  return (
    <form
      className="rounded-[24px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          code: String(formData.get("code") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          requestTypeId: stringOrNull(formData.get("requestTypeId")),
          version: Number(formData.get("version") ?? 1),
          isActive: true,
        });
        event.currentTarget.reset();
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
        <Blocks className="h-4 w-4" />
        Ajouter un template workflow
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <LabeledInput label="Code" name="code" placeholder="purchase_fast_track" />
        <LabeledInput label="Nom" name="name" placeholder="Achat rapide" />
        <LabeledInput label="Version" name="version" type="number" defaultValue="1" />
        <LabeledSelect label="Type de demande" name="requestTypeId">
          <option value="">Aucun</option>
          {requestTypes.map((requestType) => (
            <option key={requestType.id} value={requestType.id}>
              {requestType.name}
            </option>
          ))}
        </LabeledSelect>
        <LabeledInput
          className="md:col-span-4"
          label="Description"
          name="description"
          placeholder="Manager puis Procurement puis Finance."
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
      >
        Ajouter
      </button>
    </form>
  );
}

function TemplateCard({
  template,
  requestTypes,
  profiles,
  departments,
  isPending,
  onSave,
  onAddStep,
  onUpdateStep,
}: {
  template: AdminWorkflowTemplate;
  requestTypes: AdminRequestType[];
  profiles: AdminProfile[];
  departments: AdminDepartment[];
  isPending: boolean;
  onSave: (body: {
    code: string;
    name: string;
    description: string;
    requestTypeId: string | null;
    version: number;
    isActive: boolean;
  }) => void;
  onAddStep: (body: Record<string, unknown>) => void;
  onUpdateStep: (stepId: string, body: Record<string, unknown>) => void;
}) {
  return (
    <div className="rounded-[26px] border border-[color:var(--line)] bg-white/80 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            code: String(formData.get("code") ?? ""),
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            requestTypeId: stringOrNull(formData.get("requestTypeId")),
            version: Number(formData.get("version") ?? 1),
            isActive: formData.get("isActive") === "on",
          });
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[color:var(--foreground)]">{template.name}</p>
            <p className="text-sm text-[color:var(--muted)]">
              {template.code} · {template.requestTypeName} · {template.steps.length} étape(s)
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] disabled:opacity-60"
          >
            Sauver
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <LabeledInput label="Code" name="code" defaultValue={template.code} />
          <LabeledInput label="Nom" name="name" defaultValue={template.name} />
          <LabeledInput label="Version" name="version" type="number" defaultValue={String(template.version)} />
          <LabeledSelect label="Type de demande" name="requestTypeId" defaultValue={template.requestTypeId ?? ""}>
            <option value="">Aucun</option>
            {requestTypes.map((requestType) => (
              <option key={requestType.id} value={requestType.id}>
                {requestType.name}
              </option>
            ))}
          </LabeledSelect>
          <LabeledInput className="md:col-span-3" label="Description" name="description" defaultValue={template.description} />
          <LabeledCheckbox label="Actif" name="isActive" defaultChecked={template.isActive} />
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {template.steps.map((step) => (
          <form
            key={step.id}
            className="grid gap-3 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)]/75 p-4 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onUpdateStep(step.id, {
                stepOrder: Number(formData.get("stepOrder") ?? step.stepOrder),
                name: String(formData.get("name") ?? ""),
                kind: formData.get("kind"),
                approverMode: formData.get("approverMode"),
                approverUserId: stringOrNull(formData.get("approverUserId")),
                approverDepartmentId: stringOrNull(formData.get("approverDepartmentId")),
                minApprovals: Number(formData.get("minApprovals") ?? 1),
                slaHours: Number(formData.get("slaHours") ?? 24),
                conditionJson: parseJson(String(formData.get("conditionJson") ?? "{}")),
              });
            }}
          >
            <LabeledInput label="Ordre" name="stepOrder" type="number" defaultValue={String(step.stepOrder)} />
            <LabeledInput label="Nom" name="name" defaultValue={step.name} />
            <LabeledSelect label="Type" name="kind" defaultValue={step.kind}>
              <option value="approval">Approval</option>
              <option value="review">Review</option>
              <option value="task">Task</option>
              <option value="payment">Payment</option>
              <option value="notification">Notification</option>
            </LabeledSelect>
            <LabeledSelect label="Approver mode" name="approverMode" defaultValue={step.approverMode}>
              <option value="manager">Manager</option>
              <option value="department_role">Department role</option>
              <option value="dynamic">Dynamic</option>
              <option value="user">User</option>
            </LabeledSelect>
            <LabeledSelect label="Utilisateur ciblé" name="approverUserId" defaultValue={step.approverUserId ?? ""}>
              <option value="">Aucun</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </LabeledSelect>
            <LabeledSelect label="Département ciblé" name="approverDepartmentId" defaultValue={step.approverDepartmentId ?? ""}>
              <option value="">Aucun</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </LabeledSelect>
            <LabeledInput label="Min approvals" name="minApprovals" type="number" defaultValue={String(step.minApprovals)} />
            <LabeledInput label="SLA (h)" name="slaHours" type="number" defaultValue={String(step.slaHours)} />
            <LabeledInput
              className="md:col-span-4"
              label="Conditions JSON"
              name="conditionJson"
              defaultValue={JSON.stringify(step.conditionJson ?? {})}
            />
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
              >
                Sauver l’étape
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        className="mt-4 rounded-[22px] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onAddStep({
            stepOrder: Number(formData.get("stepOrder") ?? 1),
            name: String(formData.get("name") ?? ""),
            kind: formData.get("kind"),
            approverMode: formData.get("approverMode"),
            approverUserId: stringOrNull(formData.get("approverUserId")),
            approverDepartmentId: stringOrNull(formData.get("approverDepartmentId")),
            minApprovals: Number(formData.get("minApprovals") ?? 1),
            slaHours: Number(formData.get("slaHours") ?? 24),
            conditionJson: parseJson(String(formData.get("conditionJson") ?? "{}")),
          });
          event.currentTarget.reset();
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
          <Sparkles className="h-4 w-4" />
          Ajouter une étape
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <LabeledInput label="Ordre" name="stepOrder" type="number" defaultValue="1" />
          <LabeledInput label="Nom" name="name" placeholder="Validation finance" />
          <LabeledSelect label="Type" name="kind">
            <option value="approval">Approval</option>
            <option value="review">Review</option>
            <option value="task">Task</option>
            <option value="payment">Payment</option>
            <option value="notification">Notification</option>
          </LabeledSelect>
          <LabeledSelect label="Approver mode" name="approverMode">
            <option value="manager">Manager</option>
            <option value="department_role">Department role</option>
            <option value="dynamic">Dynamic</option>
            <option value="user">User</option>
          </LabeledSelect>
          <LabeledSelect label="Utilisateur ciblé" name="approverUserId">
            <option value="">Aucun</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
              </option>
            ))}
          </LabeledSelect>
          <LabeledSelect label="Département ciblé" name="approverDepartmentId">
            <option value="">Aucun</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </LabeledSelect>
          <LabeledInput label="Min approvals" name="minApprovals" type="number" defaultValue="1" />
          <LabeledInput label="SLA (h)" name="slaHours" type="number" defaultValue="24" />
          <LabeledInput className="md:col-span-4" label="Conditions JSON" name="conditionJson" defaultValue="{}" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] disabled:opacity-60"
        >
          Ajouter l’étape
        </button>
      </form>
    </div>
  );
}

function LabeledInput({
  label,
  name,
  className = "",
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  className?: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-[16px] border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--foreground)] outline-none"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  name,
  className = "",
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  className?: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-[16px] border border-[color:var(--line)] bg-white px-3 text-sm text-[color:var(--foreground)] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function LabeledCheckbox({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[16px] border border-[color:var(--line)] bg-white px-3 py-3 text-sm text-[color:var(--foreground)]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function stringOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function splitOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
