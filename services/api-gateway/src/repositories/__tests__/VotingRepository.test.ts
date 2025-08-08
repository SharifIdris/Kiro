import { VotingRepository, CastVoteData } from '../VotingRepository';
import { VoteType } from '@ideaforge/types';

// Mock the database pool
jest.mock('../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('VotingRepository', () => {
  let votingRepository: VotingRepository;
  let mockPool: any;

  beforeEach(() => {
    votingRepository = new VotingRepository();
    mockPool = require('../config/database').default;
    jest.clearAllMocks();
  });

  describe('castVote', () => {
    it('should create a new vote when user has not voted', async () => {
      const voteData: CastVoteData = {
        userId: 'user-123',
        ideaId: 'idea-456',
        voteType: VoteType.UPVOTE,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock the transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing vote - none found
        .mockResolvedValueOnce({ // INSERT new vote
          rows: [{
            id: 'vote-id-123',
            user_id: voteData.userId,
            idea_id: voteData.ideaId,
            vote_type: voteData.voteType,
            created_at: new Date(),
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await votingRepository.castVote(voteData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(voteData.userId);
      expect(result.ideaId).toBe(voteData.ideaId);
      expect(result.type).toBe(voteData.voteType);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update existing vote when user changes vote', async () => {
      const voteData: CastVoteData = {
        userId: 'user-123',
        ideaId: 'idea-456',
        voteType: VoteType.DOWNVOTE,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock the transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Check existing vote - found upvote
          rows: [{
            id: 'existing-vote-id',
            vote_type: VoteType.UPVOTE,
          }]
        })
        .mockResolvedValueOnce({ // UPDATE existing vote
          rows: [{
            id: 'existing-vote-id',
            user_id: voteData.userId,
            idea_id: voteData.ideaId,
            vote_type: voteData.voteType,
            created_at: new Date(),
            updated_at: new Date(),
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await votingRepository.castVote(voteData);

      expect(result).toBeDefined();
      expect(result.type).toBe(VoteType.DOWNVOTE);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should remove vote when user votes same type again (toggle)', async () => {
      const voteData: CastVoteData = {
        userId: 'user-123',
        ideaId: 'idea-456',
        voteType: VoteType.UPVOTE,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock the transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Check existing vote - found same type
          rows: [{
            id: 'existing-vote-id',
            vote_type: VoteType.UPVOTE,
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE vote
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await votingRepository.castVote(voteData);

      expect(result).toBeDefined();
      expect(result.type).toBe(VoteType.ABSTAIN); // Indicates vote was removed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const voteData: CastVoteData = {
        userId: 'user-123',
        ideaId: 'idea-456',
        voteType: VoteType.UPVOTE,
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock transaction failure
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Check existing vote fails

      await expect(votingRepository.castVote(voteData)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserVote', () => {
    it('should return user vote when exists', async () => {
      const mockVote = {
        id: 'vote-id-123',
        user_id: 'user-123',
        idea_id: 'idea-456',
        vote_type: VoteType.UPVOTE,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockVote] });

      const result = await votingRepository.getUserVote('user-123', 'idea-456');

      expect(result).toBeDefined();
      expect(result?.id).toBe('vote-id-123');
      expect(result?.type).toBe(VoteType.UPVOTE);
    });

    it('should return null when user has not voted', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await votingRepository.getUserVote('user-123', 'idea-456');

      expect(result).toBeNull();
    });
  });

  describe('getIdeaVotingStats', () => {
    it('should return voting stats for idea', async () => {
      const mockStats = {
        upvotes: 10,
        downvotes: 2,
        total_votes: 12,
        weighted_score: '8.5',
        voter_ids: ['user-1', 'user-2', 'user-3'],
      };

      mockPool.query.mockResolvedValue({ rows: [mockStats] });

      const result = await votingRepository.getIdeaVotingStats('idea-456');

      expect(result).toBeDefined();
      expect(result?.upvotes).toBe(10);
      expect(result?.downvotes).toBe(2);
      expect(result?.totalVotes).toBe(12);
      expect(result?.weightedScore).toBe(8.5);
      expect(result?.voterIds).toHaveLength(3);
    });

    it('should return null when idea has no votes', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await votingRepository.getIdeaVotingStats('nonexistent-idea');

      expect(result).toBeNull();
    });
  });

  describe('getVotesByUser', () => {
    it('should return paginated votes by user', async () => {
      const mockVotes = [
        {
          id: 'vote-1',
          user_id: 'user-123',
          idea_id: 'idea-1',
          vote_type: VoteType.UPVOTE,
          created_at: new Date(),
        },
        {
          id: 'vote-2',
          user_id: 'user-123',
          idea_id: 'idea-2',
          vote_type: VoteType.DOWNVOTE,
          created_at: new Date(),
        },
      ];

      // Mock count query and votes query
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: mockVotes });

      const result = await votingRepository.getVotesByUser('user-123', 1, 10);

      expect(result.votes).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getVotingAnalytics', () => {
    it('should return comprehensive voting analytics', async () => {
      const mockStats = {
        total_votes: '100',
        total_upvotes: '80',
        total_downvotes: '20',
        average_score: '0.6',
      };

      const mockTopIdeas = [
        {
          idea_id: 'idea-1',
          title: 'Top Idea',
          score: '9.5',
          vote_count: 20,
        },
      ];

      const mockTrends = [
        {
          date: new Date('2023-01-01'),
          votes: '15',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] }) // Overall stats
        .mockResolvedValueOnce({ rows: mockTopIdeas }) // Top ideas
        .mockResolvedValueOnce({ rows: mockTrends }); // Trends

      const result = await votingRepository.getVotingAnalytics();

      expect(result.totalVotes).toBe(100);
      expect(result.totalUpvotes).toBe(80);
      expect(result.totalDownvotes).toBe(20);
      expect(result.averageScore).toBe(0.6);
      expect(result.topVotedIdeas).toHaveLength(1);
      expect(result.votingTrends).toHaveLength(1);
    });
  });

  describe('hasUserVoted', () => {
    it('should return true when user has voted', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await votingRepository.hasUserVoted('user-123', 'idea-456');

      expect(result).toBe(true);
    });

    it('should return false when user has not voted', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await votingRepository.hasUserVoted('user-123', 'idea-456');

      expect(result).toBe(false);
    });
  });

  describe('removeVote', () => {
    it('should remove vote successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await votingRepository.removeVote('user-123', 'idea-456');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM votes WHERE user_id = $1 AND idea_id = $2',
        ['user-123', 'idea-456']
      );
    });

    it('should return false when no vote to remove', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await votingRepository.removeVote('user-123', 'idea-456');

      expect(result).toBe(false);
    });
  });
});