import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '@ideaforge/types';

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate a JWT token
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if user has required role
   */
  static hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.TEAM_LEAD]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user has permission to access resource
   */
  static hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    const permissions = {
      [UserRole.USER]: {
        ideas: ['create', 'read', 'update_own', 'delete_own'],
        votes: ['create', 'read'],
        comments: ['create', 'read', 'update_own', 'delete_own'],
        profile: ['read', 'update_own'],
      },
      [UserRole.TEAM_LEAD]: {
        ideas: ['create', 'read', 'update', 'delete', 'approve'],
        votes: ['create', 'read'],
        comments: ['create', 'read', 'update', 'delete', 'moderate'],
        profile: ['read', 'update_own'],
        analytics: ['read'],
      },
      [UserRole.ADMIN]: {
        ideas: ['create', 'read', 'update', 'delete', 'approve', 'archive'],
        votes: ['create', 'read', 'moderate'],
        comments: ['create', 'read', 'update', 'delete', 'moderate'],
        users: ['read', 'update', 'suspend'],
        profile: ['read', 'update'],
        analytics: ['read', 'export'],
        system: ['configure'],
      },
      [UserRole.SUPER_ADMIN]: {
        '*': ['*'], // Full access to everything
      },
    };

    const userPermissions = permissions[userRole];
    
    if (userPermissions['*'] && userPermissions['*'].includes('*')) {
      return true;
    }

    const resourcePermissions = userPermissions[resource];
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions.includes(action) || resourcePermissions.includes('*');
  }

  /**
   * Generate a secure random token for password reset, email verification, etc.
   */
  static generateSecureToken(): string {
    return jwt.sign(
      { random: Math.random(), timestamp: Date.now() },
      this.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verify a secure token
   */
  static verifySecureToken(token: string): boolean {
    try {
      jwt.verify(token, this.JWT_SECRET);
      return true;
    } catch (error) {
      return false;
    }
  }
}