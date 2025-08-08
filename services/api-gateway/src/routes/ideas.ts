import { Router } from 'express';
import { IdeaController } from '../controllers/IdeaController';
import { authenticateToken, optionalAuth, requirePermission, canModifyResource } from '../middleware/auth';
import { IdeaRepository } from '../repositories/IdeaRepository';

const router = Router();
const ideaController = new IdeaController();
const ideaRepository = new IdeaRepository();

// Helper function to get idea owner
const getIdeaOwner = async (req: any) => {
  return ideaRepository.getIdeaOwner(req.params.id);
};

// Public routes (with optional authentication)
router.get('/trending', optionalAuth, ideaController.getTrendingIdeas);
router.get('/categories', ideaController.getCategories);
router.get('/search', optionalAuth, ideaController.searchIdeas);
router.get('/search/suggestions', ideaController.getSearchSuggestions);
router.get('/search/facets', optionalAuth, ideaController.getSearchFacets);
router.get('/:id', optionalAuth, ideaController.getIdea);

// Protected routes - require authentication
router.post('/', authenticateToken, requirePermission('ideas', 'create'), ideaController.createIdea);
router.get('/', authenticateToken, ideaController.searchIdeas);

// User's own ideas
router.get('/my/ideas', authenticateToken, ideaController.getMyIdeas);

// Idea modification routes - require ownership or admin
router.put('/:id', authenticateToken, canModifyResource(getIdeaOwner), ideaController.updateIdea);
router.delete('/:id', authenticateToken, canModifyResource(getIdeaOwner), ideaController.deleteIdea);

// Collaboration routes
router.post('/:id/collaborators', authenticateToken, canModifyResource(getIdeaOwner), ideaController.addCollaborator);
router.delete('/:id/collaborators/:collaboratorId', authenticateToken, ideaController.removeCollaborator);

// Status management routes
router.post('/:id/submit', authenticateToken, canModifyResource(getIdeaOwner), ideaController.submitIdea);
router.put('/:id/status', authenticateToken, requirePermission('ideas', 'approve'), ideaController.changeStatus);

export default router;