export const AVATARS = ["fox", "cat", "frog", "bear", "bunny", "panda", "owl", "dog"] as const;
export type Avatar = typeof AVATARS[number];
export const COLORS = ["#242333", "#ffffff", "#f2556c", "#ff9a3d", "#ffcc51", "#55b98a", "#46a7e7", "#8057e8", "#e57ac0", "#93654b"] as const;
export const CANVAS = { width: 960, height: 640, maxStrokes: 1200, maxPoints: 250 } as const;
export type Phase = "lobby" | "choosing" | "drawing" | "reveal" | "finished";
export interface Settings { rounds: number; drawSeconds: number; maxPlayers: number; category: "mixed" | "animals" | "objects" | "places"; }
export const DEFAULT_SETTINGS: Settings = { rounds: 2, drawSeconds: 60, maxPlayers: 8, category: "mixed" };
export interface Point { x: number; y: number; }
export interface Stroke { id: string; color: string; size: number; tool: "pen" | "eraser"; points: Point[]; }
export interface Player { id: string; name: string; avatar: Avatar; score: number; connected: boolean; guessed: boolean; }
export interface ChatMessage { id: string; kind: "chat" | "system" | "correct"; playerId?: string; name: string; text: string; at: number; }
export interface RoomView {
  code: string; revision: number; hostId: string; youId: string; phase: Phase;
  settings: Settings; players: Player[]; drawerId: string | null; round: number;
  turn: number; turnNumber: number; totalTurns: number; endsAt: number; serverNow: number;
  hint: string; word: string | null; choices: string[]; strokes: Stroke[]; messages: ChatMessage[];
}
export interface Session { roomCode: string; playerId: string; token: string; }
export interface Identity { name: string; avatar: Avatar; }
export interface JoinInput extends Identity { code: string; }
export interface DrawInput extends Stroke { turn: number; }
export type Ack<T = void> = (result: { ok: true; data: T } | { ok: false; error: string }) => void;
export interface ClientEvents {
  "room:create": (input: Identity, ack: Ack<Session>) => void;
  "room:join": (input: JoinInput, ack: Ack<Session>) => void;
  "room:resume": (input: Session, ack: Ack<Session>) => void;
  "room:leave": (ack: Ack) => void;
  "room:settings": (input: Settings, ack: Ack) => void;
  "game:start": (ack: Ack) => void;
  "game:choose": (input: { word: string; turn: number }, ack: Ack) => void;
  "chat:send": (input: { text: string; turn: number }, ack: Ack) => void;
  "canvas:stroke": (input: DrawInput, ack: Ack) => void;
  "canvas:undo": (input: { turn: number }, ack: Ack) => void;
  "canvas:clear": (input: { turn: number }, ack: Ack) => void;
}
export type RoomUpdate = Omit<RoomView, "strokes"> & { strokes: Stroke[] | null };
export interface ServerEvents { "room:state": (view: RoomUpdate) => void; "canvas:stroke": (stroke: DrawInput) => void; "session:replaced": () => void; }
