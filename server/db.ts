import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-core';
import * as schema from "@shared/schema";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

// Log for debugging
console.log("Connecting to database...", databaseUrl);

// Check for database connection string
if (!databaseUrl) {
  console.warn("Warning: DATABASE_URL not set. Please set this environment variable.");
  throw new Error("DATABASE_URL must be set. Please create a .env file or set this environment variable.");
}

// Create connection pool with connection string
export const pool = new Pool({
  connectionString: databaseUrl,
  // Add connection timeout for development
  connectionTimeoutMillis: 5000,
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('Database connection successful!'))
  .catch(err => console.error('Database connection failed:', err));

// Create Drizzle instance with the pool
export const db = drizzle(pool, { schema });