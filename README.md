# Adaboards API

API backend pour l'application Adaboards - un système de gestion de tableaux Kanban collaboratif.

## 🛠️ Stack Technique

- **Node.js** + **Express 5** - Framework web
- **TypeScript** - Typage statique
- **Prisma** - ORM pour la gestion de la base de données
- **SQLite** - Base de données (développement)
- **JWT** - Authentification
- **Vitest** - Framework de tests
- **bcrypt** - Hachage des mots de passe

## 📋 Prérequis

- Node.js (v18 ou supérieur recommandé)
- npm ou yarn

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Créer et appliquer les migrations de base de données
npm run prisma:migrate
```

## 🔧 Configuration

Créez un fichier `.env` à la racine du projet :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="votre-secret-jwt-ici"
PORT=3000
```

## 🏃 Démarrage

### Mode développement

```bash
npm run dev
```

Démarre le serveur avec nodemon (rechargement automatique) sur `http://localhost:3000`

### Mode production

```bash
# Compiler TypeScript
npm run build

# Démarrer le serveur
npm start
```

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration

# Interface UI pour les tests
npm run test:ui

# Tests avec couverture de code
npm run test:coverage
```

### Couverture actuelle

- **Statements**: 88.71%
- **Branches**: 88.77%
- **Functions**: 89.58%
- **Lines**: 88.71%

## 🗄️ Base de données

### Commandes Prisma

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer une nouvelle migration
npm run prisma:migrate

# Ouvrir l'interface Prisma Studio
npm run prisma:studio
```

### Schéma de données

Le schéma se trouve dans [prisma/schema.prisma](./prisma/schema.prisma) et comprend :

- **User** - Utilisateurs de l'application
- **Board** - Tableaux Kanban
- **Task** - Tâches sur les tableaux
- **Membership** - Relations utilisateur-tableau avec rôles

#### Rôles disponibles

- `OWNER` - Propriétaire du tableau (tous les droits)
- `MAINTAINER` - Mainteneur (peut gérer les membres et les tâches)
- `MEMBER` - Membre simple (peut gérer les tâches uniquement)

#### Statuts des tâches

- `TODO` - À faire
- `IN_PROGRESS` - En cours
- `DONE` - Terminé

## 📡 API Endpoints

### Authentification (`/api/auth`)

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Récupérer l'utilisateur connecté (nécessite authentification)

### Tableaux (`/api/boards`)

- `GET /api/boards` - Liste des tableaux accessibles
- `GET /api/boards/:id` - Détails d'un tableau
- `POST /api/boards` - Créer un tableau
- `PUT /api/boards/:id` - Modifier un tableau (OWNER/MAINTAINER)
- `DELETE /api/boards/:id` - Supprimer un tableau (OWNER uniquement)

### Membres (`/api/boards/:boardId/members`)

- `GET /api/boards/:boardId/members` - Liste des membres
- `POST /api/boards/:boardId/members` - Inviter un membre (OWNER/MAINTAINER)
- `PUT /api/boards/:boardId/members/:userId/role` - Changer le rôle (OWNER/MAINTAINER)
- `DELETE /api/boards/:boardId/members/:userId` - Retirer un membre (OWNER/MAINTAINER)

### Tâches (`/api/boards/:boardId/tasks`)

- `GET /api/boards/:boardId/tasks` - Liste des tâches d'un tableau
- `POST /api/boards/:boardId/tasks` - Créer une tâche
- `PUT /api/tasks/:taskId` - Modifier une tâche
- `DELETE /api/tasks/:taskId` - Supprimer une tâche

### Utilisateurs (`/api/users`)

- `GET /api/users` - Liste de tous les utilisateurs

## 🏗️ Architecture

```text
src/
├── controllers/      # Contrôleurs (gestion des requêtes/réponses)
├── services/        # Logique métier
├── routes/          # Définition des routes
├── middlewares/     # Middlewares (auth, etc.)
├── errors/          # Gestion des erreurs personnalisées
├── types/           # Types TypeScript
├── utils/           # Utilitaires
├── app.ts           # Configuration Express
└── index.ts         # Point d'entrée de l'application
```

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification :

1. L'utilisateur s'inscrit ou se connecte via `/api/auth/register` ou `/api/auth/login`
2. Le serveur retourne un token JWT
3. Le client inclut ce token dans le header `Authorization: Bearer <token>` pour les requêtes protégées
4. Le middleware `authMiddleware` vérifie et décode le token

## 🔒 Permissions

### Gestion des tableaux

- **Créer** : Tous les utilisateurs authentifiés
- **Lire** : Membres du tableau uniquement
- **Modifier** : OWNER et MAINTAINER
- **Supprimer** : OWNER uniquement

### Gestion des membres

- **Ajouter** : OWNER et MAINTAINER
- **Modifier rôle** : OWNER et MAINTAINER
- **Retirer** : OWNER et MAINTAINER (un MAINTAINER peut retirer un autre MAINTAINER)

### Gestion des tâches

- **Créer/Modifier/Supprimer** : Tous les membres du tableau

## 🐛 Débogage

Les logs de débogage sont disponibles dans certains services (ex: BoardService). Pour activer plus de logs, consultez les fichiers de services.

## 📝 Notes importantes

- Le client Prisma est généré dans `generated/prisma/` (non `@prisma/client`)
- Les tests d'intégration utilisent une base de données séparée (`test.db`)
- La couverture de tests est mesurée avec v8
- CORS est activé pour `http://localhost:5173` (frontend Vite)

## 🤝 Contribution

1. Créer une branche pour votre feature
2. Écrire des tests pour votre code
3. S'assurer que tous les tests passent (`npm test`)
4. Vérifier la couverture de code (`npm run test:coverage`)
5. Créer une pull request

## 📄 Licence

ISC
