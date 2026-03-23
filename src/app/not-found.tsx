import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Ressource introuvable
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
        Ce dossier n&apos;existe pas ou n&apos;est plus accessible.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[color:var(--muted)]">
        Reviens au pilotage pour ouvrir une autre demande ou accéder à l&apos;inbox
        des approbations.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/workspace"
          className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-[color:var(--surface-strong)]"
        >
          Retour pilotage
        </Link>
        <Link
          href="/approvals"
          className="rounded-full border border-[color:var(--line)] bg-white/80 px-5 py-3 text-sm font-medium text-[color:var(--foreground)]"
        >
          Voir approvals
        </Link>
      </div>
    </div>
  );
}
