# First Commit chat backend

Node.js 22+ and TypeScript, Express 5, Supabase JavaScript SDK, PostgreSQL, Supabase Auth, private Supabase Storage, and Socket.IO. The Next.js frontend lives in `../client`; REST endpoints, SQL migrations, local configuration, and automated tests live in this folder.



## Endpoints

All protected routes require `Authorization: Bearer <session.access_token>`. JSON bodies use `Content-Type: application/json`. Successful responses contain `{ "data": ... }`; paginated responses additionally include `next_cursor`, which is `null` on the last page. Errors contain `{ "error": { "code": "...", "message": "..." }, "request_id": "..." }`. There is no response body for HTTP 204.

The machine-readable OpenAPI 3.1 specification is served at **GET `/openapi.json`** and can be imported into Postman or an OpenAPI viewer. Example requests are in `docs/api.http`.

| Method | Endpoint | Body / query | Behavior |
|---|---|---|---|
| GET | `/health` | None | Public liveness |
| GET | `/ready` | None | Public database readiness |
| POST | `/api/auth/register` | `email`, `password`, `display_name` | Create account; HTTP 201 |
| POST | `/api/auth/login` | `email`, `password` | Return user and session |
| POST | `/api/auth/refresh` | `refresh_token` | Return rotated tokens |
| POST | `/api/auth/logout` | Current `refresh_token` | Revoke current session; HTTP 204 |
| GET | `/api/auth/me` | None | Authentication user and profile |
| GET | `/api/users` | `q`, `after_id`, `limit` | Username prefix search, excluding caller |
| GET | `/api/users/:userId` | None | Public profile |
| PATCH | `/api/users/me` | `username`, `display_name`, and/or `avatar_key` | Update own profile |
| GET | `/api/conversations` | `cursor`, `limit` | Conversations by latest activity |
| POST | `/api/conversations/direct` | `user_id` | Create or retrieve a unique direct chat; HTTP 200 |
| POST | `/api/conversations/groups` | `title`, `member_ids` | Create group; HTTP 201 |
| GET | `/api/conversations/:id` | None | Conversation and members |
| PATCH | `/api/conversations/:id` | `title` | Owner renames group |
| POST | `/api/conversations/:id/members` | `user_id` | Owner adds/re-adds member; HTTP 201 |
| DELETE | `/api/conversations/:id/members/:userId` | None | Owner removes member, or member leaves |
| GET | `/api/conversations/:id/messages` | `before_seq` **or** `after_seq`, `limit` | Bounded history / reconnect catch-up |
| GET | `/api/conversations/:id/messages/search` | `q`, `before_seq`, `limit` | Full-text search within the conversation |
| POST | `/api/conversations/:id/messages` | `client_message_id`, `body`, `attachment_ids` | Save message or return retry result; HTTP 200 |
| POST | `/api/conversations/:id/read` | `seq` | Advance caller's read cursor |
| PATCH | `/api/messages/:id` | `body` | Sender edits message |
| DELETE | `/api/messages/:id` | None | Sender soft-deletes message |
| POST | `/api/messages/:id/reactions` | `emoji` | Add own reaction idempotently |
| DELETE | `/api/messages/:id/reactions` | `emoji` | Remove own reaction |
| POST | `/api/conversations/:id/attachments` | Multipart `file` | Upload private draft; HTTP 201 |
| GET | `/api/attachments/:id/url` | None | Get a 60-second download URL |
| DELETE | `/api/attachments/:id` | None | Delete caller's unused draft; HTTP 204 |

Groups contain 2–100 active members including the owner. The owner must remain a member. Direct chat memberships cannot be edited. Newly added/re-added group members can read the group's existing history; removed members immediately lose database access. This is an explicit history-sharing policy, enforced through membership checks.

Messages contain at most 10,000 characters and 10 attachment IDs. Generate a UUID once for `client_message_id`; retain it across retries. A repeated ID from the same sender returns the original saved message. Reusing it in another conversation is rejected. The server derives `sender_id` from authentication. A message must have text or an attachment.

`limit` defaults to 50 and is capped at 100. History is newest-first when using `before_seq` or no cursor. For catch-up, `after_seq` returns oldest-first; continue using the returned sequence cursor until `next_cursor` is null. Conversation cursors are opaque. Because conversation activity changes while paging, refresh the first inbox page when an update arrives and deduplicate conversation IDs.

Uploads are limited to 10 MiB (or the smaller `MAX_UPLOAD_BYTES` setting), with the permitted MIME types declared in the storage bucket and upload handler. Send an uploaded attachment by including its ID in a message. Drafts are visible only to their uploader; sent attachments become visible to active conversation members. Download URLs use attachment disposition and expire after 60 seconds. Soft-deleting a message hides its attachments and prevents issuance of new URLs; existing URLs can remain usable until expiry. File malware scanning and automatic orphan/retention cleanup are not implemented; `scan_status` starts as `unscanned` and is not presented as a safety guarantee.

## Frontend authentication and WebSockets

Keep the login session's access token and refresh token in your application's session mechanism. Every REST call uses the access token. Call `/api/auth/refresh` before expiry and replace **both** returned tokens. On logout, send the current refresh token with the access token and clear your client session. Registration usernames start as unique generated values; users can select a username using `/api/users/me` after sign-in.

The frontend should add `socket.io-client` and connect using the current access token:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  auth: { token: session.access_token },
});

socket.on('message:new', message => {
  // Upsert by message.id, and order within a conversation by message.seq.
});
socket.on('message:updated', message => { /* merge into history */ });
socket.on('message:deleted', message => { /* replace with deleted tombstone */ });
socket.on('conversation:updated', ({ conversation_id }) => { /* refetch conversation */ });

socket.emit('typing', { conversation_id, is_typing: true }, acknowledgement => {
  // { ok: true }, or { ok: false, error: '...' }
});

// After a token refresh:
socket.auth = { token: refreshedSession.access_token };
socket.disconnect().connect();
```

Socket.IO is a WebSocket-based protocol; a plain `WebSocket` client is insufficient. Connected users automatically join their own authenticated user/session rooms. Clients cannot choose arbitrary rooms. All messages are sent through the REST endpoint; the backend broadcasts only **after** database commit and only to active conversation members.

| Server event | Payload |
|---|---|
| `message:new` | Persisted message plus attachments |
| `message:updated` | Edited message plus attachments |
| `message:deleted` | Tombstone with ID, sequence and `deleted_at` |
| `message:reaction` | `message_id`, `user_id`, `emoji`, `removed` |
| `conversation:updated` | `conversation_id`; refetch conversation/inbox |
| `conversation:removed` | `conversation_id`; remove local conversation |
| `conversation:read` | `conversation_id`, `user_id`, `last_read_seq` |
| `typing` | `conversation_id`, `user_id`, `is_typing` |
| `session:expired` | No payload; refresh and reconnect |

Delivery events are hints, and clients may receive duplicates or miss events during downtime. On reconnect, catch up new messages by `after_seq`, refetch currently displayed history to reconcile edits/deletions/reactions, and refresh conversations/read positions. Clear typing state after a short local timeout. Typing updates are limited to once per second per socket. API logout disconnects that session's sockets; sessions revoked outside this API are checked every 30 seconds, and sockets also disconnect at access-token expiry. Requests verify tokens through Supabase and validate the session in `auth.sessions` on every request.

## Database and scaling

The schema has `profiles`, `conversations`, `direct_conversations`, `conversation_members`, `messages`, `attachments`, and `message_reactions`. All public tables enable RLS; anonymous callers have no application-table access. Membership grants conversation access. Public RPCs run as invokers and delegate atomic mutations to narrowly scoped private functions with verified identity/membership checks and a fixed search path. The `private` schema is never exposed through the Data API. No authorization decision uses editable user metadata.

Concurrent sends lock the conversation row before allocating `seq`, inserting the message, linking attachments, and advancing the conversation timestamp. Retry IDs also take a transaction advisory lock. Sending, group creation, and membership changes are atomic. Indexes cover message pagination, active membership, latest conversation activity, foreign keys, and full-text search. Attachments live in object storage, with metadata in PostgreSQL.

The runtime uses Supabase's HTTP Data API rather than opening a PostgreSQL connection for each user/socket. Begin with one Express instance. Set `REDIS_URL` to enable the Socket.IO Redis adapter for event fan-out and session disconnects across multiple instances. WebSocket-only clients, as shown above, avoid polling affinity; if enabling Socket.IO's polling fallback, configure sticky sessions at the load balancer. Configure a shared ingress rate limit for a cluster: the built-in HTTP limiter currently counts requests per process.

Measure p95 API latency, database CPU/I/O, lock wait time, message writes per second, active sockets, fan-out, and storage growth before scaling. Increase managed database capacity and add application instances first. Partition or shard messages only after measured database limits justify it. The per-conversation counter serializes writes in a hot room; very busy public rooms would need a different sequencer. Durable background delivery/outbox processing, push notifications, message retention, malware scanning, end-to-end encryption, and AI features are future additions. There is no claim of exactly-once event delivery or end-to-end encryption.

## Tests and production startup

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit --omit=dev
```

The normal test suite requires no credentials or Docker. It executes the application migration unchanged in PGlite (an embedded PostgreSQL engine) with fixtures for Supabase-owned Auth/Storage tables. Tests enforce RLS, session revocation, sender ownership, group permissions, read cursors, retry deduplication, deletion and attachment privacy. Protocol tests exercise the **real Supabase JavaScript SDK** against a local HTTP fixture and actual Express/Socket.IO transports. These tests do not substitute for testing your hosted Supabase project.

To run live integration tests **on a dedicated development project**, use the configured `DATABASE_URL` and enable the test for that command:

```powershell
$env:RUN_LIVE_TESTS = '1'
npm.cmd run test:integration
Remove-Item Env:RUN_LIVE_TESTS
```

The test creates three disposable, confirmed accounts, signs in through the API, exercises concurrent sends and retries, search, RLS directly through Supabase, file upload/download, WebSocket delivery, group removal and logout, then deletes its test files/conversations/users. SQL fixtures use the database connection only for test setup/cleanup; production registration uses Supabase Auth. Alternatively, a server-only `SUPABASE_SECRET_KEY` can provision fixtures through the admin API. Normal request handlers do not read it. Without `RUN_LIVE_TESTS=1`, the live test is explicitly skipped.

For the hosted session pooler, `DATABASE_SSL_CA=./certs/supabase-prod-ca-2021.crt` enables verified TLS using the bundled public Supabase Root 2021 certificate. The certificate comes from Supabase's official download endpoint; replace it when Supabase rotates its root certificate. Database credentials remain in the ignored `.env`.

For deployment, set `NODE_ENV=production`, `HOST=0.0.0.0`, `CLIENT_ORIGINS` to your actual frontend origin, and `TRUST_PROXY` to the number of trusted proxy hops. Use a Node host that supports long-lived WebSockets, HTTPS termination, and graceful SIGTERM shutdown.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Use `/ready` as the readiness probe. Production backups, restore testing, email provider settings, and monitoring are configured in your hosting/Supabase project.

## Campus tools and visual preferences

The client prioritizes student conversations and provides light/dark/system appearance, pine/clay/lake accents, text sizing, message density, and reduced motion. DM Sans is served locally. Run `npm install`, `npm run dev`, `npm test`, `npm run typecheck`, and `npm run lint` in `../client`; the default frontend is http://localhost:3000 and API is http://localhost:4000.

Calendar events, maintenance tickets, votes, status history and mess-menu edits persist in Supabase. Mess menus start with sample defaults; manager edits persist with room-scoped RLS. Mess rebate dates are a local visit draft, not a submitted claim.

Campus room identity is maintained by the private canonical catalogue migration `20261009033001_secure_campus_room_identity.sql`. Joining validates the slug and title and serializes creation. Anonymous execution is denied. Legacy groups remain intact and are not automatically adopted by matching titles; any legacy-room mapping requires an explicit database administrator decision. Privileged campus actions derive from verified institute email and room-specific rules, not editable usernames or display names.

## Development simulation

Run `npm run seed:simulation` in `server` with `NODE_ENV=development` and the configured `DATABASE_URL`, after applying migrations. It creates 27 club coordinators, 9 hostel caretakers, 5 mess managers and 3 students. Reruns reuse dummy credentials and refuse to overwrite non-demo accounts. Credentials are saved outside the repository at `../../chat-simulation-accounts.json` (the parent of the repository).

Start both apps with `npm run dev`, then open http://localhost:3000/simulate. Search by role or room and choose **Sign in**. The picker obtains a real Supabase session, then remounts the chat app. The server exposes `GET /simulate` (account catalogue without passwords) and `POST /simulate` with `{ "username": "demo_coord_kamandprompt" }`; `/api/simulate` is an equivalent frontend API path. Both paths return 404 outside explicit development mode. An unset server environment defaults to production; `npm run dev` explicitly sets development.

Managers are assigned canonical room slugs in administrator-controlled `app_metadata.campus_rooms`. The database enforces these assignments for campus room renaming and adding/removing students. Joining first never gives a student management rights. Ordinary group ownership remains unchanged. Open **Group Information** to search registered students and add/remove them. Club coordinators can create and approve their club events; caretakers and mess managers can resolve their assigned maintenance tickets. Mess managers can edit meal descriptions and special notices in the menu drawer.

Run `npx tsx scripts/verify-simulation.ts` to verify one real account of each role, membership revocation, event/ticket permissions and menu persistence. Pass `--all` to verify every account login. The script also checks persistence across server instances, concurrent venue bookings, rescheduling, votes and ticket history. It respects Auth rate limits, removes only its own newly created demo event/ticket fixtures, logs out its sessions, removes its test student's room memberships, and saves the same effective menu contents.

## Persistent calendar and maintenance

Mess menus use `mess_menu_days`, keyed by `(room_slug, weekday)` with ISO weekdays Monday=1 through Sunday=7 and separate breakfast, lunch, dinner and serving-note columns. Migration `20261009063004_mess_menu_weekdays.sql` splits the uploaded weekly schedules into 35 records and preserves shared daily items. The old `mess_menus` table remains an import snapshot for recovery; active reads and edits use the weekday table.

`GET /api/campus/messes/:messSlug/menu` returns only today's menu in `Asia/Kolkata`. Add `?weekday=1` through `7` to browse another recurring day. A missing schedule returns 404 rather than a sample menu. Manager `PUT` requests require `weekday`, `breakfast`, `lunch`, `dinner`, and optional `specialNotice`; edits affect only that mess and weekday. The drawer opens on today, supports a day selector and Back to today, and resets on reopening.

Apply `20261009035734_persist_calendar_maintenance.sql` with `npm run db:apply` (or the usual Supabase migration workflow). The migration creates `campus_events`, `maintenance_tickets`, `maintenance_ticket_votes` and `maintenance_ticket_history`, and adds canonical scope metadata to the private room catalogue. The hosted project already has this migration applied. New feeds start empty; bundled samples are not represented as real reports or reservations. The pre-migration sample feed was backed up in the repository's parent directory as `chat-campus-pre-persistence.json`.

Calendar list/filter/create/status endpoints retain their existing paths. `PATCH /api/campus/events/:id` edits or reschedules an event using the same fields as creation. Status supports `cancelled`; cancelling releases the venue. Database advisory locks serialize reservation changes per venue/date, including status approvals. Overlapping submissions remain stored as `conflict`, and an approval cannot bypass an existing reservation. IDs are UUIDs. Responses include `roomSlug`, `updatedAt` and authoritative `canManage` values.

Maintenance endpoints require authentication. Reports are visible to the reporter, residents or joined members of that hostel/mess scope, and its assigned managers. Only the scope's caretakers/managers can change status. Votes are unique per account and updated atomically; voter identities are private and `upvotedBy` includes only the caller when they have voted. History and resolution timestamps persist; reopening clears the resolution timestamp. Scope/campus/creator are resolved from the canonical catalogue and authenticated account. API callers cannot directly insert or update tables to bypass these rules.

Public RPCs are security invoker wrappers; privileged implementations remain in `private`, validate active sessions and enforce the relevant scope. All four tables have RLS. `campus:changed` Socket.IO messages contain only a refresh hint (`events` or `tickets`), and clients fetch permitted records through the API. Open panels also refresh on reconnect, window focus and every 30 seconds.
