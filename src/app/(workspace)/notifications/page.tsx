import { BellRing, MailCheck } from "lucide-react";
import { NotificationsCenter } from "@/components/workspace/notifications-center";
import { PageHeader, PillLink, SummaryStat } from "@/components/workspace/ui";
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
        <SummaryStat label="Non lues" value={String(unreadCount)} icon={BellRing} />
        <SummaryStat
          label="Emails actifs"
          value={data.preference.emailEnabled ? "ON" : "OFF"}
          icon={MailCheck}
        />
      </div>

      <NotificationsCenter
        initialItems={data.items}
        initialPreference={data.preference}
      />
    </div>
  );
}
