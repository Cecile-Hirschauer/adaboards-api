import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembershipController } from '../../src/controllers/membership.controller';
import { membershipService } from '../../src/services/membership.service';
import { Request, Response } from 'express';
import { NotFoundError, ForbiddenError, ConflictError } from '../../src/errors';

// Mock membership service
vi.mock('../../src/services/membership.service', () => ({
  membershipService: {
    getBoardMembers: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    searchUsers: vi.fn(),
  },
}));

describe('MembershipController', () => {
  let membershipController: MembershipController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let sendMock: any;

  beforeEach(() => {
    membershipController = new MembershipController();

    jsonMock = vi.fn();
    sendMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, send: sendMock });

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-1', email: 'test@example.com' },
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };

    vi.clearAllMocks();
  });

  describe('getBoardMembers', () => {
    it('should return all members for a board', async () => {
      mockRequest.params = { boardId: 'board-1' };
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          boardId: 'board-1',
          role: 'OWNER',
          joinedAt: '2024-01-01T00:00:00.000Z',
          user: { id: 'user-1', email: 'owner@test.com', name: 'Owner', createdAt: '2024-01-01T00:00:00.000Z' },
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          boardId: 'board-1',
          role: 'MEMBER',
          joinedAt: '2024-01-02T00:00:00.000Z',
          user: { id: 'user-2', email: 'member@test.com', name: 'Member', createdAt: '2024-01-02T00:00:00.000Z' },
        },
      ];

      vi.mocked(membershipService.getBoardMembers).mockResolvedValue(mockMembers);

      await membershipController.getBoardMembers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.getBoardMembers).toHaveBeenCalledWith('board-1', 'user-1');
      expect(jsonMock).toHaveBeenCalledWith(mockMembers);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { boardId: 'board-1' };

      await membershipController.getBoardMembers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.getBoardMembers).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if board not found or access denied', async () => {
      mockRequest.params = { boardId: 'board-1' };
      vi.mocked(membershipService.getBoardMembers).mockRejectedValue(new NotFoundError('Board not found or access denied'));

      await membershipController.getBoardMembers(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Board not found or access denied' });
    });
  });

  describe('addMember', () => {
    it('should add a member to a board', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { userId: 'user-2', role: 'MEMBER' };
      const mockMember = {
        id: 'membership-2',
        userId: 'user-2',
        boardId: 'board-1',
        role: 'MEMBER',
        joinedAt: '2024-01-10T00:00:00.000Z',
        user: { id: 'user-2', email: 'new@test.com', name: 'New User', createdAt: '2024-01-10T00:00:00.000Z' },
      };

      vi.mocked(membershipService.addMember).mockResolvedValue(mockMember);

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(membershipService.addMember).toHaveBeenCalledWith('board-1', 'user-1', 'user-2', 'MEMBER');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockMember);
    });

    it('should default to MEMBER role if not specified', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { userId: 'user-2' };
      const mockMember = {
        id: 'membership-2',
        userId: 'user-2',
        boardId: 'board-1',
        role: 'MEMBER',
        joinedAt: '2024-01-10T00:00:00.000Z',
        user: { id: 'user-2', email: 'new@test.com', name: 'New User', createdAt: '2024-01-10T00:00:00.000Z' },
      };

      vi.mocked(membershipService.addMember).mockResolvedValue(mockMember);

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(membershipService.addMember).toHaveBeenCalledWith('board-1', 'user-1', 'user-2', 'MEMBER');
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { role: 'MEMBER' };

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(membershipService.addMember).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User ID is required' });
    });

    it('should return 400 if role is invalid', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { userId: 'user-2', role: 'INVALID_ROLE' };

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(membershipService.addMember).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid role. Must be OWNER, MAINTAINER, or MEMBER' });
    });

    it('should return 403 if user does not have permission', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { userId: 'user-2', role: 'MEMBER' };
      vi.mocked(membershipService.addMember).mockRejectedValue(
        new ForbiddenError('Only owners and maintainers can add members')
      );

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Only owners and maintainers can add members' });
    });

    it('should return 409 if user is already a member', async () => {
      mockRequest.params = { boardId: 'board-1' };
      mockRequest.body = { userId: 'user-2', role: 'MEMBER' };
      vi.mocked(membershipService.addMember).mockRejectedValue(
        new ConflictError('User is already a member of this board')
      );

      await membershipController.addMember(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User is already a member of this board' });
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      mockRequest.params = { boardId: 'board-1', userId: 'user-2' };
      mockRequest.body = { role: 'MAINTAINER' };
      const mockUpdatedMember = {
        id: 'membership-2',
        userId: 'user-2',
        boardId: 'board-1',
        role: 'MAINTAINER',
        joinedAt: '2024-01-10T00:00:00.000Z',
        user: { id: 'user-2', email: 'user@test.com', name: 'User', createdAt: '2024-01-10T00:00:00.000Z' },
      };

      vi.mocked(membershipService.updateMemberRole).mockResolvedValue(mockUpdatedMember);

      await membershipController.updateMemberRole(mockRequest as Request, mockResponse as Response);

      expect(membershipService.updateMemberRole).toHaveBeenCalledWith('board-1', 'user-1', 'user-2', 'MAINTAINER');
      expect(jsonMock).toHaveBeenCalledWith(mockUpdatedMember);
    });

    it('should return 400 if role is missing or invalid', async () => {
      mockRequest.params = { boardId: 'board-1', userId: 'user-2' };
      mockRequest.body = {};

      await membershipController.updateMemberRole(mockRequest as Request, mockResponse as Response);

      expect(membershipService.updateMemberRole).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid role. Must be OWNER, MAINTAINER, or MEMBER' });
    });

    it('should return 403 if trying to change last owner', async () => {
      mockRequest.params = { boardId: 'board-1', userId: 'user-2' };
      mockRequest.body = { role: 'MEMBER' };
      vi.mocked(membershipService.updateMemberRole).mockRejectedValue(
        new ForbiddenError('Cannot change the role of the last owner')
      );

      await membershipController.updateMemberRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot change the role of the last owner' });
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a board', async () => {
      mockRequest.params = { boardId: 'board-1', userId: 'user-2' };
      vi.mocked(membershipService.removeMember).mockResolvedValue(undefined);

      await membershipController.removeMember(mockRequest as Request, mockResponse as Response);

      expect(membershipService.removeMember).toHaveBeenCalledWith('board-1', 'user-1', 'user-2');
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('should return 403 if trying to remove last owner', async () => {
      mockRequest.params = { boardId: 'board-1', userId: 'user-1' };
      vi.mocked(membershipService.removeMember).mockRejectedValue(new ForbiddenError('Cannot remove the last owner'));

      await membershipController.removeMember(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Cannot remove the last owner' });
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      mockRequest.query = { q: 'test' };
      const mockUsers = [
        { id: 'user-2', email: 'test@test.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'user-3', email: 'testing@test.com', name: 'Testing', createdAt: '2024-01-02T00:00:00.000Z' },
      ];

      vi.mocked(membershipService.searchUsers).mockResolvedValue(mockUsers);

      await membershipController.searchUsers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.searchUsers).toHaveBeenCalledWith('test', 'user-1', 10);
      expect(jsonMock).toHaveBeenCalledWith(mockUsers);
    });

    it('should return empty array if query is too short', async () => {
      mockRequest.query = { q: 'a' };
      vi.mocked(membershipService.searchUsers).mockResolvedValue([]);

      await membershipController.searchUsers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.searchUsers).toHaveBeenCalledWith('a', 'user-1', 10);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should return empty array if query is missing', async () => {
      mockRequest.query = {};
      vi.mocked(membershipService.searchUsers).mockResolvedValue([]);

      await membershipController.searchUsers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.searchUsers).toHaveBeenCalledWith(undefined, 'user-1', 10);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.query = { q: 'test' };

      await membershipController.searchUsers(mockRequest as Request, mockResponse as Response);

      expect(membershipService.searchUsers).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});
