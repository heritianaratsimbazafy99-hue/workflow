# Runbook V1 interne

Ce guide couvre uniquement les actions restantes pour exploiter Noria en environnement interne avec :

- `Next.js` sur Vercel
- `Supabase` pour Auth, Postgres, Storage et Realtime
- `Resend` pour les emails transactionnels
- le cron `GET /api/cron/process-reminders`

## 1. Supabase

### 1.1 Lier le projet distant

Depuis `/Users/heritiana/Documents/workflow` :

```bash
npx supabase login
npx supabase link --project-ref pqlwvditkpqguwgrusst
```

### 1.2 Pousser les migrations

Les migrations déjà validées doivent être présentes côté projet distant, plus la nouvelle migration de durcissement/observabilité :

- `/Users/heritiana/Documents/workflow/supabase/migrations/20260323190000_init_workflow_core.sql`
- `/Users/heritiana/Documents/workflow/supabase/migrations/20260323234500_expand_admin_forms_collab.sql`
- `/Users/heritiana/Documents/workflow/supabase/migrations/20260324003000_notifications_reporting_sla.sql`
- `/Users/heritiana/Documents/workflow/supabase/migrations/20260324014000_request_attachments_storage.sql`
- `/Users/heritiana/Documents/workflow/supabase/migrations/20260324113000_finalize_ops_realtime_hardening.sql`

Puis :

```bash
npx supabase db push
```

### 1.3 Vérifier les points Supabase critiques

- `Authentication > URL Configuration`
  - `Site URL`: `https://trioworkflow.vercel.app`
  - `Redirect URLs`: ajoute au minimum `https://trioworkflow.vercel.app/auth/login`
  - ajoute aussi ton URL preview Vercel si tu testes en preview
- `Storage`
  - vérifie que le bucket privé `request-files` est bien présent
- `Database > Replication`
  - confirme que `messages`, `notifications`, `requests`, `request_step_instances`, `request_comments`, `request_attachments`, `workflow_sla_events` sont bien publiés dans `supabase_realtime`

## 2. Resend

Référence officielle utilisée :

- [Managing Domains](https://resend.com/docs/dashboard/domains/introduction)
- [Send Email API](https://resend.com/docs/api-reference/emails)
- [API Keys Dashboard](https://resend.com/docs/dashboard/api-keys/introduction)

### 2.1 Vérifier un sous-domaine dédié

Resend recommande d’utiliser un sous-domaine d’envoi dédié, par exemple :

- `notify.ton-domaine.com`

Dans Resend :

1. Ouvre `Domains`
2. Ajoute le sous-domaine d’envoi
3. Recopie les entrées DNS demandées
4. Attends l’état `verified`

### 2.2 Créer la clé API de production

Dans `API Keys` :

1. crée une clé nommée `Noria Production`
2. privilégie le scope `sending_access`
3. restreins la clé au domaine de production si disponible dans ton dashboard

### 2.3 Définir les valeurs applicatives

Valeurs recommandées :

- `EMAIL_PROVIDER=resend`
- `EMAIL_FROM=Noria <workflow@notify.ton-domaine.com>`
- `EMAIL_REPLY_TO=ops@ton-domaine.com`
- `RESEND_API_KEY=...`

Le produit vérifie désormais explicitement :

- format de `EMAIL_FROM`
- format de `EMAIL_REPLY_TO`
- présence de `RESEND_API_KEY` si `EMAIL_PROVIDER=resend`
- validité de `APP_BASE_URL` pour générer les liens email

### 2.4 Tester depuis `/admin`

Dans `/admin` :

1. renseigne un destinataire de test
2. clique `Envoyer un email de test`
3. valide :
   - réception réelle
   - expéditeur correct
   - `Reply-To` correct
   - bouton d’action qui ouvre bien `https://trioworkflow.vercel.app/notifications`

## 3. Vercel

Références officielles utilisées :

- [Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Troubleshooting Vercel Cron Jobs](https://vercel.com/guides/troubleshooting-vercel-cron-jobs)

### 3.1 Variables d’environnement

Dans le projet Vercel, ajoute en `Production` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL=https://trioworkflow.vercel.app`
- `EMAIL_PROVIDER=resend`
- `EMAIL_FROM=...`
- `EMAIL_REPLY_TO=...`
- `RESEND_API_KEY=...`
- `CRON_SECRET=...`

### 3.2 Point important sur le cron Vercel

Au `28 janvier 2026`, la documentation officielle Vercel indique que les cron jobs sont disponibles sur tous les plans.

Le repo active maintenant :

- `/Users/heritiana/Documents/workflow/vercel.json`
- exécution toutes les `10 minutes`
- endpoint `GET /api/cron/process-reminders`

Si `CRON_SECRET` est défini dans Vercel, Vercel enverra automatiquement :

- `Authorization: Bearer <CRON_SECRET>`

### 3.3 Déployer

```bash
vercel --prod
```

Puis contrôle dans `Project Settings > Cron Jobs` :

- présence du job `/api/cron/process-reminders`
- statut actif

## 4. Scheduler externe de secours

Le produit reste compatible avec un scheduler externe si tu préfères ne pas dépendre du cron Vercel.

Le scheduler doit appeler :

```text
https://trioworkflow.vercel.app/api/cron/process-reminders
```

Avec :

- header `Authorization: Bearer <CRON_SECRET>`
- header recommandé `X-Idempotency-Key: <clé-unique-par-run>`
- header optionnel `X-Noria-Cron-Source: github-actions` ou autre

Le endpoint journalise chaque run dans `public.workflow_cron_runs`.

## 5. Vérifications fonctionnelles finales

### 5.1 Parcours métier

1. connexion
2. création d’une demande
3. upload de pièces jointes
4. approbation
5. rejet ou retour
6. message dossier
7. notification in-app
8. email transactionnel
9. export reporting
10. modification admin

### 5.2 Vérifications ops

1. `/admin` ne remonte plus d’erreur critique sur email
2. `/api/cron/process-reminders` répond `401` sans secret
3. le cron Vercel ou le scheduler externe crée des lignes dans `workflow_cron_runs`
4. les notifications affichent désormais la vraie référence dossier au lieu de l’UUID
5. le dossier `/requests/[id]` se rafraîchit en live sur décisions, commentaires, pièces jointes et événements SLA
