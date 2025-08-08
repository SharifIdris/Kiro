// API Constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    LEADERBOARD: '/users/leaderboard',
  },
  IDEAS: {
    LIST: '/ideas',
    CREATE: '/ideas',
    GET: '/ideas/:id',
    UPDATE: '/ideas/:id',
    DELETE: '/ideas/:id',
    SEARCH: '/ideas/search',
    TRENDING: '/ideas/trending',
  },
  VOTES: {
    CAST: '/votes',
    GET: '/votes/:ideaId',
    ANALYTICS: '/votes/analytics',
  },
  COMMENTS: {
    LIST: '/comments/:ideaId',
    CREATE: '/comments',
    UPDATE: '/comments/:id',
    DELETE: '/comments/:id',
  },
  AI: {
    REFINE: '/ai/refine',
    GENERATE_ARCHITECTURE: '/ai/architecture',
    GENERATE_CODE: '/ai/generate',
    PREVIEW: '/ai/preview',
  },
  DEPLOYMENT: {
    DEPLOY: '/deployment/deploy',
    STATUS: '/deployment/status/:id',
    LOGS: '/deployment/logs/:id',
    ROLLBACK: '/deployment/rollback/:id',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Business logic errors
  DUPLICATE_VOTE: 'DUPLICATE_VOTE',
  IDEA_NOT_EDITABLE: 'IDEA_NOT_EDITABLE',
  COLLABORATION_CONFLICT: 'COLLABORATION_CONFLICT',

  // AI service errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  CODE_GENERATION_FAILED: 'CODE_GENERATION_FAILED',
  ARCHITECTURE_GENERATION_FAILED: 'ARCHITECTURE_GENERATION_FAILED',

  // Deployment errors
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  INFRASTRUCTURE_PROVISIONING_FAILED: 'INFRASTRUCTURE_PROVISIONING_FAILED',
  BUILD_FAILED: 'BUILD_FAILED',

  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Gamification Constants
export const GAMIFICATION = {
  POINTS: {
    IDEA_SUBMISSION: 10,
    IDEA_APPROVED: 50,
    IDEA_DEPLOYED: 100,
    VOTE_CAST: 1,
    COMMENT_POSTED: 2,
    COLLABORATION: 5,
    AI_REFINEMENT_ACCEPTED: 15,
  },
  LEVELS: {
    NOVICE: { min: 0, max: 99 },
    CONTRIBUTOR: { min: 100, max: 499 },
    INNOVATOR: { min: 500, max: 1499 },
    EXPERT: { min: 1500, max: 4999 },
    MASTER: { min: 5000, max: 14999 },
    LEGEND: { min: 15000, max: Infinity },
  },
  BADGES: {
    FIRST_IDEA: 'first_idea',
    FIRST_VOTE: 'first_vote',
    FIRST_COMMENT: 'first_comment',
    IDEA_CHAMPION: 'idea_champion', // 10 approved ideas
    COLLABORATION_MASTER: 'collaboration_master', // 50 collaborations
    AI_WHISPERER: 'ai_whisperer', // 25 AI refinements
    DEPLOYMENT_GURU: 'deployment_guru', // 5 successful deployments
  },
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
    REGISTER: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 attempts per hour
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 attempts per hour
  },
  API: {
    GENERAL: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    AI_SERVICES: { windowMs: 60 * 60 * 1000, max: 10 }, // 10 AI requests per hour
    DEPLOYMENT: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 deployments per hour
  },
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB for avatars
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  IDEAS_LIST: 60, // 1 minute
  LEADERBOARD: 600, // 10 minutes
  ANALYTICS: 1800, // 30 minutes
} as const;

// WebSocket Events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  
  // Idea events
  IDEA_CREATED: 'idea_created',
  IDEA_UPDATED: 'idea_updated',
  IDEA_DELETED: 'idea_deleted',
  
  // Vote events
  VOTE_CAST: 'vote_cast',
  VOTE_UPDATED: 'vote_updated',
  
  // Comment events
  COMMENT_ADDED: 'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  
  // Collaboration events
  COLLABORATION_STARTED: 'collaboration_started',
  COLLABORATION_ENDED: 'collaboration_ended',
  COLLABORATIVE_EDIT: 'collaborative_edit',
  
  // AI events
  AI_REFINEMENT_STARTED: 'ai_refinement_started',
  AI_REFINEMENT_COMPLETED: 'ai_refinement_completed',
  CODE_GENERATION_STARTED: 'code_generation_started',
  CODE_GENERATION_PROGRESS: 'code_generation_progress',
  CODE_GENERATION_COMPLETED: 'code_generation_completed',
  
  // Deployment events
  DEPLOYMENT_STARTED: 'deployment_started',
  DEPLOYMENT_PROGRESS: 'deployment_progress',
  DEPLOYMENT_COMPLETED: 'deployment_completed',
  DEPLOYMENT_FAILED: 'deployment_failed',
  
  // Notification events
  NOTIFICATION: 'notification',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  BADGE_EARNED: 'badge_earned',
} as const;

// Environment Constants
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Database Constants
export const DATABASE = {
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  QUERY_TIMEOUT: 10000, // 10 seconds
  MAX_CONNECTIONS: 20,
  IDLE_TIMEOUT: 30000, // 30 seconds
} as const;