import { Server } from "socket.io";
import { isIP } from "node:net";
import type { Server as HttpServer } from "node:http";
import type { z } from "zod";
import type {
  Ack,
  ClientEvents,
  ServerEvents,
  Session,
} from "../shared/protocol.js";
import { RoomStore } from "./rooms.js";
import { changed, GameError, type Room } from "./model.js";
import { chooseWord, settle, startGame } from "./game.js";
import { sendChat } from "./chat.js";
import { addStroke, undoStroke, clearCanvas } from "./drawing.js";
import { disconnect, leave, resume, sweep } from "./recovery.js";
import * as schemas from "./validation.js";
import { RateLimit } from "./rate-limit.js";

interface SocketData {
  session?: Session;
  turn?: number;
}
export function createGateway(
  http: HttpServer,
  origins: string[],
  store = new RoomStore(),
  onComplete?: (room: Room) => Promise<void>,
  trustProxy = false,
) {
  const io = new Server<
    ClientEvents,
    ServerEvents,
    Record<string, never>,
    SocketData
  >(http, {
    cors: { origin: origins, methods: ["GET", "POST"] },
    maxHttpBufferSize: 32_768,
    pingTimeout: 20_000,
    allowRequest: (req, cb) =>
      cb(null, !req.headers.origin || origins.includes(req.headers.origin)),
  });
  const limits = new RateLimit();
  const saved = new Set<string>();
  const published = new Map<string, number>();
  const broadcast = (room: Room, full = false) => {
    for (const member of room.players) {
      if (!member.socketId) continue;
      const client = io.sockets.sockets.get(member.socketId);
      if (!client) continue;
      const view = store.view(room, member.id);
      const canvas = full || client.data.turn !== room.turn;
      client.data.turn = room.turn;
      client.emit("room:state", {
        ...view,
        strokes: canvas ? view.strokes : null,
      });
    }
    published.set(room.code, room.revision);
  };
  const address = (socket: {
    handshake: {
      address: string;
      headers: Record<string, string | string[] | undefined>;
    };
  }) => {
    const forwarded = socket.handshake.headers["x-forwarded-for"];
    const candidate =
      typeof forwarded === "string"
        ? forwarded.split(",").at(-1)?.trim()
        : undefined;
    return trustProxy && candidate && isIP(candidate)
      ? candidate
      : socket.handshake.address;
  };
  io.use((socket, next) => {
    if (!limits.allow(`connect:${address(socket)}`, 30, 60_000))
      return next(new Error("Too many connection attempts. Wait a minute."));
    next();
  });
  io.on("connection", (socket) => {
    const ip = address(socket);
    const run = <T>(
      ack: Ack<T> | undefined,
      action: () => T,
      limit = 30,
      kind = "action",
    ) => {
      if (typeof ack !== "function") return;
      try {
        if (!limits.allow(`${socket.id}:${kind}`, limit, 1000))
          throw new GameError("Slow down a little and try again.");
        ack({ ok: true, data: action() });
      } catch (error) {
        ack({
          ok: false,
          error:
            error instanceof GameError
              ? error.message
              : error instanceof Error && error.name === "ZodError"
                ? "Invalid input. Check your details and try again."
                : "Something went wrong. Try again.",
        });
      }
    };
    const parse = <T>(schema: z.ZodType<T>, value: unknown): T =>
      schema.parse(value);
    const current = () => {
      const session = socket.data.session;
      if (!session) throw new GameError("Join a room first.");
      const found = store.require(session.roomCode, session.playerId);
      if (found.player.socketId !== socket.id)
        throw new GameError("This session moved to another tab.");
      return found;
    };
    const bind = (session: Session) => {
      socket.data.session = session;
      const room = store.get(session.roomCode);
      broadcast(room, true);
      return session;
    };
    const unbound = () => {
      if (socket.data.session)
        throw new GameError("Leave your current room first.");
      if (!limits.allow(`join:${ip}`, 20, 60_000))
        throw new GameError("Too many room attempts. Wait a minute.");
    };
    socket.on("room:create", (input, ack) =>
      run(ack, () => {
        unbound();
        return bind(
          store.create(parse(schemas.identitySchema, input), socket.id),
        );
      }),
    );
    socket.on("room:join", (input, ack) =>
      run(ack, () => {
        unbound();
        const { code, ...identity } = parse(schemas.joinSchema, input);
        return bind(store.join(code, identity, socket.id));
      }),
    );
    socket.on("room:resume", (input, ack) =>
      run(ack, () => {
        unbound();
        const session = parse(schemas.resumeSchema, input);
        const old = resume(store, session, socket.id);
        if (old && old !== socket.id) {
          const prior = io.sockets.sockets.get(old);
          if (prior) {
            prior.data.session = undefined;
            prior.emit("session:replaced");
            prior.disconnect(true);
          }
        }
        return bind(session);
      }),
    );
    socket.on("room:leave", (ack) =>
      run(ack, () => {
        const { room, player } = current();
        leave(room, player.id, socket.id);
        socket.data.session = undefined;
        broadcast(room);
      }),
    );
    socket.on("room:settings", (input, ack) =>
      run(ack, () => {
        const { room, player } = current();
        if (
          room.hostId !== player.id ||
          !["lobby", "finished"].includes(room.phase)
        )
          throw new GameError(
            "Only the host can edit settings between matches.",
          );
        const settings = parse(schemas.settingsSchema, input);
        if (settings.maxPlayers < room.players.length)
          throw new GameError(
            "The player limit is smaller than the current room.",
          );
        room.settings = settings;
        changed(room);
        broadcast(room);
      }),
    );
    socket.on("game:start", (ack) =>
      run(ack, () => {
        const { room, player } = current();
        startGame(room, player.id);
        broadcast(room, true);
      }),
    );
    socket.on("game:choose", (input, ack) =>
      run(ack, () => {
        const { room, player } = current();
        const data = parse(schemas.chooseSchema, input);
        chooseWord(room, player.id, data.word, data.turn);
        broadcast(room);
      }),
    );
    socket.on("chat:send", (input, ack) =>
      run(
        ack,
        () => {
          const { room, player } = current();
          const data = parse(schemas.chatSchema, input);
          sendChat(room, player.id, data.text, data.turn);
          broadcast(room);
        },
        3,
        "chat",
      ),
    );
    socket.on("canvas:stroke", (input, ack) =>
      run(
        ack,
        () => {
          const { room, player } = current();
          const stroke = parse(schemas.strokeSchema, input);
          addStroke(room, player.id, stroke);
          for (const p of room.players)
            if (p.socketId) io.to(p.socketId).emit("canvas:stroke", stroke);
        },
        45,
        "stroke",
      ),
    );
    socket.on("canvas:undo", (input, ack) =>
      run(
        ack,
        () => {
          const { room, player } = current();
          const { turn } = parse(schemas.turnSchema, input);
          undoStroke(room, player.id, turn);
          broadcast(room, true);
        },
        5,
        "undo",
      ),
    );
    socket.on("canvas:clear", (input, ack) =>
      run(
        ack,
        () => {
          const { room, player } = current();
          const { turn } = parse(schemas.turnSchema, input);
          clearCanvas(room, player.id, turn);
          broadcast(room, true);
        },
        2,
        "clear",
      ),
    );
    socket.on("disconnect", () => {
      const s = socket.data.session;
      if (!s) return;
      const room = store.rooms.get(s.roomCode);
      if (room) {
        disconnect(room, s.playerId, socket.id);
        broadcast(room);
      }
    });
  });
  const timer = setInterval(() => {
    for (const room of store.rooms.values()) {
      settle(room);
      if (published.get(room.code) !== room.revision) broadcast(room);
      if (
        room.phase === "finished" &&
        room.matchId &&
        !saved.has(room.matchId)
      ) {
        saved.add(room.matchId);
        void onComplete?.(room).catch(() =>
          console.error("Match persistence failed; gameplay is unaffected."),
        );
      }
    }
    sweep(store);
    for (const code of published.keys())
      if (!store.rooms.has(code)) published.delete(code);
    limits.prune();
    if (saved.size > 1000) saved.clear();
  }, 250);
  timer.unref();
  return {
    io,
    store,
    close: async () => {
      clearInterval(timer);
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
