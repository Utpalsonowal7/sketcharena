# SketchArena ✏️

**Bad drawings. Great guesses.** A real-time multiplayer drawing game built with Next.js, TypeScript, React, Node.js, Express, and Socket.IO. PostgreSQL match archives and Redis replay caching are optional.

## Start locally

Use **Node.js 22+** and npm. No paid APIs or external services are needed for local play.

```bash
git clone https://github.com/Utpalsonowal7/sketcharena.git
cd sketcharena
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:3000**. The game server runs on port **4000**. Pick a nickname and avatar, create a room, and copy its invite link. A friend can join using that link or the six-character room code. The host can start once at least two players are connected.

For testing, open two independent new tabs with different nicknames. Duplicating a tab may copy its sessionStorage and replace the original player's session. The practice studio at **/studio** works without a game-server connection.

## Features

- Private rooms for **2–12 players**, invite links, nicknames, and eight avatars.
- Host settings: 1–5 rounds, 30–120 seconds per drawing, three word categories.
- Three word choices, automatic selection after 12 seconds, progressive hints, and six-second reveals.
- Live canvas updates using normalized stroke chunks, with immediate local feedback.
- Colors, brush sizes, eraser, undo, clear confirmation, and PNG download.
- Guessing chat, server-computed speed points, artist bonuses, ranked scores, and rematches.
- A **90-second reconnect window** with complete room/drawing restoration; automatic host transfer.
- Responsive layouts, keyboard shortcuts, optional sound, and a solo practice studio.
- Domain tests and real multi-client Socket.IO integration tests.
- Docker Compose, a WebSocket-capable Nginx proxy, and GitHub Actions CI.

## Controls

| Action | Control |
| --- | --- |
| Draw | Mouse, stylus, or touch |
| Brush / eraser | `B` / `E` |
| Undo latest stroke chunk | `Ctrl+Z` / `Cmd+Z`, or toolbar |
| Submit guess | Enter in the chat field |
| Save a drawing | Download button |
| Sound | Speaker button; muted initially |

Drawings use a canonical **960 × 640** coordinate system and render at double resolution. Long gestures are streamed as chunks; undo removes one chunk. Drawing and guessing pause while disconnected.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Frontend and game server together |
| `npm run dev:web` / `npm run dev:server` | Individual development processes |
| `npm run typecheck` | Generate Next.js route types and check frontend/backend types |
| `npm test` | Domain and live multiplayer tests |
| `npm run build` | Compile the backend and build the Next.js frontend |
| `npm run start:web` / `npm run start:server` | Individual production processes |
| `npm run db:migrate` | Create the optional match-history database schema |

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_GAME_SERVER_URL` | Browser connection URL. Development defaults to localhost:4000; production defaults to same origin. Set before building when using separate hosts. |
| `PORT` | Game-server port, default 4000 |
| `CLIENT_ORIGIN` | Exact allowed browser origins, comma-separated, without trailing slashes; default localhost:3000 |
| `DATABASE_URL` | Optional PostgreSQL connection URL |
| `REDIS_URL` | Optional Redis connection URL |
| `TRUST_PROXY` | Defaults to false; enable only behind one trusted proxy with direct backend access blocked |

Restart the server after environment changes. Rebuild the frontend when changing public variables. Never commit real credentials or `.env` files.

With `DATABASE_URL` set, run `npm run db:migrate` before starting. Completed matches archive final names, avatars, scores, round count, and completion time. Inserts are idempotent. There is no public history endpoint; inspect the database for administrative reporting.

With `REDIS_URL` set, the final drawing of completed matches is cached for 24 hours. This is an archive building block, not an implemented replay browser or shared active-room store. Archive writes are best effort, with failure logging rather than a durable retry queue.

## Docker

```bash
cp .env.docker.example .env
docker compose up --build -d
```

Open **http://localhost:8080**. Compose starts PostgreSQL, Redis, a one-shot migration, the game server, the frontend, and Nginx. The proxy routes `/socket.io/` to the game service and exposes its health response at `/game-health`. Database/cache ports stay internal. Named volumes retain their data.

For public deployment, replace the development database password, set `CLIENT_ORIGIN` to your exact HTTPS domain, and terminate TLS at a trusted proxy. The supplied HTTP configuration is for local development or use behind HTTPS termination. URL-encode special characters in database passwords used in connection URLs. Inspect logs with `docker compose logs -f game web`.

For separate hosting, set `NEXT_PUBLIC_GAME_SERVER_URL` to the public HTTPS game-server URL before building the frontend. Host the backend as a **persistent Node process supporting WebSockets**, with the frontend's origin allowed. Ordinary short-lived Next.js API/serverless functions do not host this game server.

## Architecture and limitations

See [architecture and event protocol](docs/architecture.md) and [security and operations](docs/operations.md).

This version uses **one authoritative game-server process**. Active rooms, timers, resume credentials, and in-progress drawings live in memory and are lost on restart. Redis does not make multiple game-server replicas safe. Scaling requires coordinated room ownership and state transitions as well as an appropriate Socket.IO adapter and load-balancer configuration.

Guest resume credentials stay in sessionStorage. They are temporary guest credentials, not account logins. The game has private rooms and basic rate controls; public matchmaking, spectator mode, durable in-progress saves, and a moderation console are outside this version.

## Validation

```bash
npm ci
npm run typecheck
npm test
npm run build
```

The integration test binds a temporary loopback port and opens real WebSocket clients. CI runs these checks for pushes and pull requests. Test actual mobile/touch browsers and two independent browser sessions before public launch; backend tests do not replace browser QA.

```text
src/app/          Next.js pages, metadata, responsive styles
src/components/   Landing, lobby, drawing, chat, scoreboard, game view
src/hooks/        Realtime guest sessions and optional audio
src/lib/          Canvas rendering and downloads
shared/           Typed event contracts, words, scoring, hints
server/           Room engine, gateway, validation, optional archives
tests/            Domain and live multiplayer tests
docs/             Protocol, architecture, operating limits
```

Icons: [Lucide](https://lucide.dev/). The interface uses system fonts and browser emoji; no external image services or uploaded artwork are required.
