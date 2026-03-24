"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCheck, ShieldCheck } from "lucide-react";
import type { NotificationItem, NotificationPreference } from "@/lib/workflow/types";

export function NotificationsCenter({
  initialItems,
  initialPreference,
}: {
  initialItems: NotificationItem[];
  initialPreference: NotificationPreference;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [preference, setPreference] = useState(initialPreference);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id);

  function savePreferences(next: NotificationPreference) {
    setPreference(next);
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/notification-preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(next),
        });

        if (!response.ok) {
          setFeedback("Impossible de sauvegarder les préférences.");
          return;
        }

        setFeedback("Préférences enregistrées.");
        router.refresh();
      })();
    });
  }

  function markAllAsRead() {
    if (unreadIds.length === 0) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        unreadIds.includes(item.id)
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );

    startTransition(() => {
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: unreadIds }),
      });
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-6">
        <NotificationPanel
          title="Canaux"
          icon={BellRing}
          description="Choisis précisément ce qui doit rester in-app, ce qui part en email et ce qui peut attendre un digest."
        >
          <ToggleRow
            label="Notifications in-app globales"
            checked={preference.inAppEnabled}
            onChange={(checked) => savePreferences({ ...preference, inAppEnabled: checked })}
          />
          <ToggleRow
            label="Emails globaux"
            checked={preference.emailEnabled}
            onChange={(checked) => savePreferences({ ...preference, emailEnabled: checked })}
          />
          <ToggleRow
            label="Digest"
            checked={preference.digestEnabled}
            onChange={(checked) => savePreferences({ ...preference, digestEnabled: checked })}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Fréquence digest
            </p>
            <div className="mt-2 flex gap-3">
              {(["daily", "weekly"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    savePreferences({
                      ...preference,
                      digestFrequency: value,
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm ${
                    preference.digestFrequency === value
                      ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
                      : "border border-[color:var(--line)] bg-white text-[color:var(--foreground)]"
                  }`}
                >
                  {value === "daily" ? "Quotidien" : "Hebdo"}
                </button>
              ))}
            </div>
          </div>
        </NotificationPanel>

        <NotificationPanel
          title="Catégories"
          icon={ShieldCheck}
          description="Ajuste finement approvals, messages, mentions et SLA."
        >
          <ToggleRow
            label="Approvals in-app"
            checked={preference.approvalsInApp}
            onChange={(checked) => savePreferences({ ...preference, approvalsInApp: checked })}
          />
          <ToggleRow
            label="Approvals email"
            checked={preference.approvalsEmail}
            onChange={(checked) => savePreferences({ ...preference, approvalsEmail: checked })}
          />
          <ToggleRow
            label="Messages in-app"
            checked={preference.messagesInApp}
            onChange={(checked) => savePreferences({ ...preference, messagesInApp: checked })}
          />
          <ToggleRow
            label="Messages email"
            checked={preference.messagesEmail}
            onChange={(checked) => savePreferences({ ...preference, messagesEmail: checked })}
          />
          <ToggleRow
            label="Mentions in-app"
            checked={preference.mentionsInApp}
            onChange={(checked) => savePreferences({ ...preference, mentionsInApp: checked })}
          />
          <ToggleRow
            label="Mentions email"
            checked={preference.mentionsEmail}
            onChange={(checked) => savePreferences({ ...preference, mentionsEmail: checked })}
          />
          <ToggleRow
            label="SLA in-app"
            checked={preference.slaInApp}
            onChange={(checked) => savePreferences({ ...preference, slaInApp: checked })}
          />
          <ToggleRow
            label="SLA email"
            checked={preference.slaEmail}
            onChange={(checked) => savePreferences({ ...preference, slaEmail: checked })}
          />
        </NotificationPanel>

        {feedback ? (
          <div className="rounded-[22px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--foreground)]">
            {feedback}
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_12px_40px_rgba(19,33,31,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Historique
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              Centre de notifications
            </h2>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadIds.length === 0 || isPending}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Tout lire
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[color:var(--line)] bg-white/70 p-4 text-sm leading-6 text-[color:var(--muted)]">
              Aucune notification pour le moment.
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className={`rounded-[22px] border p-4 ${
                  item.isRead
                    ? "border-[color:var(--line)] bg-white/70"
                    : "border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-[color:var(--foreground)]">{item.title}</p>
                  <span className="font-mono text-xs text-[color:var(--muted)]">
                    {item.createdAt}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {item.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  <span>{item.channel === "email" ? "Email" : "In-app"}</span>
                  <span>· {item.category}</span>
                  {item.requestReference ? <span>· {item.requestReference}</span> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function NotificationPanel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BellRing;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_12px_40px_rgba(19,33,31,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface-strong)]">
          <Icon className="h-4 w-4 text-[color:var(--foreground)]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[color:var(--line)] bg-white/80 px-4 py-3">
      <p className="text-sm text-[color:var(--foreground)]">{label}</p>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex h-7 w-12 items-center rounded-full p-1 ${
          checked ? "bg-[color:var(--foreground)]" : "bg-[color:var(--surface-strong)]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
