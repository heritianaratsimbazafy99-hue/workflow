import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChartColumnIncreasing,
  Clock3,
  Database,
  FileCheck2,
  Fingerprint,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Workflow,
} from "lucide-react";
import {
  approvalInbox,
  auditTimeline,
  automationRules,
  dashboardMetrics,
  deliveryPhases,
  platformModules,
  requestTypes,
  stackChoices,
  workflowTemplates,
} from "@/lib/workflow/mock-data";

export default function Home() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(15,143,113,0.18),transparent_20%),radial-gradient(circle_at_82%_12%,rgba(255,131,88,0.16),transparent_18%),radial-gradient(circle_at_65%_70%,rgba(243,222,192,0.55),transparent_28%)]" />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <section className="rounded-[32px] border border-[color:var(--line)] bg-[color:var(--surface)] px-5 py-5 shadow-[var(--shadow)] backdrop-blur md:px-8 md:py-7">
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-4 border-b border-[color:var(--line)] pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--surface-strong)] shadow-lg">
                  <Waypoints className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
                    Noria
                  </p>
                  <p className="text-sm text-[color:var(--foreground)]">
                    Centre de demandes internes
                  </p>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
                <a
                  className="rounded-full border border-[color:var(--line)] px-4 py-2"
                  href="#modules"
                >
                  Modules
                </a>
                <a
                  className="rounded-full border border-[color:var(--line)] px-4 py-2"
                  href="#architecture"
                >
                  Architecture
                </a>
                <a
                  className="rounded-full border border-[color:var(--line)] px-4 py-2"
                  href="#cron"
                >
                  Cron
                </a>
              </nav>
            </header>

            <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  <span className="rounded-full bg-[color:var(--brand-soft)] px-3 py-2 text-[color:var(--foreground)]">
                    Supabase
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-2">
                    Vercel
                  </span>
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-2 text-[color:var(--foreground)]">
                    Cron idempotent
                  </span>
                </div>

                <div className="space-y-5">
                  <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.04em] text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
                    Centraliser chaque demande interne dans un flux clair,
                    traçable et rapide.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
                    Budget, réparation, paiement, achat, IT ou RH. Une seule
                    interface pour soumettre, approuver, relancer, auditer et
                    piloter les demandes de toute la société.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboardMetrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)]"
                    href="/workspace"
                  >
                    Ouvrir l&apos;application
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--line)] bg-white/60 px-5 py-3 text-sm font-medium text-[color:var(--foreground)]"
                    href="#modules"
                  >
                    Explorer les modules MVP
                  </a>
                </div>
              </div>

              <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-4 shadow-[0_16px_48px_rgba(19,33,31,0.08)] backdrop-blur md:p-5">
                <div className="flex items-center justify-between rounded-[22px] bg-[color:var(--foreground)] px-4 py-4 text-[color:var(--surface-strong)]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                      Aperçu cockpit
                    </p>
                    <p className="mt-2 text-xl font-medium">
                      File d&apos;approbation unifiée
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-white/80">
                    Temps réel
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="À approuver"
                    value="18"
                    tone="bg-[color:var(--brand-soft)]"
                  />
                  <MiniStat
                    label="En retard"
                    value="4"
                    tone="bg-[color:var(--accent-soft)]"
                  />
                  <MiniStat
                    label="Escalades"
                    value="2"
                    tone="bg-[color:var(--surface-strong)]"
                  />
                </div>

                <div className="mt-4 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                        Inbox approbateurs
                      </p>
                      <p className="mt-1 text-lg font-medium">
                        Priorités du moment
                      </p>
                    </div>
                    <LayoutDashboard className="h-5 w-5 text-[color:var(--muted)]" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {approvalInbox.map((item) => (
                      <InboxRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
                  <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                      Workflow live
                    </p>
                    <div className="mt-4 space-y-4">
                      {workflowTemplates[0].steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-start gap-3"
                        >
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-sm font-medium text-[color:var(--foreground)]">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{step.name}</p>
                            <p className="text-sm text-[color:var(--muted)]">
                              {step.assigneeLabel} · {step.rule}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                      Historique du jour
                    </p>
                    <div className="mt-4 space-y-4">
                      {auditTimeline.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="border-l border-[color:var(--line)] pl-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium">{event.action}</p>
                            <span className="font-mono text-xs text-[color:var(--muted)]">
                              {event.at}
                            </span>
                          </div>
                          <p className="text-sm text-[color:var(--muted)]">
                            {event.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="modules"
          className="grid gap-6 xl:grid-cols-[1.03fr_0.97fr]"
        >
          <div className="rounded-[30px] border border-[color:var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur md:p-7">
            <SectionHeading
              eyebrow="Modules MVP"
              title="Les briques qui rendent l'outil réellement exploitable"
              description="Le produit est pensé comme une plateforme mono-entreprise: demande, workflow, approbation, notification et audit. Pas un simple formulaire empilé."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {platformModules.map((module) => (
                <FeatureCard key={module.title} module={module} />
              ))}
            </div>
          </div>

          <div
            id="architecture"
            className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--foreground)] p-5 text-[color:var(--surface-strong)] shadow-[0_22px_72px_rgba(19,33,31,0.2)] md:p-7"
          >
            <SectionHeading
              eyebrow="Architecture cible"
              title="Un socle simple à déployer, assez sérieux pour aller en production"
              description="On garde le coeur métier dans Postgres et l'orchestration côté serveur. Le scheduler ne contient aucune intelligence métier."
              light
            />

            <div className="mt-6 space-y-3">
              {stackChoices.map((item) => (
                <StackCard key={item.title} item={item} />
              ))}
            </div>

            <div
              id="cron"
              className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                Pipeline cron
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  "Scheduler Vercel ou cron-job.org",
                  "GET /api/cron/process-reminders",
                  "Lecture des demandes en retard",
                  "Relances, escalades et audit",
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/80"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
            <SectionHeading
              eyebrow="Catalogue"
              title="Des modèles de demandes pensés par cas métier"
              description="Chaque type de demande peut embarquer ses champs, ses SLA, ses pièces jointes et son parcours d'approbation."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {requestTypes.map((requestType) => (
                <RequestTypeCard key={requestType.id} requestType={requestType} />
              ))}
            </div>

            <div className="mt-6 rounded-[26px] border border-[color:var(--line)] bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Modèles de workflow
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {workflowTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4"
                  >
                    <p className="font-medium text-[color:var(--foreground)]">
                      {template.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      {template.summary}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      {template.steps.length} étapes · {template.coverage}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[color:var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur md:p-7">
            <SectionHeading
              eyebrow="Automatisation"
              title="Règles, relances et historique exploitable"
              description="Une timeline lisible pour le métier, une journalisation propre pour l'administration et des règles de notification pilotées par SLA."
            />

            <div className="mt-6 rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Règles actives
              </p>
              <div className="mt-4 space-y-3">
                {automationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium">{rule.name}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                          rule.status === "active"
                            ? "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                            : "bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--muted)]">
                      Déclencheur: {rule.trigger}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Action: {rule.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                Journal d&apos;activité
              </p>
              <div className="mt-4 space-y-4">
                {auditTimeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-3 border-b border-[color:var(--line)] pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)]" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">
                          {event.actor} · {event.action}
                        </p>
                        <span className="font-mono text-xs text-[color:var(--muted)]">
                          {event.at}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[color:var(--line)] bg-white/70 p-5 shadow-[var(--shadow)] backdrop-blur md:p-7">
          <SectionHeading
            eyebrow="Roadmap de livraison"
            title="La trajectoire produit la plus saine pour avancer ensemble"
            description="On commence par un noyau exploitable en interne, puis on durcit progressivement la sécurité, les intégrations et les tableaux de bord."
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {deliveryPhases.map((item) => (
              <div
                key={item.phase}
                className="rounded-[26px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  {item.phase}
                </p>
                <p className="mt-3 text-xl font-medium text-[color:var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`text-xs uppercase tracking-[0.28em] ${
          light ? "text-white/60" : "text-[color:var(--muted)]"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-3xl leading-tight font-semibold tracking-[-0.04em] ${
          light ? "text-white" : "text-[color:var(--foreground)]"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-3 text-base leading-7 ${
          light ? "text-white/70" : "text-[color:var(--muted)]"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: "good" | "warning" | "neutral";
}) {
  const toneClassName = {
    good: "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]",
    warning: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]",
    neutral: "bg-white/80 text-[color:var(--foreground)]",
  }[tone];

  return (
    <div
      className={`rounded-[24px] border border-[color:var(--line)] p-4 ${toneClassName}`}
    >
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-sm">{trend}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      className={`rounded-[22px] border border-[color:var(--line)] px-4 py-4 ${tone}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function InboxRow({
  item,
}: {
  item: (typeof approvalInbox)[number];
}) {
  const statusClassName = {
    submitted: "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
    in_review: "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]",
    needs_changes: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]",
    approved: "bg-emerald-100 text-emerald-900",
    rejected: "bg-rose-100 text-rose-900",
    completed: "bg-slate-100 text-slate-900",
    draft: "bg-stone-100 text-stone-700",
  }[item.status];

  const priorityClassName = {
    low: "bg-stone-100 text-stone-700",
    normal: "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
    high: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]",
    critical: "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]",
  }[item.priority];

  return (
    <div className="rounded-[20px] border border-[color:var(--line)] bg-white/80 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-[color:var(--muted)]">
              {item.id}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${statusClassName}`}
            >
              {item.status}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${priorityClassName}`}
            >
              {item.priority}
            </span>
          </div>
          <p className="text-base font-medium text-[color:var(--foreground)]">
            {item.title}
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            {item.typeName} · {item.department} · {item.requester}
            {item.amount ? ` · ${item.amount}` : ""}
          </p>
        </div>
        <div className="text-left xl:text-right">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {item.currentStep}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{item.dueLabel}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  module,
}: {
  module: (typeof platformModules)[number];
}) {
  const Icon = {
    workflow: Workflow,
    "file-check": FileCheck2,
    bell: BellRing,
    chart: ChartColumnIncreasing,
    fingerprint: Fingerprint,
    shield: ShieldCheck,
  }[module.icon];

  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--surface-strong)] text-[color:var(--foreground)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xl font-medium tracking-[-0.03em]">
        {module.title}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
        {module.description}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
        {module.detail}
      </p>
    </div>
  );
}

function StackCard({
  item,
}: {
  item: (typeof stackChoices)[number];
}) {
  const Icon = {
    layout: LayoutDashboard,
    database: Database,
    mail: Mail,
    clock: Clock3,
  }[item.icon];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-medium text-white">{item.title}</p>
          <p className="mt-2 text-sm leading-7 text-white/70">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function RequestTypeCard({
  requestType,
}: {
  requestType: (typeof requestTypes)[number];
}) {
  const accentClassName = {
    teal: "bg-[color:var(--brand-soft)]",
    sand: "bg-[#f5e6ca]",
    coral: "bg-[color:var(--accent-soft)]",
    ink: "bg-[#dde4e2]",
  }[requestType.accent];

  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClassName}`}
        >
          <Sparkles className="h-5 w-5 text-[color:var(--foreground)]" />
        </div>
        <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          {requestType.department}
        </span>
      </div>
      <p className="mt-4 text-xl font-medium text-[color:var(--foreground)]">
        {requestType.name}
      </p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
        {requestType.description}
      </p>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
        SLA moyen {requestType.averageSlaHours} h
      </p>
    </div>
  );
}
