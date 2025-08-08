import { IdeaRepository, CreateIdeaData, UpdateIdeaData, IdeaSearchFilters } from '../repositories/IdeaRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Idea, IdeaStatus, UserRole } from '@ideaforge/types';
import { createError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, GAMIFICATION } from '@ideaforge/shared';
import { logger } from '../utils/logger';

export class IdeaService {
  private ideaRepository: IdeaRepository;
  private userRepository: UserRepository;

  constructor() {
    this.ideaRepository = new IdeaRepository();
    this.userRepository = new UserRepository();
  }

  async createIdea(ideaData: CreateIdeaData): Promise<Idea> {
    // Validate submitter exists
    const submitter = await this.userRepository.getUserById(ideaData.submitterId);
    if (!submitter) {
      throw createError(
        'Submitter not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Create the idea
    const idea = await this.ideaRepository.createIdea(ideaData);

    // Award points for idea submission
    await this.userRepository.updateGamificationStats(
      ideaData.submitterId,
      GAMIFICATION.POINTS.IDEA_SUBMISSION
    );

    logger.info(`Idea created: ${idea.id} by user: ${ideaData.submitterId}`);

    return idea;
  }

  async getIdeaById(id: string, userId?: string): Promise<Idea | null> {
    const idea = await this.ideaRepository.getIdeaById(id);
    
    if (!idea) {
      return null;
    }

    // Check if user has permission to view this idea
    if (idea.status === IdeaStatus.DRAFT) {
      // Only owner and collaborators can view draft ideas
      if (!userId || !await this.canUserAccessIdea(idea.id, userId)) {
        throw createError(
          'Access denied to draft idea',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.RESOURCE_ACCESS_DENIED
        );
      }
    }

    return idea;
  }

  async updateIdea(id: string, updateData: UpdateIdeaData, userId: string): Promise<Idea | null> {
    // Check if idea exists
    const existingIdea = await this.ideaRepository.getIdeaById(id);
    if (!existingIdea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if user can modify this idea
    if (!await this.canUserModifyIdea(id, userId)) {
      throw createError(
        'You can only modify your own ideas or ideas you collaborate on',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.RESOURCE_ACCESS_DENIED
      );
    }

    // Check if idea is in a state that allows editing
    if (existingIdea.status === IdeaStatus.DEPLOYED || existingIdea.status === IdeaStatus.ARCHIVED) {
      throw createError(
        'Cannot modify deployed or archived ideas',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.IDEA_NOT_EDITABLE
      );
    }

    // If status is being changed to SUBMITTED, validate required fields
    if (updateData.status === IdeaStatus.SUBMITTED) {
      if (!existingIdea.title || !existingIdea.description || !existingIdea.category) {
        throw createError(
          'Title, description, and category are required to submit an idea',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    const updatedIdea = await this.ideaRepository.updateIdea(id, updateData);

    // Award points if idea was approved
    if (updateData.status === IdeaStatus.APPROVED && existingIdea.status !== IdeaStatus.APPROVED) {
      await this.userRepository.updateGamificationStats(
        existingIdea.submitterId,
        GAMIFICATION.POINTS.IDEA_APPROVED
      );
    }

    logger.info(`Idea updated: ${id} by user: ${userId}`);

    return updatedIdea;
  }

  async deleteIdea(id: string, userId: string): Promise<boolean> {
    // Check if idea exists
    const existingIdea = await this.ideaRepository.getIdeaById(id);
    if (!existingIdea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if user can delete this idea
    if (!await this.canUserModifyIdea(id, userId)) {
      throw createError(
        'You can only delete your own ideas',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.RESOURCE_ACCESS_DENIED
      );
    }

    // Check if idea can be deleted (only drafts and rejected ideas)
    if (![IdeaStatus.DRAFT, IdeaStatus.REJECTED].includes(existingIdea.status)) {
      throw createError(
        'Only draft and rejected ideas can be deleted',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.IDEA_NOT_EDITABLE
      );
    }

    const deleted = await this.ideaRepository.deleteIdea(id);

    if (deleted) {
      logger.info(`Idea deleted: ${id} by user: ${userId}`);
    }

    return deleted;
  }

  async searchIdeas(filters: IdeaSearchFilters, userId?: string): Promise<any> {
    const startTime = Date.now();

    // If user is not authenticated, only show public ideas
    if (!userId) {
      filters = {
        ...filters,
        status: IdeaStatus.SUBMITTED, // Only show submitted ideas to public
      };
    }

    const result = await this.ideaRepository.searchIdeas(filters);

    // Filter out draft ideas that user doesn't have access to
    if (userId) {
      const accessibleIdeas = [];
      for (const idea of result.ideas) {
        if (idea.status === IdeaStatus.DRAFT) {
          if (await this.canUserAccessIdea(idea.id, userId)) {
            accessibleIdeas.push(idea);
          }
        } else {
          accessibleIdeas.push(idea);
        }
      }
      result.ideas = accessibleIdeas;
      result.total = accessibleIdeas.length;
    }

    const executionTime = Date.now() - startTime;

    // Add search metadata
    return {
      ...result,
      searchMetadata: {
        executionTime,
        hasFilters: Object.keys(filters).length > 1, // More than just page/limit
        appliedFilters: filters,
      },
    };
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    // Get existing tags and categories for suggestions
    const [categories, recentIdeas] = await Promise.all([
      this.ideaRepository.getIdeaCategories(),
      this.ideaRepository.searchIdeas({ 
        sortBy: 'newest', 
        limit: 100,
        status: IdeaStatus.SUBMITTED 
      })
    ]);

    // Extract unique tags from recent ideas
    const allTags = new Set<string>();
    recentIdeas.ideas.forEach(idea => {
      idea.tags.forEach(tag => allTags.add(tag));
    });

    const categoryNames = categories.map(c => c.name);
    const uniqueTags = Array.from(allTags);

    return this.buildSearchSuggestions(query, uniqueTags, categoryNames);
  }

  async getSearchFacets(filters: IdeaSearchFilters): Promise<any> {
    // Get a larger sample for facet calculation
    const sampleResult = await this.ideaRepository.searchIdeas({
      ...filters,
      limit: 1000, // Get more results for better facet data
      page: 1,
    });

    return this.buildFacets(sampleResult.ideas);
  }

  private buildSearchSuggestions(query: string, tags: string[], categories: string[]): string[] {
    const suggestions: string[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    // Suggest matching tags
    const matchingTags = tags
      .filter(tag => tag.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
    suggestions.push(...matchingTags);

    // Suggest matching categories
    const matchingCategories = categories
      .filter(category => category.toLowerCase().includes(normalizedQuery))
      .slice(0, 3);
    suggestions.push(...matchingCategories);

    // Add common search patterns
    if (normalizedQuery.includes('web')) {
      suggestions.push('Web Application', 'website', 'webapp');
    }
    if (normalizedQuery.includes('mobile')) {
      suggestions.push('Mobile App', 'ios', 'android');
    }
    if (normalizedQuery.includes('api')) {
      suggestions.push('API/Backend', 'rest', 'graphql');
    }

    // Remove duplicates and limit results
    return [...new Set(suggestions)].slice(0, 8);
  }

  private buildFacets(ideas: any[]): any {
    const categories: Record<string, number> = {};
    const tags: Record<string, number> = {};
    const statuses: Record<string, number> = {};

    ideas.forEach(idea => {
      // Count categories
      categories[idea.category] = (categories[idea.category] || 0) + 1;

      // Count tags
      idea.tags.forEach((tag: string) => {
        tags[tag] = (tags[tag] || 0) + 1;
      });

      // Count statuses
      statuses[idea.status] = (statuses[idea.status] || 0) + 1;
    });

    return {
      categories: Object.entries(categories)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      tags: Object.entries(tags)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      statuses: Object.entries(statuses)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getMyIdeas(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.ideaRepository.getIdeasBySubmitter(userId, page, limit);
  }

  async getTrendingIdeas(limit: number = 10): Promise<Idea[]> {
    return this.ideaRepository.getTrendingIdeas(limit);
  }

  async getIdeaCategories(): Promise<Array<{ name: string; description: string; icon: string; color: string }>> {
    return this.ideaRepository.getIdeaCategories();
  }

  async addCollaborator(ideaId: string, collaboratorId: string, requesterId: string): Promise<boolean> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if requester can modify this idea
    if (!await this.canUserModifyIdea(ideaId, requesterId)) {
      throw createError(
        'You can only add collaborators to your own ideas',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.RESOURCE_ACCESS_DENIED
      );
    }

    // Check if collaborator exists
    const collaborator = await this.userRepository.getUserById(collaboratorId);
    if (!collaborator) {
      throw createError(
        'Collaborator not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if user allows collaboration
    if (!collaborator.profile.preferences.privacy.allowCollaboration) {
      throw createError(
        'User has disabled collaboration',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.COLLABORATION_CONFLICT
      );
    }

    const added = await this.ideaRepository.addCollaborator(ideaId, collaboratorId);

    if (added) {
      // Award points for collaboration
      await this.userRepository.updateGamificationStats(
        collaboratorId,
        GAMIFICATION.POINTS.COLLABORATION
      );

      logger.info(`Collaborator added: ${collaboratorId} to idea: ${ideaId} by user: ${requesterId}`);
    }

    return added;
  }

  async removeCollaborator(ideaId: string, collaboratorId: string, requesterId: string): Promise<boolean> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if requester can modify this idea or is removing themselves
    if (!await this.canUserModifyIdea(ideaId, requesterId) && requesterId !== collaboratorId) {
      throw createError(
        'You can only remove collaborators from your own ideas or remove yourself',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.RESOURCE_ACCESS_DENIED
      );
    }

    const removed = await this.ideaRepository.removeCollaborator(ideaId, collaboratorId);

    if (removed) {
      logger.info(`Collaborator removed: ${collaboratorId} from idea: ${ideaId} by user: ${requesterId}`);
    }

    return removed;
  }

  async changeIdeaStatus(ideaId: string, newStatus: IdeaStatus, userId: string, userRole: UserRole): Promise<Idea | null> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check permissions for status changes
    const canChangeStatus = this.canUserChangeStatus(idea.status, newStatus, userId, userRole, idea.submitterId);
    if (!canChangeStatus) {
      throw createError(
        'You do not have permission to change this idea status',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }

    return this.updateIdea(ideaId, { status: newStatus }, userId);
  }

  private async canUserAccessIdea(ideaId: string, userId: string): Promise<boolean> {
    return this.ideaRepository.isCollaborator(ideaId, userId);
  }

  private async canUserModifyIdea(ideaId: string, userId: string): Promise<boolean> {
    // Get user to check if they're admin
    const user = await this.userRepository.getUserById(userId);
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
      return true;
    }

    return this.ideaRepository.isCollaborator(ideaId, userId);
  }

  private canUserChangeStatus(
    currentStatus: IdeaStatus,
    newStatus: IdeaStatus,
    userId: string,
    userRole: UserRole,
    ideaOwnerId: string
  ): boolean {
    // Admins can change any status
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Team leads can approve/reject submitted ideas
    if (userRole === UserRole.TEAM_LEAD) {
      if (currentStatus === IdeaStatus.SUBMITTED && 
          (newStatus === IdeaStatus.APPROVED || newStatus === IdeaStatus.REJECTED)) {
        return true;
      }
      if (currentStatus === IdeaStatus.APPROVED && newStatus === IdeaStatus.IN_DEVELOPMENT) {
        return true;
      }
    }

    // Idea owners can submit their drafts
    if (userId === ideaOwnerId) {
      if (currentStatus === IdeaStatus.DRAFT && newStatus === IdeaStatus.SUBMITTED) {
        return true;
      }
    }

    return false;
  }
}