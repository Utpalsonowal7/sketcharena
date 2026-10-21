# Security and operations

## Deployment

Run one game-server process. Do not use multiple replicas or PM2 cluster mode without adding coordinated room ownership. The Nginx configuration supports polling and WebSocket upgrade. Use HTTPS for public traffic and set exact allowed frontend origins.

CORS/origin checks are browser boundaries, not authentication. Non-browser clients may omit Origin. Every command is checked independently against its bound guest session and room authority. Invite links contain only a room code; never add resume tokens to URLs or logs.

Set TRUST_PROXY=true only behind one trusted proxy and block direct backend access. The supplied Nginx appends the effective client IP; the server trusts the closest forwarded address. Review this policy before adding another proxy or CDN.

## Resource controls

- Maximum 500 rooms and 12 members per room.
- Maximum 32 KiB socket packet size.
- Names: 2–18 allowed characters. Chat: 160 characters and 100 recent messages per room.
- Connection attempts: 30/minute per effective IP. Room attempts: 20/minute per IP.
- Per-socket actions: 30/second; chat: 3/second; drawing chunks: 45/second; undo: 5/second; clear: 2/second.
- Canvas: 1,200 chunks and 30,000 points per turn.
- Empty disconnected rooms expire after 90 seconds. Connected idle lobbies remain until guests leave/disconnect.

Limits are process-local basic abuse controls, not a substitute for edge protection or moderation. Groups behind one shared IP may require tuned connection limits.

## Persistence and health

GET /health reports process liveness; GET /api/stats returns only aggregate counts. Health does not certify optional archive-service availability. Match inserts are idempotent by UUID. Apply database backups, access controls, and a retention policy: completed guest names stay in PostgreSQL until an operator removes them.

Redis archive entries expire after 24 hours and contain the final revealed word and last drawing. Neither archive contains resume credentials. Failures are logged without connection strings. Guaranteed archives require a durable outbox/queue beyond this version.

SIGINT/SIGTERM closes sockets and optional clients with a ten-second watchdog. Active matches are lost during restart or rolling replacement, so announce maintenance to players first.

## Validation

Run npm run typecheck, npm test, and npm run build. The realtime test uses actual local WebSocket clients to check room isolation, drawing authority, word privacy, and session recovery.

Before launch, check mobile touch input, portrait layout, tab suspension, copy-link permissions, audio opt-in, disconnect/reconnect, host departure, and a complete match using two independent browser sessions. Backend tests are not browser QA. Docker and optional database/cache services also need runtime validation on the target deployment host.
