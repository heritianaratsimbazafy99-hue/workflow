import { BellRing, MailCheck } from "lucide-react";
import { NotificationsCenter } from "@/components/workspace/notifications-center";
import {
  PageHeader,
  PillLink,
  SummaryStat,
  SurfaceCard,
} from "@/components/workspace/ui";
import { getNotificationCenterData } from "@/lib/notifications/center";

export default async function NotificationsPage() {
  const data = await getNotificationCenterData();
  const unreadCount = data.items.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Centre de préférences et d’alertes"
        description="Tu peux maintenant régler le bruit, distinguer messages, approvals, SLA et choisir ce qui part immédiatement en email."
        actions={
          <>
            <PillLink href="/workspace" label="Retour pilotage" />
            <PillLink href="/reports" label="Voir les rapports" tone="primary" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryStat label="Notifications" value={String(data.items.length)} icon={BellRing} />
        <SummaryStat
          label="Non lues"
          value={String(unreadCount)}
          icon={BellRing}
          detail="À traiter"
        />
        <SummaryStat
          label="Emails actifs"
          value={data.preference.emailEnabled ? "ON" : "OFF"}
          icon={MailCheck}
          detail="Canal externe"
        />
      </div>

      <SurfaceCard>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[22px] border border-[color:var(--line)] bg-white/82 p-4">
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              Préférences granulaires
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Les canaux et catégories restent séparés pour limiter le bruit.
            </p>
          </div>
          <div className="rounded-[22px] border border-[color:var(--line)] bg-white/82 p-4">
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              Realtime côté app
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Le centre se rafraîchit automatiquement sur insertions et mises à jour.
            </p>
          </div>
          <div className="rounded-[22px] border border-[color:var(--line)] bg-white/82 p-4">
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              Lien dossier conservé
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Chaque alerte renvoie désormais vers la vraie référence métier du dossier.
            </p>
          </div>
        </div>
      </SurfaceCard>

      <NotificationsCenter
        initialItems={data.items}
        initialPreference={data.preference}
      />
    </div>
  );
}
