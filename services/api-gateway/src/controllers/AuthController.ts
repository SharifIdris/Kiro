import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { createSuccessResponse, createErrorResponse } from '@ideaforge/shared';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  userRegistrationSchema, 
  userLoginSchema,
  validatePassword 
} from '@ideaforge/shared';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = userRegistrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: validationResult.error.errors,
          },
          'Invalid registration data'
        )
      );
    }

    const { email, username, password, firstName, lastName } = validationResult.data;

    // Additional password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Password does not meet requirements',
            details: passwordValidation.errors,
          },
          'Invalid password'
        )
      );
    }

    const authResponse = await this.authService.register({
      email,
      username,
      password,
      firstName,
      lastName,
    });

    res.status(HTTP_STATUS.CREATED).json(
      createSuccessResponse(authResponse, 'User registered successfully')
    );
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = userLoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: validationResult.error.errors,
          },
          'Invalid login data'
        )
      );
    }

    const { email, password } = validationResult.data;

    const authResponse = await this.authService.login({ email, password });

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(authResponse, 'Login successful')
    );
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Refresh token is required',
          },
          'Missing refresh token'
        )
      );
    }

    const authResponse = await this.authService.refreshToken(refreshToken);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(authResponse, 'Token refreshed successfully')
    );
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Email is required',
          },
          'Missing email'
        )
      );
    }

    await this.authService.forgotPassword(email);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(
        null,
        'If an account with that email exists, a password reset link has been sent'
      )
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Token and password are required',
          },
          'Missing required fields'
        )
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Password does not meet requirements',
            details: passwordValidation.errors,
          },
          'Invalid password'
        )
      );
    }

    await this.authService.resetPassword(token, password);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Password reset successfully')
    );
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Verification token is required',
          },
          'Missing verification token'
        )
      );
    }

    await this.authService.verifyEmail(token);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Email verified successfully')
    );
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Current password and new password are required',
          },
          'Missing required fields'
        )
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'New password does not meet requirements',
            details: passwordValidation.errors,
          },
          'Invalid new password'
        )
      );
    }

    await this.authService.changePassword(userId, currentPassword, newPassword);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Password changed successfully')
    );
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    // In a stateless JWT implementation, logout is handled client-side
    // by removing the token. In a more sophisticated implementation,
    // you might maintain a blacklist of tokens.
    
    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Logged out successfully')
    );
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(user, 'User profile retrieved successfully')
    );
  });
}