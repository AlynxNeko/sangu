import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// We are using Supabase directly from the frontend, so this DB connection 
// is optional or used for admin tasks if needed. 
// We make it safe so it doesn't crash if DATABASE_URL is not set.

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/dbname" 
});

// If we don't have a real connection, this might fail on query, but the app 
// shouldn't crash on startup if we don't use it.
export const db = drizzle(pool, { schema });
