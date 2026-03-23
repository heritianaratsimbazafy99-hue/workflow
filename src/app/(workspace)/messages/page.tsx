import {
  Mail,
  MessageSquareMore,
  RadioTower,
  Users,
} from "lucide-react";
import { MessagesWorkspace } from "@/components/workspace/messages-workspace";
import {
  PageHeader,
  PillLink,
  SectionTitle,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";
import { getMessagesWorkspaceData } from "@/lib/workflow/messages";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getMessagesWorkspaceData(resolvedSearchParams.conversation);
  const uniqueParticipants = new Set(
    data.conversations.flatMap((conversation) => conversation.participants),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messagerie interne"
        title="Conversations liées aux demandes"
        description="Le produit peut centraliser les échanges directement dans les dossiers pour éviter la dispersion entre email, chat et commentaires séparés."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/requests/new" label="Nouvelle demande" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryStat
          label="Conversations actives"
          value={String(data.conversations.length)}
          icon={MessageSquareMore}
        />
        <SummaryStat
          label="Participants visibles"
          value={String(uniqueParticipants.size)}
          icon={Users}
        />
        <SummaryStat
          label="Emails immédiats prêts"
          value={data.mode === "live" ? "LIVE" : "ON"}
          icon={Mail}
        />
      </div>

      <SurfaceCard>
        <SectionTitle
          title="Messagerie workflow temps réel"
          description="Les échanges restent dans le produit, diffusés via Supabase Realtime, avec notifications in-app et option email immédiat côté serveur."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
              <RadioTower className="h-4 w-4 text-[color:var(--brand)]" />
              Live côté front
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Abonnement `messages` et `notifications` directement depuis le client
              quand la session Supabase est active.
            </p>
          </div>
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
              <Mail className="h-4 w-4 text-[color:var(--accent)]" />
              Emails immédiats
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Le serveur peut envoyer un email transactionnel au moment d’un
              événement sans dépendre du cron.
            </p>
          </div>
          <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
              <Users className="h-4 w-4 text-[color:var(--brand)]" />
              UX dossier
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Conversation, audit et décision restent collés à la demande au lieu
              d’être dispersés.
            </p>
          </div>
        </div>
      </SurfaceCard>

      <MessagesWorkspace
        currentUser={data.actor}
        initialConversations={data.conversations}
        initialActiveConversationId={data.activeConversationId}
        initialMessages={data.messages}
      />
    </div>
  );
}
