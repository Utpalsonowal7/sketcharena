import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  DEFAULT_SETTINGS,
  type Identity,
  type Session,
  type RoomView,
} from "../shared/protocol.js";
import { maskWord } from "../shared/rules.js";
import {
  changed,
  GameError,
  message,
  type Member,
  type Room,
} from "./model.js";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class RoomStore {
  rooms = new Map<string, Room>();
  create(identity: Identity, socketId: string, now = Date.now()): Session {
    if (this.rooms.size >= 500)
      throw new GameError("The arena is busy. Try again in a moment.");
    let code = "";
    do {
      code = Array.from(
        { length: 6 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)],
      ).join("");
    } while (this.rooms.has(code));
    const token = randomBytes(32).toString("hex");
    const player = this.member(identity, socketId, token);
    const room: Room = {
      code,
      revision: 0,
      hostId: player.id,
      settings: { ...DEFAULT_SETTINGS },
      players: [player],
      phase: "lobby",
      drawerId: null,
      round: 0,
      turn: 0,
      turnIndex: -1,
      order: [],
      endsAt: 0,
      startedAt: 0,
      lastActive: now,
      word: "",
      choices: [],
      used: new Set(),
      strokes: [],
      messages: [],
      guessOrder: [],
      hintLevel: 0,
      matchId: "",
    };
    this.rooms.set(code, room);
    message(
      room,
      `${player.name} opened the room.`,
      "system",
      "Arena",
      undefined,
      now,
    );
    return { roomCode: code, playerId: player.id, token };
  }
  member(identity: Identity, socketId: string, token: string): Member {
    return {
      ...identity,
      id: randomUUID(),
      score: 0,
      guessed: false,
      connected: true,
      resumeHash: hashToken(token),
      socketId,
      disconnectedAt: null,
    };
  }
  join(
    code: string,
    identity: Identity,
    socketId: string,
    now = Date.now(),
  ): Session {
    const room = this.get(code);
    if (room.phase !== "lobby" && room.phase !== "finished")
      throw new GameError(
        "This game has started. Join after the match finishes.",
      );
    if (room.players.length >= room.settings.maxPlayers)
      throw new GameError("This room is full.");
    if (
      room.players.some(
        (p) => p.name.toLowerCase() === identity.name.toLowerCase(),
      )
    )
      throw new GameError("That name is taken in this room. Pick another.");
    const token = randomBytes(32).toString("hex");
    const player = this.member(identity, socketId, token);
    room.players.push(player);
    if (
      !room.players.some(
        (member) => member.id === room.hostId && member.connected,
      )
    ) {
      room.hostId = player.id;
    }
    message(
      room,
      `${player.name} joined the room.`,
      "system",
      "Arena",
      undefined,
      now,
    );
    return { roomCode: code, playerId: player.id, token };
  }
  get(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new GameError("Room not found. It may have expired.");
    return room;
  }
  require(code: string, playerId: string): { room: Room; player: Member } {
    const room = this.get(code);
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.connected)
      throw new GameError("Your session is no longer active.");
    return { room, player };
  }
  view(room: Room, playerId: string, now = Date.now()): RoomView {
    const isDrawer = room.drawerId === playerId;
    const reveal = room.phase === "reveal" || room.phase === "finished";
    const ratio =
      room.phase === "drawing"
        ? (now - room.startedAt) / (room.settings.drawSeconds * 1000)
        : 0;
    return {
      code: room.code,
      revision: room.revision,
      hostId: room.hostId,
      youId: playerId,
      settings: room.settings,
      phase: room.phase,
      players: room.players.map(
        ({ id, name, avatar, score, connected, guessed }) => ({
          id,
          name,
          avatar,
          score,
          connected,
          guessed,
        }),
      ),
      drawerId: room.drawerId,
      round: room.round,
      turn: room.turn,
      turnNumber: Math.min(room.turnIndex + 1, room.order.length),
      totalTurns: room.order.length,
      endsAt: room.endsAt,
      serverNow: now,
      hint: room.phase === "drawing" ? maskWord(room.word, ratio) : "",
      word: reveal || (isDrawer && room.phase === "drawing") ? room.word : null,
      choices: isDrawer && room.phase === "choosing" ? room.choices : [],
      strokes: room.strokes,
      messages: room.messages,
    };
  }
}
