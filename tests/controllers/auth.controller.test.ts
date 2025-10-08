import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller';
import { authService } from '../../src/services/auth.service';
import { Request, Response } from 'express';

// Mock auth service
vi.mock('../../src/services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn()
  }
}));

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    authController = new AuthController();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const mockAuthResponse = {
        token: 'mock.jwt.token',
        user: {
          id: '1',
          email: registerData.email,
          name: registerData.name
        }
      };

      mockRequest.body = registerData;
      vi.mocked(authService.register).mockResolvedValue(mockAuthResponse);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(authService.register).toHaveBeenCalledWith(registerData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockAuthResponse);
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {
        name: 'Test User',
        password: 'password123'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(authService.register).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email, name and password are required' });
    });

    it('should return 400 if name is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(authService.register).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email, name and password are required' });
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        name: 'Test User'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(authService.register).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email, name and password are required' });
    });

    it('should return 400 if password is too short', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: '12345'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(authService.register).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters' });
    });

    it('should return 409 if email already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      vi.mocked(authService.register).mockRejectedValue(new Error('Email already exists'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      vi.mocked(authService.register).mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse = {
        token: 'mock.jwt.token',
        user: {
          id: '1',
          email: loginData.email,
          name: 'Test User'
        }
      };

      mockRequest.body = loginData;
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(authService.login).toHaveBeenCalledWith(loginData);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockAuthResponse);
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {
        password: 'password123'
      };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(authService.login).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password are required' });
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com'
      };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(authService.login).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password are required' });
    });

    it('should return 401 with invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      vi.mocked(authService.login).mockRejectedValue(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
