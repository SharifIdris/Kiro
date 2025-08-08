import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, authController.changePassword);
router.get('/me', authenticateToken, authController.me);

export default router;