import { AuthUtils } from '@ideaforge/shared';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@ideaforge/types';
import { UserRepository } from '../repositories/UserRepository';
import { createError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';
import { logger } from '../utils/logger';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, username, password, firstName, lastName } = registerData;

    // Check if user already exists
    const existingUserByEmail = await this.userRepository.getUserByEmail(email);
    if (existingUserByEmail) {
      throw createError(
        'User with this email already exists',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.RESOURCE_ALREADY_EXISTS
      );
    }

    const existingUserByUsername = await this.userRepository.getUserByUsername(username);
    if (existingUserByUsername) {
      throw createError(
        'Username is already taken',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.RESOURCE_ALREADY_EXISTS
      );
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Create user
    const user = await this.userRepository.createUser({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
    });

    // Generate tokens
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User registered successfully: ${email}`);

    return {
      user,
      token,
      refreshToken,
    };
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Get user by email
    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      throw createError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Get password hash
    const passwordHash = await this.userRepository.getPasswordHash(email);
    if (!passwordHash) {
      throw createError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Verify password
    const isPasswordValid = await AuthUtils.comparePassword(password, passwordHash);
    if (!isPasswordValid) {
      throw createError(
        'Invalid email or password',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if email is verified (optional - can be enabled later)
    // if (!user.emailVerified) {
    //   throw createError(
    //     'Please verify your email before logging in',
    //     HTTP_STATUS.UNAUTHORIZED,
    //     ERROR_CODES.EMAIL_NOT_VERIFIED
    //   );
    // }

    // Generate tokens
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`User logged in successfully: ${email}`);

    return {
      user,
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verify refresh token
    const payload = AuthUtils.verifyToken(refreshToken);
    if (!payload) {
      throw createError(
        'Invalid refresh token',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Get user
    const user = await this.userRepository.getUserById(payload.userId);
    if (!user) {
      throw createError(
        'User not found',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Generate new tokens
    const newToken = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token: newToken,
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = AuthUtils.generateSecureToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await this.userRepository.setPasswordResetToken(email, resetToken, resetExpires);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(email, resetToken);

    logger.info(`Password reset token generated for: ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    const user = await this.userRepository.getUserByPasswordResetToken(token);
    if (!user) {
      throw createError(
        'Invalid or expired reset token',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Hash new password
    const passwordHash = await AuthUtils.hashPassword(newPassword);

    // Update password and clear reset token
    await this.userRepository.updatePassword(user.id, passwordHash);

    logger.info(`Password reset successfully for user: ${user.email}`);
  }

  async verifyEmail(token: string): Promise<void> {
    // In a real implementation, you would store and verify email verification tokens
    // For now, we'll just verify the token format
    const isValidToken = AuthUtils.verifySecureToken(token);
    if (!isValidToken) {
      throw createError(
        'Invalid verification token',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // TODO: Implement email verification logic
    // const user = await this.userRepository.getUserByEmailVerificationToken(token);
    // if (user) {
    //   await this.userRepository.verifyEmail(user.id);
    // }

    logger.info('Email verification attempted');
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw createError(
        'User not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Get current password hash
    const currentPasswordHash = await this.userRepository.getPasswordHash(user.email);
    if (!currentPasswordHash) {
      throw createError(
        'Unable to verify current password',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthUtils.comparePassword(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      throw createError(
        'Current password is incorrect',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const newPasswordHash = await AuthUtils.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    logger.info(`Password changed successfully for user: ${user.email}`);
  }

  async validateToken(token: string): Promise<User | null> {
    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await this.userRepository.getUserById(payload.userId);
    return user;
  }
}