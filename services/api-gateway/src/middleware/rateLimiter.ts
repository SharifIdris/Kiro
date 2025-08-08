import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@ideaforge/shared';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.GENERAL.windowMs,
  max: RATE_LIMITS.API.GENERAL.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.LOGIN.windowMs,
  max: RATE_LIMITS.AUTH.LOGIN.max,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// AI services rate limiter
export const aiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.AI_SERVICES.windowMs,
  max: RATE_LIMITS.API.AI_SERVICES.max,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'Too many AI requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Deployment rate limiter
export const deploymentRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.DEPLOYMENT.windowMs,
  max: RATE_LIMITS.API.DEPLOYMENT.max,
  message: {
    success: false,
    error: {
      code: 'DEPLOYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many deployment requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});