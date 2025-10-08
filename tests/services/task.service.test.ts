import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService } from '../../src/services/task.service';
import { PrismaClient } from '../../generated/prisma';

// Mock Prisma Client
vi.mock('../../generated/prisma', () => {
  const mockPrismaClient = {
    membership: {
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    TaskStatus: {
      TODO: 'TODO',
      IN_PROGRESS: 'IN_PROGRESS',
      DONE: 'DONE'
    }
  };
});

describe('TaskService', () => {
  let taskService: TaskService;
  let mockPrisma: any;

  beforeEach(() => {
    taskService = new TaskService();
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  describe('getBoardTasks', () => {
    it('should return all tasks for a board', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'TODO',
          boardId,
          createdBy: userId,
          assignedTo: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          creator: { id: userId, name: 'User 1', email: 'user1@test.com' },
          assignee: null
        },
        {
          id: 'task-2',
          title: 'Task 2',
          description: null,
          status: 'IN_PROGRESS',
          boardId,
          createdBy: userId,
          assignedTo: 'user-2',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          creator: { id: userId, name: 'User 1', email: 'user1@test.com' },
          assignee: { id: 'user-2', name: 'User 2', email: 'user2@test.com' }
        }
      ];

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result = await taskService.getBoardTasks(boardId, userId);

      expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith({
        where: { userId_boardId: { userId, boardId } }
      });
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { boardId },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
    });

    it('should throw error if user does not have access to board', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(taskService.getBoardTasks(boardId, userId))
        .rejects.toThrow('Board not found or access denied');

      expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'TODO' as any,
      };

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      const mockTask = {
        id: 'task-1',
        title: taskData.title,
        description: taskData.description,
        status: 'TODO',
        boardId,
        createdBy: userId,
        assignedTo: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        creator: { id: userId, name: 'User 1', email: 'user1@test.com' },
        assignee: null
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await taskService.createTask(boardId, userId, taskData);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: 'TODO',
          boardId,
          createdBy: userId,
          assignedTo: undefined
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } }
        }
      });

      expect(result.id).toBe('task-1');
      expect(result.title).toBe(taskData.title);
    });

    it('should create task with assignee if user is board member', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const assignedUserId = 'user-2';
      const taskData = {
        title: 'Assigned Task',
        assignedTo: assignedUserId
      };

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      const mockAssigneeMembership = {
        id: 'membership-2',
        userId: assignedUserId,
        boardId,
        role: 'MEMBER'
      };

      const mockTask = {
        id: 'task-1',
        title: taskData.title,
        description: null,
        status: 'TODO',
        boardId,
        createdBy: userId,
        assignedTo: assignedUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        creator: { id: userId, name: 'User 1', email: 'user1@test.com' },
        assignee: { id: assignedUserId, name: 'User 2', email: 'user2@test.com' }
      };

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(mockAssigneeMembership);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      await taskService.createTask(boardId, userId, taskData);

      expect(mockPrisma.membership.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should throw error if assignee is not a board member', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskData = {
        title: 'Task',
        assignedTo: 'non-member-user'
      };

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce(mockMembership)
        .mockResolvedValueOnce(null);

      await expect(taskService.createTask(boardId, userId, taskData))
        .rejects.toThrow('Assigned user is not a member of this board');

      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';
      const updateData = {
        title: 'Updated Title',
        status: 'DONE' as any
      };

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      const mockExistingTask = {
        id: taskId,
        title: 'Old Title',
        boardId
      };

      const mockUpdatedTask = {
        id: taskId,
        title: updateData.title,
        description: null,
        status: 'DONE',
        boardId,
        createdBy: userId,
        assignedTo: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        creator: { id: userId, name: 'User 1', email: 'user1@test.com' },
        assignee: null
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);

      const result = await taskService.updateTask(boardId, taskId, userId, updateData);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: updateData,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } }
        }
      });

      expect(result.title).toBe(updateData.title);
    });

    it('should throw error if task not found', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(taskService.updateTask(boardId, taskId, userId, { title: 'New' }))
        .rejects.toThrow('Task not found');

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should delete task if user is creator', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      const mockTask = {
        id: taskId,
        boardId,
        createdBy: userId
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.delete.mockResolvedValue({});

      await taskService.deleteTask(boardId, taskId, userId);

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: taskId }
      });
    });

    it('should delete task if user is OWNER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      const mockTask = {
        id: taskId,
        boardId,
        createdBy: 'different-user'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.delete.mockResolvedValue({});

      await taskService.deleteTask(boardId, taskId, userId);

      expect(mockPrisma.task.delete).toHaveBeenCalled();
    });

    it('should throw error if user is MEMBER and not creator', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      const mockTask = {
        id: taskId,
        boardId,
        createdBy: 'different-user'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      await expect(taskService.deleteTask(boardId, taskId, userId))
        .rejects.toThrow('Only task creator, owners and maintainers can delete tasks');

      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });

    it('should throw error if task not found', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const taskId = 'task-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(taskService.deleteTask(boardId, taskId, userId))
        .rejects.toThrow('Task not found');

      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });
  });
});
