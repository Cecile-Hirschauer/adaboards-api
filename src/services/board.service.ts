import { PrismaClient } from '../../generated/prisma';
import { NotFoundError, ForbiddenError } from '../errors';

const prisma = new PrismaClient();

export class BoardService {
  /**
   * Récupérer tous les boards d'un utilisateur
   */
  async getUserBoards(userId: string) {
    // Récupérer les boards via les memberships
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        board: true,
      },
      orderBy: {
        board: {
          updatedAt: 'desc',
        },
      },
    });

    return memberships.map(m => ({
      id: m.board.id,
      name: m.board.name,
      updated_at: m.board.updatedAt.toISOString(),
      role: m.role,
    }));
  }

  /**
   * Récupérer un board par ID
   */
  async getBoard(boardId: string, userId: string) {
    console.log('[BoardService.getBoard] Looking for board:', { boardId, userId });

    // Vérifier que l'utilisateur est membre du board
    const membership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
      include: {
        board: true,
      },
    });

    console.log('[BoardService.getBoard] Membership found:', membership ? 'YES' : 'NO');

    if (!membership) {
      throw new NotFoundError('Board not found or access denied');
    }

    return {
      id: membership.board.id,
      name: membership.board.name,
      updated_at: membership.board.updatedAt.toISOString(),
      role: membership.role,
    };
  }

  /**
   * Créer un nouveau board
   */
  async createBoard(name: string, userId: string) {
    // Créer le board et ajouter l'utilisateur comme OWNER
    const board = await prisma.board.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    return {
      id: board.id,
      name: board.name,
      updated_at: board.updatedAt.toISOString(),
    };
  }

  /**
   * Mettre à jour un board
   */
  async updateBoard(boardId: string, userId: string, data: { name?: string }) {
    // Vérifier que l'utilisateur est OWNER ou MAINTAINER
    const membership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('Board not found or access denied');
    }

    if (membership.role === 'MEMBER') {
      throw new ForbiddenError('Only owners and maintainers can update boards');
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data: {
        name: data.name,
      },
    });

    return {
      id: board.id,
      name: board.name,
      updated_at: board.updatedAt.toISOString(),
    };
  }

  /**
   * Supprimer un board
   */
  async deleteBoard(boardId: string, userId: string) {
    // Vérifier que l'utilisateur est OWNER
    const membership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('Board not found or access denied');
    }

    if (membership.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can delete boards');
    }

    // Supprimer le board (cascade supprimera automatiquement les memberships et tasks)
    await prisma.board.delete({
      where: { id: boardId },
    });
  }
}

export const boardService = new BoardService();
