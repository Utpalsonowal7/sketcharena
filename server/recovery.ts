import { timingSafeEqual } from "node:crypto";
import type { Session } from "../shared/protocol.js";
import { endTurn } from "./game.js";
import { changed, GameError, message, type Room } from "./model.js";
import { hashToken, type RoomStore } from "./rooms.js";
export function resume(store: RoomStore, session: Session, socketId: string, now = Date.now()): string | null {
  const room=store.get(session.roomCode);const p=room.players.find(p=>p.id===session.playerId);
  if(!p || !/^[a-f0-9]{64}$/.test(session.token) || !timingSafeEqual(Buffer.from(p.resumeHash,"hex"),Buffer.from(hashToken(session.token),"hex"))) throw new GameError("This session expired. Join the room again.");
  if(p.disconnectedAt && now-p.disconnectedAt>90_000) throw new GameError("The reconnect window expired. Join again after this match.");
  const old=p.socketId;p.socketId=socketId;p.connected=true;p.disconnectedAt=null;changed(room,now);return old;
}
export function disconnect(room: Room, id: string, socketId: string, now = Date.now()): void {
  const p=room.players.find(p=>p.id===id);if(!p || p.socketId!==socketId) return;
  p.connected=false;p.socketId=null;p.disconnectedAt=now;message(room,`${p.name} disconnected. They can reconnect for 90 seconds.`,"system","Arena",undefined,now);
  if(room.hostId===id) room.hostId=room.players.find(x=>x.connected)?.id ?? id;
  if(room.drawerId===id) endTurn(room,now);
  const guessers=room.players.filter(x=>x.connected&&x.id!==room.drawerId);
  if(room.phase==="drawing" && guessers.length && guessers.every(x=>x.guessed)) endTurn(room,now);
}
export function leave(room: Room,id: string,socketId: string,now=Date.now()): void { disconnect(room,id,socketId,now);room.players=room.players.filter(p=>p.id!==id);changed(room,now); }
export function sweep(store: RoomStore,now=Date.now()): void {
  for(const room of store.rooms.values()) {
    if(!room.players.some(p=>p.connected) && now-room.lastActive>90_000) {store.rooms.delete(room.code);continue;}
    if(room.phase==="lobby" || room.phase==="finished") room.players=room.players.filter(p=>p.connected || !p.disconnectedAt || now-p.disconnectedAt<=90_000);
  }
}
