import { UserRepository, CreateUserData } from '../UserRepository';
import { UserRole } from '@ideaforge/types';

// Mock the database pool
jest.mock('../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockPool: any;

  beforeEach(() => {
    userRepository = new UserRepository();
    mockPool = require('../config/database').default;
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with profile and gamification stats', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock the transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // INSERT user
          rows: [{
            id: 'user-id-123',
            email: userData.email,
            username: userData.username,
            role: userData.role,
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }]
        })
        .mockResolvedValueOnce({ rows: [{}] }) // INSERT profile
        .mockResolvedValueOnce({ rows: [{}] }) // INSERT gamification
        .mockResolvedValueOnce(undefined); // COMMIT

      // Mock getUserById call
      jest.spyOn(userRepository, 'getUserById').mockResolvedValue({
        id: 'user-id-123',
        email: userData.email,
        username: userData.username,
        role: userData.role,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: undefined,
          bio: undefined,
          skills: [],
          preferences: {
            theme: 'light',
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
      });

      const result = await userRepository.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.username).toBe(userData.username);
      expect(result.role).toBe(userData.role);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock transaction failure
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT user fails

      await expect(userRepository.createUser(userData)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
        first_name: 'Test',
        last_name: 'User',
        avatar: null,
        bio: null,
        skills: [],
        theme: 'light',
        notifications_email: true,
        notifications_push: true,
        notifications_idea_updates: true,
        notifications_voting_results: true,
        notifications_achievements: true,
        privacy_show_in_leaderboard: true,
        privacy_share_profile: true,
        privacy_allow_collaboration: true,
        points: 100,
        level: 2,
        leaderboard_rank: 5,
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.getUserByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result?.profile.firstName).toBe('Test');
      expect(result?.gamificationStats.points).toBe(100);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateGamificationStats', () => {
    it('should update points and level correctly', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await userRepository.updateGamificationStats('user-id-123', 50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE gamification_stats'),
        [50, 'user-id-123']
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should return top users by points', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          role: 'user',
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
          first_name: 'User',
          last_name: 'One',
          avatar: null,
          bio: null,
          skills: [],
          theme: 'light',
          notifications_email: true,
          notifications_push: true,
          notifications_idea_updates: true,
          notifications_voting_results: true,
          notifications_achievements: true,
          privacy_show_in_leaderboard: true,
          privacy_share_profile: true,
          privacy_allow_collaboration: true,
          points: 1000,
          level: 3,
          leaderboard_rank: null,
          rank: 1,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockUsers });

      const result = await userRepository.getLeaderboard(10);

      expect(result).toHaveLength(1);
      expect(result[0].gamificationStats.points).toBe(1000);
      expect(result[0].gamificationStats.leaderboardRank).toBe(1);
    });
  });
});