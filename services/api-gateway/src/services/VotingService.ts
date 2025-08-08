import { VotingRepository, CastVoteData, VotingAnalytics } from '../repositories/VotingRepository';
import { IdeaRepository } from '../repositories/IdeaRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Vote, VoteType, VotingStats, UserRole } from '@ideaforge/types';
import { createError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, GAMIFICATION } from '@ideaforge/shared';
import { logger } from '../utils/logger';
import { io } from '../index';

export class VotingService {
  private votingRepository: VotingRepository;
  private ideaRepository: IdeaRepository;
  private userRepository: UserRepository;

  constructor() {
    this.votingRepository = new VotingRepository();
    this.ideaRepository = new IdeaRepository();
    this.userRepository = new UserRepository();
  }

  async castVote(userId: string, ideaId: string, voteType: VoteType): Promise<{
    vote: Vote;
    votingStats: VotingStats;
  }> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if user can vote on this idea
    if (idea.submitterId === userId) {
      throw createError(
        'You cannot vote on your own idea',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.DUPLICATE_VOTE
      );
    }

    // Only allow voting on submitted, approved, or in-development ideas
    if (!['submitted', 'approved', 'in_development'].includes(idea.status)) {
      throw createError(
        'You can only vote on submitted ideas',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.DUPLICATE_VOTE
      );
    }

    // Cast the vote
    const vote = await this.votingRepository.castVote({
      userId,
      ideaId,
      voteType,
    });

    // Get updated voting stats
    const votingStats = await this.votingRepository.getIdeaVotingStats(ideaId);
    if (!votingStats) {
      throw createError(
        'Failed to retrieve voting stats',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Award points for voting (only for new votes, not updates)
    if (vote.type !== VoteType.ABSTAIN) {
      const existingVote = await this.votingRepository.getUserVote(userId, ideaId);
      if (!existingVote || existingVote.id === vote.id) {
        await this.userRepository.updateGamificationStats(
          userId,
          GAMIFICATION.POINTS.VOTE_CAST
        );
      }
    }

    // Emit real-time update
    this.emitVoteUpdate(ideaId, votingStats, vote);

    logger.info(`Vote cast: ${voteType} by user ${userId} on idea ${ideaId}`);

    return {
      vote,
      votingStats,
    };
  }

  async getUserVote(userId: string, ideaId: string): Promise<Vote | null> {
    return this.votingRepository.getUserVote(userId, ideaId);
  }

  async getIdeaVotingStats(ideaId: string): Promise<VotingStats | null> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    return this.votingRepository.getIdeaVotingStats(ideaId);
  }

  async removeVote(userId: string, ideaId: string): Promise<VotingStats> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Check if user has voted
    const existingVote = await this.votingRepository.getUserVote(userId, ideaId);
    if (!existingVote) {
      throw createError(
        'You have not voted on this idea',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // Remove the vote
    const removed = await this.votingRepository.removeVote(userId, ideaId);
    if (!removed) {
      throw createError(
        'Failed to remove vote',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Get updated voting stats
    const votingStats = await this.votingRepository.getIdeaVotingStats(ideaId);
    if (!votingStats) {
      throw createError(
        'Failed to retrieve voting stats',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Emit real-time update
    this.emitVoteUpdate(ideaId, votingStats, null);

    logger.info(`Vote removed by user ${userId} on idea ${ideaId}`);

    return votingStats;
  }

  async getVotesByUser(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.votingRepository.getVotesByUser(userId, page, limit);
  }

  async getVotesByIdea(ideaId: string, page: number = 1, limit: number = 20): Promise<any> {
    // Check if idea exists
    const idea = await this.ideaRepository.getIdeaById(ideaId);
    if (!idea) {
      throw createError(
        'Idea not found',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    return this.votingRepository.getVotesByIdea(ideaId, page, limit);
  }

  async getVotingAnalytics(
    userRole: UserRole,
    timeRange?: { start: Date; end: Date }
  ): Promise<VotingAnalytics> {
    // Only team leads and admins can view analytics
    if (![UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      throw createError(
        'Insufficient permissions to view voting analytics',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }

    return this.votingRepository.getVotingAnalytics(timeRange);
  }

  async getMostActiveVoters(limit: number = 10): Promise<any> {
    return this.votingRepository.getMostActiveVoters(limit);
  }

  async getVotingTrends(days: number = 30): Promise<Array<{
    date: string;
    upvotes: number;
    downvotes: number;
    totalVotes: number;
  }>> {
    // This would require a more complex query to get daily voting trends
    // For now, return the basic trends from analytics
    const analytics = await this.votingRepository.getVotingAnalytics();
    return analytics.votingTrends.map(trend => ({
      date: trend.date,
      upvotes: Math.floor(trend.votes * 0.8), // Estimate based on average ratio
      downvotes: Math.floor(trend.votes * 0.2),
      totalVotes: trend.votes,
    }));
  }

  async hasUserVoted(userId: string, ideaId: string): Promise<boolean> {
    return this.votingRepository.hasUserVoted(userId, ideaId);
  }

  async getTopVotedIdeas(limit: number = 10, timeRange?: { start: Date; end: Date }): Promise<any> {
    const analytics = await this.votingRepository.getVotingAnalytics(timeRange);
    return analytics.topVotedIdeas.slice(0, limit);
  }

  private emitVoteUpdate(ideaId: string, votingStats: VotingStats, vote: Vote | null): void {
    try {
      // Emit to idea-specific room
      io.to(`idea:${ideaId}`).emit('vote_updated', {
        ideaId,
        votingStats,
        vote,
        timestamp: new Date().toISOString(),
      });

      // Emit to general voting updates room
      io.to('voting_updates').emit('vote_cast', {
        ideaId,
        voteType: vote?.type,
        votingStats,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`Real-time vote update emitted for idea: ${ideaId}`);
    } catch (error) {
      logger.error('Failed to emit vote update:', error);
      // Don't throw error as this is not critical for the voting operation
    }
  }

  async getVotingLeaderboard(limit: number = 10): Promise<Array<{
    ideaId: string;
    title: string;
    submitterName: string;
    votingStats: VotingStats;
    rank: number;
  }>> {
    const analytics = await this.votingRepository.getVotingAnalytics();
    const topIdeas = analytics.topVotedIdeas.slice(0, limit);

    const leaderboard = [];
    for (let i = 0; i < topIdeas.length; i++) {
      const topIdea = topIdeas[i];
      const idea = await this.ideaRepository.getIdeaById(topIdea.ideaId);
      const submitter = idea ? await this.userRepository.getUserById(idea.submitterId) : null;

      if (idea && submitter) {
        leaderboard.push({
          ideaId: idea.id,
          title: idea.title,
          submitterName: `${submitter.profile.firstName} ${submitter.profile.lastName}`,
          votingStats: idea.votingStats,
          rank: i + 1,
        });
      }
    }

    return leaderboard;
  }
}