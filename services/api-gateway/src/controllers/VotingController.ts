import { Request, Response } from 'express';
import { VotingService } from '../services/VotingService';
import { createSuccessResponse, createErrorResponse } from '@ideaforge/shared';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';
import { asyncHandler } from '../middleware/errorHandler';
import { voteSchema } from '@ideaforge/shared';
import { VoteType } from '@ideaforge/types';

export class VotingController {
  private votingService: VotingService;

  constructor() {
    this.votingService = new VotingService();
  }

  castVote = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = voteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: validationResult.error.errors,
          },
          'Invalid vote data'
        )
      );
    }

    const { ideaId, type } = validationResult.data;
    const userId = (req as any).user.id;

    const result = await this.votingService.castVote(userId, ideaId, type);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Vote cast successfully')
    );
  });

  getUserVote = asyncHandler(async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const userId = (req as any).user.id;

    const vote = await this.votingService.getUserVote(userId, ideaId);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(vote, 'User vote retrieved successfully')
    );
  });

  getIdeaVotingStats = asyncHandler(async (req: Request, res: Response) => {
    const { ideaId } = req.params;

    const votingStats = await this.votingService.getIdeaVotingStats(ideaId);

    if (!votingStats) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Voting stats not found',
          },
          'Voting stats not found'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(votingStats, 'Voting stats retrieved successfully')
    );
  });

  removeVote = asyncHandler(async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const userId = (req as any).user.id;

    const votingStats = await this.votingService.removeVote(userId, ideaId);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(votingStats, 'Vote removed successfully')
    );
  });

  getMyVotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.votingService.getVotesByUser(userId, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Your votes retrieved successfully')
    );
  });

  getIdeaVotes = asyncHandler(async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.votingService.getVotesByIdea(ideaId, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Idea votes retrieved successfully')
    );
  });

  getVotingAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    // Parse optional time range
    let timeRange;
    if (req.query.startDate && req.query.endDate) {
      timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    const analytics = await this.votingService.getVotingAnalytics(user.role, timeRange);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(analytics, 'Voting analytics retrieved successfully')
    );
  });

  getMostActiveVoters = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const activeVoters = await this.votingService.getMostActiveVoters(limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(activeVoters, 'Most active voters retrieved successfully')
    );
  });

  getVotingTrends = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    const trends = await this.votingService.getVotingTrends(days);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(trends, 'Voting trends retrieved successfully')
    );
  });

  getTopVotedIdeas = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Parse optional time range
    let timeRange;
    if (req.query.startDate && req.query.endDate) {
      timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    const topIdeas = await this.votingService.getTopVotedIdeas(limit, timeRange);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(topIdeas, 'Top voted ideas retrieved successfully')
    );
  });

  getVotingLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await this.votingService.getVotingLeaderboard(limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(leaderboard, 'Voting leaderboard retrieved successfully')
    );
  });

  hasUserVoted = asyncHandler(async (req: Request, res: Response) => {
    const { ideaId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(HTTP_STATUS.OK).json(
        createSuccessResponse({ hasVoted: false }, 'User has not voted')
      );
    }

    const hasVoted = await this.votingService.hasUserVoted(userId, ideaId);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse({ hasVoted }, 'Vote status retrieved successfully')
    );
  });

  // Bulk vote operations
  bulkVote = asyncHandler(async (req: Request, res: Response) => {
    const { votes } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(votes) || votes.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Votes array is required',
          },
          'Invalid bulk vote data'
        )
      );
    }

    const results = [];
    const errors = [];

    for (const vote of votes) {
      try {
        const validationResult = voteSchema.safeParse(vote);
        if (!validationResult.success) {
          errors.push({
            ideaId: vote.ideaId,
            error: 'Validation failed',
            details: validationResult.error.errors,
          });
          continue;
        }

        const result = await this.votingService.castVote(
          userId,
          validationResult.data.ideaId,
          validationResult.data.type
        );
        results.push({
          ideaId: validationResult.data.ideaId,
          success: true,
          result,
        });
      } catch (error: any) {
        errors.push({
          ideaId: vote.ideaId,
          error: error.message,
        });
      }
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(
        { results, errors },
        `Bulk vote completed: ${results.length} successful, ${errors.length} failed`
      )
    );
  });
}