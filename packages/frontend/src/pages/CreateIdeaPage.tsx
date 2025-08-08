import React from 'react';
import { Container, Typography } from '@mui/material';

const CreateIdeaPage: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Idea
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Idea creation form will be implemented in upcoming tasks
      </Typography>
    </Container>
  );
};

export default CreateIdeaPage;