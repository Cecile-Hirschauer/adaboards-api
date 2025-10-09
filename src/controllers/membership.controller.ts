import { Request, Response } from 'express';
import { membershipService } from '../services/membership.service';
import { Role } from '../../generated/prisma';
import { UnauthorizedError, BadRequestError } from '../errors';
import { mapError } from '../utils/http';

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
        throw new UnauthorizedError();
      }

      const members = await membershipService.getBoardMembers(boardId, userId);
      return res.json(members);
    } catch (error) {
      console.error('Error fetching board members:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      // Validation
      if (!targetUserId || typeof targetUserId !== 'string') {
        throw new BadRequestError('User ID is required');
      }

      // Valider le rôle
      const validRoles: Role[] = ['OWNER', 'MAINTAINER', 'MEMBER'];
      const memberRole = role || 'MEMBER';
      if (!validRoles.includes(memberRole)) {
        throw new BadRequestError('Invalid role. Must be OWNER, MAINTAINER, or MEMBER');
      }

      const member = await membershipService.addMember(boardId, userId, targetUserId, memberRole);
      return res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      // Validation du rôle
      const validRoles: Role[] = ['OWNER', 'MAINTAINER', 'MEMBER'];
      if (!role || !validRoles.includes(role)) {
        throw new BadRequestError('Invalid role. Must be OWNER, MAINTAINER, or MEMBER');
      }

      const member = await membershipService.updateMemberRole(boardId, currentUserId, targetUserId, role);
      return res.json(member);
    } catch (error) {
      console.error('Error updating member role:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      await membershipService.removeMember(boardId, currentUserId, targetUserId);
      return res.status(204).send();
    } catch (error) {
      console.error('Error removing member:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }

  /**
   * GET /api/search/users
   * Rechercher des utilisateurs
   */
  async searchUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (!userId) {
        throw new UnauthorizedError();
      }

      const users = await membershipService.searchUsers(query, userId, limit);
      return res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }
}

export const membershipController = new MembershipController();
