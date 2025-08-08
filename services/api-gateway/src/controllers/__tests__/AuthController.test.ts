import request from 'supertest';
import { app } from '../../index';
import { AuthService } from '../../services/AuthService';
import { UserRole } from '@ideaforge/types';

// Mock the AuthService
jest.mock('../../services/AuthService');

describe('AuthController', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      const mockAuthResponse = {
        user: {
          id: 'user-id-123',
          email: validRegistrationData.email,
          username: validRegistrationData.username,
          role: UserRole.USER,
          profile: {
            firstName: validRegistrationData.firstName,
            lastName: validRegistrationData.lastName,
            avatar: undefined,
            bio: undefined,
            skills: [],
            preferences: {
              theme: 'light' as const,
              notifications: {
                email: true,
                push: true,
                ideaUpdates: true,
                votingResults: true,
                achievements: true,
              },
              privacy: {
                showInLeaderboard: true,
                shareProfile: true,
                allowCollaboration: true,
              },
            },
          },
          gamificationStats: {
            points: 0,
            level: 1,
            badges: [],
            achievements: [],
            leaderboardRank: undefined,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validRegistrationData.email);
      expect(response.body.data.token).toBe('jwt-token');
      expect(mockAuthService.register).toHaveBeenCalledWith(validRegistrationData);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return validation error for weak password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: '123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should handle registration service errors', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    it('should login user successfully', async () => {
      const mockAuthResponse = {
        user: {
          id: 'user-id-123',
          email: validLoginData.email,
          username: 'testuser',
          role: UserRole.USER,
          profile: {
            firstName: 'Test',
            lastName: 'User',
            avatar: undefined,
            bio: undefined,
            skills: [],
            preferences: {
              theme: 'light' as const,
              notifications: {
                email: true,
                push: true,
                ideaUpdates: true,
                votingResults: true,
                achievements: true,
              },
              privacy: {
                showInLeaderboard: true,
                shareProfile: true,
                allowCollaboration: true,
              },
            },
          },
          gamificationStats: {
            points: 100,
            level: 2,
            badges: [],
            achievements: [],
            leaderboardRank: 5,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validLoginData.email);
      expect(response.body.data.token).toBe('jwt-token');
      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginData);
    });

    it('should return validation error for missing email', async () => {
      const invalidData = {
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle login service errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockAuthResponse = {
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          username: 'testuser',
          role: UserRole.USER,
          profile: {
            firstName: 'Test',
            lastName: 'User',
            avatar: undefined,
            bio: undefined,
            skills: [],
            preferences: {
              theme: 'light' as const,
              notifications: {
                email: true,
                push: true,
                ideaUpdates: true,
                votingResults: true,
                achievements: true,
              },
              privacy: {
                showInLeaderboard: true,
                shareProfile: true,
                allowCollaboration: true,
              },
            },
          },
          gamificationStats: {
            points: 100,
            level: 2,
            badges: [],
            achievements: [],
            leaderboardRank: 5,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'old-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('new-jwt-token');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should handle forgot password request', async () => {
      mockAuthService.forgotPassword.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should return error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });
  });
});