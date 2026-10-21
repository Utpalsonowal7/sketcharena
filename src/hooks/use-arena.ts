"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientEvents, DrawInput, Identity, RoomView, ServerEvents, Session, Settings } from "@shared/protocol";
type GameSocket=Socket<ServerEvents,ClientEvents>;
const KEY="sketcharena.session.v1";
export function useArena(){
  const [room,setRoom]=useState<RoomView|null>(null);const [status,setStatus]=useState("connecting");const [error,setError]=useState("");const [offset,setOffset]=useState(0);
  const socketRef=useRef<GameSocket|null>(null);const sessionRef=useRef<Session|null>(null);const roomRef=useRef(room);roomRef.current=room;
  const save=useCallback((value:Session|null)=>{sessionRef.current=value;try{if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY);}catch{setError("This browser cannot save reconnect sessions. Keep this tab open while playing.");}},[]);
  const ask=useCallback(<T,>(event:string,input?:unknown):Promise<T>=>{
    const socket=socketRef.current;if(!socket?.connected)return Promise.reject(new Error("You’re offline. Wait for the connection to return."));
    return new Promise((resolve,reject)=>{
      const ack=(err:Error|null,result:{ok:true;data:T}|{ok:false;error:string})=>{if(err)reject(new Error("The server didn’t reply. Check your connection and try again."));else if(!result||!result.ok)reject(new Error(result?.error||"Unexpected server response."));else resolve(result.data);};
      // Dynamic event dispatch stays inside this boundary; public actions below are typed.
      const sender=socket.timeout(8000) as unknown as {emit:(event:string,...args:unknown[])=>void};sender.emit(event,...(input===undefined?[ack]:[input,ack]));
    });
  },[]);
  useEffect(()=>{
    try{const raw=sessionStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(typeof parsed.token==="string"&&typeof parsed.playerId==="string"&&typeof parsed.roomCode==="string")sessionRef.current=parsed;}}catch{/* A restricted storage environment can still play. */}
    const socket:GameSocket=io(process.env.NEXT_PUBLIC_GAME_SERVER_URL||(process.env.NODE_ENV==="development"?"http://localhost:4000":undefined),{autoConnect:false,reconnection:true,reconnectionDelay:700,reconnectionDelayMax:5000,timeout:8000});socketRef.current=socket;
    socket.on("connect",()=>{
      const cached=sessionRef.current;if(!cached){setStatus("connected");return;}setStatus("recovering");
      void ask<Session>("room:resume",cached).then(s=>{save(s);setStatus("connected");}).catch(err=>{save(null);setRoom(null);setStatus("connected");setError(err.message);});
    });
    socket.on("disconnect",()=>setStatus("disconnected"));socket.on("connect_error",()=>setStatus("disconnected"));
    socket.on("room:state",view=>{setOffset(Date.now()-view.serverNow);setRoom(previous=>({...view,strokes:view.strokes??(previous?.code===view.code&&previous.turn===view.turn?previous.strokes:[])}));});
    socket.on("canvas:stroke",stroke=>setRoom(previous=>{if(!previous||previous.turn!==stroke.turn||previous.strokes.some(s=>s.id===stroke.id))return previous;return{...previous,strokes:[...previous.strokes,stroke]};}));
    socket.on("session:replaced",()=>{save(null);setRoom(null);setError("This session was opened in another tab. Join again to play here.");socket.disconnect();});
    socket.connect();return()=>{socket.removeAllListeners();socket.disconnect();socketRef.current=null;};
  },[ask,save]);
  const connect=useCallback(async()=>{
    const socket=socketRef.current;if(!socket)throw new Error("The app is still opening. Try again.");if(socket.connected){if(status==="recovering")throw new Error("Restoring your room. Give it a moment.");return;}
    await new Promise<void>((resolve,reject)=>{const cleanup=()=>{clearTimeout(timer);socket.off("connect",done);socket.off("connect_error",fail);};const done=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error("Cannot reach the game server. Make sure it is running and try again."));};const timer=setTimeout(fail,8500);socket.once("connect",done);socket.once("connect_error",fail);socket.connect();});
  },[status]);
  return {room,status,error,offset,clearError:()=>setError(""),
    create:async(identity:Identity)=>{await connect();save(await ask<Session>("room:create",identity));},
    join:async(identity:Identity,code:string)=>{await connect();save(await ask<Session>("room:join",{...identity,code}));},
    leave:async()=>{try{if(socketRef.current?.connected)await ask<void>("room:leave");}finally{save(null);setRoom(null);socketRef.current?.disconnect();socketRef.current?.connect();}},
    start:()=>ask<void>("game:start"),settings:(settings:Settings)=>ask<void>("room:settings",settings),
    choose:(word:string)=>ask<void>("game:choose",{word,turn:roomRef.current?.turn??0}),
    chat:(text:string)=>ask<void>("chat:send",{text,turn:roomRef.current?.turn??0}),
    stroke:(stroke:DrawInput)=>ask<void>("canvas:stroke",stroke),
    undo:()=>ask<void>("canvas:undo",{turn:roomRef.current?.turn??0}),clear:()=>ask<void>("canvas:clear",{turn:roomRef.current?.turn??0}),
  };
}
export type Arena=ReturnType<typeof useArena>;
