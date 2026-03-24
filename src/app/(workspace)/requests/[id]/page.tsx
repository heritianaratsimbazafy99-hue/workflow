import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  History,
  MessageSquareMore,
  Paperclip,
  ShieldCheck,
  Users,
} from "lucide-react";
import { RequestAttachmentsPanel } from "@/components/workspace/request-attachments-panel";
import { RequestDecisionPanel } from "@/components/workspace/request-decision-panel";
import { RequestLiveRefresh } from "@/components/workspace/request-live-refresh";
import { RequestResubmitPanel } from "@/components/workspace/request-resubmit-panel";
import { getRequestDetailData } from "@/lib/workflow/engine";
import {
  DueBadge,
  LabeledValue,
  PageHeader,
  PillLink,
  PriorityBadge,
  SectionTitle,
  StatusBadge,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetailData(id);

  if (!detail) {
    notFound();
  }

  const {
    actor,
    request,
    conversation,
    messages,
    history,
    canAct,
    canResubmit,
    currentApproverLabel,
  } = detail;

  return (
    <div className="space-y-6">
      {actor.mode === "live" ? (
        <RequestLiveRefresh
          requestId={request.id}
          conversationId={request.conversationId || null}
        />
      ) : null}

      <PageHeader
        eyebrow={request.reference}
        title={request.title}
        description={request.description}
        actions={
          <>
            <PillLink href="/approvals" label="Retour approvals" />
            <PillLink
              href={
                request.conversationId
                  ? `/messages?conversation=${request.conversationId}`
                  : "/messages"
              }
              label="Ouvrir la messagerie"
              tone="primary"
            />
          </>
        }
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
            <DueBadge state={request.dueState} label={request.dueLabel} />
            <span className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-sm text-[color:var(--foreground)]">
              Étape: {request.currentStep}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[26rem]">
            <LabeledValue
              label="Workflow"
              value={request.templateName}
              detail={currentApproverLabel ? `Validateur actuel: ${currentApproverLabel}` : undefined}
            />
            <LabeledValue
              label="Référence dossier"
              value={request.reference}
              detail={request.submittedAt}
            />
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryStat
          label="Type"
          value={request.typeName}
          icon={FileText}
          detail={request.department}
        />
        <SummaryStat
          label="Demandeur"
          value={request.requester}
          valueTitle={request.requesterFullName ?? request.requester}
          valueClassName="truncate text-[2.15rem] leading-none"
          icon={Users}
          detail={request.requesterRole}
        />
        <SummaryStat
          label="Montant"
          value={request.amount ?? "n/a"}
          icon={ShieldCheck}
          detail="Montant estimé"
        />
        <SummaryStat
          label="Pièces"
          value={String(request.attachments.length)}
          icon={Paperclip}
          detail="Fichiers liés"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <SectionTitle
              title="Contexte et règle métier"
              description="Le dossier reste lisible pour l'approbateur comme pour l'audit."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Informations clés
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <LabeledValue
                    label="Demandeur"
                    value={request.requesterFullName ?? request.requester}
                    detail={request.requesterHandle ? `@${request.requesterHandle}` : undefined}
                    valueTitle={request.requesterFullName ?? request.requester}
                  />
                  <LabeledValue label="Rôle" value={request.requesterRole} />
                  <LabeledValue label="Département" value={request.department} />
                  <LabeledValue label="Soumise le" value={request.submittedAt} />
                </div>
              </div>
              <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Règle appliquée
                </p>
                <p className="mt-4 text-sm leading-7 text-[color:var(--foreground)]">
                  {request.businessRule}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Étapes d'approbation"
              description="Ce sont les instances réelles de workflow générées pour cette demande."
            />
            <div className="space-y-4">
              {request.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex gap-4 rounded-[24px] border border-[color:var(--line)] bg-white/82 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-sm font-medium text-[color:var(--foreground)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-lg font-medium text-[color:var(--foreground)]">
                        {step.name}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                          step.status === "approved"
                            ? "bg-emerald-100 text-emerald-900"
                            : step.status === "active"
                              ? "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                              : step.status === "escalated"
                                ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]"
                                : step.status === "rejected"
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      Responsable: {step.owner} · Deadline {step.deadline}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                      {step.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Données métier"
              description="Les champs dynamiques du type de demande restent lisibles dans le dossier."
            />
            {request.customFields.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucun champ métier supplémentaire renseigné pour cette demande.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {request.customFields.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {field.section}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]">
                      {field.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Commentaires et décisions"
              description="Chaque décision enrichit l'historique du dossier."
            />
            <div className="space-y-3">
              {request.comments.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
                  Aucun commentaire manuel pour le moment.
                </div>
              ) : (
                request.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p
                        title={`${comment.author} · ${comment.role}`}
                        className="truncate font-medium text-[color:var(--foreground)]"
                      >
                        {comment.author} · {comment.role}
                      </p>
                      <span className="font-mono text-xs text-[color:var(--muted)]">
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-[color:var(--muted)]">
                      {comment.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Historique d'audit"
              description="Journal technique des décisions, transitions et actions automatiques."
            />
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
                  Aucun événement d’audit supplémentaire à afficher.
                </div>
              ) : (
                history.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-[color:var(--foreground)]">
                        {event.action}
                      </p>
                      <span className="font-mono text-xs text-[color:var(--muted)]">
                        {event.at}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
                      {event.actor}
                    </p>
                    <p className="mt-2 break-words text-sm leading-6 text-[color:var(--muted)]">
                      {event.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="SLA et relances"
              description="Rappels et escalades déjà émis sur ce dossier."
            />
            {request.slaEvents.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
                Aucun rappel SLA émis pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {request.slaEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-[color:var(--foreground)]">
                        {event.kind === "escalation" ? "Escalade" : "Rappel"}
                      </p>
                      <span className="font-mono text-xs text-[color:var(--muted)]">
                        {event.createdAt}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      Destinataire: {event.recipient}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      {event.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6 self-start xl:sticky xl:top-6">
          <RequestDecisionPanel
            requestReference={request.reference}
            canAct={canAct}
            currentApproverLabel={currentApproverLabel}
          />
          <RequestResubmitPanel
            requestReference={request.reference}
            canResubmit={canResubmit}
          />

          <SurfaceCard>
            <SectionTitle
              title="Participants"
              description="La demande, ses approbateurs et les personnes à informer."
            />
            <div className="flex flex-wrap gap-2">
              {request.participants.map((participant) => (
                <span
                  key={participant}
                  title={participant}
                  className="max-w-full truncate rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm text-[color:var(--foreground)]"
                >
                  {participant}
                </span>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Pièces jointes"
              description="Les fichiers sont centralisés dans le dossier."
            />
            <RequestAttachmentsPanel
              requestReference={request.reference}
              initialAttachments={request.attachments}
              canUpload={actor.mode === "live"}
            />
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Messagerie liée"
              description={
                conversation
                  ? conversation.context
                  : "Canal de conversation associé au dossier."
              }
            />
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/75 p-4 text-sm leading-6 text-[color:var(--muted)]">
                  Aucun message encore lié à ce dossier.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-[22px] p-4 ${
                      message.kind === "system"
                        ? "border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
                        : message.isOwn
                          ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                          : "border border-[color:var(--line)] bg-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium">{message.author}</p>
                      <span
                        className={`font-mono text-xs ${
                          message.isOwn && message.kind !== "system"
                            ? "text-white/65"
                            : "text-[color:var(--muted)]"
                        }`}
                      >
                        {message.createdAt}
                      </span>
                    </div>
                    <p
                      className={`mt-2 break-words text-sm leading-6 ${
                        message.isOwn && message.kind !== "system"
                          ? "text-white/85"
                          : "text-[color:var(--muted)]"
                      }`}
                    >
                      {message.body}
                    </p>
                  </div>
                ))
              )}
            </div>
            <Link
              href={
                request.conversationId
                  ? `/messages?conversation=${request.conversationId}`
                  : "/messages"
              }
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
            >
              <MessageSquareMore className="h-4 w-4" />
              Basculer vers la messagerie
            </Link>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle
              title="Trace d'exécution"
              description="Ce bloc te permet de voir immédiatement si le moteur est bien branché."
            />
            <div className="grid gap-3">
              <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
                  <History className="h-4 w-4" />
                  Workflow live + historique versionné
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  Les décisions écrivent désormais dans les étapes d’instance, les commentaires,
                  le journal d’audit et les notifications serveur.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledValue
                  label="Mode runtime"
                  value={actor.mode === "live" ? "Supabase live" : "Configuration requise"}
                />
                <LabeledValue
                  label="Canal dossier"
                  value={conversation ? "Messagerie liée active" : "Aucun canal lié"}
                />
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
