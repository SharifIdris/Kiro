import axios from 'axios';
import { Idea, IdeaStatus, Vote, VoteType } from '@ideaforge/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Ideas API
export const ideasApi = {
  // Get all ideas with filters
  getIdeas: async (params?: {
    query?: string;
    category?: string;
    tags?: string[];
    status?: IdeaStatus;
    sortBy?: 'newest' | 'oldest' | 'most_voted' | 'trending';
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/api/ideas/search', { params });
    return response.data;
  },

  // Get trending ideas
  getTrendingIdeas: async (limit?: number) => {
    const response = await api.get('/api/ideas/trending', { params: { limit } });
    return response.data;
  },

  // Get idea by ID
  getIdea: async (id: string) => {
    const response = await api.get(`/api/ideas/${id}`);
    return response.data;
  },

  // Create new idea
  createIdea: async (ideaData: {
    title: string;
    description: string;
    category: string;
    tags: string[];
  }) => {
    const response = await api.post('/api/ideas', ideaData);
    return response.data;
  },

  // Update idea
  updateIdea: async (id: string, updateData: {
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    status?: IdeaStatus;
  }) => {
    const response = await api.put(`/api/ideas/${id}`, updateData);
    return response.data;
  },

  // Delete idea
  deleteIdea: async (id: string) => {
    const response = await api.delete(`/api/ideas/${id}`);
    return response.data;
  },

  // Get my ideas
  getMyIdeas: async (page?: number, limit?: number) => {
    const response = await api.get('/api/ideas/my/ideas', { params: { page, limit } });
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/api/ideas/categories');
    return response.data;
  },

  // Submit idea
  submitIdea: async (id: string) => {
    const response = await api.post(`/api/ideas/${id}/submit`);
    return response.data;
  },

  // Add collaborator
  addCollaborator: async (id: string, collaboratorId: string) => {
    const response = await api.post(`/api/ideas/${id}/collaborators`, { collaboratorId });
    return response.data;
  },

  // Remove collaborator
  removeCollaborator: async (id: string, collaboratorId: string) => {
    const response = await api.delete(`/api/ideas/${id}/collaborators/${collaboratorId}`);
    return response.data;
  },

  // Get search suggestions
  getSearchSuggestions: async (query: string) => {
    const response = await api.get('/api/ideas/search/suggestions', { params: { q: query } });
    return response.data;
  },

  // Get search facets
  getSearchFacets: async (filters?: any) => {
    const response = await api.get('/api/ideas/search/facets', { params: filters });
    return response.data;
  },
};

// Voting API
export const votingApi = {
  // Cast vote
  castVote: async (ideaId: string, type: VoteType) => {
    const response = await api.post('/api/votes', { ideaId, type });
    return response.data;
  },

  // Get user's vote for an idea
  getUserVote: async (ideaId: string) => {
    const response = await api.get(`/api/votes/ideas/${ideaId}/user`);
    return response.data;
  },

  // Get voting stats for an idea
  getVotingStats: async (ideaId: string) => {
    const response = await api.get(`/api/votes/ideas/${ideaId}/stats`);
    return response.data;
  },

  // Remove vote
  removeVote: async (ideaId: string) => {
    const response = await api.delete(`/api/votes/ideas/${ideaId}`);
    return response.data;
  },

  // Get my votes
  getMyVotes: async (page?: number, limit?: number) => {
    const response = await api.get('/api/votes/my-votes', { params: { page, limit } });
    return response.data;
  },

  // Get voting leaderboard
  getLeaderboard: async (limit?: number) => {
    const response = await api.get('/api/votes/leaderboard', { params: { limit } });
    return response.data;
  },

  // Check if user has voted
  hasUserVoted: async (ideaId: string) => {
    const response = await api.get(`/api/votes/ideas/${ideaId}/has-voted`);
    return response.data;
  },

  // Get top voted ideas
  getTopVotedIdeas: async (limit?: number) => {
    const response = await api.get('/api/votes/top-ideas', { params: { limit } });
    return response.data;
  },

  // Bulk vote
  bulkVote: async (votes: Array<{ ideaId: string; type: VoteType }>) => {
    const response = await api.post('/api/votes/bulk', { votes });
    return response.data;
  },
};

// Users API
export const usersApi = {
  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    skills?: string[];
    avatar?: string;
  }) => {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export default api;