import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const RegisterPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Register
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your IdeaForge account
          </Typography>
        </Box>
        {/* TODO: Add registration form */}
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Registration form will be implemented in the next task
        </Typography>
      </Paper>
    </Container>
  );
};

export default RegisterPage;