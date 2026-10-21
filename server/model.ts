import type {
  Player,
  Settings,
  Phase,
  Stroke,
  ChatMessage,
} from "../shared/protocol.js";
export interface Member extends Player {
  resumeHash: string;
  socketId: string | null;
  disconnectedAt: number | null;
}
export interface Room {
  code: string;
  revision: number;
  hostId: string;
  settings: Settings;
  players: Member[];
  phase: Phase;
  drawerId: string | null;
  round: number;
  turn: number;
  turnIndex: number;
  order: string[];
  endsAt: number;
  startedAt: number;
  lastActive: number;
  word: string;
  choices: string[];
  used: Set<string>;
  strokes: Stroke[];
  messages: ChatMessage[];
  guessOrder: string[];
  hintLevel: number;
  matchId: string;
}
export function changed(room: Room, now = Date.now()): void {
  room.revision++;
  room.lastActive = now;
}
export function message(
  room: Room,
  text: string,
  kind: ChatMessage["kind"] = "system",
  name = "Arena",
  playerId?: string,
  now = Date.now(),
): void {
  room.messages.push({
    id: crypto.randomUUID(),
    text,
    kind,
    name,
    playerId,
    at: now,
  });
  room.messages = room.messages.slice(-100);
  changed(room, now);
}
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}
