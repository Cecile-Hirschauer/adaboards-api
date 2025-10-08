import { PrismaClient, Role } from '../../generated/prisma';

const prisma = new PrismaClient();

export class MembershipService {
  /**
   * Récupérer tous les membres d'un board
   */
  async getBoardMembers(boardId: string, userId: string) {
    // Vérifier que l'utilisateur est membre du board
    const membership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        },
      },
    });

    if (!membership) {
      throw new Error('Board not found or access denied');
    }

    // Récupérer tous les membres du board avec les infos utilisateur
    const members = await prisma.membership.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members.map(m => ({
      id: m.id,
      userId: m.userId,
      boardId: m.boardId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        createdAt: m.user.createdAt.toISOString(),
      },
    }));
  }

  /**
   * Ajouter un membre à un board
   */
  async addMember(boardId: string, currentUserId: string, targetUserId: string, role: Role = 'MEMBER') {
    // Vérifier que l'utilisateur actuel est OWNER ou MAINTAINER
    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: currentUserId,
          boardId,
        },
      },
    });

    if (!currentMembership) {
      throw new Error('Board not found or access denied');
    }

    if (currentMembership.role === 'MEMBER') {
      throw new Error('Only owners and maintainers can add members');
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        },
      },
    });

    if (existingMembership) {
      throw new Error('User is already a member of this board');
    }

    // Créer le membership
    const newMembership = await prisma.membership.create({
      data: {
        userId: targetUserId,
        boardId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      id: newMembership.id,
      userId: newMembership.userId,
      boardId: newMembership.boardId,
      role: newMembership.role,
      joinedAt: newMembership.joinedAt.toISOString(),
      user: {
        id: newMembership.user.id,
        email: newMembership.user.email,
        name: newMembership.user.name,
        createdAt: newMembership.user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Modifier le rôle d'un membre
   */
  async updateMemberRole(boardId: string, currentUserId: string, targetUserId: string, newRole: Role) {
    // Vérifier que l'utilisateur actuel est OWNER ou MAINTAINER
    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: currentUserId,
          boardId,
        },
      },
    });

    if (!currentMembership) {
      throw new Error('Board not found or access denied');
    }

    if (currentMembership.role === 'MEMBER') {
      throw new Error('Only owners and maintainers can update member roles');
    }

    // Vérifier que le membre cible existe
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        },
      },
    });

    if (!targetMembership) {
      throw new Error('Member not found');
    }

    // Empêcher de changer le rôle du dernier OWNER
    if (targetMembership.role === 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: {
          boardId,
          role: 'OWNER',
        },
      });

      if (ownerCount === 1) {
        throw new Error('Cannot change the role of the last owner');
      }
    }

    // Mettre à jour le rôle
    const updatedMembership = await prisma.membership.update({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        },
      },
      data: {
        role: newRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      id: updatedMembership.id,
      userId: updatedMembership.userId,
      boardId: updatedMembership.boardId,
      role: updatedMembership.role,
      joinedAt: updatedMembership.joinedAt.toISOString(),
      user: {
        id: updatedMembership.user.id,
        email: updatedMembership.user.email,
        name: updatedMembership.user.name,
        createdAt: updatedMembership.user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Retirer un membre d'un board
   */
  async removeMember(boardId: string, currentUserId: string, targetUserId: string) {
    // Vérifier que l'utilisateur actuel est OWNER ou MAINTAINER
    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: currentUserId,
          boardId,
        },
      },
    });

    if (!currentMembership) {
      throw new Error('Board not found or access denied');
    }

    if (currentMembership.role === 'MEMBER') {
      throw new Error('Only owners and maintainers can remove members');
    }

    // Vérifier que le membre cible existe
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        },
      },
    });

    if (!targetMembership) {
      throw new Error('Member not found');
    }

    // Empêcher de retirer le dernier OWNER
    if (targetMembership.role === 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: {
          boardId,
          role: 'OWNER',
        },
      });

      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner');
      }
    }

    // Supprimer le membership
    await prisma.membership.delete({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        },
      },
    });
  }

  /**
   * Rechercher des utilisateurs par email ou nom
   */
  async searchUsers(query: string, currentUserId: string, limit: number = 10) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: currentUserId, // Exclure l'utilisateur actuel
            },
          },
          {
            OR: [
              {
                email: {
                  contains: query,
                },
              },
              {
                name: {
                  contains: query,
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
    }));
  }
}

export const membershipService = new MembershipService();
