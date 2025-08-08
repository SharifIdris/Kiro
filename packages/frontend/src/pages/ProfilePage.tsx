import React from 'react';
import { Container, Typography } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary">
        User profile management will be implemented in upcoming tasks
      </Typography>
    </Container>
  );
};

export default ProfilePage;