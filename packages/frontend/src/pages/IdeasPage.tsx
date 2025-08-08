import React from 'react';
import { Container, Typography } from '@mui/material';

const IdeasPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Ideas
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Ideas listing and management will be implemented in upcoming tasks
      </Typography>
    </Container>
  );
};

export default IdeasPage;