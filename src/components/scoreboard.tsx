import { Check, Crown, Pencil, Trophy, Users } from "lucide-react";
import type { RoomView } from "@shared/protocol";
import { rankPlayers } from "@shared/rules";
import { Avatar } from "./avatar";
export function Scoreboard({ room }: { room: RoomView }) {
  return (
    <aside className="scoreboard panel">
      <div className="panel-heading">
        <span>
          <Users size={15} />
          The crew
        </span>
        <span className="muted">
          {room.players.filter((p) => p.connected).length}/
          {room.settings.maxPlayers}
        </span>
      </div>
      <div className="score-list">
        {rankPlayers(room.players).map((player, index) => (
          <div
            key={player.id}
            className={`score-player ${player.id === room.youId ? "is-you" : ""} ${player.guessed ? "has-guessed" : ""} ${!player.connected ? "offline" : ""}`}
          >
            <span className="player-rank">
              {index === 0 && player.score > 0 ? (
                <Trophy size={13} />
              ) : (
                index + 1
              )}
            </span>
            <Avatar value={player.avatar} />
            <div className="player-info">
              <strong>
                {player.name}
                {player.id === room.youId && <small>you</small>}
              </strong>
              <span>
                {!player.connected
                  ? "Reconnecting…"
                  : player.id === room.drawerId
                    ? "Drawing something…"
                    : `${player.score.toLocaleString()} points`}
              </span>
            </div>
            {player.id === room.drawerId ? (
              <Pencil size={13} className="player-status" />
            ) : player.guessed ? (
              <Check size={15} className="player-status" />
            ) : player.id === room.hostId ? (
              <Crown size={13} className="player-host" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="score-tip">
        <Trophy size={19} />
        <p>
          Fast guesses. Big points.
          <br />
          And bragging rights, obviously.
        </p>
      </div>
    </aside>
  );
}
