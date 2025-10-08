import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardController } from '../../src/controllers/board.controller';
import { boardService } from '../../src/services/board.service';
import { Request, Response } from 'express';

// Mock board service
vi.mock('../../src/services/board.service', () => ({
  boardService: {
    getUserBoards: vi.fn(),
    getBoard: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    deleteBoard: vi.fn()
  }
}));

describe('BoardController', () => {
  let boardController: BoardController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let sendMock: any;

  beforeEach(() => {
    boardController = new BoardController();

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

  describe('getBoards', () => {
    it('should return all boards for authenticated user', async () => {
      const mockBoards = [
        { id: 'board-1', name: 'Project A', updated_at: '2024-01-15T00:00:00.000Z', role: 'OWNER' },
        { id: 'board-2', name: 'Project B', updated_at: '2024-01-20T00:00:00.000Z', role: 'MEMBER' }
      ];

      vi.mocked(boardService.getUserBoards).mockResolvedValue(mockBoards);

      await boardController.getBoards(mockRequest as Request, mockResponse as Response);

      expect(boardService.getUserBoards).toHaveBeenCalledWith('user-1');
      expect(jsonMock).toHaveBeenCalledWith(mockBoards);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await boardController.getBoards(mockRequest as Request, mockResponse as Response);

      expect(boardService.getUserBoards).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 500 on service error', async () => {
      vi.mocked(boardService.getUserBoards).mockRejectedValue(new Error('Database error'));

      await boardController.getBoards(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch boards' });
    });
  });

  describe('getBoard', () => {
    it('should return board by id', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'My Board',
        updated_at: '2024-01-15T00:00:00.000Z',
        role: 'OWNER'
      };

      mockRequest.params = { id: 'board-1' };
      vi.mocked(boardService.getBoard).mockResolvedValue(mockBoard);

      await boardController.getBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.getBoard).toHaveBeenCalledWith('board-1', 'user-1');
      expect(jsonMock).toHaveBeenCalledWith(mockBoard);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'board-1' };

      await boardController.getBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.getBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if board not found', async () => {
      mockRequest.params = { id: 'board-1' };
      vi.mocked(boardService.getBoard).mockRejectedValue(new Error('Board not found or access denied'));

      await boardController.getBoard(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Board not found or access denied' });
    });
  });

  describe('createBoard', () => {
    it('should create a new board', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'New Board',
        updated_at: '2024-01-15T00:00:00.000Z'
      };

      mockRequest.body = { name: 'New Board' };
      vi.mocked(boardService.createBoard).mockResolvedValue(mockBoard);

      await boardController.createBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.createBoard).toHaveBeenCalledWith('New Board', 'user-1');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockBoard);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { name: 'New Board' };

      await boardController.createBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.createBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 if name is missing', async () => {
      mockRequest.body = {};

      await boardController.createBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.createBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Board name is required' });
    });

    it('should return 400 if name is empty string', async () => {
      mockRequest.body = { name: '   ' };

      await boardController.createBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.createBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Board name is required' });
    });

    it('should trim whitespace from name', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'Trimmed Name',
        updated_at: '2024-01-15T00:00:00.000Z'
      };

      mockRequest.body = { name: '  Trimmed Name  ' };
      vi.mocked(boardService.createBoard).mockResolvedValue(mockBoard);

      await boardController.createBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.createBoard).toHaveBeenCalledWith('Trimmed Name', 'user-1');
    });
  });

  describe('updateBoard', () => {
    it('should update board successfully', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'Updated Name',
        updated_at: '2024-01-15T00:00:00.000Z'
      };

      mockRequest.params = { id: 'board-1' };
      mockRequest.body = { name: 'Updated Name' };
      vi.mocked(boardService.updateBoard).mockResolvedValue(mockBoard);

      await boardController.updateBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.updateBoard).toHaveBeenCalledWith('board-1', 'user-1', { name: 'Updated Name' });
      expect(jsonMock).toHaveBeenCalledWith(mockBoard);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'board-1' };
      mockRequest.body = { name: 'Updated Name' };

      await boardController.updateBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.updateBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 400 if name is missing', async () => {
      mockRequest.params = { id: 'board-1' };
      mockRequest.body = {};

      await boardController.updateBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.updateBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 403 if user is not owner or maintainer', async () => {
      mockRequest.params = { id: 'board-1' };
      mockRequest.body = { name: 'Updated Name' };
      vi.mocked(boardService.updateBoard).mockRejectedValue(new Error('Only owners and maintainers can update boards'));

      await boardController.updateBoard(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Only owners and maintainers can update boards' });
    });

    it('should return 404 if board not found', async () => {
      mockRequest.params = { id: 'board-1' };
      mockRequest.body = { name: 'Updated Name' };
      vi.mocked(boardService.updateBoard).mockRejectedValue(new Error('Board not found or access denied'));

      await boardController.updateBoard(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteBoard', () => {
    it('should delete board successfully', async () => {
      mockRequest.params = { id: 'board-1' };
      vi.mocked(boardService.deleteBoard).mockResolvedValue(undefined);

      await boardController.deleteBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.deleteBoard).toHaveBeenCalledWith('board-1', 'user-1');
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'board-1' };

      await boardController.deleteBoard(mockRequest as Request, mockResponse as Response);

      expect(boardService.deleteBoard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user is not owner', async () => {
      mockRequest.params = { id: 'board-1' };
      vi.mocked(boardService.deleteBoard).mockRejectedValue(new Error('Only owners can delete boards'));

      await boardController.deleteBoard(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Only owners can delete boards' });
    });

    it('should return 404 if board not found', async () => {
      mockRequest.params = { id: 'board-1' };
      vi.mocked(boardService.deleteBoard).mockRejectedValue(new Error('Board not found or access denied'));

      await boardController.deleteBoard(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});
