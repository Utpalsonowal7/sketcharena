import pg from "pg";
import type { Room } from "./model.js";
export function createHistory(url: string) {
  const pool = url
    ? new pg.Pool({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30_000,
      })
    : null;
  pool?.on("error", () => console.error("PostgreSQL connection error."));
  return {
    async save(room: Room) {
      if (!pool) return;
      await pool.query(
        "INSERT INTO matches (id, room_code, players, rounds, finished_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (id) DO NOTHING",
        [
          room.matchId,
          room.code,
          JSON.stringify(
            room.players.map(({ name, score, avatar }) => ({
              name,
              score,
              avatar,
            })),
          ),
          room.settings.rounds,
        ],
      );
    },
    async close() {
      await pool?.end();
    },
  };
}
