import { Pool } from 'pg';
import { User, UserProfile, GamificationStats, UserRole } from '@ideaforge/types';
import { generateUUID } from '@ideaforge/shared';
import pool from '../config/database';

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  skills?: string[];
  avatar?: string;
}

export class UserRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, username, password_hash, role, email_verification_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, username, role, email_verified, created_at, updated_at`,
        [
          userData.email,
          userData.username,
          userData.passwordHash,
          userData.role || UserRole.USER,
          generateUUID(), // email verification token
        ]
      );

      const user = userResult.rows[0];

      // Create user profile
      const profileResult = await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user.id, userData.firstName, userData.lastName]
      );

      // Create gamification stats
      await client.query(
        `INSERT INTO gamification_stats (user_id, points, level)
         VALUES ($1, 0, 1)`,
        [user.id]
      );

      await client.query('COMMIT');

      // Return complete user object
      return this.getUserById(user.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.email_verified, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.avatar, p.bio, p.skills,
        p.theme, p.notifications_email, p.notifications_push, p.notifications_idea_updates,
        p.notifications_voting_results, p.notifications_achievements,
        p.privacy_show_in_leaderboard, p.privacy_share_profile, p.privacy_allow_collaboration,
        g.points, g.level, g.leaderboard_rank
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN gamification_stats g ON u.id = g.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.email_verified, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.avatar, p.bio, p.skills,
        p.theme, p.notifications_email, p.notifications_push, p.notifications_idea_updates,
        p.notifications_voting_results, p.notifications_achievements,
        p.privacy_show_in_leaderboard, p.privacy_share_profile, p.privacy_allow_collaboration,
        g.points, g.level, g.leaderboard_rank
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN gamification_stats g ON u.id = g.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.email_verified, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.avatar, p.bio, p.skills,
        p.theme, p.notifications_email, p.notifications_push, p.notifications_idea_updates,
        p.notifications_voting_results, p.notifications_achievements,
        p.privacy_show_in_leaderboard, p.privacy_share_profile, p.privacy_allow_collaboration,
        g.points, g.level, g.leaderboard_rank
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN gamification_stats g ON u.id = g.user_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async getPasswordHash(email: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0 ? result.rows[0].password_hash : null;
  }

  async updateUserProfile(userId: string, profileData: UpdateUserProfileData): Promise<User | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (profileData.firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(profileData.firstName);
    }
    if (profileData.lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(profileData.lastName);
    }
    if (profileData.bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      values.push(profileData.bio);
    }
    if (profileData.skills !== undefined) {
      updateFields.push(`skills = $${paramCount++}`);
      values.push(profileData.skills);
    }
    if (profileData.avatar !== undefined) {
      updateFields.push(`avatar = $${paramCount++}`);
      values.push(profileData.avatar);
    }

    if (updateFields.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);

    await this.pool.query(
      `UPDATE user_profiles SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $${paramCount}`,
      values
    );

    return this.getUserById(userId);
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = $1',
      [userId]
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [token, expires, email]
    );
  }

  async getUserByPasswordResetToken(token: string): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.email_verified, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.avatar, p.bio, p.skills,
        p.theme, p.notifications_email, p.notifications_push, p.notifications_idea_updates,
        p.notifications_voting_results, p.notifications_achievements,
        p.privacy_show_in_leaderboard, p.privacy_share_profile, p.privacy_allow_collaboration,
        g.points, g.level, g.leaderboard_rank
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN gamification_stats g ON u.id = g.user_id
       WHERE u.password_reset_token = $1 AND u.password_reset_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async updateGamificationStats(userId: string, points: number): Promise<void> {
    await this.pool.query(
      `UPDATE gamification_stats 
       SET points = points + $1, 
           level = CASE 
             WHEN points + $1 >= 15000 THEN 6
             WHEN points + $1 >= 5000 THEN 5
             WHEN points + $1 >= 1500 THEN 4
             WHEN points + $1 >= 500 THEN 3
             WHEN points + $1 >= 100 THEN 2
             ELSE 1
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [points, userId]
    );
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.email_verified, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.avatar, p.bio, p.skills,
        p.theme, p.notifications_email, p.notifications_push, p.notifications_idea_updates,
        p.notifications_voting_results, p.notifications_achievements,
        p.privacy_show_in_leaderboard, p.privacy_share_profile, p.privacy_allow_collaboration,
        g.points, g.level, g.leaderboard_rank,
        ROW_NUMBER() OVER (ORDER BY g.points DESC) as rank
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN gamification_stats g ON u.id = g.user_id
       WHERE p.privacy_show_in_leaderboard = TRUE
       ORDER BY g.points DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as UserRole,
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        avatar: row.avatar,
        bio: row.bio,
        skills: row.skills || [],
        preferences: {
          theme: row.theme || 'light',
          notifications: {
            email: row.notifications_email,
            push: row.notifications_push,
            ideaUpdates: row.notifications_idea_updates,
            votingResults: row.notifications_voting_results,
            achievements: row.notifications_achievements,
          },
          privacy: {
            showInLeaderboard: row.privacy_show_in_leaderboard,
            shareProfile: row.privacy_share_profile,
            allowCollaboration: row.privacy_allow_collaboration,
          },
        },
      },
      gamificationStats: {
        points: row.points || 0,
        level: row.level || 1,
        badges: [], // Will be populated separately if needed
        achievements: [], // Will be populated separately if needed
        leaderboardRank: row.leaderboard_rank || row.rank,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}