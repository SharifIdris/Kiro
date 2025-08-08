import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { Lightbulb, Code, Rocket, Group } from '@mui/icons-material';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <Lightbulb sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Submit Ideas',
      description: 'Share your innovative ideas with the community and get feedback from peers.',
    },
    {
      icon: <Group sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Collaborate',
      description: 'Work together with others to refine and improve ideas through collaboration.',
    },
    {
      icon: <Code sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'AI Code Generation',
      description: 'Transform your ideas into functional applications with AI-powered code generation.',
    },
    {
      icon: <Rocket sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'One-Click Deploy',
      description: 'Deploy your generated applications to the cloud with a single click.',
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          borderRadius: 2,
          color: 'white',
          mb: 6,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          IdeaForge
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4 }}>
          Transform Your Ideas into Reality with AI-Powered Development
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          Submit, collaborate, and automatically generate functional applications from your ideas.
          Our AI-powered platform takes you from concept to deployment in minutes.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/register"
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            to="/ideas"
            sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.300' } }}
          >
            Explore Ideas
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          How It Works
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          From idea submission to deployed application in four simple steps
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          bgcolor: 'grey.50',
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom>
          Ready to Transform Your Ideas?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Join thousands of innovators who are already using IdeaForge to bring their ideas to life.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to="/register"
        >
          Start Building Today
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;