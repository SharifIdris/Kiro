import { Router } from 'express';
import { VotingController } from '../controllers/VotingController';
import { authenticateToken, optionalAuth, requirePermission } from '../middleware/auth';

const router = Router();
const votingController = new VotingController();

// Public routes (with optional authentication)
router.get('/ideas/:ideaId/stats', votingController.getIdeaVotingStats);
router.get('/ideas/:ideaId/has-voted', optionalAuth, votingController.hasUserVoted);
router.get('/leaderboard', votingController.getVotingLeaderboard);
router.get('/top-ideas', votingController.getTopVotedIdeas);

// Protected routes - require authentication
router.post('/', authenticateToken, votingController.castVote);
router.delete('/ideas/:ideaId', authenticateToken, votingController.removeVote);
router.get('/ideas/:ideaId/user', authenticateToken, votingController.getUserVote);
router.get('/ideas/:ideaId/votes', authenticateToken, votingController.getIdeaVotes);
router.get('/my-votes', authenticateToken, votingController.getMyVotes);
router.post('/bulk', authenticateToken, votingController.bulkVote);

// Analytics routes - require team lead or admin permissions
router.get('/analytics', authenticateToken, requirePermission('votes', 'read'), votingController.getVotingAnalytics);
router.get('/trends', authenticateToken, requirePermission('votes', 'read'), votingController.getVotingTrends);
router.get('/active-voters', authenticateToken, requirePermission('votes', 'read'), votingController.getMostActiveVoters);

export default router;