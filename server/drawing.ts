import { CANVAS, type DrawInput } from "../shared/protocol.js";
import { settle } from "./game.js";
import { GameError, type Room } from "./model.js";
export function drawingAllowed(room: Room, id: string, turn: number, now = Date.now()): void {
  settle(room,now);
  if(room.phase!=="drawing" || room.drawerId!==id || room.turn!==turn || !room.players.some(p=>p.id===id&&p.connected)) throw new GameError("Only the current artist can draw.");
}
export function addStroke(room: Room, id: string, stroke: DrawInput, now = Date.now()): void {
  drawingAllowed(room,id,stroke.turn,now);
  if(room.strokes.some(s=>s.id===stroke.id)) return;
  if(room.strokes.length>=CANVAS.maxStrokes || room.strokes.reduce((n,s)=>n+s.points.length,0)+stroke.points.length>30_000) throw new GameError("Canvas limit reached. Undo or clear to keep drawing.");
  const {turn:_,...saved}=stroke;room.strokes.push(saved);room.lastActive=now;
}
export function undoStroke(room: Room,id: string,turn: number, now = Date.now()): void { drawingAllowed(room,id,turn,now);room.strokes.pop(); }
export function clearCanvas(room: Room,id: string,turn: number, now = Date.now()): void { drawingAllowed(room,id,turn,now);room.strokes=[]; }
