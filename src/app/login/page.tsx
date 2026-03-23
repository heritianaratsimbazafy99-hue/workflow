import Link from "next/link";
import { ArrowLeft, LockKeyhole, Workflow } from "lucide-react";
import { resolveRuntimeActor } from "@/lib/workflow/runtime";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await resolveRuntimeActor();
  const resolvedSearchParams = await searchParams;
  const errorCode =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1320px] overflow-hidden border border-[color:var(--line)] bg-white/70 shadow-[var(--shadow)] backdrop-blur lg:rounded-[36px]">
        <section className="hidden w-[46%] border-r border-[color:var(--line)] bg-[color:var(--foreground)] px-8 py-10 text-[color:var(--surface-strong)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l’aperçu
            </Link>
            <div className="mt-12 max-w-md">
              <p className="text-xs uppercase tracking-[0.28em] text-white/55">
                Noria Access
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">
                Connexion interne pour activer le moteur live.
              </h1>
              <p className="mt-5 text-base leading-7 text-white/70">
                Une fois connecté, tu bascules du mode démo au mode Supabase live:
                vraies demandes, vraies approbations, vraies notifications et historique
                persistant.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              "Profils créés automatiquement à la première création d’utilisateur Supabase.",
              "Le moteur d’approbation instancie les étapes, l’audit et la conversation dossier.",
              "Les emails immédiats partent côté serveur, le cron reste réservé aux relances.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 text-sm leading-6 text-white/72"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-[480px]">
            <div className="rounded-[30px] border border-[color:var(--line)] bg-[color:var(--surface)] px-6 py-6 shadow-[0_20px_60px_rgba(19,33,31,0.08)] sm:px-8 sm:py-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[color:var(--foreground)] text-[color:var(--surface-strong)]">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    Accès sécurisé
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                    Connexion Noria
                  </h2>
                </div>
              </div>

              {actor.mode === "live" ? (
                <div className="mt-8 rounded-[24px] border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] px-5 py-5">
                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                    Session active
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {actor.fullName} est déjà connecté. Tu peux ouvrir directement le cockpit
                    ou fermer la session.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/workspace"
                      className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[color:var(--foreground)] px-4 text-sm font-medium text-[color:var(--surface-strong)]"
                    >
                      Ouvrir l’espace
                    </Link>
                    <form action="/auth/logout" method="post" className="flex-1">
                      <button
                        type="submit"
                        className="inline-flex h-12 w-full items-center justify-center rounded-[18px] border border-[color:var(--line)] bg-white px-4 text-sm font-medium text-[color:var(--foreground)]"
                      >
                        Déconnexion
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <form action="/auth/login" method="post" className="mt-8 space-y-5">
                  {errorCode ? (
                    <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                      {errorCode === "missing_credentials"
                        ? "Email ou mot de passe manquant."
                        : "Connexion refusée. Vérifie l’email, le mot de passe et l’état du compte Supabase."}
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="text-sm font-medium text-[color:var(--foreground)]">
                      Email professionnel
                    </span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      className="mt-2 h-13 w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--brand)]"
                      placeholder="prenom.nom@entreprise.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[color:var(--foreground)]">
                      Mot de passe
                    </span>
                    <input
                      type="password"
                      name="password"
                      required
                      autoComplete="current-password"
                      className="mt-2 h-13 w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--brand)]"
                      placeholder="••••••••"
                    />
                  </label>

                  <div className="rounded-[22px] border border-[color:var(--line)] bg-white/75 px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
                    Crée d’abord les utilisateurs dans Supabase Auth. Le trigger SQL crée
                    automatiquement le profil applicatif au premier ajout.
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[color:var(--foreground)] px-4 text-sm font-medium text-[color:var(--surface-strong)]"
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Se connecter
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
