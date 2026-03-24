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
- un `vercel.json` avec cron actif toutes les 10 minutes pour les rappels SLA
- une migration Supabase versionnee dans `supabase/migrations/20260323190000_init_workflow_core.sql`
- une tour de controle admin `/admin` pour profils, types, champs et templates
- un centre `/notifications` avec preferences in-app/email/digest
- un espace `/reports` avec exports CSV, charge approbateur et repartitions live
- une deuxieme migration pour notifications, SLA et reporting dans `supabase/migrations/20260324003000_notifications_reporting_sla.sql`
- une migration Storage pour le bucket prive des pieces jointes dans `supabase/migrations/20260324014000_request_attachments_storage.sql`

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
- `http://localhost:3000/notifications` pour le centre de preferences
- `http://localhost:3000/reports` pour le reporting
- `http://localhost:3000/admin` pour l'administration
- `http://localhost:3000/requests/REQ-...` pour ajouter et ouvrir les pieces jointes

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

- `vercel.json` active maintenant un cron toutes les 10 minutes
- l'endpoint reste compatible avec un scheduler externe
- `CRON_SECRET` est verifie cote serveur et journalise dans `public.workflow_cron_runs`
- la logique metier ne vit pas dans le scheduler: il ne fait que reveiller le moteur
- la logique SLA live est prete: rappels proches, escalades hors SLA et audit `workflow_sla_events`

## Pieces jointes

- bucket prive Supabase Storage: `request-files`
- upload securise via `/api/requests/[id]/attachments`
- ouverture securisee via `/api/requests/[id]/attachments/[attachmentId]`
- les fichiers restent prives et passent par une URL signee courte cote serveur

## Guides ajoutes

- installation et deploiement: `docs/setup-fast-track.md`
- runbook production V1: `docs/production-v1-runbook.md`
- SQL initial workflow + messagerie: `docs/sql/2026-03-23_init_workflow_core.sql`
