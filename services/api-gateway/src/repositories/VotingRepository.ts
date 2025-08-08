import { Pool } from 'pg';
import { Vote, VoteType, VotingStats } from '@ideaforge/types';
import { generateUUID } from '@ideaforge/shared';
import pool from '../config/database';

export interface CastVoteData {
  userId: string;
  ideaId: string;
  voteType: VoteType;
}

export interface VotingAnalytics {
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  averageScore: number;
  topVotedIdeas: Array<{
    ideaId: string;
    title: string;
    score: number;
    voteCount: number;
  }>;
  votingTrends: Array<{
    date: string;
    votes: number;
  }>;
}

export class VotingRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async castVote(voteData: CastVoteData): Promise<Vote> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user has already voted on this idea
      const existingVoteResult = await client.query(
        'SELECT id, vote_type FROM votes WHERE user_id = $1 AND idea_id = $2',
        [voteData.userId, voteData.ideaId]
      );

      let vote: Vote;

      if (existingVoteResult.rows.length > 0) {
        // Update existing vote
        const existingVote = existingVoteResult.rows[0];
        
        if (existingVote.vote_type === voteData.voteType) {
          // Same vote type, remove the vote (toggle off)
          await client.query(
            'DELETE FROM votes WHERE id = $1',
            [existingVote.id]
          );
          
          vote = {
            id: existingVote.id,
            userId: voteData.userId,
            ideaId: voteData.ideaId,
            type: VoteType.ABSTAIN, // Indicate vote was removed
            createdAt: new Date(),
          };
        } else {
          // Different vote type, update the vote
          const updateResult = await client.query(
            `UPDATE votes 
             SET vote_type = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, user_id, idea_id, vote_type, created_at, updated_at`,
            [voteData.voteType, existingVote.id]
          );

          const updatedVote = updateResult.rows[0];
          vote = {
            id: updatedVote.id,
            userId: updatedVote.user_id,
            ideaId: updatedVote.idea_id,
            type: updatedVote.vote_type as VoteType,
            createdAt: updatedVote.created_at,
          };
        }
      } else {
        // Create new vote
        const insertResult = await client.query(
          `INSERT INTO votes (user_id, idea_id, vote_type)
           VALUES ($1, $2, $3)
           RETURNING id, user_id, idea_id, vote_type, created_at`,
          [voteData.userId, voteData.ideaId, voteData.voteType]
        );

        const newVote = insertResult.rows[0];
        vote = {
          id: newVote.id,
          userId: newVote.user_id,
          ideaId: newVote.idea_id,
          type: newVote.vote_type as VoteType,
          createdAt: newVote.created_at,
        };
      }

      await client.query('COMMIT');
      return vote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserVote(userId: string, ideaId: string): Promise<Vote | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, idea_id, vote_type, created_at
       FROM votes 
       WHERE user_id = $1 AND idea_id = $2`,
      [userId, ideaId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      ideaId: row.idea_id,
      type: row.vote_type as VoteType,
      createdAt: row.created_at,
    };
  }

  async getIdeaVotingStats(ideaId: string): Promise<VotingStats | null> {
    const result = await this.pool.query(
      `SELECT 
        vs.upvotes, vs.downvotes, vs.total_votes, vs.weighted_score,
        COALESCE(
          array_agg(v.user_id) FILTER (WHERE v.user_id IS NOT NULL), 
          '{}'
        ) as voter_ids
       FROM idea_voting_stats vs
       LEFT JOIN votes v ON vs.idea_id = v.idea_id
       WHERE vs.idea_id = $1
       GROUP BY vs.upvotes, vs.downvotes, vs.total_votes, vs.weighted_score`,
      [ideaId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      upvotes: row.upvotes || 0,
      downvotes: row.downvotes || 0,
      totalVotes: row.total_votes || 0,
      weightedScore: parseFloat(row.weighted_score) || 0,
      voterIds: row.voter_ids || [],
    };
  }

  async getVotesByUser(userId: string, page: number = 1, limit: number = 20): Promise<{
    votes: Vote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.pool.query(
      'SELECT COUNT(*) as total FROM votes WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get votes
    const votesResult = await this.pool.query(
      `SELECT id, user_id, idea_id, vote_type, created_at
       FROM votes 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const votes = votesResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      ideaId: row.idea_id,
      type: row.vote_type as VoteType,
      createdAt: row.created_at,
    }));

    return {
      votes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVotesByIdea(ideaId: string, page: number = 1, limit: number = 20): Promise<{
    votes: Vote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.pool.query(
      'SELECT COUNT(*) as total FROM votes WHERE idea_id = $1',
      [ideaId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get votes
    const votesResult = await this.pool.query(
      `SELECT id, user_id, idea_id, vote_type, created_at
       FROM votes 
       WHERE idea_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [ideaId, limit, offset]
    );

    const votes = votesResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      ideaId: row.idea_id,
      type: row.vote_type as VoteType,
      createdAt: row.created_at,
    }));

    return {
      votes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVotingAnalytics(timeRange?: { start: Date; end: Date }): Promise<VotingAnalytics> {
    let timeCondition = '';
    let timeParams: any[] = [];

    if (timeRange) {
      timeCondition = 'WHERE v.created_at BETWEEN $1 AND $2';
      timeParams = [timeRange.start, timeRange.end];
    }

    // Get overall voting stats
    const statsResult = await this.pool.query(
      `SELECT 
        COUNT(*) as total_votes,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as total_upvotes,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as total_downvotes,
        AVG(CASE 
          WHEN vote_type = 'upvote' THEN 1 
          WHEN vote_type = 'downvote' THEN -1 
          ELSE 0 
        END) as average_score
       FROM votes v
       ${timeCondition}`,
      timeParams
    );

    const stats = statsResult.rows[0];

    // Get top voted ideas
    const topIdeasResult = await this.pool.query(
      `SELECT 
        i.id as idea_id,
        i.title,
        vs.weighted_score as score,
        vs.total_votes as vote_count
       FROM ideas i
       JOIN idea_voting_stats vs ON i.id = vs.idea_id
       ORDER BY vs.weighted_score DESC, vs.total_votes DESC
       LIMIT 10`
    );

    const topVotedIdeas = topIdeasResult.rows.map(row => ({
      ideaId: row.idea_id,
      title: row.title,
      score: parseFloat(row.score),
      voteCount: row.vote_count,
    }));

    // Get voting trends (last 30 days)
    const trendsResult = await this.pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as votes
       FROM votes
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    const votingTrends = trendsResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      votes: parseInt(row.votes),
    }));

    return {
      totalVotes: parseInt(stats.total_votes) || 0,
      totalUpvotes: parseInt(stats.total_upvotes) || 0,
      totalDownvotes: parseInt(stats.total_downvotes) || 0,
      averageScore: parseFloat(stats.average_score) || 0,
      topVotedIdeas,
      votingTrends,
    };
  }

  async removeVote(userId: string, ideaId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM votes WHERE user_id = $1 AND idea_id = $2',
      [userId, ideaId]
    );

    return result.rowCount > 0;
  }

  async hasUserVoted(userId: string, ideaId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM votes WHERE user_id = $1 AND idea_id = $2',
      [userId, ideaId]
    );

    return result.rows.length > 0;
  }

  async getVoterIds(ideaId: string): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT user_id FROM votes WHERE idea_id = $1',
      [ideaId]
    );

    return result.rows.map(row => row.user_id);
  }

  async getMostActiveVoters(limit: number = 10): Promise<Array<{
    userId: string;
    voteCount: number;
    upvoteCount: number;
    downvoteCount: number;
  }>> {
    const result = await this.pool.query(
      `SELECT 
        user_id,
        COUNT(*) as vote_count,
        COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvote_count,
        COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvote_count
       FROM votes
       GROUP BY user_id
       ORDER BY vote_count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      voteCount: parseInt(row.vote_count),
      upvoteCount: parseInt(row.upvote_count),
      downvoteCount: parseInt(row.downvote_count),
    }));
  }
}