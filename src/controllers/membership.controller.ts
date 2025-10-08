import { Request, Response } from 'express';
import { membershipService } from '../services/membership.service';
import { Role } from '../../generated/prisma';

export class MembershipController {
  /**
   * GET /api/boards/:boardId/members
   * Récupérer tous les membres d'un board
   */
  async getBoardMembers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.boardId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const members = await membershipService.getBoardMembers(boardId, userId);
      res.json(members);
    } catch (error) {
      console.error('Error fetching board members:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch members';
      const status = message.includes('not found') || message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * POST /api/boards/:boardId/members
   * Ajouter un membre à un board
   */
  async addMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.boardId;
      const { userId: targetUserId, role } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validation
      if (!targetUserId || typeof targetUserId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Valider le rôle
      const validRoles: Role[] = ['OWNER', 'MAINTAINER', 'MEMBER'];
      const memberRole = role || 'MEMBER';
      if (!validRoles.includes(memberRole)) {
        return res.status(400).json({ error: 'Invalid role. Must be OWNER, MAINTAINER, or MEMBER' });
      }

      const member = await membershipService.addMember(boardId, userId, targetUserId, memberRole);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      const message = error instanceof Error ? error.message : 'Failed to add member';
      const status = message.includes('not found') ? 404 :
                     message.includes('access denied') || message.includes('Only owners') ? 403 :
                     message.includes('already a member') ? 409 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * PATCH /api/boards/:boardId/members/:userId
   * Modifier le rôle d'un membre
   */
  async updateMemberRole(req: Request, res: Response) {
    try {
      const currentUserId = req.user?.id;
      const boardId = req.params.boardId;
      const targetUserId = req.params.userId;
      const { role } = req.body;

      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validation du rôle
      const validRoles: Role[] = ['OWNER', 'MAINTAINER', 'MEMBER'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be OWNER, MAINTAINER, or MEMBER' });
      }

      const member = await membershipService.updateMemberRole(boardId, currentUserId, targetUserId, role);
      res.json(member);
    } catch (error) {
      console.error('Error updating member role:', error);
      const message = error instanceof Error ? error.message : 'Failed to update member role';
      const status = message.includes('not found') ? 404 :
                     message.includes('access denied') || message.includes('Only owners') || message.includes('last owner') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * DELETE /api/boards/:boardId/members/:userId
   * Retirer un membre d'un board
   */
  async removeMember(req: Request, res: Response) {
    try {
      const currentUserId = req.user?.id;
      const boardId = req.params.boardId;
      const targetUserId = req.params.userId;

      if (!currentUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await membershipService.removeMember(boardId, currentUserId, targetUserId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing member:', error);
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      const status = message.includes('not found') ? 404 :
                     message.includes('access denied') || message.includes('Only owners') || message.includes('last owner') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * GET /api/users/search
   * Rechercher des utilisateurs par email ou nom
   */
  async searchUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const query = req.query.q as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json([]);
      }

      const users = await membershipService.searchUsers(query.trim(), userId);
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
}

export const membershipController = new MembershipController();
