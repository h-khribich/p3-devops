# DataShare

Application de partage de fichiers avec authentification JWT, upload, expiration automatique et stockage S3-compatible.

## Architecture

- **Backend** : NestJS (TypeScript) - API REST
- **Frontend** : React + Vite (TypeScript)
- **Base de données** : PostgreSQL (via Prisma ORM)
- **Stockage** : AWS S3

---

## Installation

### 1. Installer les dépendances

```bash
cd backend
npm install

cd ../frontend
npm install
cd ..
```

### 2. Configurer les variables d'environnement (optionnel, voir avertissement)

Le backend lit un fichier `.env` à la racine de `/backend`. Ce fichier **est versionné temporaiement**. Dans le futur, il faudra effectuer cette étape de configuration, pour l'instant, vous pouvez passer à l'étape 3.

Crée `backend/.env` avec les variables suivantes :

```env
# ── PostgreSQL ──
DATABASE_URL="postgresql://user:password@localhost:5432/datashare"

# ── JWT ──
JWT_SECRET="une-chaine-secrete-tres-longue"

# ── AWS S3 (ou compatible) ──
AWS_REGION="us-east-1"
AWS_S3_BUCKET="datashare"
AWS_ACCESS_KEY_ID="ton-access-key"
AWS_SECRET_ACCESS_KEY="ton-secret-key"
# Si tu utilises MinIO ou un S3 compatible en local :
# AWS_ENDPOINT="http://localhost:9000"
# AWS_FORCE_PATH_STYLE="true"
```

⚠️

> Pour ce MVP, j'ai ajouté le fichier env. avec des accès disponibles Prisma et AWS non sensibles pour faciliter le démarrage et le partage du projet. Pour la v1, il faudra **obligatoirement** effectuer cette étape car le fichier .env sera ignoré pour des raisons de sécurité

⚠️

### 3. Générer le client Prisma

```bash
cd backend
npx prisma generate
```

Cela crée les tables dans PostgreSQL.

### 4. Lancer le backend

```bash
cd backend
npm run start:dev
```

- API accessible sur **`http://localhost:3000`**
- Documentation Swagger sur **`http://localhost:3000/api-docs`**

### 5. Lancer le frontend

```bash
cd frontend
npm run dev
```

- Frontend accessible sur **`http://localhost:5173`**

---

## Commande unique récapitulative

```bash
git pull
cd backend && npm install && cd ../frontend && npm install && cd ..
# Configurer backend/.env avec PostgreSQL + S3
cd backend && npx prisma migrate deploy && npm run start:dev
# Dans un autre terminal :
cd frontend && npm run dev
```

---

## ⚠️ Pré-requis obligatoires (hors npm)

`npm install` seul **ne suffit pas**. Ce projet nécessite **obligatoirement** deux services externes en cours d'exécution :

1. **PostgreSQL** - une base de données relationnelle
2. **Un service de stockage S3-compatible** - AWS S3

Sans ces deux services, l'application backend refusera de fonctionner correctement.

---

## Scripts disponibles

### Backend

| Commande             | Description                             |
| -------------------- | --------------------------------------- |
| `npm run start:dev`  | Démarrage en mode développement (watch) |
| `npm run build`      | Compilation TypeScript                  |
| `npm run start:prod` | Démarrage en mode production            |
| `npm run test`       | Tests unitaires (Jest)                  |
| `npm run lint`       | Linting ESLint                          |

### Frontend

| Commande          | Description                     |
| ----------------- | ------------------------------- |
| `npm run dev`     | Démarrage en mode développement |
| `npm run build`   | Build de production             |
| `npm run preview` | Prévisualisation du build       |
| `npm run lint`    | Linting ESLint                  |

## Documentation

#### [Tests](./TESTING.md)

#### [Sécurité](./SECURITY.md)

#### [Performance](./PERFORMANCE.md)

#### [Maintenance](./MAINTENANCE.md)
