# Noria

Base produit pour une application interne de gestion des demandes et workflows d'approbation.

## Stack retenue

- `Next.js` pour l'interface et les routes serveur
- `Supabase` pour Postgres, Auth, Storage et temps reel
- `Vercel` pour l'hebergement et le cron
- `Vercel` pour l'hebergement
- `Resend` ou `Postmark` pour les emails transactionnels

## Ce qui est deja pose

- une page d'accueil produit orientee SaaS interne
- un shell applicatif interne avec les routes `workspace`, `approvals`, `requests/new`, `requests/[id]`, `messages`
- la structure de domaine du MVP: demandes, templates, inbox, audit, automatisations
- les clients Supabase navigateur, serveur et service role
- un endpoint cron securise: `/api/cron/process-reminders`
- des endpoints live: `/api/messages` et `/api/notifications`
- des endpoints workflow live: `/api/requests` et `/api/requests/[id]/decision`
- une messagerie client avec insertion optimistic + abonnement Realtime
- un moteur d'approbation live: creation de demande, instanciation des etapes, decisions et audit
- une page de connexion interne `/login` avec login/logout Supabase
- une structure serveur pour les emails immediats via `EMAIL_PROVIDER=console|resend`
- un `vercel.json` compatible `Vercel Hobby` sans cron actif pour le moment
- une migration Supabase versionnee dans `supabase/migrations/20260323190000_init_workflow_core.sql`

## Demarrage local

1. Installer les dependances:

```bash
npm install
```

2. Copier les variables d'environnement:

```bash
cp .env.example .env.local
```

3. Lancer le projet:

```bash
npm run dev
```

4. Ouvrir:

- `http://localhost:3000/login` pour la connexion interne
- `http://localhost:3000/workspace` pour le cockpit
- `http://localhost:3000/approvals` pour l'inbox approbateur
- `http://localhost:3000/messages` pour la messagerie

## Scripts utiles

- `npm run lint`
- `npm run typecheck`
- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:reset`
- `npm run supabase:types`

## Variables d'environnement

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `RESEND_API_KEY`
- `CRON_SECRET`

## Cron

Le cron appelle `GET /api/cron/process-reminders`.

- en `Vercel Hobby`, aucun cron n'est active dans `vercel.json` pour eviter le blocage de deploy
- l'endpoint est conserve et sera rebranche plus tard avec `Vercel Pro` ou un scheduler externe
- la logique metier ne doit pas vivre dans le scheduler: il ne fait que reveiller le moteur

## Etape suivante recommandee

1. brancher un seed de démonstration complet avec utilisateurs réels
2. ajouter le builder admin de workflows personnalisés
3. brancher les pieces jointes Supabase Storage

## Guides ajoutes

- installation et deploiement: `docs/setup-fast-track.md`
- SQL initial workflow + messagerie: `docs/sql/2026-03-23_init_workflow_core.sql`
