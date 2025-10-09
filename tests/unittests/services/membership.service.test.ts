import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembershipService } from '../../../src/services/membership.service';
import { PrismaClient, Role } from '../../../generated/prisma';

// Mock Prisma Client
vi.mock('../../../generated/prisma', () => {
  const mockPrismaClient = {
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

describe('MembershipService', () => {
  let membershipService: MembershipService;
  let mockPrisma: any;

  beforeEach(() => {
    membershipService = new MembershipService();
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  describe('getBoardMembers', () => {
    it('should return all members of a board when user has access', async () => {
      const boardId = 'board-1';
      const userId = 'user-1';
      const mockMembership = { id: 'membership-1', userId, boardId, role: 'OWNER' };
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          boardId,
          role: 'OWNER',
          joinedAt: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            email: 'owner@test.com',
            name: 'Owner User',
            createdAt: new Date('2024-01-01'),
          },
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          boardId,
          role: 'MEMBER',
          joinedAt: new Date('2024-01-02'),
          user: {
            id: 'user-2',
            email: 'member@test.com',
            name: 'Member User',
            createdAt: new Date('2024-01-02'),
          },
        },
      ];

      mockPrisma.membership.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.membership.findMany.mockResolvedValue(mockMembers);

      const result = await membershipService.getBoardMembers(boardId, userId);

      expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith({
        where: { userId_boardId: { userId, boardId } },
      });

      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: { boardId },
        include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
        orderBy: { joinedAt: 'asc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'membership-1',
        userId: 'user-1',
        boardId,
        role: 'OWNER',
        joinedAt: mockMembers[0].joinedAt.toISOString(),
        user: {
          id: 'user-1',
          email: 'owner@test.com',
          name: 'Owner User',
          createdAt: mockMembers[0].user.createdAt.toISOString(),
        },
      });
    });

    it('should throw error when user is not a member of the board', async () => {
      const boardId = 'board-1';
      const userId = 'user-1';

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(membershipService.getBoardMembers(boardId, userId)).rejects.toThrow(
        'Board not found or access denied'
      );
    });
  });

  describe('addMember', () => {
    it('should add a member when current user is OWNER', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const role: Role = 'MEMBER';

      const mockCurrentMembership = { id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' };
      const mockTargetUser = { id: targetUserId, email: 'new@test.com', name: 'New User', createdAt: new Date() };
      const mockNewMembership = {
        id: 'membership-2',
        userId: targetUserId,
        boardId,
        role,
        joinedAt: new Date('2024-01-10'),
        user: mockTargetUser,
      };

      mockPrisma.membership.findUnique.mockResolvedValueOnce(mockCurrentMembership).mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockTargetUser);
      mockPrisma.membership.create.mockResolvedValue(mockNewMembership);

      const result = await membershipService.addMember(boardId, currentUserId, targetUserId, role);

      expect(mockPrisma.membership.create).toHaveBeenCalledWith({
        data: { userId: targetUserId, boardId, role },
        include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      });

      expect(result).toEqual({
        id: 'membership-2',
        userId: targetUserId,
        boardId,
        role,
        joinedAt: mockNewMembership.joinedAt.toISOString(),
        user: {
          id: targetUserId,
          email: 'new@test.com',
          name: 'New User',
          createdAt: mockTargetUser.createdAt.toISOString(),
        },
      });
    });

    it('should throw error when current user is only MEMBER', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';

      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: currentUserId,
        boardId,
        role: 'MEMBER',
      });

      await expect(membershipService.addMember(boardId, currentUserId, targetUserId)).rejects.toThrow(
        'Only owners and maintainers can add members'
      );
    });

    it('should throw error when target user does not exist', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-999';

      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'membership-1',
        userId: currentUserId,
        boardId,
        role: 'OWNER',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(membershipService.addMember(boardId, currentUserId, targetUserId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when user is already a member', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({ id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'membership-2', userId: targetUserId, boardId, role: 'MEMBER' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: targetUserId, email: 'test@test.com', name: 'Test' });

      await expect(membershipService.addMember(boardId, currentUserId, targetUserId)).rejects.toThrow(
        'User is already a member of this board'
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role when current user is OWNER', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';
      const newRole: Role = 'MAINTAINER';

      const mockCurrentMembership = { id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' };
      const mockTargetMembership = { id: 'membership-2', userId: targetUserId, boardId, role: 'MEMBER' };
      const mockUpdatedMembership = {
        id: 'membership-2',
        userId: targetUserId,
        boardId,
        role: newRole,
        joinedAt: new Date('2024-01-10'),
        user: { id: targetUserId, email: 'test@test.com', name: 'Test User', createdAt: new Date() },
      };

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce(mockCurrentMembership)
        .mockResolvedValueOnce(mockTargetMembership);
      mockPrisma.membership.update.mockResolvedValue(mockUpdatedMembership);

      const result = await membershipService.updateMemberRole(boardId, currentUserId, targetUserId, newRole);

      expect(mockPrisma.membership.update).toHaveBeenCalledWith({
        where: { userId_boardId: { userId: targetUserId, boardId } },
        data: { role: newRole },
        include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      });

      expect(result.role).toBe(newRole);
    });

    it('should throw error when trying to change the last owner', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-1';
      const newRole: Role = 'MEMBER';

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({ id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'membership-1', userId: targetUserId, boardId, role: 'OWNER' });
      mockPrisma.membership.count.mockResolvedValue(1); // Only one owner

      await expect(
        membershipService.updateMemberRole(boardId, currentUserId, targetUserId, newRole)
      ).rejects.toThrow('Cannot change the role of the last owner');
    });
  });

  describe('removeMember', () => {
    it('should remove member when current user is OWNER', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-2';

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({ id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'membership-2', userId: targetUserId, boardId, role: 'MEMBER' });
      mockPrisma.membership.delete.mockResolvedValue({});

      await membershipService.removeMember(boardId, currentUserId, targetUserId);

      expect(mockPrisma.membership.delete).toHaveBeenCalledWith({
        where: { userId_boardId: { userId: targetUserId, boardId } },
      });
    });

    it('should throw error when trying to remove the last owner', async () => {
      const boardId = 'board-1';
      const currentUserId = 'user-1';
      const targetUserId = 'user-1';

      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({ id: 'membership-1', userId: currentUserId, boardId, role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'membership-1', userId: targetUserId, boardId, role: 'OWNER' });
      mockPrisma.membership.count.mockResolvedValue(1);

      await expect(membershipService.removeMember(boardId, currentUserId, targetUserId)).rejects.toThrow(
        'Cannot remove the last owner'
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users by email or name', async () => {
      const query = 'test';
      const currentUserId = 'user-1';
      const mockUsers = [
        { id: 'user-2', email: 'test@test.com', name: 'Test User', createdAt: new Date('2024-01-01') },
        { id: 'user-3', email: 'another@test.com', name: 'Testing', createdAt: new Date('2024-01-02') },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await membershipService.searchUsers(query, currentUserId);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { not: currentUserId } },
            {
              OR: [
                { email: { contains: query } },
                { name: { contains: query } },
              ],
            },
          ],
        },
        select: { id: true, email: true, name: true, createdAt: true },
        take: 10,
        orderBy: { name: 'asc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-2',
        email: 'test@test.com',
        name: 'Test User',
        createdAt: mockUsers[0].createdAt.toISOString(),
      });
    });

    it('should return empty array for queries less than 2 characters', async () => {
      const result = await membershipService.searchUsers('a', 'user-1');
      expect(result).toEqual([]);
    });

    it('should exclude current user from search results', async () => {
      const query = 'test';
      const currentUserId = 'user-1';

      mockPrisma.user.findMany.mockResolvedValue([]);

      await membershipService.searchUsers(query, currentUserId);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([{ id: { not: currentUserId } }]),
          }),
        })
      );
    });
  });
});
