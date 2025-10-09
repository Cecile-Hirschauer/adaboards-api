import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import './setup';

describe('Board Integration Tests', () => {
  describe('POST /api/boards - Create board', () => {
    it('should create a board', async () => {
      // 1. Créer un utilisateur et obtenir un token
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'boarduser@test.com',
          name: 'Board User',
          password: 'Secret123!'
        });

      const token = authResponse.body.token;

      // 2. Créer un board avec le token
      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Test Board' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('My Test Board');
      expect(response.body).toHaveProperty('id');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/boards')
        .send({ name: 'Unauthorized Board' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/boards - List boards', () => {
    it('should return only boards where user is member (isolation)', async () => {
      // Créer Alice
      const aliceAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice@test.com',
          name: 'Alice',
          password: 'Password123!'
        });
      const aliceToken = aliceAuth.body.token;

      // Créer Bob
      const bobAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'bob@test.com',
          name: 'Bob',
          password: 'Password123!'
        });
      const bobToken = bobAuth.body.token;

      // Alice crée 2 boards
      const aliceBoard1 = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ name: 'Alice Board 1' });

      await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ name: 'Alice Board 2' });

      // Bob crée 1 board
      await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ name: 'Bob Board' });

      // Alice invite Bob sur "Alice Board 1"
      await request(app)
        .post(`/api/boards/${aliceBoard1.body.id}/members`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ userId: bobAuth.body.user.id, role: 'MEMBER' });

      // Bob récupère ses boards
      const bobBoards = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(bobBoards.status).toBe(200);
      expect(bobBoards.body).toHaveLength(2); // Son board + Alice Board 1

      const boardNames = bobBoards.body.map((b: any) => b.name).sort();
      expect(boardNames).toEqual(['Alice Board 1', 'Bob Board']);

      // Alice récupère ses boards
      const aliceBoards = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(aliceBoards.status).toBe(200);
      expect(aliceBoards.body).toHaveLength(2); // Ses 2 boards

      const aliceBoardNames = aliceBoards.body.map((b: any) => b.name).sort();
      expect(aliceBoardNames).toEqual(['Alice Board 1', 'Alice Board 2']);
    });

    it('should not see boards where user is not a member', async () => {
      // Créer Charlie
      const charlieAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'charlie@test.com',
          name: 'Charlie',
          password: 'Password123!'
        });
      const charlieToken = charlieAuth.body.token;

      // Créer Diana
      const dianaAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'diana@test.com',
          name: 'Diana',
          password: 'Password123!'
        });
      const dianaToken = dianaAuth.body.token;

      // Charlie crée un board
      await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${charlieToken}`)
        .send({ name: 'Charlie Private Board' });

      // Diana ne devrait voir aucun board de Charlie
      const dianaBoards = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${dianaToken}`);

      expect(dianaBoards.status).toBe(200);
      expect(dianaBoards.body).toHaveLength(0); // Aucun board
    });
  });

  describe('GET /api/boards/:id - Get single board', () => {
    it('should allow access to board where user is member', async () => {
      // Créer Eve
      const eveAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'eve@test.com',
          name: 'Eve',
          password: 'Password123!'
        });
      const eveToken = eveAuth.body.token;

      // Créer Frank
      const frankAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'frank@test.com',
          name: 'Frank',
          password: 'Password123!'
        });
      const frankToken = frankAuth.body.token;

      // Eve crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${eveToken}`)
        .send({ name: 'Eve Board' });

      // Eve invite Frank
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${eveToken}`)
        .send({ userId: frankAuth.body.user.id, role: 'MEMBER' });

      // Frank peut accéder au board
      const response = await request(app)
        .get(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${frankToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Eve Board');
    });

    it('should deny access to board where user is NOT member', async () => {
      // Créer Grace
      const graceAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'grace@test.com',
          name: 'Grace',
          password: 'Password123!'
        });
      const graceToken = graceAuth.body.token;

      // Créer Hank
      const hankAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hank@test.com',
          name: 'Hank',
          password: 'Password123!'
        });
      const hankToken = hankAuth.body.token;

      // Grace crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${graceToken}`)
        .send({ name: 'Grace Private Board' });

      // Hank essaie d'accéder au board (non autorisé)
      const response = await request(app)
        .get(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${hankToken}`);

      expect(response.status).toBe(404); // Not Found (car board n'existe pas pour Hank)
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/boards/:boardId/members - Invite users', () => {
    it('should allow OWNER to invite members', async () => {
      // Créer Ivy
      const ivyAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'ivy@test.com',
          name: 'Ivy',
          password: 'Password123!'
        });
      const ivyToken = ivyAuth.body.token;

      // Créer Jack
      const jackAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'jack@test.com',
          name: 'Jack',
          password: 'Password123!'
        });
      const jackToken = jackAuth.body.token;

      // Ivy crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ivyToken}`)
        .send({ name: 'Ivy Board' });

      // Ivy invite Jack
      const response = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ivyToken}`)
        .send({ userId: jackAuth.body.user.id, role: 'MEMBER' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(jackAuth.body.user.id);
      expect(response.body.role).toBe('MEMBER');

      // Vérifier que Jack voit maintenant le board
      const jackBoards = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${jackToken}`);

      expect(jackBoards.body).toHaveLength(1);
      expect(jackBoards.body[0].name).toBe('Ivy Board');
    });

    it('should prevent MEMBER from inviting other users', async () => {
      // Créer Kelly (owner)
      const kellyAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'kelly@test.com',
          name: 'Kelly',
          password: 'Password123!'
        });
      const kellyToken = kellyAuth.body.token;

      // Créer Leo (member)
      const leoAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'leo@test.com',
          name: 'Leo',
          password: 'Password123!'
        });
      const leoToken = leoAuth.body.token;

      // Créer Mike (invité potentiel)
      const mikeAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'mike@test.com',
          name: 'Mike',
          password: 'Password123!'
        });

      // Kelly crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${kellyToken}`)
        .send({ name: 'Kelly Board' });

      // Kelly invite Leo en tant que MEMBER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${kellyToken}`)
        .send({ userId: leoAuth.body.user.id, role: 'MEMBER' });

      // Leo essaie d'inviter Mike (devrait échouer)
      const response = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${leoToken}`)
        .send({ userId: mikeAuth.body.user.id, role: 'MEMBER' });

      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('DELETE /api/boards/:id - Delete board', () => {
    it('should allow only OWNER to delete board', async () => {
      // Créer Nina (owner)
      const ninaAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nina@test.com',
          name: 'Nina',
          password: 'Password123!'
        });
      const ninaToken = ninaAuth.body.token;

      // Créer Oscar (member)
      const oscarAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'oscar@test.com',
          name: 'Oscar',
          password: 'Password123!'
        });
      const oscarToken = oscarAuth.body.token;

      // Nina crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ninaToken}`)
        .send({ name: 'Nina Board' });

      // Nina invite Oscar
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ninaToken}`)
        .send({ userId: oscarAuth.body.user.id, role: 'MEMBER' });

      // Oscar essaie de supprimer le board (devrait échouer)
      const deleteResponse = await request(app)
        .delete(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${oscarToken}`);

      expect(deleteResponse.status).toBe(403); // Forbidden

      // Nina peut supprimer son board
      const deleteByOwner = await request(app)
        .delete(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${ninaToken}`);

      expect(deleteByOwner.status).toBe(204); // No Content
    });
  });
});