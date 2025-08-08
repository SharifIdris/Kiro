import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
};

export const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database connections...');
  await pool.end();
});

process.on('SIGTERM', async () => {
  logger.info('Closing database connections...');
  await pool.end();
});

export default pool;