import { createClient } from "redis";
import type { Room } from "./model.js";
export function createReplayCache(url: string) {
  const client = url
    ? createClient({
        url,
        socket: { connectTimeout: 3000, reconnectStrategy: false },
      })
    : null;
  client?.on("error", () => console.error("Redis cache unavailable."));
  return {
    async connect() {
      if (client)
        try {
          await client.connect();
        } catch {
          console.error("Starting without replay cache.");
        }
    },
    async save(room: Room) {
      if (!client?.isReady) return;
      await client.set(
        `sketcharena:replay:${room.matchId}`,
        JSON.stringify({ word: room.word, strokes: room.strokes }),
        { EX: 86400 },
      );
    },
    async close() {
      if (client?.isOpen) await client.quit();
    },
  };
}
