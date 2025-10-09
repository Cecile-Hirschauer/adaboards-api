import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import './setup';

/**
 * Tests d'intégration spécifiques pour la suppression de membres
 *
 * Ce fichier teste en détail les différents scénarios de suppression de membres
 * par les OWNER et MAINTAINER, incluant les cas qui posaient problème.
 */

describe('Member Removal Integration Tests', () => {
  describe('OWNER removing MEMBER', () => {
    it('should allow OWNER to remove a simple MEMBER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove1@test.com',
          name: 'Owner Remove One',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER à supprimer
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove1@test.com',
          name: 'Member Remove One',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Member Removal Test 1' });

      expect(board.status).toBe(201);
      const boardId = board.body.id;

      // OWNER invite le MEMBER
      const addMemberResponse = await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      expect(addMemberResponse.status).toBe(201);
      expect(addMemberResponse.body.role).toBe('MEMBER');

      // Vérifier que le board a bien 2 membres (OWNER + MEMBER)
      const membersBeforeRemoval = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersBeforeRemoval.status).toBe(200);
      expect(membersBeforeRemoval.body).toHaveLength(2);

      // OWNER supprime le MEMBER
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${memberAuth.body.user.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Vérifier que la suppression a réussi
      expect(removeResponse.status).toBe(204);

      // Vérifier qu'il ne reste plus qu'un membre (OWNER)
      const membersAfterRemoval = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersAfterRemoval.status).toBe(200);
      expect(membersAfterRemoval.body).toHaveLength(1);
      expect(membersAfterRemoval.body[0].role).toBe('OWNER');
    });

    it('should allow OWNER to remove multiple MEMBERs sequentially', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove2@test.com',
          name: 'Owner Remove Two',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer 3 MEMBERs
      const member1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove2a@test.com',
          name: 'Member Remove 2A',
          password: 'Password123!'
        });

      const member2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove2b@test.com',
          name: 'Member Remove 2B',
          password: 'Password123!'
        });

      const member3Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove2c@test.com',
          name: 'Member Remove 2C',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Multiple Member Removal' });

      const boardId = board.body.id;

      // OWNER invite les 3 MEMBERs
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member1Auth.body.user.id, role: 'MEMBER' });

      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member2Auth.body.user.id, role: 'MEMBER' });

      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member3Auth.body.user.id, role: 'MEMBER' });

      // Vérifier 4 membres au total
      const membersBefore = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersBefore.body).toHaveLength(4);

      // OWNER supprime le premier MEMBER
      const remove1 = await request(app)
        .delete(`/api/boards/${boardId}/members/${member1Auth.body.user.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(remove1.status).toBe(204);

      // Vérifier 3 membres restants
      const membersAfter1 = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersAfter1.body).toHaveLength(3);

      // OWNER supprime le deuxième MEMBER
      const remove2 = await request(app)
        .delete(`/api/boards/${boardId}/members/${member2Auth.body.user.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(remove2.status).toBe(204);

      // Vérifier 2 membres restants
      const membersAfter2 = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersAfter2.body).toHaveLength(2);

      // OWNER supprime le troisième MEMBER
      const remove3 = await request(app)
        .delete(`/api/boards/${boardId}/members/${member3Auth.body.user.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(remove3.status).toBe(204);

      // Vérifier qu'il ne reste que l'OWNER
      const membersAfter3 = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersAfter3.body).toHaveLength(1);
      expect(membersAfter3.body[0].role).toBe('OWNER');
    });
  });

  describe('MAINTAINER removing MEMBER', () => {
    it('should allow MAINTAINER to remove a MEMBER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove3@test.com',
          name: 'Owner Remove Three',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer-remove1@test.com',
          name: 'Maintainer Remove One',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // Créer MEMBER à supprimer
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove3@test.com',
          name: 'Member Remove Three',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Maintainer Removal Test' });

      const boardId = board.body.id;

      // OWNER invite MAINTAINER et MEMBER
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // Vérifier 3 membres (OWNER + MAINTAINER + MEMBER)
      const membersBefore = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(membersBefore.body).toHaveLength(3);

      // MAINTAINER supprime le MEMBER
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${memberAuth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(removeResponse.status).toBe(204);

      // Vérifier qu'il reste 2 membres (OWNER + MAINTAINER)
      const membersAfter = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(membersAfter.body).toHaveLength(2);

      const roles = membersAfter.body.map((m: any) => m.role).sort();
      expect(roles).toEqual(['MAINTAINER', 'OWNER']);
    });

    it('should prevent MAINTAINER from removing OWNER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove4@test.com',
          name: 'Owner Remove Four',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer-remove2@test.com',
          name: 'Maintainer Remove Two',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board to Protect Owner' });

      const boardId = board.body.id;

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER essaie de supprimer l'OWNER (doit échouer)
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${ownerAuth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(removeResponse.status).toBe(403);
      expect(removeResponse.body.error).toContain('Cannot remove the last owner');

      // Vérifier que les 2 membres sont toujours là
      const membersAfter = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(membersAfter.body).toHaveLength(2);
    });

    it('should allow MAINTAINER to remove another MAINTAINER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove5@test.com',
          name: 'Owner Remove Five',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER 1
      const maintainer1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer-remove3@test.com',
          name: 'Maintainer Remove Three',
          password: 'Password123!'
        });
      const maintainer1Token = maintainer1Auth.body.token;

      // Créer MAINTAINER 2
      const maintainer2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer-remove4@test.com',
          name: 'Maintainer Remove Four',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Multiple Maintainers' });

      const boardId = board.body.id;

      // OWNER invite les 2 MAINTAINERs
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainer1Auth.body.user.id, role: 'MAINTAINER' });

      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainer2Auth.body.user.id, role: 'MAINTAINER' });

      // Vérifier 3 membres
      const membersBefore = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${maintainer1Token}`);

      expect(membersBefore.body).toHaveLength(3);

      // MAINTAINER 1 supprime MAINTAINER 2
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${maintainer2Auth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainer1Token}`);

      expect(removeResponse.status).toBe(204);

      // Vérifier qu'il reste 2 membres (OWNER + MAINTAINER 1)
      const membersAfter = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${maintainer1Token}`);

      expect(membersAfter.body).toHaveLength(2);
    });
  });

  describe('Edge cases for member removal', () => {
    it('should fail when trying to remove a non-existent member', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove6@test.com',
          name: 'Owner Remove Six',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Non-Existent Member Test' });

      const boardId = board.body.id;

      // Essayer de supprimer un utilisateur qui n'est pas membre
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${fakeUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(removeResponse.status).toBe(404);
      expect(removeResponse.body.error).toContain('Member not found');
    });

    it('should fail when non-member tries to remove a member', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove7@test.com',
          name: 'Owner Remove Seven',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER du board
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member-remove4@test.com',
          name: 'Member Remove Four',
          password: 'Password123!'
        });

      // Créer OUTSIDER (pas membre du board)
      const outsiderAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'outsider-remove1@test.com',
          name: 'Outsider Remove One',
          password: 'Password123!'
        });
      const outsiderToken = outsiderAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Outsider Test' });

      const boardId = board.body.id;

      // OWNER invite MEMBER
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // OUTSIDER essaie de supprimer MEMBER (doit échouer)
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${memberAuth.body.user.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      // Devrait échouer car OUTSIDER n'est pas membre du board
      expect(removeResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow OWNER to remove themselves if there is another OWNER', async () => {
      // Créer OWNER 1
      const owner1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove8@test.com',
          name: 'Owner Remove Eight',
          password: 'Password123!'
        });
      const owner1Token = owner1Auth.body.token;

      // Créer OWNER 2
      const owner2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner-remove9@test.com',
          name: 'Owner Remove Nine',
          password: 'Password123!'
        });

      // OWNER 1 crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ name: 'Board with Multiple Owners' });

      const boardId = board.body.id;

      // OWNER 1 invite OWNER 2
      await request(app)
        .post(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ userId: owner2Auth.body.user.id, role: 'OWNER' });

      // Vérifier 2 OWNERs
      const membersBefore = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(membersBefore.body).toHaveLength(2);
      expect(membersBefore.body.every((m: any) => m.role === 'OWNER')).toBe(true);

      // OWNER 1 peut se retirer car il y a un autre OWNER
      const removeResponse = await request(app)
        .delete(`/api/boards/${boardId}/members/${owner1Auth.body.user.id}`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(removeResponse.status).toBe(204);

      // Vérifier qu'il ne reste qu'OWNER 2
      const membersAfter = await request(app)
        .get(`/api/boards/${boardId}/members`)
        .set('Authorization', `Bearer ${owner1Token}`);

      // OWNER 1 ne peut plus accéder au board
      expect(membersAfter.status).toBe(404);
    });
  });
});
