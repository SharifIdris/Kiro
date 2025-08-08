import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '@ideaforge/shared';
import { UserRole } from '@ideaforge/types';
import { AuthService } from '../services/AuthService';
import { createErrorResponse } from '@ideaforge/shared';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Access token is required',
          },
          'Authentication required'
        )
      );
    }

    // Verify token
    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Invalid or expired token',
          },
          'Authentication failed'
        )
      );
    }

    // Get user from database to ensure they still exist and get latest data
    const authService = new AuthService();
    const user = await authService.validateToken(token);
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'User not found',
          },
          'Authentication failed'
        )
      );
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createErrorResponse(
        {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication failed',
        },
        'Invalid token'
      )
    );
  }
};

export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Authentication required',
          },
          'User not authenticated'
        )
      );
    }

    if (!AuthUtils.hasRole(user.role, requiredRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createErrorResponse(
          {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: `${requiredRole} role required`,
          },
          'Insufficient permissions'
        )
      );
    }

    next();
  };
};

export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Authentication required',
          },
          'User not authenticated'
        )
      );
    }

    if (!AuthUtils.hasPermission(user.role, resource, action)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createErrorResponse(
          {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: `Permission denied for ${action} on ${resource}`,
          },
          'Insufficient permissions'
        )
      );
    }

    next();
  };
};

export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const resourceId = req.params[resourceIdParam];

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse(
          {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Authentication required',
          },
          'User not authenticated'
        )
      );
    }

    // Allow admins to access any resource
    if (AuthUtils.hasRole(user.role, UserRole.ADMIN)) {
      return next();
    }

    // Check if user owns the resource
    // This is a simplified check - in practice, you'd query the database
    // to verify ownership based on the specific resource type
    if (user.id !== resourceId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_ACCESS_DENIED,
            message: 'You can only access your own resources',
          },
          'Access denied'
        )
      );
    }

    next();
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Verify token
    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      // Invalid token, continue without authentication
      return next();
    }

    // Get user from database
    const authService = new AuthService();
    const user = await authService.validateToken(token);
    
    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.warn('Optional authentication error:', error);
    next();
  }
};

// Middleware to check if user can modify a specific resource
export const canModifyResource = (getResourceOwner: (req: Request) => Promise<string | null>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(
          createErrorResponse(
            {
              code: ERROR_CODES.TOKEN_INVALID,
              message: 'Authentication required',
            },
            'User not authenticated'
          )
        );
      }

      // Allow admins to modify any resource
      if (AuthUtils.hasRole(user.role, UserRole.ADMIN)) {
        return next();
      }

      // Get resource owner
      const resourceOwnerId = await getResourceOwner(req);
      
      if (!resourceOwnerId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createErrorResponse(
            {
              code: ERROR_CODES.RESOURCE_NOT_FOUND,
              message: 'Resource not found',
            },
            'Resource not found'
          )
        );
      }

      // Check if user owns the resource
      if (user.id !== resourceOwnerId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          createErrorResponse(
            {
              code: ERROR_CODES.RESOURCE_ACCESS_DENIED,
              message: 'You can only modify your own resources',
            },
            'Access denied'
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          {
            code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            message: 'Failed to verify resource ownership',
          },
          'Internal server error'
        )
      );
    }
  };
};