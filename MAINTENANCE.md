# Maintenance - DataShare

Ce document décrit les opérations nécessaires pour maintenir l'infrastructure, les dépendances et la base de données de l'application à jour.

## 1. Mises à jour

| Composant                                | Fréquence     | Critère de déclenchement                                 |
| ---------------------------------------- | ------------- | -------------------------------------------------------- |
| **Correctifs de sécurité (Patch)**       | Immédiate     | Alerte critique (ex: via `npm audit` ou CVE Docker)      |
| **Dépendances mineures (NPM)**           | Mensuelle     | Début de mois                                            |
| **Mises à jour majeures (Vite, NestJS)** | Semestrielle  | Après validation du changelog et tests de non-régression |
| **Images Docker (MinIO, PostgreSQL)**    | Trimestrielle | Disponibilité d'une version LTS stable                   |

## 2. Procédures de MàJ

### 2.1. Dépendances Node.js (Frontend & Backend)

1. Identifier les paquets obsolètes : `npm outdated`
2. Appliquer les mises à jour mineures respectant le package.json : `npm update`
3. Vérifier les failles connues : `npm audit`

### 2.2. Base de données (Prisma)

Toute modification du schéma (schema.prisma) nécessite une migration avant déploiement.

1. Générer la migration : `npx prisma migrate dev --name <description>`
2. Appliquer en production : `npx prisma migrate deploy`

## Problèmes courants

| Problème                                            | Cause                                         | Solution                                                           |
| --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `ServiceUnavailableException: S3 refuse l'écriture` | Credentials S3 invalides                      | Vérifier `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` dans `.env` |
| `ECONNREFUSED PostgreSQL`                           | Base non accessible                           | Vérifier `DATABASE_URL`                                            |
| `GoneException: fichier expiré`                     | Fichier supprimé par le nettoyage automatique | Comportement normal (durée max 7 jours)                            |
| Tests Cypress échouent                              | Conteneurs e2e non démarrés                   | Lancer `docker compose up -d` avant les tests                      |
| `BadRequestException: type non autorisé`            | Extension non supportée                       | Extensions autorisées : `jpg, jpeg, png, pdf, doc`                 |
| Port 3000 déjà utilisé                              | Processus précédent                           | `kill $(lsof -t -i:3000)` ou `npx nest start -p 3001`              |
| `PrismaClientInitializationError`                   | Migration non appliquée                       | `cd backend && npx prisma migrate deploy`                          |
