"use client";
import { ArrowRight, Copy, LockKeyhole, Settings2, Users } from "lucide-react";
import { useState } from "react";
import type { RoomView, Settings } from "@shared/protocol";
import type { Arena } from "@/hooks/use-arena";
import { Avatar } from "./avatar";
export function Lobby({
  room,
  arena,
  onNotice,
}: {
  room: RoomView;
  arena: Arena;
  onNotice: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const host = room.hostId === room.youId;
  const online = room.players.filter((p) => p.connected).length;
  async function update(key: keyof Settings, value: string) {
    try {
      await arena.settings({
        ...room.settings,
        [key]: key === "category" ? value : Number(value),
      });
    } catch (err) {
      onNotice((err as Error).message);
    }
  }
  async function invite() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/?room=${room.code}`,
      );
      onNotice("Invite link copied. Send it to your people!");
    } catch {
      onNotice(`Share this room code: ${room.code}`);
    }
  }
  return (
    <section className="lobby-layout">
      <div className="lobby-main panel">
        <span className="lobby-spark">✦</span>
        <span className="eyebrow">THE GANG’S GETTING TOGETHER</span>
        <h1>
          Good company.
          <br />
          <span>Questionable art.</span>
        </h1>
        <p>Invite a friend or twelve. The canvas is waiting.</p>
        <button
          className="invite-code"
          onClick={() => void invite()}
          aria-label="Copy room invite"
        >
          <span>YOUR PRIVATE ROOM</span>
          <strong>{room.code}</strong>
          <Copy size={17} />
        </button>
        <div className="lobby-players">
          {room.players.map((player) => (
            <div key={player.id} className={player.connected ? "" : "offline"}>
              <Avatar value={player.avatar} />
              <strong>
                {player.name}
                {player.id === room.youId ? " (you)" : ""}
              </strong>
              <span>
                {player.id === room.hostId
                  ? "Host"
                  : player.connected
                    ? "Ready to doodle"
                    : "Reconnecting…"}
              </span>
            </div>
          ))}
          {Array.from(
            {
              length: Math.max(
                0,
                Math.min(4, room.settings.maxPlayers - room.players.length),
              ),
            },
            (_, i) => (
              <button
                key={i}
                className="empty-player"
                onClick={() => void invite()}
                aria-label="Invite another player"
              >
                <span>+</span>
                <strong>Your friend here</strong>
                <small>Send them the link</small>
              </button>
            ),
          )}
        </div>
        <div className="lobby-start">
          {host ? (
            <button
              className="button button-primary"
              disabled={online < 2 || busy || arena.status !== "connected"}
              onClick={async () => {
                setBusy(true);
                try {
                  await arena.start();
                } catch (err) {
                  onNotice((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Start the good times <ArrowRight size={17} />
            </button>
          ) : (
            <span className="waiting-host">
              <span className="live-dot" />
              Waiting for the host to start…
            </span>
          )}
          <span>
            {online < 2
              ? "You need at least 2 connected players to start."
              : `${online} players ready. This is going to be good.`}
          </span>
        </div>
      </div>
      <aside className="lobby-settings panel">
        <div className="panel-heading">
          <span>
            <Settings2 size={15} />
            Make it your game
          </span>
          <span className="badge">{host ? "HOST" : "ROOM RULES"}</span>
        </div>
        <div className="settings-fields">
          <label>
            Rounds
            <select
              value={room.settings.rounds}
              disabled={!host}
              onChange={(e) => void update("rounds", e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "round" : "rounds"}
                </option>
              ))}
            </select>
            <small>Everyone gets a turn each round.</small>
          </label>
          <label>
            Time to draw
            <select
              value={room.settings.drawSeconds}
              disabled={!host}
              onChange={(e) => void update("drawSeconds", e.target.value)}
            >
              {[30, 45, 60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </select>
          </label>
          <label>
            Room size
            <select
              value={room.settings.maxPlayers}
              disabled={!host}
              onChange={(e) => void update("maxPlayers", e.target.value)}
            >
              {[2, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
          </label>
          <label>
            Word collection
            <select
              value={room.settings.category}
              disabled={!host}
              onChange={(e) => void update("category", e.target.value)}
            >
              <option value="mixed">A little bit of everything</option>
              <option value="animals">Animals & creatures</option>
              <option value="objects">Everyday things</option>
              <option value="places">Places to be</option>
            </select>
          </label>
        </div>
        <div className="lobby-tip">
          <LockKeyhole size={17} />
          <p>
            A private room for your crew.
            <br />
            Only people with the code can join.
          </p>
        </div>
      </aside>
    </section>
  );
}
