import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { createHttp } from "../server/http.js";
import { createGateway } from "../server/gateway.js";
import { readConfig } from "../server/config.js";
import { RoomStore } from "../server/rooms.js";
import type { RoomUpdate, Session } from "../shared/protocol.js";
function request<T = void>(
  socket: Socket,
  event: string,
  input?: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const ack = (
      err: Error | null,
      result: { ok: boolean; data: T; error: string },
    ) => {
      if (err) reject(err);
      else if (!result.ok) reject(new Error(result.error));
      else resolve(result.data);
    };
    if (input === undefined) socket.timeout(2500).emit(event, ack);
    else socket.timeout(2500).emit(event, input, ack);
  });
}
test("real sockets isolate rooms, synchronize strokes, reject unauthorized drawing and recover sessions", async (t) => {
  const store = new RoomStore();
  const http = createHttp(readConfig({}), store);
  const game = createGateway(http, ["http://localhost:3000"], store);
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  const clients: Socket[] = [];
  t.after(async () => {
    clients.forEach((c) => c.disconnect());
    await game.close();
  });
  const open = async () => {
    const client = io(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      autoConnect: false,
    });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("connect_error", reject);
      client.connect();
    });
    return client;
  };
  const a = await open(),
    b = await open(),
    other = await open();
  let artist!: RoomUpdate, guesser!: RoomUpdate;
  const strokes: unknown[] = [];
  const otherStrokes: unknown[] = [];
  a.on("room:state", (s) => (artist = s));
  b.on("room:state", (s) => (guesser = s));
  b.on("canvas:stroke", (s) => strokes.push(s));
  other.on("canvas:stroke", (s) => otherStrokes.push(s));
  const sa = await request<Session>(a, "room:create", {
    name: "Alice",
    avatar: "fox",
  });
  const sb = await request<Session>(b, "room:join", {
    name: "Bob",
    avatar: "cat",
    code: sa.roomCode,
  });
  await request(other, "room:create", { name: "Other", avatar: "bear" });
  await request(a, "game:start");
  assert.equal(artist.choices.length, 3);
  assert.equal(guesser.choices.length, 0);
  await request(a, "game:choose", {
    word: artist.choices[0],
    turn: artist.turn,
  });
  assert.equal(guesser.word, null);
  const stroke = {
    id: randomUUID(),
    turn: artist.turn,
    color: "#242333",
    size: 6,
    tool: "pen",
    points: [
      { x: 20, y: 30 },
      { x: 40, y: 60 },
    ],
  };
  await assert.rejects(request(b, "canvas:stroke", stroke), /artist/);
  const incoming = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Stroke did not arrive")),
      2000,
    );
    b.once("canvas:stroke", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await request(a, "canvas:stroke", stroke);
  await incoming;
  assert.equal(strokes.length, 1);
  assert.equal(otherStrokes.length, 0);
  b.disconnect();
  const rejoined = await open();
  let restored!: RoomUpdate;
  rejoined.on("room:state", (s) => (restored = s));
  await request(rejoined, "room:resume", sb);
  assert.equal(restored.youId, sb.playerId);
  assert.equal(restored.strokes!.length, 1);
  assert.equal(restored.word, null);
  const bad = await open();
  await assert.rejects(
    request(bad, "room:resume", { ...sb, token: "0".repeat(64) }),
    /expired/,
  );
  const health = await fetch(`${url}/health`);
  assert.equal(health.status, 200);
  assert.equal(((await health.json()) as { status: string }).status, "ok");
});
