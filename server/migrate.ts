import "dotenv/config";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before running migrations.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS matches (id uuid PRIMARY KEY, room_code varchar(6) NOT NULL, players jsonb NOT NULL, rounds integer NOT NULL, finished_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX IF NOT EXISTS matches_finished_at_idx ON matches (finished_at DESC);`,
  );
  console.log("Match history schema is ready.");
} finally {
  await pool.end();
}
