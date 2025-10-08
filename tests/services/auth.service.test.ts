import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma';

// Mock Prisma Client
vi.mock('../../generated/prisma', () => {
  const mockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  };
});

// Mock bcrypt
vi.mock('bcrypt');

// Mock jsonwebtoken
vi.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    authService = new AuthService();
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: '1',
        email: registerData.email,
        name: registerData.name,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockToken = 'mock.jwt.token';

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never);

      // Execute
      const result = await authService.register(registerData);

      // Assertions
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerData.email,
          name: registerData.name,
          password: hashedPassword
        }
      });
      expect(result).toEqual({
        token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        }
      });
    });

    it('should throw error if email already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const existingUser = {
        id: '1',
        email: registerData.email,
        name: 'Existing User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Setup mock
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      // Execute and assert
      await expect(authService.register(registerData)).rejects.toThrow('Email already exists');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        name: 'Test User',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockToken = 'mock.jwt.token';

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never);

      // Execute
      const result = await authService.login(loginData);

      // Assertions
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(result).toEqual({
        token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        }
      });
    });

    it('should throw error if user does not exist', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Setup mock
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Execute and assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        name: 'Test User',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Execute and assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        userId: '1',
        email: 'test@example.com'
      };

      // Setup mock
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as never);

      // Execute
      const result = authService.verifyToken(mockToken);

      // Assertions
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', () => {
      const mockToken = 'invalid.jwt.token';

      // Setup mock
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Execute and assert
      expect(() => authService.verifyToken(mockToken)).toThrow('Invalid token');
    });
  });
});
