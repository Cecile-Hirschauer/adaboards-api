import { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { TaskStatus } from '../../generated/prisma';
import { UnauthorizedError, BadRequestError } from '../errors';
import { mapError } from '../utils/http';

export class TaskController {
  /**
   * GET /api/boards/:boardId/tasks
   * Récupérer toutes les tâches d'un board
   */
  async getTasks(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.boardId;

      if (!userId) {
        throw new UnauthorizedError();
      }

      const tasks = await taskService.getBoardTasks(boardId, userId);
      return res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }

  /**
   * POST /api/boards/:boardId/tasks
   * Créer une nouvelle tâche
   */
  async createTask(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.boardId;
      const { title, description, status, assignedTo } = req.body;

      if (!userId) {
        throw new UnauthorizedError();
      }

      // Validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new BadRequestError('Task title is required');
      }

      // Valider le status si fourni
      if (status && !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        throw new BadRequestError('Invalid status. Must be TODO, IN_PROGRESS, or DONE');
      }

      const task = await taskService.createTask(boardId, userId, {
        title: title.trim(),
        description: description?.trim(),
        status: status as TaskStatus,
        assignedTo,
      });

      return res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }

  /**
   * PATCH /api/boards/:boardId/tasks/:taskId
   * Mettre à jour une tâche
   */
  async updateTask(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { boardId, taskId } = req.params;
      const { title, description, status, assignedTo } = req.body;

      if (!userId) {
        throw new UnauthorizedError();
      }

      // Validation du titre si fourni
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        throw new BadRequestError('Task title cannot be empty');
      }

      // Valider le status si fourni
      if (status && !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        throw new BadRequestError('Invalid status. Must be TODO, IN_PROGRESS, or DONE');
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (status !== undefined) updateData.status = status as TaskStatus;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

      const task = await taskService.updateTask(boardId, taskId, userId, updateData);
      return res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }

  /**
   * DELETE /api/boards/:boardId/tasks/:taskId
   * Supprimer une tâche
   */
  async deleteTask(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { boardId, taskId } = req.params;

      if (!userId) {
        throw new UnauthorizedError();
      }

      await taskService.deleteTask(boardId, taskId, userId);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting task:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }
}

export const taskController = new TaskController();
