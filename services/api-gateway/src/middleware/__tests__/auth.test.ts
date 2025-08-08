import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, requirePermission, optionalAuth } from '../auth';
import { AuthUtils } from '@ideaforge/shared';
import { UserRole } from '@ideaforge/types';
import { AuthService } from '../../services/AuthService';

// Mock dependencies
jest.mock('@ideaforge/shared');
jest.mock('../../services/AuthService');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      mockAuthService.validateToken.mockResolvedValue(mockUser as any);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBe(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOKEN_INVALID',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOKEN_INVALID',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when user not found', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      mockAuthService.validateToken.mockResolvedValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      mockRequest.user = {
        id: 'user-123',
        role: UserRole.ADMIN,
      };

      (AuthUtils.hasRole as jest.Mock).mockReturnValue(true);

      const middleware = requireRole(UserRole.TEAM_LEAD);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      mockRequest.user = {
        id: 'user-123',
        role: UserRole.USER,
      };

      (AuthUtils.hasRole as jest.Mock).mockReturnValue(false);

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INSUFFICIENT_PERMISSIONS',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockRequest.user = undefined;

      const middleware = requireRole(UserRole.USER);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOKEN_INVALID',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      mockRequest.user = {
        id: 'user-123',
        role: UserRole.ADMIN,
      };

      (AuthUtils.hasPermission as jest.Mock).mockReturnValue(true);

      const middleware = requirePermission('ideas', 'create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.hasPermission).toHaveBeenCalledWith(UserRole.ADMIN, 'ideas', 'create');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      mockRequest.user = {
        id: 'user-123',
        role: UserRole.USER,
      };

      (AuthUtils.hasPermission as jest.Mock).mockReturnValue(false);

      const middleware = requirePermission('users', 'delete');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Permission denied for delete on users',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('valid-token');
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      });
      mockAuthService.validateToken.mockResolvedValue(mockUser as any);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBe(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      mockRequest.headers = {};

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (AuthUtils.extractTokenFromHeader as jest.Mock).mockReturnValue('invalid-token');
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});