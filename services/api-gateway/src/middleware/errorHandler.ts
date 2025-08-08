import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { createErrorResponse } from '@ideaforge/shared';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Default error values
  let statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = error.code || ERROR_CODES.EXTERNAL_SERVICE_ERROR;
  let message = error.message || 'An unexpected error occurred';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_INVALID;
    message = 'Authentication failed';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Token has expired';
  } else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.INVALID_INPUT;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
    message = 'Resource already exists';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    message = 'Internal server error';
  }

  const errorResponse = createErrorResponse(
    {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    message
  );

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code: string = ERROR_CODES.EXTERNAL_SERVICE_ERROR
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};