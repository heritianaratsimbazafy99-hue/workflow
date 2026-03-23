"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bot, SendHorizonal, Waypoints } from "lucide-react";
import type {
  FormSection,
  RequestPriority,
  RequestType,
  WorkflowTemplate,
} from "@/lib/workflow/types";

type RequestTypeOption = Pick<
  RequestType,
  "id" | "name" | "description" | "department" | "averageSlaHours" | "accent"
> & {
  code: string;
};

type TemplateOption = Pick<
  WorkflowTemplate,
  "id" | "name" | "summary" | "coverage" | "steps"
> & {
  code: string;
  requestTypeId: string;
  requestTypeCode: string | null;
};

export function RequestCreateForm({
  mode,
  requestTypes,
  templates,
  formSectionsByRequestType,
}: {
  mode: "demo" | "live";
  requestTypes: RequestTypeOption[];
  templates: TemplateOption[];
  formSectionsByRequestType: Record<string, FormSection[]>;
}) {
  const router = useRouter();
  const [requestTypeCode, setRequestTypeCode] = useState(
    requestTypes[0]?.code ?? "budget",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("normal");
  const [dynamicFields, setDynamicFields] = useState<Record<string, string | boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.requestTypeCode === requestTypeCode ||
          requestTypes.find((type) => type.code === requestTypeCode)?.id ===
            template.requestTypeId,
      ),
    [requestTypeCode, requestTypes, templates],
  );
  const [templateId, setTemplateId] = useState<string | null>(
    filteredTemplates[0]?.id ?? null,
  );

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === templateId) ??
    filteredTemplates[0] ??
    null;
  const selectedRequestType =
    requestTypes.find((requestType) => requestType.code === requestTypeCode) ?? null;
  const activeFormSections =
    (selectedRequestType &&
      (formSectionsByRequestType[selectedRequestType.id] ??
        formSectionsByRequestType[selectedRequestType.code])) ||
    formSectionsByRequestType[requestTypeCode] ||
    [];

  function handleTypeChange(nextCode: string) {
    setRequestTypeCode(nextCode);
    const nextTemplate =
      templates.find((template) => template.requestTypeCode === nextCode) ?? null;
    setTemplateId(nextTemplate?.id ?? null);
    setDynamicFields({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(() => {
      void submitForm();
    });
  }

  async function submitForm() {
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestTypeCode,
          templateId: selectedTemplate?.id ?? null,
          title,
          description,
          amount: amount.trim().length > 0 ? Number(amount) : null,
          priority,
          dynamicFields,
        }),
      });

      const data = (await response.json()) as {
        mode: "demo" | "live";
        reference?: string;
        note?: string;
        error?: string;
      };

      if (!response.ok) {
        setFeedback(data.error ?? "Impossible de créer la demande.");
        return;
      }

      if (data.mode === "live" && data.reference) {
        router.push(`/requests/${data.reference}`);
        router.refresh();
        return;
      }

      setFeedback(
        data.note ??
          "Mode démo actif. La vraie persistance démarre dès que Supabase Auth est branché.",
      );
    } catch {
      setFeedback("Erreur réseau pendant la création de la demande.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-[26px] border border-[color:var(--line)] bg-white/80 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)]">
            <Bot className="h-4 w-4 text-[color:var(--foreground)]" />
          </div>
          <div>
            <p className="text-lg font-medium text-[color:var(--foreground)]">
              Soumettre une demande
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              Le moteur choisit le template, instancie les étapes et notifie le
              premier approbateur.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Type de demande">
            <select
              value={requestTypeCode}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            >
              {requestTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priorité">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as RequestPriority)}
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            >
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Élevée</option>
              <option value="critical">Critique</option>
            </select>
          </Field>

          <Field label="Workflow appliqué">
            <select
              value={selectedTemplate?.id ?? ""}
              onChange={(event) => setTemplateId(event.target.value || null)}
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            >
              {filteredTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Montant estimé (EUR)">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="7400"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[color:var(--muted)]"
            />
          </Field>

          <Field label="Titre" className="md:col-span-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Remplacement groupe froid du site Nord"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[color:var(--muted)]"
            />
          </Field>

          <Field label="Description" className="md:col-span-2">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              placeholder="Contexte, impact business, urgence, éléments de décision..."
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm leading-7 outline-none placeholder:text-[color:var(--muted)]"
            />
          </Field>

          {activeFormSections.map((section) => (
            <div key={section.key} className="md:col-span-2">
              <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface)]/65 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  {section.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {section.description}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <Field
                      key={field.id || field.key}
                      label={field.label}
                      className={field.width === "full" ? "md:col-span-2" : ""}
                    >
                      <DynamicFieldInput
                        field={field}
                        value={dynamicFields[field.key] ?? (field.type === "checkbox" ? false : "")}
                        onChange={(value) =>
                          setDynamicFields((current) => ({
                            ...current,
                            [field.key]: value,
                          }))
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--surface-strong)]">
            <Waypoints className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium text-[color:var(--foreground)]">
              {selectedTemplate?.name ?? "Aucun workflow"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
              {selectedTemplate?.summary ??
                "Sélectionne un type de demande pour voir le workflow appliqué."}
            </p>
            <div className="mt-4 space-y-3">
              {selectedTemplate?.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex gap-3 rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">{step.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {step.assigneeLabel} · {step.rule} · SLA {step.slaHours} h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm text-[color:var(--muted)]">
          Runtime {mode === "live" ? "Supabase live" : "Démo locale"}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizonal className="h-4 w-4" />
          {isPending ? "Soumission..." : "Créer la demande"}
        </button>
      </div>
    </form>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormSection["fields"][number];
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const baseClassName =
    "w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[color:var(--muted)]";

  if (field.type === "textarea") {
    return (
      <>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={field.placeholder ?? undefined}
          className={`${baseClassName} leading-7`}
        />
        <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{field.helper}</p>
      </>
    );
  }

  if (field.type === "select") {
    return (
      <>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={baseClassName}
        >
          <option value="">Sélectionner</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{field.helper}</p>
      </>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1"
        />
        <span className="leading-6">
          {field.helper || field.label}
        </span>
      </label>
    );
  }

  return (
    <>
      <input
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        type={field.type === "date" ? "date" : "text"}
        inputMode={field.type === "currency" ? "decimal" : undefined}
        placeholder={field.placeholder ?? undefined}
        className={baseClassName}
      />
      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{field.helper}</p>
    </>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}
