"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Radar,
  ShieldCheck,
  Users,
  Waypoints,
} from "lucide-react";
import type {
  AdminControlTowerData,
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

  const activeWorkflowTemplates = data.templates.filter((template) => template.isActive).length;
  const totalWorkflowSteps = data.templates.reduce(
    (total, template) => total + template.steps.length,
    0,
  );

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
          icon={Waypoints}
          title="Studio workflow dédié"
          detail="La création des flux d’approbation passe désormais par un écran guidé séparé, pensé pour aller plus vite et choisir les approbateurs sans jargon technique."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <OpsTile
            label="Types branchés"
            value={String(data.requestTypes.length)}
            detail="catalogue métier disponible"
          />
          <OpsTile
            label="Flux actifs"
            value={String(activeWorkflowTemplates)}
            detail="templates publiés"
          />
          <OpsTile
            label="Étapes configurées"
            value={String(totalWorkflowSteps)}
            detail="parcours actuellement en place"
          />
        </div>
        <div className="mt-5 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Workflow Studio centralisé
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[color:var(--muted)]">
            Workflow Studio concentre désormais la création des types de demandes, la composition des formulaires et le branchement des flux d’approbation dans un seul parcours.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/workflow-studio")}
              className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)]"
            >
              Ouvrir Workflow Studio
            </button>
            <button
              type="button"
              onClick={() => router.push("/requests/new")}
              className="rounded-full border border-[color:var(--line)] bg-white/86 px-4 py-2 text-sm font-medium text-[color:var(--foreground)]"
            >
              Tester un type en création
            </button>
          </div>
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

function stringOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
