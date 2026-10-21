import "dotenv/config";
import { z } from "zod";
export function readConfig(env: Record<string,string|undefined> = process.env) {
  const parsed=z.object({ PORT:z.coerce.number().int().min(1).max(65535).default(4000), CLIENT_ORIGIN:z.string().default("http://localhost:3000"), DATABASE_URL:z.string().default(""), REDIS_URL:z.string().default(""), TRUST_PROXY:z.enum(["true","false"]).default("false") }).parse(env);
  const origins=parsed.CLIENT_ORIGIN.split(",").map(s=>s.trim()).filter(Boolean);
  if(!origins.length || origins.some(origin=>!/^https?:\/\//.test(origin) || new URL(origin).origin!==origin)) throw new Error("CLIENT_ORIGIN must contain comma-separated origins without trailing slashes.");
  return {...parsed,origins};
}
