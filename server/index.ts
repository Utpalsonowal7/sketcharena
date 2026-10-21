import { readConfig } from "./config.js";
import { createHttp } from "./http.js";
import { createGateway } from "./gateway.js";
import { createHistory } from "./history.js";
import { createReplayCache } from "./replay-cache.js";
import { RoomStore } from "./rooms.js";
const config=readConfig();const store=new RoomStore();const history=createHistory(config.DATABASE_URL);const cache=createReplayCache(config.REDIS_URL);
await cache.connect();const http=createHttp(config,store);const gateway=createGateway(http,config.origins,store,async room=>{const results=await Promise.allSettled([history.save(room),cache.save(room)]);if(results.some(result=>result.status==="rejected"))console.error("A completed-match archive could not be saved.");},config.TRUST_PROXY==="true");
http.listen(config.PORT,"0.0.0.0",()=>console.log(`SketchArena game server listening on port ${config.PORT}`));
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;console.log("Stopping SketchArena…");const watchdog=setTimeout(()=>process.exit(1),10_000);watchdog.unref();await gateway.close();await Promise.allSettled([history.close(),cache.close()]);clearTimeout(watchdog);process.exit(0);}
process.on("SIGTERM",()=>void shutdown());process.on("SIGINT",()=>void shutdown());
