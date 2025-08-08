import React from 'react';
import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

const IdeaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Idea Detail
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Idea detail view for ID: {id} will be implemented in upcoming tasks
      </Typography>
    </Container>
  );
};

export default IdeaDetailPage;