import request from 'supertest';
import { app } from '../../index';
import { VotingService } from '../../services/VotingService';
import { VoteType, UserRole } from '@ideaforge/types';

// Mock the VotingService
jest.mock('../../services/VotingService');

describe('VotingController', () => {
  let mockVotingService: jest.Mocked<VotingService>;

  beforeEach(() => {
    mockVotingService = new VotingService() as jest.Mocked<VotingService>;
    jest.clearAllMocks();
  });

  describe('POST /api/votes', () => {
    const validVoteData = {
      ideaId: 'idea-123',
      type: VoteType.UPVOTE,
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should cast vote successfully', async () => {
      const mockResult = {
        vote: {
          id: 'vote-123',
          userId: mockUser.id,
          ideaId: validVoteData.ideaId,
          type: validVoteData.type,
          createdAt: new Date(),
        },
        votingStats: {
          upvotes: 1,
          downvotes: 0,
          totalVotes: 1,
          weightedScore: 1.0,
          voterIds: [mockUser.id],
        },
      };

      mockVotingService.castVote.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/votes')
        .set('Authorization', 'Bearer valid-token')
        .send(validVoteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vote.type).toBe(VoteType.UPVOTE);
      expect(response.body.data.votingStats.upvotes).toBe(1);
      expect(mockVotingService.castVote).toHaveBeenCalledWith(
        mockUser.id,
        validVoteData.ideaId,
        validVoteData.type
      );
    });

    it('should return validation error for invalid vote data', async () => {
      const invalidData = {
        ideaId: 'invalid-uuid',
        type: 'invalid-type',
      };

      const response = await request(app)
        .post('/api/votes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockVotingService.castVote).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/votes')
        .send(validVoteData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.castVote).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockVotingService.castVote.mockRejectedValue(new Error('Cannot vote on own idea'));

      const response = await request(app)
        .post('/api/votes')
        .set('Authorization', 'Bearer valid-token')
        .send(validVoteData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/votes/ideas/:ideaId/stats', () => {
    it('should get voting stats successfully', async () => {
      const mockStats = {
        upvotes: 10,
        downvotes: 2,
        totalVotes: 12,
        weightedScore: 8.5,
        voterIds: ['user-1', 'user-2'],
      };

      mockVotingService.getIdeaVotingStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/votes/ideas/idea-123/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.upvotes).toBe(10);
      expect(response.body.data.totalVotes).toBe(12);
      expect(mockVotingService.getIdeaVotingStats).toHaveBeenCalledWith('idea-123');
    });

    it('should return 404 when stats not found', async () => {
      mockVotingService.getIdeaVotingStats.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/votes/ideas/nonexistent-id/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('GET /api/votes/ideas/:ideaId/user', () => {
    it('should get user vote successfully', async () => {
      const mockVote = {
        id: 'vote-123',
        userId: 'user-123',
        ideaId: 'idea-123',
        type: VoteType.UPVOTE,
        createdAt: new Date(),
      };

      mockVotingService.getUserVote.mockResolvedValue(mockVote);

      const response = await request(app)
        .get('/api/votes/ideas/idea-123/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(VoteType.UPVOTE);
      expect(mockVotingService.getUserVote).toHaveBeenCalledWith('user-123', 'idea-123');
    });

    it('should return null when user has not voted', async () => {
      mockVotingService.getUserVote.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/votes/ideas/idea-123/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/votes/ideas/idea-123/user')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.getUserVote).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/votes/ideas/:ideaId', () => {
    it('should remove vote successfully', async () => {
      const mockStats = {
        upvotes: 0,
        downvotes: 0,
        totalVotes: 0,
        weightedScore: 0,
        voterIds: [],
      };

      mockVotingService.removeVote.mockResolvedValue(mockStats);

      const response = await request(app)
        .delete('/api/votes/ideas/idea-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVotes).toBe(0);
      expect(mockVotingService.removeVote).toHaveBeenCalledWith('user-123', 'idea-123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/votes/ideas/idea-123')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.removeVote).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/votes/my-votes', () => {
    it('should get user votes successfully', async () => {
      const mockResult = {
        votes: [
          {
            id: 'vote-1',
            userId: 'user-123',
            ideaId: 'idea-1',
            type: VoteType.UPVOTE,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockVotingService.getVotesByUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/votes/my-votes')
        .set('Authorization', 'Bearer valid-token')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.votes).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(mockVotingService.getVotesByUser).toHaveBeenCalledWith('user-123', 1, 20);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/votes/my-votes')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.getVotesByUser).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/votes/leaderboard', () => {
    it('should get voting leaderboard successfully', async () => {
      const mockLeaderboard = [
        {
          ideaId: 'idea-1',
          title: 'Top Idea',
          submitterName: 'John Doe',
          votingStats: {
            upvotes: 20,
            downvotes: 1,
            totalVotes: 21,
            weightedScore: 19.5,
            voterIds: [],
          },
          rank: 1,
        },
      ];

      mockVotingService.getVotingLeaderboard.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/votes/leaderboard')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].rank).toBe(1);
      expect(mockVotingService.getVotingLeaderboard).toHaveBeenCalledWith(10);
    });
  });

  describe('GET /api/votes/analytics', () => {
    it('should get voting analytics for authorized user', async () => {
      const mockAnalytics = {
        totalVotes: 100,
        totalUpvotes: 80,
        totalDownvotes: 20,
        averageScore: 0.6,
        topVotedIdeas: [],
        votingTrends: [],
      };

      mockVotingService.getVotingAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/votes/analytics')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalVotes).toBe(100);
      expect(mockVotingService.getVotingAnalytics).toHaveBeenCalledWith(
        UserRole.ADMIN,
        undefined
      );
    });

    it('should handle time range parameters', async () => {
      const mockAnalytics = {
        totalVotes: 50,
        totalUpvotes: 40,
        totalDownvotes: 10,
        averageScore: 0.6,
        topVotedIdeas: [],
        votingTrends: [],
      };

      mockVotingService.getVotingAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/votes/analytics')
        .set('Authorization', 'Bearer admin-token')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-01-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockVotingService.getVotingAnalytics).toHaveBeenCalledWith(
        UserRole.ADMIN,
        {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31'),
        }
      );
    });

    it('should require appropriate permissions', async () => {
      const response = await request(app)
        .get('/api/votes/analytics')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.getVotingAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/votes/bulk', () => {
    it('should handle bulk voting successfully', async () => {
      const bulkVotes = [
        { ideaId: 'idea-1', type: VoteType.UPVOTE },
        { ideaId: 'idea-2', type: VoteType.DOWNVOTE },
      ];

      const mockResults = [
        {
          vote: {
            id: 'vote-1',
            userId: 'user-123',
            ideaId: 'idea-1',
            type: VoteType.UPVOTE,
            createdAt: new Date(),
          },
          votingStats: {
            upvotes: 1,
            downvotes: 0,
            totalVotes: 1,
            weightedScore: 1.0,
            voterIds: ['user-123'],
          },
        },
        {
          vote: {
            id: 'vote-2',
            userId: 'user-123',
            ideaId: 'idea-2',
            type: VoteType.DOWNVOTE,
            createdAt: new Date(),
          },
          votingStats: {
            upvotes: 0,
            downvotes: 1,
            totalVotes: 1,
            weightedScore: -0.5,
            voterIds: ['user-123'],
          },
        },
      ];

      mockVotingService.castVote
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const response = await request(app)
        .post('/api/votes/bulk')
        .set('Authorization', 'Bearer valid-token')
        .send({ votes: bulkVotes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.errors).toHaveLength(0);
      expect(mockVotingService.castVote).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk voting', async () => {
      const bulkVotes = [
        { ideaId: 'idea-1', type: VoteType.UPVOTE },
        { ideaId: 'invalid-id', type: 'invalid-type' },
      ];

      const mockResult = {
        vote: {
          id: 'vote-1',
          userId: 'user-123',
          ideaId: 'idea-1',
          type: VoteType.UPVOTE,
          createdAt: new Date(),
        },
        votingStats: {
          upvotes: 1,
          downvotes: 0,
          totalVotes: 1,
          weightedScore: 1.0,
          voterIds: ['user-123'],
        },
      };

      mockVotingService.castVote.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/votes/bulk')
        .set('Authorization', 'Bearer valid-token')
        .send({ votes: bulkVotes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].ideaId).toBe('invalid-id');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/votes/bulk')
        .send({ votes: [] })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockVotingService.castVote).not.toHaveBeenCalled();
    });
  });
});