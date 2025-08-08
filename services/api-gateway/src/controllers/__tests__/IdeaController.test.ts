import request from 'supertest';
import { app } from '../../index';
import { IdeaService } from '../../services/IdeaService';
import { IdeaStatus, UserRole } from '@ideaforge/types';

// Mock the IdeaService
jest.mock('../../services/IdeaService');

describe('IdeaController', () => {
  let mockIdeaService: jest.Mocked<IdeaService>;

  beforeEach(() => {
    mockIdeaService = new IdeaService() as jest.Mocked<IdeaService>;
    jest.clearAllMocks();
  });

  describe('POST /api/ideas', () => {
    const validIdeaData = {
      title: 'Test Idea',
      description: 'This is a test idea with sufficient description length to meet validation requirements',
      category: 'Web Application',
      tags: ['react', 'nodejs'],
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should create a new idea successfully', async () => {
      const mockIdea = {
        id: 'idea-123',
        ...validIdeaData,
        submitterId: mockUser.id,
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
      };

      mockIdeaService.createIdea.mockResolvedValue(mockIdea);

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', 'Bearer valid-token')
        .send(validIdeaData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validIdeaData.title);
      expect(response.body.data.status).toBe(IdeaStatus.DRAFT);
      expect(mockIdeaService.createIdea).toHaveBeenCalledWith({
        ...validIdeaData,
        submitterId: mockUser.id,
      });
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        title: 'A', // Too short
        description: 'Short', // Too short
        category: '',
        tags: [],
      };

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockIdeaService.createIdea).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ideas')
        .send(validIdeaData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockIdeaService.createIdea).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/ideas/:id', () => {
    it('should get idea by id successfully', async () => {
      const mockIdea = {
        id: 'idea-123',
        title: 'Test Idea',
        description: 'Test description',
        category: 'Web Application',
        tags: ['react'],
        submitterId: 'user-123',
        collaborators: [],
        status: IdeaStatus.SUBMITTED,
        votingStats: {
          upvotes: 5,
          downvotes: 1,
          totalVotes: 6,
          weightedScore: 4.5,
          voterIds: [],
        },
        aiRefinements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIdeaService.getIdeaById.mockResolvedValue(mockIdea);

      const response = await request(app)
        .get('/api/ideas/idea-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('idea-123');
      expect(response.body.data.title).toBe('Test Idea');
      expect(mockIdeaService.getIdeaById).toHaveBeenCalledWith('idea-123', undefined);
    });

    it('should return 404 for non-existent idea', async () => {
      mockIdeaService.getIdeaById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/ideas/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('PUT /api/ideas/:id', () => {
    const updateData = {
      title: 'Updated Title',
      description: 'Updated description with sufficient length to meet validation requirements',
    };

    it('should update idea successfully', async () => {
      const mockUpdatedIdea = {
        id: 'idea-123',
        title: 'Updated Title',
        description: 'Updated description with sufficient length to meet validation requirements',
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
      };

      mockIdeaService.updateIdea.mockResolvedValue(mockUpdatedIdea);

      const response = await request(app)
        .put('/api/ideas/idea-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(mockIdeaService.updateIdea).toHaveBeenCalledWith('idea-123', updateData, 'user-123');
    });

    it('should return validation error for invalid update data', async () => {
      const invalidData = {
        title: '', // Empty title
      };

      const response = await request(app)
        .put('/api/ideas/idea-123')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockIdeaService.updateIdea).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/ideas/idea-123')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockIdeaService.updateIdea).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/ideas/:id', () => {
    it('should delete idea successfully', async () => {
      mockIdeaService.deleteIdea.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/ideas/idea-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Idea deleted successfully');
      expect(mockIdeaService.deleteIdea).toHaveBeenCalledWith('idea-123', 'user-123');
    });

    it('should return 404 when idea not found', async () => {
      mockIdeaService.deleteIdea.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/ideas/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/ideas/idea-123')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(mockIdeaService.deleteIdea).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/ideas/search', () => {
    it('should search ideas successfully', async () => {
      const mockSearchResult = {
        ideas: [
          {
            id: 'idea-1',
            title: 'Test Idea 1',
            description: 'Test description 1',
            category: 'Web Application',
            tags: ['react'],
            submitterId: 'user-123',
            collaborators: [],
            status: IdeaStatus.SUBMITTED,
            votingStats: {
              upvotes: 3,
              downvotes: 0,
              totalVotes: 3,
              weightedScore: 3.0,
              voterIds: [],
            },
            aiRefinements: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockIdeaService.searchIdeas.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/ideas/search')
        .query({
          query: 'test',
          category: 'Web Application',
          page: 1,
          limit: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ideas).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(mockIdeaService.searchIdeas).toHaveBeenCalledWith(
        {
          query: 'test',
          category: 'Web Application',
          page: 1,
          limit: 20,
          sortBy: 'newest',
        },
        undefined
      );
    });

    it('should handle invalid search parameters', async () => {
      const response = await request(app)
        .get('/api/ideas/search')
        .query({
          page: 'invalid',
          limit: -1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockIdeaService.searchIdeas).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/ideas/trending', () => {
    it('should get trending ideas successfully', async () => {
      const mockTrendingIdeas = [
        {
          id: 'idea-1',
          title: 'Trending Idea 1',
          description: 'Trending description 1',
          category: 'Web Application',
          tags: ['react'],
          submitterId: 'user-123',
          collaborators: [],
          status: IdeaStatus.SUBMITTED,
          votingStats: {
            upvotes: 10,
            downvotes: 1,
            totalVotes: 11,
            weightedScore: 9.5,
            voterIds: [],
          },
          aiRefinements: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockIdeaService.getTrendingIdeas.mockResolvedValue(mockTrendingIdeas);

      const response = await request(app)
        .get('/api/ideas/trending')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Trending Idea 1');
      expect(mockIdeaService.getTrendingIdeas).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /api/ideas/categories', () => {
    it('should get categories successfully', async () => {
      const mockCategories = [
        {
          name: 'Web Application',
          description: 'Web-based applications',
          icon: 'web',
          color: '#2196F3',
        },
        {
          name: 'Mobile App',
          description: 'Mobile applications',
          icon: 'mobile',
          color: '#4CAF50',
        },
      ];

      mockIdeaService.getIdeaCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/ideas/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Web Application');
      expect(mockIdeaService.getIdeaCategories).toHaveBeenCalled();
    });
  });
});