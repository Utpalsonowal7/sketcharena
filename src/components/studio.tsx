"use client";
import { useRef,useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Stroke } from "@shared/protocol";
import { Brand } from "./brand";
import { CanvasBoard } from "./canvas-board";
import { DrawingToolbar } from "./drawing-toolbar";
import { downloadCanvas } from "@/lib/canvas";
export function Studio(){const [strokes,setStrokes]=useState<Stroke[]>([]);const [color,setColor]=useState("#8057e8");const [size,setSize]=useState(6);const [tool,setTool]=useState<"pen"|"eraser">("pen");const canvas=useRef<HTMLCanvasElement>(null);const [clear,setClear]=useState(false);
return <><header className="site-header shell"><Brand/><a className="button button-secondary button-small" href="/"><ArrowLeft size={14}/>Back to the game</a></header><main className="studio-main shell"><span className="eyebrow"><Pencil size={12}/>A LITTLE CREATIVE WARM-UP</span><h1>Your canvas. No pressure.</h1><p>Try out the tools. Draw something delightfully bad. This studio stays on your device and clears when you leave.</p><div className="board-panel panel"><CanvasBoard canvasRef={canvas} strokes={strokes} turn={0} enabled color={color} size={size} tool={tool} onStroke={async stroke=>{setStrokes(current=>[...current,stroke]);}} onError={()=>undefined}/><DrawingToolbar color={color} size={size} tool={tool} onColor={setColor} onSize={setSize} onTool={setTool} onUndo={()=>setStrokes(current=>current.slice(0,-1))} onClear={()=>setClear(true)} onExport={()=>{if(canvas.current)downloadCanvas(canvas.current);}} enabled/>{clear&&<div className="clear-confirm"><span>Start fresh?</span><button className="button button-secondary button-small" onClick={()=>setClear(false)}>Keep it</button><button className="button button-danger button-small" onClick={()=>{setStrokes([]);setClear(false);}}>Clear canvas</button></div>}</div><span className="studio-note">Psst. Every great doodle starts with a slightly wonky line.</span></main></>;}
