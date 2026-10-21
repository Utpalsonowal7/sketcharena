import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "node:http";
import type { RoomStore } from "./rooms.js";
import type { readConfig } from "./config.js";
export function createHttp(config: ReturnType<typeof readConfig>, store: RoomStore) {
  const app=express();app.disable("x-powered-by");if(config.TRUST_PROXY==="true") app.set("trust proxy",1);
  app.use(helmet());app.use(cors({origin:config.origins,methods:["GET"]}));
  app.get("/health",(_req,res)=>res.json({status:"ok",service:"sketcharena-game",uptime:Math.floor(process.uptime())}));
  app.get("/api/stats",(_req,res)=>res.json({rooms:store.rooms.size,players:[...store.rooms.values()].reduce((sum,r)=>sum+r.players.filter(p=>p.connected).length,0)}));
  app.use((_req,res)=>res.status(404).json({error:"Route not found"}));
  return createServer(app);
}
