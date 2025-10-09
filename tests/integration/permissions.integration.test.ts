import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import './setup';

/**
 * Tests d'intégration pour les permissions et rôles
 *
 * Rôles disponibles :
 * - OWNER : Tous les droits (update board, delete board, add/remove members, change roles)
 * - MAINTAINER : Droits limités (update board, add/remove members, change roles de MEMBER uniquement)
 * - MEMBER : Lecture seule + création de tâches
 */

describe('Permissions & Roles Integration Tests', () => {
  describe('Board Update Permissions', () => {
    it('should allow OWNER to update board name', async () => {
      // Créer un utilisateur OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner1@test.com',
          name: 'Owner One',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Original Board Name' });

      // OWNER peut modifier le nom
      const response = await request(app)
        .patch(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Board Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Board Name');
    });

    it('should allow MAINTAINER to update board name', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner2@test.com',
          name: 'Owner Two',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer1@test.com',
          name: 'Maintainer One',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Maintainer' });

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER peut modifier le nom
      const response = await request(app)
        .patch(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({ name: 'Updated by Maintainer' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated by Maintainer');
    });

    it('should deny MEMBER from updating board name', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner3@test.com',
          name: 'Owner Three',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member1@test.com',
          name: 'Member One',
          password: 'Password123!'
        });
      const memberToken = memberAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board for Member' });

      // OWNER invite MEMBER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // MEMBER ne peut PAS modifier le nom
      const response = await request(app)
        .patch(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Trying to Update' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only owners and maintainers');
    });
  });

  describe('Board Delete Permissions', () => {
    it('should allow only OWNER to delete board', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner4@test.com',
          name: 'Owner Four',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer2@test.com',
          name: 'Maintainer Two',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board to Delete' });

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER ne peut PAS supprimer
      const maintainerDelete = await request(app)
        .delete(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(maintainerDelete.status).toBe(403);
      expect(maintainerDelete.body.error).toContain('Only owners can delete');

      // OWNER peut supprimer
      const ownerDelete = await request(app)
        .delete(`/api/boards/${board.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(ownerDelete.status).toBe(204);
    });
  });

  describe('Member Management Permissions', () => {
    it('should allow OWNER to add members with any role', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner5@test.com',
          name: 'Owner Five',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer utilisateurs à inviter
      const user1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invite1@test.com',
          name: 'Invite One',
          password: 'Password123!'
        });

      const user2 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invite2@test.com',
          name: 'Invite Two',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Multiple Roles' });

      // OWNER peut ajouter un MAINTAINER
      const addMaintainer = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: user1.body.user.id, role: 'MAINTAINER' });

      expect(addMaintainer.status).toBe(201);
      expect(addMaintainer.body.role).toBe('MAINTAINER');

      // OWNER peut ajouter un MEMBER
      const addMember = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: user2.body.user.id, role: 'MEMBER' });

      expect(addMember.status).toBe(201);
      expect(addMember.body.role).toBe('MEMBER');
    });

    it('should allow MAINTAINER to add members', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner6@test.com',
          name: 'Owner Six',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer3@test.com',
          name: 'Maintainer Three',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // Créer utilisateur à inviter
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newmember1@test.com',
          name: 'New Member One',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board Managed by Maintainer' });

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER peut ajouter des membres
      const addMember = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({ userId: newUser.body.user.id, role: 'MEMBER' });

      expect(addMember.status).toBe(201);
      expect(addMember.body.role).toBe('MEMBER');
    });

    it('should deny MEMBER from adding other members', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner7@test.com',
          name: 'Owner Seven',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member2@test.com',
          name: 'Member Two',
          password: 'Password123!'
        });
      const memberToken = memberAuth.body.token;

      // Créer utilisateur à inviter
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newmember2@test.com',
          name: 'New Member Two',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Member Restriction' });

      // OWNER invite MEMBER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // MEMBER ne peut PAS ajouter des membres
      const addMember = await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: newUser.body.user.id, role: 'MEMBER' });

      expect(addMember.status).toBe(403);
      expect(addMember.body.error).toContain('Only owners and maintainers');
    });
  });

  describe('Role Change Permissions', () => {
    it('should allow OWNER and MAINTAINER to change member roles', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner8@test.com',
          name: 'Owner Eight',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer4@test.com',
          name: 'Maintainer Four',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // Créer MEMBER
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member3@test.com',
          name: 'Member Three',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Role Changes' });

      // OWNER invite MAINTAINER et MEMBER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // MAINTAINER peut changer le rôle de MEMBER
      const roleChange = await request(app)
        .patch(`/api/boards/${board.body.id}/members/${memberAuth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({ role: 'MAINTAINER' });

      expect(roleChange.status).toBe(200);
      expect(roleChange.body.role).toBe('MAINTAINER');
    });

    it('should prevent changing role of last OWNER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner9@test.com',
          name: 'Owner Nine',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer5@test.com',
          name: 'Maintainer Five',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Last Owner' });

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER ne peut PAS changer le rôle du dernier OWNER
      const roleChange = await request(app)
        .patch(`/api/boards/${board.body.id}/members/${ownerAuth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`)
        .send({ role: 'MEMBER' });

      expect(roleChange.status).toBe(403);
      expect(roleChange.body.error).toContain('Cannot change the role of the last owner');
    });

    it('should deny MEMBER from changing roles', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner10@test.com',
          name: 'Owner Ten',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER 1 et 2
      const member1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member4@test.com',
          name: 'Member Four',
          password: 'Password123!'
        });
      const member1Token = member1Auth.body.token;

      const member2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member5@test.com',
          name: 'Member Five',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Member Restrictions' });

      // OWNER invite MEMBER 1 et 2
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member1Auth.body.user.id, role: 'MEMBER' });

      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member2Auth.body.user.id, role: 'MEMBER' });

      // MEMBER 1 ne peut PAS changer le rôle de MEMBER 2
      const roleChange = await request(app)
        .patch(`/api/boards/${board.body.id}/members/${member2Auth.body.user.id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ role: 'MAINTAINER' });

      expect(roleChange.status).toBe(403);
      expect(roleChange.body.error).toContain('Only owners and maintainers');
    });
  });

  describe('Member Removal Permissions', () => {
    it('should allow OWNER and MAINTAINER to remove members', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner11@test.com',
          name: 'Owner Eleven',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer6@test.com',
          name: 'Maintainer Six',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // Créer MEMBERs
      const member1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member6@test.com',
          name: 'Member Six',
          password: 'Password123!'
        });

      const member2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member7@test.com',
          name: 'Member Seven',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Removals' });

      // OWNER invite tous les membres
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member1Auth.body.user.id, role: 'MEMBER' });

      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member2Auth.body.user.id, role: 'MEMBER' });

      // MAINTAINER peut retirer MEMBER 1
      const remove1 = await request(app)
        .delete(`/api/boards/${board.body.id}/members/${member1Auth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(remove1.status).toBe(204);

      // OWNER peut retirer MEMBER 2
      const remove2 = await request(app)
        .delete(`/api/boards/${board.body.id}/members/${member2Auth.body.user.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(remove2.status).toBe(204);
    });

    it('should prevent removing last OWNER', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner12@test.com',
          name: 'Owner Twelve',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MAINTAINER
      const maintainerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maintainer7@test.com',
          name: 'Maintainer Seven',
          password: 'Password123!'
        });
      const maintainerToken = maintainerAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Protected Owner' });

      // OWNER invite MAINTAINER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: maintainerAuth.body.user.id, role: 'MAINTAINER' });

      // MAINTAINER ne peut PAS retirer le dernier OWNER
      const remove = await request(app)
        .delete(`/api/boards/${board.body.id}/members/${ownerAuth.body.user.id}`)
        .set('Authorization', `Bearer ${maintainerToken}`);

      expect(remove.status).toBe(403);
      expect(remove.body.error).toContain('Cannot remove the last owner');
    });

    it('should deny MEMBER from removing other members', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner13@test.com',
          name: 'Owner Thirteen',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBERs
      const member1Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member8@test.com',
          name: 'Member Eight',
          password: 'Password123!'
        });
      const member1Token = member1Auth.body.token;

      const member2Auth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member9@test.com',
          name: 'Member Nine',
          password: 'Password123!'
        });

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Member Removal Restriction' });

      // OWNER invite MEMBER 1 et 2
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member1Auth.body.user.id, role: 'MEMBER' });

      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: member2Auth.body.user.id, role: 'MEMBER' });

      // MEMBER 1 ne peut PAS retirer MEMBER 2
      const remove = await request(app)
        .delete(`/api/boards/${board.body.id}/members/${member2Auth.body.user.id}`)
        .set('Authorization', `Bearer ${member1Token}`);

      expect(remove.status).toBe(403);
      expect(remove.body.error).toContain('Only owners and maintainers');
    });
  });

  describe('Access Control by Role', () => {
    it('should allow all members to view board members list', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner14@test.com',
          name: 'Owner Fourteen',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer MEMBER
      const memberAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member10@test.com',
          name: 'Member Ten',
          password: 'Password123!'
        });
      const memberToken = memberAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Board with Members View' });

      // OWNER invite MEMBER
      await request(app)
        .post(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberAuth.body.user.id, role: 'MEMBER' });

      // MEMBER peut voir la liste des membres
      const members = await request(app)
        .get(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(members.status).toBe(200);
      expect(members.body).toHaveLength(2); // OWNER + MEMBER
    });

    it('should deny non-members from viewing board members', async () => {
      // Créer OWNER
      const ownerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'owner15@test.com',
          name: 'Owner Fifteen',
          password: 'Password123!'
        });
      const ownerToken = ownerAuth.body.token;

      // Créer NON-MEMBER
      const outsiderAuth = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'outsider1@test.com',
          name: 'Outsider One',
          password: 'Password123!'
        });
      const outsiderToken = outsiderAuth.body.token;

      // OWNER crée un board
      const board = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Private Board' });

      // NON-MEMBER ne peut PAS voir les membres
      const members = await request(app)
        .get(`/api/boards/${board.body.id}/members`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(members.status).toBe(404);
      expect(members.body.error).toContain('not found or access denied');
    });
  });
});
