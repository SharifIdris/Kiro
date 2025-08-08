import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  ThumbUp,
  Visibility,
  EmojiEvents,
  Star,
  Timeline,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { ideasApi, votingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Idea, IdeaStatus } from '@ideaforge/types';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [trendingIdeas, setTrendingIdeas] = useState<Idea[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [myIdeasRes, trendingRes, leaderboardRes] = await Promise.all([
        ideasApi.getMyIdeas(1, 5),
        ideasApi.getTrendingIdeas(5),
        votingApi.getLeaderboard(5),
      ]);

      if (myIdeasRes.success) {
        setMyIdeas(myIdeasRes.data.ideas);
      }
      if (trendingRes.success) {
        setTrendingIdeas(trendingRes.data);
      }
      if (leaderboardRes.success) {
        setLeaderboard(leaderboardRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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

  const getLevelProgress = (points: number) => {
    const levels = [
      { name: 'Novice', min: 0, max: 99 },
      { name: 'Contributor', min: 100, max: 499 },
      { name: 'Innovator', min: 500, max: 1499 },
      { name: 'Expert', min: 1500, max: 4999 },
      { name: 'Master', min: 5000, max: 14999 },
      { name: 'Legend', min: 15000, max: Infinity },
    ];

    const currentLevel = levels.find(level => points >= level.min && points <= level.max);
    if (!currentLevel) return { level: 'Legend', progress: 100 };

    const progress = currentLevel.max === Infinity 
      ? 100 
      : ((points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

    return { level: currentLevel.name, progress };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner message="Loading dashboard..." />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to IdeaForge
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in to access your dashboard.
        </Typography>
      </Container>
    );
  }

  const { level, progress } = getLevelProgress(user.gamificationStats.points);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user.profile.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your ideas
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/ideas/create"
          variant="contained"
          startIcon={<Add />}
          size="large"
        >
          New Idea
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* User Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <EmojiEvents />
              </Avatar>
              <Box>
                <Typography variant="h6">Level: {level}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.gamificationStats.points} points
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {Math.round(progress)}% to next level
            </Typography>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">
                    {myIdeas.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    My Ideas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="success.main">
                    {myIdeas.filter(idea => idea.status === IdeaStatus.APPROVED).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="info.main">
                    {myIdeas.reduce((sum, idea) => sum + idea.votingStats.upvotes, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Votes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="warning.main">
                    {user.gamificationStats.leaderboardRank || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rank
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* My Ideas */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">My Recent Ideas</Typography>
              <Button component={Link} to="/ideas?submitter=me" size="small">
                View All
              </Button>
            </Box>
            {myIdeas.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  You haven't created any ideas yet
                </Typography>
                <Button
                  component={Link}
                  to="/ideas/create"
                  variant="outlined"
                  startIcon={<Add />}
                >
                  Create Your First Idea
                </Button>
              </Box>
            ) : (
              <List>
                {myIdeas.map((idea, index) => (
                  <React.Fragment key={idea.id}>
                    <ListItem
                      secondaryAction={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={idea.status}
                            color={getStatusColor(idea.status)}
                            size="small"
                          />
                          <Tooltip title="Upvotes">
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <ThumbUp fontSize="small" color="primary" />
                              <Typography variant="caption">
                                {idea.votingStats.upvotes}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Link
                            to={`/ideas/${idea.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            {idea.title}
                          </Link>
                        }
                        secondary={`${idea.category} • ${new Date(idea.createdAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                    {index < myIdeas.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Trending Ideas */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Trending Ideas</Typography>
              <TrendingUp color="primary" />
            </Box>
            <List>
              {trendingIdeas.map((idea, index) => (
                <React.Fragment key={idea.id}>
                  <ListItem disablePadding>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Link
                          to={`/ideas/${idea.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <Typography variant="body2" noWrap>
                            {idea.title}
                          </Typography>
                        </Link>
                      }
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <ThumbUp fontSize="small" />
                          <Typography variant="caption">
                            {idea.votingStats.upvotes}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < trendingIdeas.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            <Button
              component={Link}
              to="/ideas?sortBy=trending"
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
            >
              View All Trending
            </Button>
          </Paper>
        </Grid>

        {/* Leaderboard */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Top Contributors</Typography>
              <Star color="warning" />
            </Box>
            <Grid container spacing={2}>
              {leaderboard.map((entry, index) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={entry.ideaId}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#CD7F32' : 'primary.main',
                          mx: 'auto',
                          mb: 1,
                        }}
                      >
                        {entry.rank}
                      </Avatar>
                      <Typography variant="body2" noWrap gutterBottom>
                        {entry.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {entry.submitterName}
                      </Typography>
                      <Box display="flex" justifyContent="center" alignItems="center" gap={0.5} mt={1}>
                        <ThumbUp fontSize="small" color="primary" />
                        <Typography variant="caption">
                          {entry.votingStats.upvotes}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;