import { guessScore, normalizeGuess } from "../shared/rules.js";
import { endTurn, settle } from "./game.js";
import { GameError, message, type Room } from "./model.js";
export function sendChat(room: Room, playerId: string, text: string, turn: number, now = Date.now()): void {
  settle(room,now);
  const player=room.players.find(p=>p.id===playerId);
  if(!player?.connected) throw new GameError("You are not in this room.");
  if(room.turn!==turn) throw new GameError("The turn changed. Send your message again.");
  if(room.phase==="drawing" && playerId===room.drawerId) throw new GameError("Let your drawing do the talking this turn!");
  if(room.phase==="drawing" && player.guessed) throw new GameError("You got it! Wait for the next turn before chatting.");
  if(room.phase==="drawing" && normalizeGuess(text)===normalizeGuess(room.word)) {
    player.guessed=true; const points=guessScore(room.endsAt-now,room.settings.drawSeconds*1000,room.guessOrder.length); player.score+=points;room.guessOrder.push(playerId);
    const drawer=room.players.find(p=>p.id===room.drawerId);if(drawer) drawer.score+=75;
    message(room,`guessed the word! +${points}`,"correct",player.name,player.id,now);
    if(room.players.filter(p=>p.connected && p.id!==room.drawerId).every(p=>p.guessed)) endTurn(room,now);
  } else message(room,text,"chat",player.name,player.id,now);
}
