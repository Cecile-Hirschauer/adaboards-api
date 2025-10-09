# Tests d'intégration API - Guide

## Vue d'ensemble

Les tests d'intégration testent l'API complète de bout en bout, incluant :
- Routes HTTP
- Authentification JWT
- Base de données SQLite (test.db)
- Autorisations et isolation des données

## Structure

```
tests/integration/
├── README.md                      Ce fichier
├── setup.ts                       Configuration globale (nettoyage DB)
├── helpers.ts                     Fonctions utilitaires
├── auth.integration.test.ts       Tests authentification
└── board.integration.test.ts      Tests boards et isolation
```

## Lancer les tests

```bash
# Tous les tests d'intégration
npm run test:integration

# Un fichier spécifique
npm run test:integration -- auth.integration.test.ts

# Avec l'interface UI
npm run test:ui
```

## Tests d'isolation des boards

### Scénarios testés

#### 1. **Isolation des boards** (`GET /api/boards`)
Un utilisateur ne voit QUE :
- Les boards qu'il a créés
- Les boards où il a été invité

```typescript
// Alice crée 2 boards
// Bob crée 1 board
// Alice invite Bob sur "Alice Board 1"

// Bob voit : "Bob Board" + "Alice Board 1" ✅
// Bob ne voit PAS : "Alice Board 2" ❌
```

#### 2. **Accès aux boards** (`GET /api/boards/:id`)
- ✅ Un membre peut accéder à un board où il est invité
- ❌ Un non-membre reçoit 404 "Board not found"

```typescript
// Eve crée un board et invite Frank
expect(frankCanAccess).toBe(200); // ✅

// Hank essaie d'accéder au board d'Eve
expect(hankCannotAccess).toBe(404); // ❌
```

#### 3. **Invitations** (`POST /api/boards/:boardId/members`)
- ✅ Un OWNER peut inviter des membres
- ✅ Un MAINTAINER peut inviter des membres
- ❌ Un MEMBER ne peut PAS inviter

```typescript
// Kelly (OWNER) invite Leo (MEMBER)
// Leo essaie d'inviter Mike
expect(response.status).toBe(403); // ❌ Forbidden
```

#### 4. **Suppression** (`DELETE /api/boards/:id`)
- ✅ Seul le OWNER peut supprimer un board
- ❌ Un MEMBER ne peut pas supprimer

```typescript
// Nina (OWNER) invite Oscar (MEMBER)
expect(oscarDelete).toBe(403); // ❌
expect(ninaDelete).toBe(204);  // ✅
```

## Bonnes pratiques

### ✅ À faire

```typescript
// Créer des utilisateurs avec emails uniques
const user = await request(app)
  .post('/api/auth/register')
  .send({
    email: `unique-${Date.now()}@example.com`, // ✅ Unique
    name: 'User',
    password: 'Password123!'
  });

// Récupérer le token
const token = user.body.token;

// Utiliser le token dans les requêtes
await request(app)
  .get('/api/boards')
  .set('Authorization', `Bearer ${token}`);
```

### ❌ À éviter

```typescript
// Ne PAS supprimer les users dans beforeEach
// (Le JWT contiendrait un userId supprimé)

// Ne PAS réutiliser les mêmes emails
email: 'test@example.com' // ❌ Conflit si déjà utilisé
```

## Isolation des tests

### Comment ça fonctionne ?

1. **beforeAll** : Nettoie la DB une fois au début
2. **Pas de beforeEach** : Les utilisateurs persistent pendant les tests
3. **Emails uniques** : Garantissent l'isolation entre tests

### Pourquoi pas de `beforeEach` ?

```typescript
// ❌ Problème avec beforeEach
beforeEach(() => prisma.user.deleteMany());

it('test', async () => {
  const auth = await register({ email: 'user@test.com' });
  const token = auth.body.token; // Token contient userId

  // ❌ beforeEach du prochain test supprime cet utilisateur
  // Mais le JWT contient toujours l'ancien userId !

  await request(app)
    .post('/api/boards')
    .set('Authorization', `Bearer ${token}`) // userId n'existe plus
    .send({ name: 'Board' }); // ❌ Erreur de clé étrangère
});
```

## Ajouter de nouveaux tests

### Template de base

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import './setup';

describe('Mon Feature Integration Tests', () => {
  it('should do something', async () => {
    // 1. Créer un utilisateur
    const auth = await request(app)
      .post('/api/auth/register')
      .send({
        email: `user-${Date.now()}@test.com`,
        name: 'Test User',
        password: 'Password123!'
      });

    const token = auth.body.token;

    // 2. Tester votre endpoint
    const response = await request(app)
      .post('/api/mon-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: 'test' });

    // 3. Vérifier
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Tester l'isolation

```typescript
it('should isolate data between users', async () => {
  // Créer Alice
  const alice = await registerUser('alice@test.com');
  const aliceToken = alice.body.token;

  // Créer Bob
  const bob = await registerUser('bob@test.com');
  const bobToken = bob.body.token;

  // Alice crée des données
  await createData(aliceToken, 'Alice Data');

  // Bob ne devrait PAS voir les données d'Alice
  const bobData = await request(app)
    .get('/api/data')
    .set('Authorization', `Bearer ${bobToken}`);

  expect(bobData.body).toHaveLength(0); // ✅ Isolation
});
```

## FAQ

### Q: Pourquoi 404 au lieu de 403 pour les boards non autorisés ?

**R:** Par sécurité. Un 403 révèle que le board existe. Un 404 cache son existence.

```typescript
// Board exists mais user n'est pas membre
GET /api/boards/secret-board-id
→ 404 "Board not found" // ✅ Ne révèle pas son existence

// vs

→ 403 "Forbidden"        // ❌ Révèle que le board existe
```

### Q: Comment debugger un test qui échoue ?

```typescript
it('my test', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send({ data: 'test' });

  // Debug : afficher la réponse
  console.log('Status:', response.status);
  console.log('Body:', response.body);

  expect(response.status).toBe(201);
});
```

### Q: Les tests sont lents, comment accélérer ?

1. **Réduire le nombre de requêtes** : Regrouper les vérifications
2. **Utiliser test.only** : Tester un seul test à la fois
3. **Ne pas tester les détails** : Tester le comportement, pas l'implémentation

```typescript
// ❌ Lent
it('test 1', async () => { await register(); await createBoard(); });
it('test 2', async () => { await register(); await createBoard(); });
it('test 3', async () => { await register(); await createBoard(); });

// ✅ Plus rapide
it('test all', async () => {
  const user = await register();
  const board1 = await createBoard(user.token);
  const board2 = await createBoard(user.token);
  // Plusieurs vérifications dans un test
});
```

## Ressources

- [Documentation Supertest](https://github.com/ladjs/supertest)
- [Documentation Vitest](https://vitest.dev)
- [CLAUDE.md](../../CLAUDE.md) - Vue d'ensemble du projet
