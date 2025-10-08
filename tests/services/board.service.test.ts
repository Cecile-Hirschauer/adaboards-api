import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardService } from '../../src/services/board.service';
import { PrismaClient } from '../../generated/prisma';

// Mock Prisma Client
vi.mock('../../generated/prisma', () => {
  const mockPrismaClient = {
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    board: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  };
});

describe('BoardService', () => {
  let boardService: BoardService;
  let mockPrisma: any;

  beforeEach(() => {
    boardService = new BoardService();
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  describe('getUserBoards', () => {
    it('should return all boards for a user', async () => {
      const userId = 'user-1';
      const mockMemberships = [
        {
          id: 'membership-1',
          userId,
          boardId: 'board-1',
          role: 'OWNER',
          board: {
            id: 'board-1',
            name: 'Project A',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
          }
        },
        {
          id: 'membership-2',
          userId,
          boardId: 'board-2',
          role: 'MEMBER',
          board: {
            id: 'board-2',
            name: 'Project B',
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-20'),
          }
        }
      ];

      mockPrisma.membership.findMany.mockResolvedValue(mockMemberships);

      const result = await boardService.getUserBoards(userId);

      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { board: true },
        orderBy: { board: { updatedAt: 'desc' } }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'board-1',
        name: 'Project A',
        updated_at: mockMemberships[0].board.updatedAt.toISOString(),
        role: 'OWNER'
      });
    });

    it('should return empty array if user has no boards', async () => {
      const userId = 'user-without-boards';
      mockPrisma.membership.findMany.mockResolvedValue([]);

      const result = await boardService.getUserBoards(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getBoard', () => {
    it('should return board if user has access', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER',
        board: {
          id: boardId,
          name: 'My Board',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        }
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);

      const result = await boardService.getBoard(boardId, userId);

      expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_boardId: { userId, boardId }
        },
        include: { board: true }
      });

      expect(result).toEqual({
        id: boardId,
        name: 'My Board',
        updated_at: mockMembership.board.updatedAt.toISOString(),
        role: 'OWNER'
      });
    });

    it('should throw error if user does not have access', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(boardService.getBoard(boardId, userId))
        .rejects.toThrow('Board not found or access denied');
    });
  });

  describe('createBoard', () => {
    it('should create a board and add user as OWNER', async () => {
      const userId = 'user-1';
      const boardName = 'New Project';
      const mockBoard = {
        id: 'board-1',
        name: boardName,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.board.create.mockResolvedValue(mockBoard);

      const result = await boardService.createBoard(boardName, userId);

      expect(mockPrisma.board.create).toHaveBeenCalledWith({
        data: {
          name: boardName,
          memberships: {
            create: {
              userId,
              role: 'OWNER'
            }
          }
        }
      });

      expect(result).toEqual({
        id: mockBoard.id,
        name: mockBoard.name,
        updated_at: mockBoard.updatedAt.toISOString()
      });
    });
  });

  describe('updateBoard', () => {
    it('should update board if user is OWNER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const newName = 'Updated Name';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      const mockUpdatedBoard = {
        id: boardId,
        name: newName,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.board.update.mockResolvedValue(mockUpdatedBoard);

      const result = await boardService.updateBoard(boardId, userId, { name: newName });

      expect(mockPrisma.board.update).toHaveBeenCalledWith({
        where: { id: boardId },
        data: { name: newName }
      });

      expect(result).toEqual({
        id: boardId,
        name: newName,
        updated_at: mockUpdatedBoard.updatedAt.toISOString()
      });
    });

    it('should update board if user is MAINTAINER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';
      const newName = 'Updated Name';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MAINTAINER'
      };

      const mockUpdatedBoard = {
        id: boardId,
        name: newName,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.board.update.mockResolvedValue(mockUpdatedBoard);

      await boardService.updateBoard(boardId, userId, { name: newName });

      expect(mockPrisma.board.update).toHaveBeenCalled();
    });

    it('should throw error if user is MEMBER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MEMBER'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);

      await expect(boardService.updateBoard(boardId, userId, { name: 'New Name' }))
        .rejects.toThrow('Only owners and maintainers can update boards');

      expect(mockPrisma.board.update).not.toHaveBeenCalled();
    });

    it('should throw error if user does not have access', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(boardService.updateBoard(boardId, userId, { name: 'New Name' }))
        .rejects.toThrow('Board not found or access denied');
    });
  });

  describe('deleteBoard', () => {
    it('should delete board if user is OWNER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'OWNER'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.board.delete.mockResolvedValue({});

      await boardService.deleteBoard(boardId, userId);

      expect(mockPrisma.board.delete).toHaveBeenCalledWith({
        where: { id: boardId }
      });
    });

    it('should throw error if user is not OWNER', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      const mockMembership = {
        id: 'membership-1',
        userId,
        boardId,
        role: 'MAINTAINER'
      };

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);

      await expect(boardService.deleteBoard(boardId, userId))
        .rejects.toThrow('Only owners can delete boards');

      expect(mockPrisma.board.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user does not have access', async () => {
      const userId = 'user-1';
      const boardId = 'board-1';

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(boardService.deleteBoard(boardId, userId))
        .rejects.toThrow('Board not found or access denied');

      expect(mockPrisma.board.delete).not.toHaveBeenCalled();
    });
  });
});
