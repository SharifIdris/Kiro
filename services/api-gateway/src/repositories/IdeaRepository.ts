import { Pool } from 'pg';
import { Idea, IdeaStatus, VotingStats, Comment, AIRefinement } from '@ideaforge/types';
import { generateUUID } from '@ideaforge/shared';
import pool from '../config/database';

export interface CreateIdeaData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  submitterId: string;
}

export interface UpdateIdeaData {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: IdeaStatus;
  collaborators?: string[];
}

export interface IdeaSearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  status?: IdeaStatus;
  submitterId?: string;
  sortBy?: 'newest' | 'oldest' | 'most_voted' | 'trending';
  page?: number;
  limit?: number;
}

export interface IdeaSearchResult {
  ideas: Idea[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class IdeaRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createIdea(ideaData: CreateIdeaData): Promise<Idea> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create idea
      const ideaResult = await client.query(
        `INSERT INTO ideas (title, description, category, tags, submitter_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, description, category, tags, submitter_id, collaborators, status, created_at, updated_at`,
        [
          ideaData.title,
          ideaData.description,
          ideaData.category,
          ideaData.tags,
          ideaData.submitterId,
          IdeaStatus.DRAFT,
        ]
      );

      const idea = ideaResult.rows[0];

      // Initialize voting stats
      await client.query(
        `INSERT INTO idea_voting_stats (idea_id, upvotes, downvotes, total_votes, weighted_score)
         VALUES ($1, 0, 0, 0, 0.0)`,
        [idea.id]
      );

      await client.query('COMMIT');

      // Return complete idea object
      return this.getIdeaById(idea.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getIdeaById(id: string): Promise<Idea | null> {
    const result = await this.pool.query(
      `SELECT 
        i.id, i.title, i.description, i.category, i.tags, i.submitter_id, 
        i.collaborators, i.status, i.created_at, i.updated_at,
        vs.upvotes, vs.downvotes, vs.total_votes, vs.weighted_score,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'version', ar.version,
              'suggestions', ar.suggestions,
              'appliedSuggestions', ar.applied_suggestions,
              'feedback', ar.feedback,
              'createdAt', ar.created_at
            )
          ) FILTER (WHERE ar.id IS NOT NULL), 
          '[]'
        ) as ai_refinements,
        gc.id as generated_code_id,
        gc.architecture,
        gc.frontend_files,
        gc.backend_files,
        gc.database_schema,
        gc.tests,
        gc.documentation,
        gc.generated_at,
        di.id as deployment_id,
        di.status as deployment_status,
        di.environments,
        di.urls,
        di.infrastructure,
        di.monitoring,
        di.deployed_at
       FROM ideas i
       LEFT JOIN idea_voting_stats vs ON i.id = vs.idea_id
       LEFT JOIN ai_refinements ar ON i.id = ar.idea_id
       LEFT JOIN generated_code gc ON i.id = gc.idea_id
       LEFT JOIN deployment_info di ON i.id = di.idea_id
       WHERE i.id = $1
       GROUP BY i.id, vs.upvotes, vs.downvotes, vs.total_votes, vs.weighted_score,
                gc.id, gc.architecture, gc.frontend_files, gc.backend_files, 
                gc.database_schema, gc.tests, gc.documentation, gc.generated_at,
                di.id, di.status, di.environments, di.urls, di.infrastructure, 
                di.monitoring, di.deployed_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToIdea(result.rows[0]);
  }

  async updateIdea(id: string, updateData: UpdateIdeaData): Promise<Idea | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      values.push(updateData.category);
    }
    if (updateData.tags !== undefined) {
      updateFields.push(`tags = $${paramCount++}`);
      values.push(updateData.tags);
    }
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updateData.status);
    }
    if (updateData.collaborators !== undefined) {
      updateFields.push(`collaborators = $${paramCount++}`);
      values.push(updateData.collaborators);
    }

    if (updateFields.length === 0) {
      return this.getIdeaById(id);
    }

    values.push(id);

    await this.pool.query(
      `UPDATE ideas SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount}`,
      values
    );

    return this.getIdeaById(id);
  }

  async deleteIdea(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM ideas WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  async searchIdeas(filters: IdeaSearchFilters): Promise<IdeaSearchResult> {
    const {
      query,
      category,
      tags,
      status,
      submitterId,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = filters;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (query) {
      whereConditions.push(`to_tsvector('english', i.title || ' ' || i.description) @@ plainto_tsquery('english', $${paramCount++})`);
      queryParams.push(query);
    }

    if (category) {
      whereConditions.push(`i.category = $${paramCount++}`);
      queryParams.push(category);
    }

    if (tags && tags.length > 0) {
      whereConditions.push(`i.tags && $${paramCount++}`);
      queryParams.push(tags);
    }

    if (status) {
      whereConditions.push(`i.status = $${paramCount++}`);
      queryParams.push(status);
    }

    if (submitterId) {
      whereConditions.push(`i.submitter_id = $${paramCount++}`);
      queryParams.push(submitterId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderBy = '';
    switch (sortBy) {
      case 'oldest':
        orderBy = 'ORDER BY i.created_at ASC';
        break;
      case 'most_voted':
        orderBy = 'ORDER BY COALESCE(vs.weighted_score, 0) DESC, i.created_at DESC';
        break;
      case 'trending':
        // Trending: combination of recent activity and votes
        orderBy = `ORDER BY (
          COALESCE(vs.weighted_score, 0) * 
          EXP(-EXTRACT(EPOCH FROM (NOW() - i.updated_at)) / 86400.0)
        ) DESC, i.created_at DESC`;
        break;
      default: // newest
        orderBy = 'ORDER BY i.created_at DESC';
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM ideas i
      LEFT JOIN idea_voting_stats vs ON i.id = vs.idea_id
      ${whereClause}
    `;

    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get ideas
    const ideasQuery = `
      SELECT 
        i.id, i.title, i.description, i.category, i.tags, i.submitter_id, 
        i.collaborators, i.status, i.created_at, i.updated_at,
        vs.upvotes, vs.downvotes, vs.total_votes, vs.weighted_score
      FROM ideas i
      LEFT JOIN idea_voting_stats vs ON i.id = vs.idea_id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    queryParams.push(limit, offset);

    const ideasResult = await this.pool.query(ideasQuery, queryParams);

    const ideas = ideasResult.rows.map(row => this.mapRowToIdea(row));

    return {
      ideas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIdeasBySubmitter(submitterId: string, page: number = 1, limit: number = 20): Promise<IdeaSearchResult> {
    return this.searchIdeas({
      submitterId,
      page,
      limit,
      sortBy: 'newest',
    });
  }

  async getTrendingIdeas(limit: number = 10): Promise<Idea[]> {
    const result = await this.searchIdeas({
      sortBy: 'trending',
      limit,
      page: 1,
    });

    return result.ideas;
  }

  async getIdeaCategories(): Promise<Array<{ name: string; description: string; icon: string; color: string }>> {
    const result = await this.pool.query(
      'SELECT name, description, icon, color FROM idea_categories ORDER BY name'
    );

    return result.rows;
  }

  async addCollaborator(ideaId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE ideas 
       SET collaborators = array_append(collaborators, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND NOT ($1 = ANY(collaborators))`,
      [userId, ideaId]
    );

    return result.rowCount > 0;
  }

  async removeCollaborator(ideaId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE ideas 
       SET collaborators = array_remove(collaborators, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, ideaId]
    );

    return result.rowCount > 0;
  }

  async getIdeaOwner(ideaId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT submitter_id FROM ideas WHERE id = $1',
      [ideaId]
    );

    return result.rows.length > 0 ? result.rows[0].submitter_id : null;
  }

  async isCollaborator(ideaId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM ideas WHERE id = $1 AND (submitter_id = $2 OR $2 = ANY(collaborators))',
      [ideaId, userId]
    );

    return result.rows.length > 0;
  }

  private mapRowToIdea(row: any): Idea {
    const idea: Idea = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags || [],
      submitterId: row.submitter_id,
      collaborators: row.collaborators || [],
      status: row.status as IdeaStatus,
      votingStats: {
        upvotes: row.upvotes || 0,
        downvotes: row.downvotes || 0,
        totalVotes: row.total_votes || 0,
        weightedScore: parseFloat(row.weighted_score) || 0,
        voterIds: [], // This would need a separate query to populate
      },
      aiRefinements: row.ai_refinements || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Add generated code if exists
    if (row.generated_code_id) {
      idea.generatedCode = {
        id: row.generated_code_id,
        architecture: row.architecture,
        frontend: {
          files: row.frontend_files?.files || [],
          dependencies: row.frontend_files?.dependencies || [],
          buildConfig: row.frontend_files?.buildConfig || {},
        },
        backend: {
          files: row.backend_files?.files || [],
          dependencies: row.backend_files?.dependencies || [],
          buildConfig: row.backend_files?.buildConfig || {},
        },
        database: row.database_schema,
        tests: row.tests,
        documentation: row.documentation,
        generatedAt: row.generated_at,
      };
    }

    // Add deployment info if exists
    if (row.deployment_id) {
      idea.deploymentInfo = {
        id: row.deployment_id,
        status: row.deployment_status,
        environments: row.environments || [],
        urls: row.urls,
        infrastructure: row.infrastructure,
        monitoring: row.monitoring,
        deployedAt: row.deployed_at,
      };
    }

    return idea;
  }
}