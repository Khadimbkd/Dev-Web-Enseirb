# Dev-Web-Enseirb

Matériel d’enseignement pour le module de développement web (R&I, 2A).

## Contenu

- `ProjetWeb.md` : sujet détaillé du projet SeenFlix.
- `ProjetWeb.pdf` : version PDF du sujet (à télécharger / consulter).

## Projet des étudiants

Chaque trinôme doit créer **son propre dépôt** pour développer le projet SeenFlix  
et ajouter `@Systemofalam` comme collaboratrice.

## Choix pour le Frontend

Nous avons pris la décision de privilégier Axios pour les appels HTTP et Pinia pour
la gestion d'état

## Base de données

PostgreSQL, accédé avec le module `pg` (pas d'ORM).

### Prérequis

- Node.js 18+
- PostgreSQL 14 ou plus récent (macOS : `brew install postgresql@14 && brew services start postgresql@14`)

### Installation (moins de 5 minutes)

```bash
createdb seenflix
cd backend
cp .env.example .env     # puis adapter DATABASE_URL à votre installation locale
npm ci
npm run db:reset         # crée les tables et insère les données de démo
```

Exemple de `DATABASE_URL` sans mot de passe : `postgres://votre_utilisateur@localhost:5432/seenflix`.

### Compte de démo

`alice@example.org` / `Passw0rd!` (avec 3 favoris : Matrix, Inception, Breaking Bad).

### Scripts

| Commande (depuis `backend/`) | Rôle |
|---|---|
| `npm run db:reset` | **Supprime** les tables, les recrée (`schema.sql`) puis lance le seed. Réservé au développement : refusé si `NODE_ENV=production` |
| `npm run db:seed` | Insère le compte de démo et ses favoris (peut être relancé sans doublon) |

### Schéma

| Table | Contenu |
|---|---|
| `users` | `id`, `email` (unique), `password_hash` (bcrypt), `created_at` |
| `media` | film ou série TMDB : `id`, `tmdb_id`, `type` (`movie` / `tv`), unique sur (`tmdb_id`, `type`) |
| `favorites` | `id`, `user_id`, `media_id`, `rating` (1 à 5, optionnel), `comment` (optionnel), `created_at`, unique sur (`user_id`, `media_id`) |

Le MCD et le modèle relationnel sont dans `modele-donnees.drawio` ; le schéma SQL est dans `backend/src/db/schema.sql`.

### Accès aux données (`backend/src/models/`)

- `users.js` : `createUser`, `findUserByEmail`, `findUserById` (email déjà pris : erreur 409).
- `favorites.js` : `listFavorites`, `addFavorite` (doublon : erreur 409), `removeFavorite`.

Toutes les requêtes SQL sont paramétrées.

### Tests

```bash
cd backend
npm test                 # tests unitaires (la base est simulée, aucune connexion réelle)
npm run test:coverage    # rapport de couverture
```