import { Request, Response } from 'express';
import { IdeaService } from '../services/IdeaService';
import { createSuccessResponse, createErrorResponse } from '@ideaforge/shared';
import { HTTP_STATUS, ERROR_CODES } from '@ideaforge/shared';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  ideaSubmissionSchema, 
  ideaUpdateSchema,
  ideaSearchSchema 
} from '@ideaforge/shared';
import { IdeaStatus } from '@ideaforge/types';

export class IdeaController {
  private ideaService: IdeaService;

  constructor() {
    this.ideaService = new IdeaService();
  }

  createIdea = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = ideaSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: validationResult.error.errors,
          },
          'Invalid idea data'
        )
      );
    }

    const { title, description, category, tags } = validationResult.data;
    const submitterId = (req as any).user.id;

    const idea = await this.ideaService.createIdea({
      title,
      description,
      category,
      tags,
      submitterId,
    });

    res.status(HTTP_STATUS.CREATED).json(
      createSuccessResponse(idea, 'Idea created successfully')
    );
  });

  getIdea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const idea = await this.ideaService.getIdeaById(id, userId);

    if (!idea) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Idea not found',
          },
          'Idea not found'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(idea, 'Idea retrieved successfully')
    );
  });

  updateIdea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Validate request body
    const validationResult = ideaUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: validationResult.error.errors,
          },
          'Invalid update data'
        )
      );
    }

    const idea = await this.ideaService.updateIdea(id, validationResult.data, userId);

    if (!idea) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Idea not found',
          },
          'Idea not found'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(idea, 'Idea updated successfully')
    );
  });

  deleteIdea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const deleted = await this.ideaService.deleteIdea(id, userId);

    if (!deleted) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Idea not found or could not be deleted',
          },
          'Delete failed'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Idea deleted successfully')
    );
  });

  searchIdeas = asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validationResult = ideaSearchSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid search parameters',
            details: validationResult.error.errors,
          },
          'Invalid search parameters'
        )
      );
    }

    const userId = (req as any).user?.id;
    const result = await this.ideaService.searchIdeas(validationResult.data, userId);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Ideas retrieved successfully')
    );
  });

  getMyIdeas = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.ideaService.getMyIdeas(userId, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(result, 'Your ideas retrieved successfully')
    );
  });

  getTrendingIdeas = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const ideas = await this.ideaService.getTrendingIdeas(limit);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(ideas, 'Trending ideas retrieved successfully')
    );
  });

  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.ideaService.getIdeaCategories();

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(categories, 'Categories retrieved successfully')
    );
  });

  addCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { collaboratorId } = req.body;
    const requesterId = (req as any).user.id;

    if (!collaboratorId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Collaborator ID is required',
          },
          'Missing collaborator ID'
        )
      );
    }

    const added = await this.ideaService.addCollaborator(id, collaboratorId, requesterId);

    if (!added) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.COLLABORATION_CONFLICT,
            message: 'Collaborator could not be added',
          },
          'Failed to add collaborator'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Collaborator added successfully')
    );
  });

  removeCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id, collaboratorId } = req.params;
    const requesterId = (req as any).user.id;

    const removed = await this.ideaService.removeCollaborator(id, collaboratorId, requesterId);

    if (!removed) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.COLLABORATION_CONFLICT,
            message: 'Collaborator could not be removed',
          },
          'Failed to remove collaborator'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(null, 'Collaborator removed successfully')
    );
  });

  changeStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = (req as any).user;

    if (!status || !Object.values(IdeaStatus).includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Valid status is required',
          },
          'Invalid status'
        )
      );
    }

    const idea = await this.ideaService.changeIdeaStatus(id, status, user.id, user.role);

    if (!idea) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Idea not found',
          },
          'Idea not found'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(idea, 'Idea status updated successfully')
    );
  });

  submitIdea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const idea = await this.ideaService.updateIdea(id, { status: IdeaStatus.SUBMITTED }, userId);

    if (!idea) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse(
          {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: 'Idea not found',
          },
          'Idea not found'
        )
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(idea, 'Idea submitted successfully')
    );
  });

  getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Query parameter "q" is required',
          },
          'Missing query parameter'
        )
      );
    }

    const suggestions = await this.ideaService.getSearchSuggestions(q);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(suggestions, 'Search suggestions retrieved successfully')
    );
  });

  getSearchFacets = asyncHandler(async (req: Request, res: Response) => {
    // Parse query parameters for filters
    const validationResult = ideaSearchSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(
          {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid search parameters',
            details: validationResult.error.errors,
          },
          'Invalid search parameters'
        )
      );
    }

    const facets = await this.ideaService.getSearchFacets(validationResult.data);

    res.status(HTTP_STATUS.OK).json(
      createSuccessResponse(facets, 'Search facets retrieved successfully')
    );
  });
}