import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search,
  ThumbUp,
  ThumbDown,
  Visibility,
  TrendingUp,
  FilterList,
} from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import { ideasApi, votingApi } from '../services/api';
import { Idea, IdeaStatus } from '@ideaforge/types';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const IdeasPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadIdeas();
    loadCategories();
  }, [searchQuery, selectedCategory, sortBy, page]);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const response = await ideasApi.getIdeas({
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        sortBy: sortBy as any,
        page,
        limit: 12,
      });

      if (response.success) {
        setIdeas(response.data.ideas);
        setTotalPages(response.data.totalPages);
      } else {
        setError('Failed to load ideas');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await ideasApi.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateSearchParams();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sortBy !== 'newest') params.set('sortBy', sortBy);
    if (page !== 1) params.set('page', page.toString());
    setSearchParams(params);
  };

  const handleVote = async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) return;

    try {
      await votingApi.castVote(ideaId, voteType as any);
      // Reload ideas to get updated vote counts
      loadIdeas();
    } catch (err: any) {
      console.error('Failed to vote:', err);
    }
  };

  const getStatusColor = (status: IdeaStatus) => {
    switch (status) {
      case IdeaStatus.DRAFT:
        return 'default';
      case IdeaStatus.SUBMITTED:
        return 'primary';
      case IdeaStatus.APPROVED:
        return 'success';
      case IdeaStatus.IN_DEVELOPMENT:
        return 'info';
      case IdeaStatus.DEPLOYED:
        return 'success';
      case IdeaStatus.REJECTED:
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading && ideas.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner message="Loading ideas..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ideas
      </Typography>

      {/* Search and Filters */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="oldest">Oldest</MenuItem>
                <MenuItem value="most_voted">Most Voted</MenuItem>
                <MenuItem value="trending">Trending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              startIcon={<FilterList />}
            >
              Filter
            </Button>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Ideas Grid */}
      {ideas.length === 0 && !loading ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No ideas found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or{' '}
            <Link to="/ideas/create">create a new idea</Link>
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {ideas.map((idea) => (
            <Grid item xs={12} sm={6} md={4} key={idea.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Chip
                      label={idea.status}
                      color={getStatusColor(idea.status)}
                      size="small"
                    />
                    <Chip
                      label={idea.category}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h2" gutterBottom>
                    <Link
                      to={`/ideas/${idea.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {idea.title}
                    </Link>
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {idea.description.length > 150
                      ? `${idea.description.substring(0, 150)}...`
                      : idea.description}
                  </Typography>

                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                    {idea.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                    {idea.tags.length > 3 && (
                      <Chip label={`+${idea.tags.length - 3}`} size="small" variant="outlined" />
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title="Upvotes">
                      <IconButton
                        size="small"
                        onClick={() => handleVote(idea.id, 'upvote')}
                        disabled={!user}
                        color="primary"
                      >
                        <ThumbUp fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" color="text.secondary">
                      {idea.votingStats.upvotes}
                    </Typography>
                    
                    <Tooltip title="Downvotes">
                      <IconButton
                        size="small"
                        onClick={() => handleVote(idea.id, 'downvote')}
                        disabled={!user}
                        color="error"
                      >
                        <ThumbDown fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" color="text.secondary">
                      {idea.votingStats.downvotes}
                    </Typography>
                  </Box>

                  <Button
                    component={Link}
                    to={`/ideas/${idea.id}`}
                    size="small"
                    startIcon={<Visibility />}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => {
              setPage(newPage);
              updateSearchParams();
            }}
            color="primary"
          />
        </Box>
      )}

      {loading && ideas.length > 0 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Container>
  );
};

export default IdeasPage;