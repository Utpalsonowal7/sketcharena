"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  LogOut,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import { useArena } from "@/hooks/use-arena";
import { useSound } from "@/hooks/use-sound";
import { Brand } from "./brand";
import { Landing } from "./landing";
import { Lobby } from "./lobby";
import { GameRoom } from "./game-room";
export function SketchApp() {
  const arena = useArena();
  const [notice, setNotice] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const last = arena.room?.messages.at(-1);
  const sound = useSound(last?.id, last?.kind === "correct");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/?room=${arena.room?.code}`,
      );
      setNotice("Invite copied. Let the questionable drawings begin.");
    } catch {
      setNotice(`Share the room code: ${arena.room?.code}`);
    }
  }
  return (
    <>
      <header className="site-header shell">
        <Brand />
        {arena.room ? (
          <div className="room-header-info">
            <span className="room-header-code">
              ROOM{" "}
              <button onClick={() => void copyInvite()}>
                {arena.room.code}
                <Copy size={12} />
              </button>
            </span>
            <span className="header-note">
              <span className="live-dot" />
              {arena.room.players.filter((p) => p.connected).length} friends at
              the canvas
            </span>
          </div>
        ) : (
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How to play</a>
            <a href="/studio">
              Drawing studio <ArrowRight size={12} />
            </a>
          </nav>
        )}
        <div className="header-actions">
          {arena.room && (
            <button
              className="icon-button"
              onClick={sound.toggle}
              aria-label={sound.enabled ? "Mute sounds" : "Enable sounds"}
              title={sound.enabled ? "Mute sounds" : "Enable sounds"}
            >
              {sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {arena.room ? (
            <button
              className="leave-button"
              onClick={() => setConfirmLeave(true)}
            >
              <LogOut size={15} />
              <span>Leave room</span>
            </button>
          ) : (
            <span className="header-note">
              <span className="live-dot" />A good time is a doodle away.
            </span>
          )}
        </div>
      </header>
      {arena.room && arena.status !== "connected" && (
        <div className="connection-banner" role="status">
          <WifiOff size={15} />
          {arena.status === "recovering"
            ? "Restoring your room and drawing…"
            : "Connection lost. Trying to bring you back…"}
          <span>Your pencil is paused until you reconnect.</span>
        </div>
      )}
      {arena.room ? (
        <main className="room-main shell">
          <div className="room-welcome">
            <div>
              <span className="eyebrow">
                {arena.room.phase === "lobby"
                  ? "YOUR PRIVATE LITTLE GAME NIGHT"
                  : "GOOD GUESSES. EVEN BETTER COMPANY."}
              </span>
              <p>
                {arena.room.phase === "lobby"
                  ? "The best game nights start with “send me the link.”"
                  : "Remember: it’s the thought that counts. Probably."}
              </p>
            </div>
            <button
              className="button button-secondary button-small"
              onClick={() => void copyInvite()}
            >
              <Copy size={13} />
              Invite friends
            </button>
          </div>
          {arena.room.phase === "lobby" ? (
            <Lobby room={arena.room} arena={arena} onNotice={setNotice} />
          ) : (
            <GameRoom arena={arena} onNotice={setNotice} />
          )}
        </main>
      ) : (
        <Landing
          onCreate={arena.create}
          onJoin={arena.join}
          status={arena.status}
        />
      )}
      <footer className="site-footer shell">
        <Brand />
        <span>Made for friends. Open to terrible drawings.</span>
        <span>NO ART DEGREE REQUIRED ✦</span>
      </footer>
      {confirmLeave && (
        <div className="leave-confirm" role="alert">
          <strong>Leave this room?</strong>
          <p>Your seat will be released. You can join again between matches.</p>
          <div>
            <button
              className="button button-small button-secondary"
              onClick={() => setConfirmLeave(false)}
            >
              Stay here
            </button>
            <button
              className="button button-small button-danger"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                try {
                  await arena.leave();
                } catch (error) {
                  setNotice((error as Error).message);
                } finally {
                  setLeaving(false);
                  setConfirmLeave(false);
                }
              }}
            >
              Leave room
            </button>
          </div>
        </div>
      )}
      {(notice || arena.error) && (
        <div className="toast" role={arena.error ? "alert" : "status"}>
          <span>{arena.error || notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => {
              arena.clearError();
              setNotice("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
