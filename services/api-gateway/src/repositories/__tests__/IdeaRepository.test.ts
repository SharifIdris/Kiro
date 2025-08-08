import { IdeaRepository, CreateIdeaData, IdeaSearchFilters } from '../IdeaRepository';
import { IdeaStatus } from '@ideaforge/types';

// Mock the database pool
jest.mock('../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('IdeaRepository', () => {
  let ideaRepository: IdeaRepository;
  let mockPool: any;

  beforeEach(() => {
    ideaRepository = new IdeaRepository();
    mockPool = require('../config/database').default;
    jest.clearAllMocks();
  });

  describe('createIdea', () => {
    it('should create a new idea with voting stats', async () => {
      const ideaData: CreateIdeaData = {
        title: 'Test Idea',
        description: 'This is a test idea description',
        category: 'Web Application',
        tags: ['react', 'nodejs'],
        submitterId: 'user-123',
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock the transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // INSERT idea
          rows: [{
            id: 'idea-id-123',
            title: ideaData.title,
            description: ideaData.description,
            category: ideaData.category,
            tags: ideaData.tags,
            submitter_id: ideaData.submitterId,
            collaborators: [],
            status: IdeaStatus.DRAFT,
            created_at: new Date(),
            updated_at: new Date(),
          }]
        })
        .mockResolvedValueOnce({ rows: [{}] }) // INSERT voting stats
        .mockResolvedValueOnce(undefined); // COMMIT

      // Mock getIdeaById call
      jest.spyOn(ideaRepository, 'getIdeaById').mockResolvedValue({
        id: 'idea-id-123',
        title: ideaData.title,
        description: ideaData.description,
        category: ideaData.category,
        tags: ideaData.tags,
        submitterId: ideaData.submitterId,
        collaborators: [],
        status: IdeaStatus.DRAFT,
        votingStats: {
          upvotes: 0,
          downvotes: 0,
          totalVotes: 0,
          weightedScore: 0,
          voterIds: [],
        },
        aiRefinements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await ideaRepository.createIdea(ideaData);

      expect(result).toBeDefined();
      expect(result.title).toBe(ideaData.title);
      expect(result.status).toBe(IdeaStatus.DRAFT);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const ideaData: CreateIdeaData = {
        title: 'Test Idea',
        description: 'This is a test idea description',
        category: 'Web Application',
        tags: ['react', 'nodejs'],
        submitterId: 'user-123',
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock transaction failure
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT idea fails

      await expect(ideaRepository.createIdea(ideaData)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getIdeaById', () => {
    it('should return idea when found', async () => {
      const mockIdea = {
        id: 'idea-id-123',
        title: 'Test Idea',
        description: 'Test description',
        category: 'Web Application',
        tags: ['react', 'nodejs'],
        submitter_id: 'user-123',
        collaborators: [],
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
        upvotes: 5,
        downvotes: 1,
        total_votes: 6,
        weighted_score: 4.5,
        ai_refinements: [],
        generated_code_id: null,
        deployment_id: null,
      };

      mockPool.query.mockResolvedValue({ rows: [mockIdea] });

      const result = await ideaRepository.getIdeaById('idea-id-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('idea-id-123');
      expect(result?.title).toBe('Test Idea');
      expect(result?.votingStats.upvotes).toBe(5);
      expect(result?.votingStats.downvotes).toBe(1);
    });

    it('should return null when idea not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await ideaRepository.getIdeaById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('searchIdeas', () => {
    it('should search ideas with filters', async () => {
      const filters: IdeaSearchFilters = {
        query: 'test',
        category: 'Web Application',
        tags: ['react'],
        status: IdeaStatus.SUBMITTED,
        page: 1,
        limit: 10,
        sortBy: 'newest',
      };

      const mockIdeas = [
        {
          id: 'idea-1',
          title: 'Test Idea 1',
          description: 'Test description 1',
          category: 'Web Application',
          tags: ['react', 'nodejs'],
          submitter_id: 'user-123',
          collaborators: [],
          status: 'submitted',
          created_at: new Date(),
          updated_at: new Date(),
          upvotes: 3,
          downvotes: 0,
          total_votes: 3,
          weighted_score: 3.0,
        },
      ];

      // Mock count query
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockIdeas });

      const result = await ideaRepository.searchIdeas(filters);

      expect(result.ideas).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.ideas[0].title).toBe('Test Idea 1');
    });

    it('should handle empty search results', async () => {
      const filters: IdeaSearchFilters = {
        query: 'nonexistent',
        page: 1,
        limit: 10,
      };

      // Mock count query and ideas query
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await ideaRepository.searchIdeas(filters);

      expect(result.ideas).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('updateIdea', () => {
    it('should update idea fields', async () => {
      const updateData = {
        title: 'Updated Title',
        status: IdeaStatus.SUBMITTED,
      };

      mockPool.query.mockResolvedValue({ rowCount: 1 });

      // Mock getIdeaById call
      jest.spyOn(ideaRepository, 'getIdeaById').mockResolvedValue({
        id: 'idea-id-123',
        title: 'Updated Title',
        description: 'Test description',
        category: 'Web Application',
        tags: ['react'],
        submitterId: 'user-123',
        collaborators: [],
        status: IdeaStatus.SUBMITTED,
        votingStats: {
          upvotes: 0,
          downvotes: 0,
          totalVotes: 0,
          weightedScore: 0,
          voterIds: [],
        },
        aiRefinements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await ideaRepository.updateIdea('idea-id-123', updateData);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Title');
      expect(result?.status).toBe(IdeaStatus.SUBMITTED);
    });

    it('should return existing idea when no updates provided', async () => {
      jest.spyOn(ideaRepository, 'getIdeaById').mockResolvedValue({
        id: 'idea-id-123',
        title: 'Original Title',
        description: 'Test description',
        category: 'Web Application',
        tags: ['react'],
        submitterId: 'user-123',
        collaborators: [],
        status: IdeaStatus.DRAFT,
        votingStats: {
          upvotes: 0,
          downvotes: 0,
          totalVotes: 0,
          weightedScore: 0,
          voterIds: [],
        },
        aiRefinements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await ideaRepository.updateIdea('idea-id-123', {});

      expect(result).toBeDefined();
      expect(result?.title).toBe('Original Title');
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteIdea', () => {
    it('should delete idea successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await ideaRepository.deleteIdea('idea-id-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM ideas WHERE id = $1',
        ['idea-id-123']
      );
    });

    it('should return false when idea not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await ideaRepository.deleteIdea('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('getIdeaOwner', () => {
    it('should return owner id when idea exists', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ submitter_id: 'user-123' }]
      });

      const result = await ideaRepository.getIdeaOwner('idea-id-123');

      expect(result).toBe('user-123');
    });

    it('should return null when idea not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await ideaRepository.getIdeaOwner('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('isCollaborator', () => {
    it('should return true for idea owner', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await ideaRepository.isCollaborator('idea-id-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false for non-collaborator', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await ideaRepository.isCollaborator('idea-id-123', 'user-456');

      expect(result).toBe(false);
    });
  });
});