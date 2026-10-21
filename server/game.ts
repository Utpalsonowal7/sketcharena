import { randomUUID } from "node:crypto";
import { chooseWords } from "../shared/words.js";
import { changed, GameError, message, type Room } from "./model.js";
export function startGame(room: Room, playerId: string, now = Date.now()): void {
  if(room.hostId!==playerId) throw new GameError("Only the host can start a match.");
  if(!["lobby","finished"].includes(room.phase)) throw new GameError("A match is already running.");
  const players=room.players.filter(p=>p.connected);
  if(players.length<2) throw new GameError("Invite at least one friend to start.");
  room.players.forEach(p=>{p.score=0;p.guessed=false;});
  room.order=Array.from({length:room.settings.rounds},()=>players.map(p=>p.id)).flat();
  room.turnIndex=-1; room.used.clear(); room.matchId=randomUUID();
  message(room,"A new match is starting!","system","Arena",undefined,now); nextTurn(room,now);
}
export function nextTurn(room: Room, now: number): void {
  do { room.turnIndex++; } while(room.turnIndex<room.order.length && !room.players.some(p=>p.id===room.order[room.turnIndex] && p.connected));
  if(room.turnIndex>=room.order.length) { room.phase="finished";room.endsAt=0;message(room,"Match complete. What a masterpiece!","system","Arena",undefined,now); return; }
  room.drawerId=room.order[room.turnIndex]; room.turn++; room.round=Math.floor(room.turnIndex/(room.order.length/room.settings.rounds))+1;
  room.phase="choosing";room.endsAt=now+12_000;room.word="";room.strokes=[];room.guessOrder=[];room.hintLevel=0;
  room.players.forEach(p=>p.guessed=false);room.choices=chooseWords(room.settings.category,room.used);
  const name=room.players.find(p=>p.id===room.drawerId)?.name;
  message(room,`${name} is choosing a word.`,"system","Arena",undefined,now);
}
export function chooseWord(room: Room, id: string, word: string, turn: number, now = Date.now()): void {
  settle(room,now);
  if(room.phase!=="choosing" || room.drawerId!==id || room.turn!==turn || !room.choices.includes(word)) throw new GameError("That word choice is no longer available.");
  room.word=word;room.used.add(word);room.choices=[];room.phase="drawing";room.startedAt=now;room.endsAt=now+room.settings.drawSeconds*1000;
  message(room,"The clock is ticking. Start guessing!","system","Arena",undefined,now);
}
export function endTurn(room: Room, now: number): void {
  if(room.phase!=="drawing" && room.phase!=="choosing") return;
  room.phase="reveal";room.endsAt=now+6_000;message(room,room.word ? `The word was “${room.word}”.` : "The turn was skipped.","system","Arena",undefined,now);
}
export function settle(room: Room, now = Date.now()): void {
  if(room.phase==="drawing") {
    const ratio=(now-room.startedAt)/(room.settings.drawSeconds*1000); const level=ratio>=.72?2:ratio>=.4?1:0;
    if(level!==room.hintLevel) {room.hintLevel=level;changed(room,now);}
  }
  if(!room.endsAt || now<room.endsAt) return;
  if(room.phase==="choosing") { const word=room.choices[0]; room.word=word;room.used.add(word);room.choices=[];room.phase="drawing";room.startedAt=now;room.endsAt=now+room.settings.drawSeconds*1000;message(room,"A word was picked automatically.","system","Arena",undefined,now); }
  else if(room.phase==="drawing") endTurn(room,now);
  else if(room.phase==="reveal") nextTurn(room,now);
}
