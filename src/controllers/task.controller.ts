import { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { TaskStatus } from '../../generated/prisma';

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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tasks = await taskService.getBoardTasks(boardId, userId);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
      const status = message.includes('not found') || message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: message });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Task title is required' });
      }

      // Valider le status si fourni
      if (status && !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be TODO, IN_PROGRESS, or DONE' });
      }

      const task = await taskService.createTask(boardId, userId, {
        title: title.trim(),
        description: description?.trim(),
        status: status as TaskStatus,
        assignedTo,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      const message = error instanceof Error ? error.message : 'Failed to create task';
      const status = message.includes('not found') || message.includes('access denied') ? 404 :
                     message.includes('not a member') ? 400 : 500;
      res.status(status).json({ error: message });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validation du titre si fourni
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        return res.status(400).json({ error: 'Task title cannot be empty' });
      }

      // Valider le status si fourni
      if (status && !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be TODO, IN_PROGRESS, or DONE' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (status !== undefined) updateData.status = status as TaskStatus;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

      const task = await taskService.updateTask(boardId, taskId, userId, updateData);
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      const message = error instanceof Error ? error.message : 'Failed to update task';
      const status = message.includes('not found') ? 404 :
                     message.includes('access denied') ? 403 :
                     message.includes('not a member') ? 400 : 500;
      res.status(status).json({ error: message });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await taskService.deleteTask(boardId, taskId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting task:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      const status = message.includes('not found') ? 404 :
                     message.includes('access denied') ? 403 :
                     message.includes('can delete') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }
}

export const taskController = new TaskController();
