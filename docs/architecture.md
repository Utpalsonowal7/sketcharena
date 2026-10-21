# Architecture and event protocol

The Next.js app handles presentation, pointer input, and temporary guest credentials. The separate Node.js/Socket.IO server owns all room state, timing, permissions, and scores. Shared TypeScript interfaces describe the wire protocol.

## Lifecycle

`lobby → choosing → drawing → reveal → choosing … → finished`

Each connected starting player receives a turn per configured round. New guests may join only between matches; existing guests can resume during a match within 90 seconds of disconnecting. Selection lasts 12 seconds, then a word is chosen automatically. The drawing deadline or all connected guessers solving ends a turn. A six-second reveal precedes the next connected artist. A disconnected artist's turn is skipped rather than replayed.

Deadlines are checked inside commands and on a 250 ms maintenance tick. Late guesses never score. Published revisions ensure changes caused during rejected actions still reach clients on the next tick. The client derives its countdown from the server's absolute deadline and clock offset.

## Client commands

Every command requires an acknowledgment. Success is `{ok:true,data}`; failure is `{ok:false,error}`. Void success data may be omitted during serialization.

| Event                          | Payload                                   | Required authority                                             |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| `room:create`                  | name, avatar                              | Unbound socket                                                 |
| `room:join`                    | code, name, avatar                        | Unbound socket; room between matches                           |
| `room:resume`                  | roomCode, playerId, token                 | Valid guest credential                                         |
| `room:leave`                   | None                                      | Bound guest                                                    |
| `room:settings`                | rounds, drawSeconds, maxPlayers, category | Host between matches                                           |
| `game:start`                   | None                                      | Host; at least two connected guests                            |
| `game:choose`                  | word, turn                                | Current artist during selection                                |
| `chat:send`                    | text, turn                                | Bound guest; artists/solved players cannot chat during drawing |
| `canvas:stroke`                | id, turn, color, size, tool, points[]     | Current artist before deadline                                 |
| `canvas:undo` / `canvas:clear` | turn                                      | Current artist before deadline                                 |

## Server events and privacy

`room:state` contains a personalized snapshot. Secret words and word choices are sent only to the artist until reveal. Token hashes and socket identifiers never appear in public player records. Correct answers are replaced by success messages during drawing.

`room:state.strokes` is null when the existing canvas should be retained; it is an array for full synchronization, a new turn, undo, or clear. `canvas:stroke` carries individual accepted chunks only to members of the matching room. Clients deduplicate IDs and discard strokes for stale turns. `session:replaced` disconnects an older socket when the same guest resumes elsewhere.

## Drawing and scoring

Points use a canonical 960 × 640 coordinate system, rendered at double resolution. Pointer input is drawn immediately and emitted around every 60 ms or 100 points. The server validates ranges, tools, colors, sizes, and IDs, with limits of 250 points per chunk, 1,200 chunks and 30,000 points per turn. Undo removes one chunk. Reconnect restores the complete authoritative canvas.

Correct guesses earn a 100-point base, up to 400 time points, and a declining guess-order bonus starting at 100. Each correct guess awards the artist 75 points. Solved players cannot score again during the same turn.

Active rooms exist only in memory. PostgreSQL archives completed summaries; Redis caches the last completed-match drawing for 24 hours. Neither restores active games. Archive failures do not delay gameplay and have no durable retry queue.
