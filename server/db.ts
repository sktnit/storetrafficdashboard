import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Use WebSockets for Neon serverless
neonConfig.webSocketConstructor = ws;

// Provide fallback for local development
const databaseUrl = process.env.DATABASE_URL;

// Check for database connection string
if (!databaseUrl) {
  console.warn("Warning: DATABASE_URL not set. Using local database or mock storage instead.");
}

// Create connection pool with connection string if available
export const pool = databaseUrl 
  ? new Pool({ connectionString: databaseUrl }) 
  : undefined;

// Create Drizzle instance if pool is available
export const db = pool 
  ? drizzle({ client: pool, schema }) 
  : undefined;