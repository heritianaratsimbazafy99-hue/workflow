# Installation rapide et deploiement

Ce guide est la facon la plus rapide et la plus propre pour tester puis deployer l'application.

## 1. Reponse courte sur la messagerie

Oui, on peut ajouter une messagerie.

- niveau 1: commentaires et mentions sur chaque demande
- niveau 2: conversation liee a chaque demande
- niveau 3: messagerie directe et groupes temps reel

Le SQL fourni dans `supabase/migrations/20260323190000_init_workflow_core.sql` pose deja les tables `conversations`, `conversation_members`, `messages` et `message_reads`.

## 2. Prerequis

- Node.js deja installe
- Docker Desktop ou OrbStack pour le Supabase local
- un compte Supabase
- un compte Vercel

## 3. Installation locale

Depuis ce dossier:

```bash
cd /Users/heritiana/Documents/workflow
npm install
```

Initialiser Supabase local:

```bash
npx supabase init
npm run supabase:start
```

La migration initiale est deja versionnee dans le repo:

`/Users/heritiana/Documents/workflow/supabase/migrations/20260323190000_init_workflow_core.sql`

Appliquer la migration localement:

```bash
npm run supabase:reset
```

## 4. Variables locales

Copier le fichier d'exemple:

```bash
cp .env.example .env.local
```

Puis remplir:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_FROM_SUPABASE_START
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_FROM_SUPABASE_START
APP_BASE_URL=http://localhost:3000
EMAIL_PROVIDER=console
EMAIL_FROM=Noria <notifications@example.com>
EMAIL_REPLY_TO=workflow@example.com
RESEND_API_KEY=YOUR_RESEND_API_KEY_IF_USED
CRON_SECRET=CHANGE_ME_WITH_A_RANDOM_SECRET
```

Generer un secret:

```bash
openssl rand -hex 32
```

## 5. Lancer et tester en local

Lancer l'application:

```bash
npm run dev
```

Creer 2 ou 3 utilisateurs de test dans Supabase Auth:

1. ouvrir le dashboard local ou cloud Supabase
2. aller dans `Authentication > Users`
3. creer au moins un demandeur et un approbateur avec email + mot de passe
4. le trigger SQL cree automatiquement leur profil dans `public.profiles`

Puis ouvrir:

- `http://localhost:3000/login`
- `http://localhost:3000/workspace`
- `http://localhost:3000/approvals`
- `http://localhost:3000/requests/new`
- `http://localhost:3000/messages`

Tester l'endpoint cron localement:

```bash
curl -H "Authorization: Bearer CHANGE_ME_WITH_A_RANDOM_SECRET" \
  http://localhost:3000/api/cron/process-reminders
```

Generer les types TypeScript depuis la base locale:

```bash
npm run supabase:types
```

## 6. Creer le projet Supabase cloud

Dans le dashboard Supabase:

1. Cree un projet
2. Recupere le `project ref`
3. Recupere l'URL du projet, l'`anon key` et la `service role key`

Connecter le repo local au projet distant:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Si tu veux aller encore plus vite pour un premier test, tu peux aussi coller directement le SQL dans le SQL Editor Supabase, mais la bonne methode reste `migration + db push`.

## 7. Deploiement preview sur Vercel

Installer la CLI:

```bash
npm i -g vercel
```

Lier le projet:

```bash
vercel link
```

Ajouter les variables d'environnement en preview:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add APP_BASE_URL preview
vercel env add EMAIL_PROVIDER preview
vercel env add EMAIL_FROM preview
vercel env add EMAIL_REPLY_TO preview
vercel env add RESEND_API_KEY preview
vercel env add CRON_SECRET preview
```

Deployer une preview:

```bash
vercel
```

Si tu veux aussi recuperer les variables `development` depuis Vercel vers ta machine locale:

```bash
vercel env pull
```

## 8. Deploiement production

Ajouter les variables production:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add APP_BASE_URL production
vercel env add EMAIL_PROVIDER production
vercel env add EMAIL_FROM production
vercel env add EMAIL_REPLY_TO production
vercel env add RESEND_API_KEY production
vercel env add CRON_SECRET production
```

Deployer en production:

```bash
vercel --prod
```

## 9. Cron en production

Pour le moment, `vercel.json` ne declare aucun cron afin de rester compatible avec `Vercel Hobby`.

Le point important:

- l'endpoint cron existe deja dans l'application
- le scheduler sera rebranche a la fin du projet
- plus tard, tu pourras choisir `Vercel Pro` ou un scheduler externe

L'URL a appeler sera:

```text
https://YOUR_DOMAIN/api/cron/process-reminders
```

Avec ce header:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

## 10. Ordre de test le plus efficace

1. tester le SQL en local avec `npm run supabase:reset`
2. tester l'app en local avec `npm run dev`
3. tester le cron avec `curl`
4. pousser la base vers Supabase cloud avec `supabase db push`
5. deployer une preview avec `vercel`
6. seulement ensuite deployer en prod avec `vercel --prod`

## 11. Ce que je te conseille de faire ensuite

Le prochain bloc a construire est:

1. seed SQL complet pour utilisateurs, profils et demandes de démo
2. builder admin pour les workflows personnalisés
3. upload de pièces jointes dans Supabase Storage
4. dashboard analytics branché à la vraie base
5. rebrancher le scheduler cron en fin de projet

Quand tu veux, je te prepare l'etape suivante avec:

- le seed SQL affiné pour des données de démonstration locales
- les premieres pages applicatives connectees a Supabase
