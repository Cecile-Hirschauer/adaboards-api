import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskController } from '../../src/controllers/task.controller';
import { taskService } from '../../src/services/task.service';
import { Request, Response } from 'express';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../src/errors';
import { TaskStatus } from '../../generated/prisma';

// Mock task service
vi.mock('../../src/services/task.service', () => ({
  taskService: {
    getBoardTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn()
  }
}));

describe('TaskController', () => {
  let taskController: TaskController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let sendMock: any;

  beforeEach(() => {
    taskController = new TaskController();

    jsonMock = vi.fn();
    sendMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    mockRequest = {
      body: {},
      params: {},
      user: { id: 'user-1', email: 'test@example.com' }
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      send: sendMock
    };

    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return all tasks for a board', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description',
          status: TaskStatus.TODO,
          boardId: 'board-1',
          createdBy: 'user-1',
          assignedTo: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          creator: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
          assignee: null
        }
      ];

      mockRequest.params = { boardId: 'board-1' };
      vi.mocked(taskService.getBoardTasks).mockResolvedValue(mockTasks);

      await taskController.getTasks(mockRequest as Request, mockResponse as Response);

      expect(taskService.getBoardTasks).toHaveBeenCalledWith('board-1', 'user-1');
      expect(jsonMock).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { boardId: 'board-1' };

      await taskController.getTasks(mockRequest as Request, mockResponse as Response);

      expect(taskService.getBoardTasks).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if board not found', async () => {
      mockRequest.params = { boardId: 'board-1' };
      vi.mocked(taskService.getBoardTasks).mockRejectedValue(new NotFoundError('Board not found or access denied'));

      await taskController.getTasks(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Board not found or access denied' });
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'New Task',
        description: 'Description',
        status: TaskStatus.TODO,
        boardId: 'board-1',
        createdBy: 'user-1',
        assignedTo: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        creator: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
        assignee: null
      };

      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { title: 'New Task', description: 'Description' };
      vi.mocked(taskService.createTask).mockResolvedValue(mockTask);

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).toHaveBeenCalledWith('board-1', 'user-1', {
        title: 'New Task',
        description: 'Description',
        status: undefined,
        assignedTo: undefined
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockTask);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { title: 'New Task' };

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 400 if title is missing', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = {};

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Task title is required' });
    });

    it('should return 400 if title is empty string', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { title: '   ' };

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 if status is invalid', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { title: 'Task', status: 'INVALID_STATUS' };

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid status. Must be TODO, IN_PROGRESS, or DONE' });
    });

    it('should trim whitespace from title and description', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Trimmed Task',
        description: 'Trimmed Description',
        status: TaskStatus.TODO,
        boardId: 'board-1',
        createdBy: 'user-1',
        assignedTo: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        creator: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
        assignee: null
      };

      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { title: '  Trimmed Task  ', description: '  Trimmed Description  ' };
      vi.mocked(taskService.createTask).mockResolvedValue(mockTask);

      await taskController.createTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.createTask).toHaveBeenCalledWith('board-1', 'user-1', {
        title: 'Trimmed Task',
        description: 'Trimmed Description',
        status: undefined,
        assignedTo: undefined
      });
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Updated Task',
        description: null,
        status: TaskStatus.DONE,
        boardId: 'board-1',
        createdBy: 'user-1',
        assignedTo: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        creator: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
        assignee: null
      };

      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      mockRequest.body = { title: 'Updated Task', status: 'DONE' };
      vi.mocked(taskService.updateTask).mockResolvedValue(mockTask);

      await taskController.updateTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.updateTask).toHaveBeenCalledWith('board-1', 'task-1', 'user-1', {
        title: 'Updated Task',
        status: 'DONE'
      });
      expect(jsonMock).toHaveBeenCalledWith(mockTask);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      mockRequest.body = { title: 'Updated' };

      await taskController.updateTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.updateTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 400 if title is empty string', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      mockRequest.body = { title: '   ' };

      await taskController.updateTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.updateTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Task title cannot be empty' });
    });

    it('should return 400 if status is invalid', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      mockRequest.body = { status: 'INVALID' };

      await taskController.updateTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.updateTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 if task not found', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      mockRequest.body = { title: 'Updated' };
      vi.mocked(taskService.updateTask).mockRejectedValue(new NotFoundError('Task not found'));

      await taskController.updateTask(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      vi.mocked(taskService.deleteTask).mockResolvedValue(undefined);

      await taskController.deleteTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.deleteTask).toHaveBeenCalledWith('board-1', 'task-1', 'user-1');
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };

      await taskController.deleteTask(mockRequest as Request, mockResponse as Response);

      expect(taskService.deleteTask).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user cannot delete task', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      vi.mocked(taskService.deleteTask).mockRejectedValue(new ForbiddenError('Only task creator, owners and maintainers can delete tasks'));

      await taskController.deleteTask(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Only task creator, owners and maintainers can delete tasks' });
    });

    it('should return 404 if task not found', async () => {
      mockRequest.params = { boardId: 'board-1', taskId: 'task-1' };
      vi.mocked(taskService.deleteTask).mockRejectedValue(new NotFoundError('Task not found'));

      await taskController.deleteTask(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});
