import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { Save, Send } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ideasApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CreateIdeaPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Common tags for suggestions
  const commonTags = [
    'react', 'nodejs', 'javascript', 'typescript', 'python', 'java',
    'web', 'mobile', 'api', 'database', 'ai', 'ml', 'blockchain',
    'frontend', 'backend', 'fullstack', 'ui', 'ux', 'design',
    'productivity', 'automation', 'analytics', 'social', 'ecommerce'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent, shouldSubmit: boolean = false) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (!category) {
      setError('Category is required');
      return;
    }

    if (tags.length === 0) {
      setError('At least one tag is required');
      return;
    }

    try {
      setLoading(true);
      
      // Create the idea
      const response = await ideasApi.createIdea({
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
      });

      if (response.success) {
        const ideaId = response.data.id;
        
        // If shouldSubmit is true, also submit the idea
        if (shouldSubmit) {
          await ideasApi.submitIdea(ideaId);
          toast.success('Idea created and submitted successfully!');
        } else {
          toast.success('Idea saved as draft!');
        }
        
        navigate(`/ideas/${ideaId}`);
      } else {
        setError(response.error?.message || 'Failed to create idea');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create idea');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          You must be logged in to create an idea.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Idea
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Share your innovative idea with the community
      </Typography>

      <Paper elevation={3} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={(e) => handleSubmit(e, false)}>
          <TextField
            fullWidth
            label="Idea Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            placeholder="Enter a compelling title for your idea"
            helperText={`${title.length}/100 characters`}
            inputProps={{ maxLength: 100 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            required
            multiline
            rows={6}
            placeholder="Describe your idea in detail. What problem does it solve? How would it work?"
            helperText={`${description.length}/2000 characters`}
            inputProps={{ maxLength: 2000 }}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.name} value={cat.name}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <span style={{ color: cat.color }}>●</span>
                    {cat.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            options={commonTags}
            value={tags}
            onChange={(_, newTags) => setTags(newTags)}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Add tags to help others find your idea"
                margin="normal"
                required={tags.length === 0}
                helperText="Press Enter to add custom tags or select from suggestions"
              />
            )}
            sx={{ mt: 2 }}
          />

          <Box display="flex" gap={2} mt={4}>
            <Button
              type="submit"
              variant="outlined"
              startIcon={<Save />}
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save as Draft'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              disabled={loading}
              onClick={(e) => handleSubmit(e, true)}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create & Submit'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Drafts can be edited later. Submitted ideas will be reviewed by the community.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateIdeaPage;