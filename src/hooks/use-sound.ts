"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useSound(eventId:string|undefined,correct:boolean){
  const [enabled,setEnabled]=useState(false);const audio=useRef<AudioContext|null>(null);const previous=useRef(eventId);
  const toggle=useCallback(()=>{if(!audio.current&&typeof AudioContext!=="undefined")audio.current=new AudioContext();void audio.current?.resume();setEnabled(value=>!value);},[]);
  useEffect(()=>{if(previous.current===eventId)return;previous.current=eventId;const ctx=audio.current;if(!enabled||!correct||!ctx||ctx.state!=="running")return;[523.25,659.25,783.99].forEach((frequency,i)=>{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type="sine";osc.frequency.value=frequency;const start=ctx.currentTime+i*.07;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.08,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.3);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+.31);});},[eventId,correct,enabled]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return{enabled,toggle};
}
