import { z } from "zod";
import { AVATARS, CANVAS, COLORS } from "../shared/protocol.js";
export const identitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(18)
      .regex(
        /^[\p{L}\p{N} ._-]+$/u,
        "Use letters, numbers, spaces, dots, underscores or hyphens.",
      ),
    avatar: z.enum(AVATARS),
  })
  .strict();
export const joinSchema = identitySchema.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{6}$/),
});
export const resumeSchema = z
  .object({
    roomCode: z.string().regex(/^[A-Z2-9]{6}$/),
    playerId: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const turnSchema = z.object({ turn: z.number().int().nonnegative() });
export const chooseSchema = turnSchema
  .extend({ word: z.string().min(1).max(40) })
  .strict();
export const chatSchema = turnSchema
  .extend({ text: z.string().trim().min(1).max(160) })
  .strict();
export const settingsSchema = z
  .object({
    rounds: z.number().int().min(1).max(5),
    drawSeconds: z.number().int().min(30).max(120),
    maxPlayers: z.number().int().min(2).max(12),
    category: z.enum(["mixed", "animals", "objects", "places"]),
  })
  .strict();
export const strokeSchema = turnSchema
  .extend({
    id: z.uuid(),
    color: z.enum(COLORS),
    size: z.number().int().min(2).max(40),
    tool: z.enum(["pen", "eraser"]),
    points: z
      .array(
        z
          .object({
            x: z.number().finite().min(0).max(CANVAS.width),
            y: z.number().finite().min(0).max(CANVAS.height),
          })
          .strict(),
      )
      .min(1)
      .max(CANVAS.maxPoints),
  })
  .strict();
