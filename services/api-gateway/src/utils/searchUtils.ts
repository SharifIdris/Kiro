import { IdeaSearchFilters } from '../repositories/IdeaRepository';

export class SearchUtils {
  /**
   * Normalize search query for better matching
   */
  static normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  }

  /**
   * Extract keywords from search query
   */
  static extractKeywords(query: string): string[] {
    const normalized = this.normalizeQuery(query);
    return normalized
      .split(' ')
      .filter(word => word.length > 2) // Filter out short words
      .filter(word => !this.isStopWord(word)); // Filter out stop words
  }

  /**
   * Check if a word is a stop word
   */
  static isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Build search suggestions based on partial query
   */
  static buildSearchSuggestions(query: string, existingTags: string[], categories: string[]): string[] {
    const suggestions: string[] = [];
    const normalizedQuery = this.normalizeQuery(query);

    // Suggest matching tags
    const matchingTags = existingTags.filter(tag =>
      tag.toLowerCase().includes(normalizedQuery)
    );
    suggestions.push(...matchingTags.slice(0, 5));

    // Suggest matching categories
    const matchingCategories = categories.filter(category =>
      category.toLowerCase().includes(normalizedQuery)
    );
    suggestions.push(...matchingCategories.slice(0, 3));

    // Remove duplicates and limit results
    return [...new Set(suggestions)].slice(0, 8);
  }

  /**
   * Calculate search relevance score
   */
  static calculateRelevanceScore(
    idea: any,
    query: string,
    filters: IdeaSearchFilters
  ): number {
    let score = 0;
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      return idea.votingStats?.weightedScore || 0;
    }

    // Title matches (highest weight)
    const titleMatches = keywords.filter(keyword =>
      idea.title.toLowerCase().includes(keyword)
    ).length;
    score += titleMatches * 10;

    // Description matches
    const descriptionMatches = keywords.filter(keyword =>
      idea.description.toLowerCase().includes(keyword)
    ).length;
    score += descriptionMatches * 5;

    // Tag matches
    const tagMatches = keywords.filter(keyword =>
      idea.tags.some((tag: string) => tag.toLowerCase().includes(keyword))
    ).length;
    score += tagMatches * 7;

    // Category match
    if (keywords.some(keyword => idea.category.toLowerCase().includes(keyword))) {
      score += 8;
    }

    // Boost score based on voting stats
    score += (idea.votingStats?.weightedScore || 0) * 0.5;

    // Boost recent ideas
    const daysSinceCreation = (Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) {
      score += 2; // Boost for ideas less than a week old
    }

    return score;
  }

  /**
   * Build advanced search filters from query string
   */
  static parseAdvancedQuery(query: string): {
    cleanQuery: string;
    filters: Partial<IdeaSearchFilters>;
  } {
    const filters: Partial<IdeaSearchFilters> = {};
    let cleanQuery = query;

    // Extract category filter: category:web
    const categoryMatch = query.match(/category:(\w+)/i);
    if (categoryMatch) {
      filters.category = categoryMatch[1];
      cleanQuery = cleanQuery.replace(categoryMatch[0], '').trim();
    }

    // Extract tag filters: tag:react tag:nodejs
    const tagMatches = query.match(/tag:(\w+)/gi);
    if (tagMatches) {
      filters.tags = tagMatches.map(match => match.replace(/tag:/i, ''));
      tagMatches.forEach(match => {
        cleanQuery = cleanQuery.replace(match, '').trim();
      });
    }

    // Extract status filter: status:submitted
    const statusMatch = query.match(/status:(\w+)/i);
    if (statusMatch) {
      filters.status = statusMatch[1] as any;
      cleanQuery = cleanQuery.replace(statusMatch[0], '').trim();
    }

    // Clean up extra spaces
    cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

    return { cleanQuery, filters };
  }

  /**
   * Generate search analytics data
   */
  static generateSearchAnalytics(
    query: string,
    filters: IdeaSearchFilters,
    results: any,
    executionTime: number
  ): any {
    return {
      query,
      filters,
      resultCount: results.total,
      executionTimeMs: executionTime,
      hasResults: results.total > 0,
      topCategories: this.getTopCategories(results.ideas),
      topTags: this.getTopTags(results.ideas),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get top categories from search results
   */
  private static getTopCategories(ideas: any[]): Array<{ category: string; count: number }> {
    const categoryCount: Record<string, number> = {};
    
    ideas.forEach(idea => {
      categoryCount[idea.category] = (categoryCount[idea.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Get top tags from search results
   */
  private static getTopTags(ideas: any[]): Array<{ tag: string; count: number }> {
    const tagCount: Record<string, number> = {};
    
    ideas.forEach(idea => {
      idea.tags.forEach((tag: string) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Build faceted search filters
   */
  static buildFacets(ideas: any[]): any {
    const categories = this.getTopCategories(ideas);
    const tags = this.getTopTags(ideas);
    
    const statusCount: Record<string, number> = {};
    ideas.forEach(idea => {
      statusCount[idea.status] = (statusCount[idea.status] || 0) + 1;
    });

    const statuses = Object.entries(statusCount)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return {
      categories,
      tags,
      statuses,
    };
  }
}