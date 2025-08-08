-- Create ideas table
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    submitter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collaborators UUID[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create voting stats table
CREATE TABLE IF NOT EXISTS idea_voting_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    weighted_score DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'abstain')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, idea_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AI refinements table
CREATE TABLE IF NOT EXISTS ai_refinements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    suggestions TEXT[] NOT NULL DEFAULT '{}',
    applied_suggestions TEXT[] DEFAULT '{}',
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create generated code table
CREATE TABLE IF NOT EXISTS generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    architecture JSONB,
    frontend_files JSONB,
    backend_files JSONB,
    database_schema JSONB,
    tests JSONB,
    documentation TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id)
);

-- Create deployment info table
CREATE TABLE IF NOT EXISTS deployment_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    environments JSONB DEFAULT '[]',
    urls JSONB,
    infrastructure JSONB,
    monitoring JSONB,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id)
);

-- Create categories table for predefined categories
CREATE TABLE IF NOT EXISTS idea_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7), -- hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO idea_categories (name, description, icon, color) VALUES
('Web Application', 'Web-based applications and websites', 'web', '#2196F3'),
('Mobile App', 'Mobile applications for iOS and Android', 'mobile', '#4CAF50'),
('API/Backend', 'Backend services and APIs', 'api', '#FF9800'),
('Data Science', 'Data analysis and machine learning projects', 'analytics', '#9C27B0'),
('DevOps/Tools', 'Development tools and automation', 'build', '#607D8B'),
('E-commerce', 'Online shopping and marketplace solutions', 'shopping', '#F44336'),
('Social Platform', 'Social networking and community platforms', 'people', '#E91E63'),
('Productivity', 'Tools to improve productivity and workflow', 'work', '#795548'),
('Entertainment', 'Games and entertainment applications', 'games', '#FF5722'),
('Education', 'Educational tools and learning platforms', 'school', '#3F51B5')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_submitter_id ON ideas(submitter_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ideas_collaborators ON ideas USING GIN(collaborators);

CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_idea_id ON votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_votes_type ON votes(vote_type);

CREATE INDEX IF NOT EXISTS idx_comments_idea_id ON comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_ai_refinements_idea_id ON ai_refinements(idea_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_idea_id ON generated_code(idea_id);
CREATE INDEX IF NOT EXISTS idx_deployment_info_idea_id ON deployment_info(idea_id);

-- Create full-text search index for ideas
CREATE INDEX IF NOT EXISTS idx_ideas_search ON ideas USING GIN(to_tsvector('english', title || ' ' || description));

-- Create triggers for updated_at
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_idea_voting_stats_updated_at BEFORE UPDATE ON idea_voting_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deployment_info_updated_at BEFORE UPDATE ON deployment_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update voting stats when votes change
CREATE OR REPLACE FUNCTION update_voting_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert voting stats
    INSERT INTO idea_voting_stats (idea_id, upvotes, downvotes, total_votes, weighted_score)
    SELECT 
        idea_id,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
        COUNT(*) as total_votes,
        (COUNT(*) FILTER (WHERE vote_type = 'upvote') * 1.0 - COUNT(*) FILTER (WHERE vote_type = 'downvote') * 0.5) as weighted_score
    FROM votes 
    WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id)
    GROUP BY idea_id
    ON CONFLICT (idea_id) 
    DO UPDATE SET
        upvotes = EXCLUDED.upvotes,
        downvotes = EXCLUDED.downvotes,
        total_votes = EXCLUDED.total_votes,
        weighted_score = EXCLUDED.weighted_score,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for voting stats updates
CREATE TRIGGER update_voting_stats_on_insert AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION update_voting_stats();
CREATE TRIGGER update_voting_stats_on_update AFTER UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_voting_stats();
CREATE TRIGGER update_voting_stats_on_delete AFTER DELETE ON votes FOR EACH ROW EXECUTE FUNCTION update_voting_stats();