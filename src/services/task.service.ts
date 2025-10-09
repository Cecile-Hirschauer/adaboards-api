import { PrismaClient, TaskStatus } from '../../generated/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors';

const prisma = new PrismaClient();

export class TaskService {
  /**
   * Vérifier que l'utilisateur a accès au board
   */
  private async verifyBoardAccess(boardId: string, userId: string) {
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

    return membership;
  }

  /**
   * Récupérer toutes les tâches d'un board
   */
  async getBoardTasks(boardId: string, userId: string) {
    // Vérifier l'accès au board
    await this.verifyBoardAccess(boardId, userId);

    const tasks = await prisma.task.findMany({
      where: { boardId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      boardId: task.boardId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      creator: task.creator,
      assignee: task.assignee,
    }));
  }

  /**
   * Créer une nouvelle tâche
   */
  async createTask(
    boardId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      assignedTo?: string;
    }
  ) {
    // Vérifier l'accès au board
    await this.verifyBoardAccess(boardId, userId);

    // Si assignedTo est fourni, vérifier que cet utilisateur est membre du board
    if (data.assignedTo) {
      const assigneeMembership = await prisma.membership.findUnique({
        where: {
          userId_boardId: {
            userId: data.assignedTo,
            boardId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new BadRequestError('Assigned user is not a member of this board');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        boardId,
        createdBy: userId,
        assignedTo: data.assignedTo,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      boardId: task.boardId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      creator: task.creator,
      assignee: task.assignee,
    };
  }

  /**
   * Mettre à jour une tâche
   */
  async updateTask(
    boardId: string,
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      assignedTo?: string;
    }
  ) {
    // Vérifier l'accès au board
    await this.verifyBoardAccess(boardId, userId);

    // Vérifier que la tâche existe et appartient au board
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        boardId,
      },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Si assignedTo est fourni, vérifier que cet utilisateur est membre du board
    if (data.assignedTo !== undefined) {
      if (data.assignedTo !== null) {
        const assigneeMembership = await prisma.membership.findUnique({
          where: {
            userId_boardId: {
              userId: data.assignedTo,
              boardId,
            },
          },
        });

        if (!assigneeMembership) {
          throw new BadRequestError('Assigned user is not a member of this board');
        }
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        assignedTo: data.assignedTo,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      boardId: task.boardId,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      creator: task.creator,
      assignee: task.assignee,
    };
  }

  /**
   * Supprimer une tâche
   */
  async deleteTask(boardId: string, taskId: string, userId: string) {
    // Vérifier l'accès au board
    const membership = await this.verifyBoardAccess(boardId, userId);

    // Vérifier que la tâche existe et appartient au board
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        boardId,
      },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Seuls le créateur de la tâche, les OWNER et MAINTAINER peuvent supprimer
    const canDelete =
      existingTask.createdBy === userId ||
      membership.role === 'OWNER' ||
      membership.role === 'MAINTAINER';

    if (!canDelete) {
      throw new ForbiddenError('Only task creator, owners and maintainers can delete tasks');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });
  }
}

export const taskService = new TaskService();
