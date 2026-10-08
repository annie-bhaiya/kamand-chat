# First Commit chat backend

Node.js 22+ and TypeScript, Express 5, Supabase JavaScript SDK, PostgreSQL, Supabase Auth, private Supabase Storage, and Socket.IO. There is no frontend in this workspace yet. REST endpoints, the SQL migration, local configuration, and automated tests live in this folder.



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
