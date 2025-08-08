import { SearchUtils } from '../searchUtils';
import { IdeaStatus } from '@ideaforge/types';

describe('SearchUtils', () => {
  describe('normalizeQuery', () => {
    it('should normalize query string', () => {
      expect(SearchUtils.normalizeQuery('  Hello World!  ')).toBe('hello world');
      expect(SearchUtils.normalizeQuery('React.js & Node.js')).toBe('react js   node js');
      expect(SearchUtils.normalizeQuery('Multiple   Spaces')).toBe('multiple spaces');
    });
  });

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const keywords = SearchUtils.extractKeywords('React web application with Node.js backend');
      expect(keywords).toContain('react');
      expect(keywords).toContain('web');
      expect(keywords).toContain('application');
      expect(keywords).toContain('node');
      expect(keywords).toContain('backend');
      expect(keywords).not.toContain('with'); // stop word
    });

    it('should filter out short words and stop words', () => {
      const keywords = SearchUtils.extractKeywords('A web app is the best');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('web');
      expect(keywords).toContain('app');
      expect(keywords).toContain('best');
    });
  });

  describe('isStopWord', () => {
    it('should identify stop words', () => {
      expect(SearchUtils.isStopWord('the')).toBe(true);
      expect(SearchUtils.isStopWord('and')).toBe(true);
      expect(SearchUtils.isStopWord('is')).toBe(true);
      expect(SearchUtils.isStopWord('react')).toBe(false);
      expect(SearchUtils.isStopWord('application')).toBe(false);
    });
  });

  describe('buildSearchSuggestions', () => {
    it('should build suggestions from tags and categories', () => {
      const tags = ['react', 'nodejs', 'javascript', 'typescript'];
      const categories = ['Web Application', 'Mobile App', 'API/Backend'];
      
      const suggestions = SearchUtils.buildSearchSuggestions('rea', tags, categories);
      
      expect(suggestions).toContain('react');
      expect(suggestions.length).toBeLessThanOrEqual(8);
    });

    it('should return empty array for very short queries', () => {
      const suggestions = SearchUtils.buildSearchSuggestions('a', [], []);
      expect(suggestions).toEqual([]);
    });
  });

  describe('calculateRelevanceScore', () => {
    const mockIdea = {
      id: 'idea-1',
      title: 'React Web Application',
      description: 'A modern web application built with React and Node.js',
      category: 'Web Application',
      tags: ['react', 'nodejs', 'javascript'],
      votingStats: {
        weightedScore: 5.0,
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    };

    it('should calculate relevance score based on matches', () => {
      const score = SearchUtils.calculateRelevanceScore(mockIdea, 'react web', {});
      expect(score).toBeGreaterThan(0);
    });

    it('should give higher score for title matches', () => {
      const titleScore = SearchUtils.calculateRelevanceScore(mockIdea, 'react', {});
      const descriptionScore = SearchUtils.calculateRelevanceScore(mockIdea, 'modern', {});
      expect(titleScore).toBeGreaterThan(descriptionScore);
    });

    it('should boost recent ideas', () => {
      const recentIdea = {
        ...mockIdea,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };
      const oldIdea = {
        ...mockIdea,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };

      const recentScore = SearchUtils.calculateRelevanceScore(recentIdea, 'react', {});
      const oldScore = SearchUtils.calculateRelevanceScore(oldIdea, 'react', {});
      
      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  describe('parseAdvancedQuery', () => {
    it('should parse category filter', () => {
      const result = SearchUtils.parseAdvancedQuery('react app category:web');
      expect(result.cleanQuery).toBe('react app');
      expect(result.filters.category).toBe('web');
    });

    it('should parse tag filters', () => {
      const result = SearchUtils.parseAdvancedQuery('web app tag:react tag:nodejs');
      expect(result.cleanQuery).toBe('web app');
      expect(result.filters.tags).toEqual(['react', 'nodejs']);
    });

    it('should parse status filter', () => {
      const result = SearchUtils.parseAdvancedQuery('my ideas status:submitted');
      expect(result.cleanQuery).toBe('my ideas');
      expect(result.filters.status).toBe('submitted');
    });

    it('should parse multiple filters', () => {
      const result = SearchUtils.parseAdvancedQuery('react app category:web tag:react status:submitted');
      expect(result.cleanQuery).toBe('react app');
      expect(result.filters.category).toBe('web');
      expect(result.filters.tags).toEqual(['react']);
      expect(result.filters.status).toBe('submitted');
    });

    it('should handle query without filters', () => {
      const result = SearchUtils.parseAdvancedQuery('simple search query');
      expect(result.cleanQuery).toBe('simple search query');
      expect(result.filters).toEqual({});
    });
  });

  describe('generateSearchAnalytics', () => {
    it('should generate analytics data', () => {
      const mockResults = {
        ideas: [
          {
            category: 'Web Application',
            tags: ['react', 'nodejs'],
          },
          {
            category: 'Mobile App',
            tags: ['react-native', 'ios'],
          },
        ],
        total: 2,
      };

      const analytics = SearchUtils.generateSearchAnalytics(
        'react',
        { query: 'react' },
        mockResults,
        150
      );

      expect(analytics.query).toBe('react');
      expect(analytics.resultCount).toBe(2);
      expect(analytics.executionTimeMs).toBe(150);
      expect(analytics.hasResults).toBe(true);
      expect(analytics.topCategories).toHaveLength(2);
      expect(analytics.topTags).toHaveLength(4);
      expect(analytics.timestamp).toBeDefined();
    });
  });

  describe('buildFacets', () => {
    it('should build facets from ideas', () => {
      const mockIdeas = [
        {
          category: 'Web Application',
          tags: ['react', 'nodejs'],
          status: IdeaStatus.SUBMITTED,
        },
        {
          category: 'Web Application',
          tags: ['vue', 'nodejs'],
          status: IdeaStatus.APPROVED,
        },
        {
          category: 'Mobile App',
          tags: ['react-native'],
          status: IdeaStatus.SUBMITTED,
        },
      ];

      const facets = SearchUtils.buildFacets(mockIdeas);

      expect(facets.categories).toHaveLength(2);
      expect(facets.categories[0]).toEqual({ category: 'Web Application', count: 2 });
      expect(facets.categories[1]).toEqual({ category: 'Mobile App', count: 1 });

      expect(facets.tags).toContainEqual({ tag: 'nodejs', count: 2 });
      expect(facets.tags).toContainEqual({ tag: 'react', count: 1 });

      expect(facets.statuses).toContainEqual({ status: IdeaStatus.SUBMITTED, count: 2 });
      expect(facets.statuses).toContainEqual({ status: IdeaStatus.APPROVED, count: 1 });
    });
  });
});