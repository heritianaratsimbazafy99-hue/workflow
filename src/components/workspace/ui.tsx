import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Flame, LucideIcon } from "lucide-react";
import type {
  DueState,
  RequestPriority,
  RequestStatus,
} from "@/lib/workflow/types";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(252,247,240,0.96),rgba(239,226,206,0.94))] px-6 py-6 shadow-[var(--shadow-soft)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(15,143,113,0.14),transparent_48%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-[color:var(--muted)]">
            {eyebrow}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)] sm:text-4xl">
          {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)]">
            {description}
          </p>
        </div>
        {actions ? <div className="relative flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(244,234,220,0.94),rgba(252,247,240,0.82))] p-5 shadow-[0_12px_40px_rgba(19,33,31,0.06)] backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-[color:var(--foreground)]"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const styles = {
    draft: "bg-stone-100 text-stone-700",
    submitted: "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
    in_review: "bg-[color:var(--brand-soft)] text-[color:var(--foreground)]",
    needs_changes: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]",
    approved: "bg-emerald-100 text-emerald-900",
    rejected: "bg-rose-100 text-rose-900",
    completed: "bg-slate-100 text-slate-900",
  }[status];

  const labels = {
    draft: "Brouillon",
    submitted: "Soumise",
    in_review: "En revue",
    needs_changes: "À corriger",
    approved: "Approuvée",
    rejected: "Rejetée",
    completed: "Terminée",
  }[status];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${styles}`}>
      {labels}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const styles = {
    low: "bg-stone-100 text-stone-700",
    normal: "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
    high: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)]",
    critical: "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]",
  }[priority];

  const labels = {
    low: "Faible",
    normal: "Normale",
    high: "Élevée",
    critical: "Critique",
  }[priority];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${styles}`}>
      {labels}
    </span>
  );
}

export function DueBadge({
  state,
  label,
}: {
  state: DueState;
  label: string;
}) {
  const styles = {
    on_track: "bg-[#e9efe5] text-[#35513f]",
    soon: "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]",
    overdue: "bg-[#ffe3dc] text-[#8f3c25]",
  }[state];

  const Icon = state === "overdue" ? AlertTriangle : state === "soon" ? Flame : Clock3;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function SummaryStat({
  label,
  value,
  icon: Icon,
  valueTitle,
  detail,
  valueClassName = "",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  valueTitle?: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(252,247,240,0.92),rgba(239,226,206,0.82))] p-4 shadow-[0_8px_26px_rgba(19,33,31,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[color:var(--muted)]">{label}</p>
          {detail ? (
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {detail}
            </p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/80">
          <Icon className="h-4 w-4 text-[color:var(--muted)]" />
        </div>
      </div>
      <p
        title={valueTitle}
        className={`mt-4 min-w-0 overflow-hidden text-3xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)] text-ellipsis whitespace-nowrap ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

export function PillLink({
  href,
  label,
  tone = "neutral",
}: {
  href: string;
  label: string;
  tone?: "neutral" | "primary";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-[0_8px_24px_rgba(19,33,31,0.06)] ${
        tone === "primary"
          ? "bg-[color:var(--foreground)] text-[color:var(--surface-strong)]"
          : "border border-[color:var(--line)] bg-white/88 text-[color:var(--foreground)]"
      }`}
    >
      {label}
    </Link>
  );
}

export function LabeledValue({
  label,
  value,
  detail,
  valueTitle,
}: {
  label: string;
  value: string;
  detail?: string;
  valueTitle?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--line)] bg-white/78 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </p>
      <p
        title={valueTitle}
        className="mt-3 break-words text-sm font-medium leading-6 text-[color:var(--foreground)]"
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}
