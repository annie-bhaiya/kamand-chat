# Current Azure deployment

Deployed and verified on 9 October 2026 using the signed-in **Azure for Students** subscription.

| Setting | Value |
| --- | --- |
| Region | Central India |
| Resource group | `rg-pulse-chat` |
| Environment | `pulse-chat-env` |
| Registry | `pulseitz3kz4cs7p2k.azurecr.io` |
| Image tag | `20261009122738` |
| Frontend | https://pulse-chat-web.salmonriver-faba0caf.centralindia.azurecontainerapps.io |
| API | https://pulse-chat-api.salmonriver-faba0caf.centralindia.azurecontainerapps.io |
| Registry pull identity | `pulse-chat-pull` |

Both active revisions reported **Healthy**. Frontend, API `/health` and API `/ready` returned HTTP 200. Production CORS returned the exact deployed frontend origin. All nine referenced JavaScript assets loaded successfully, and the frontend bundle included the correct public Azure API URL. A WebSocket-only Socket.IO connection reached the API over HTTPS and correctly rejected anonymous access. This verifies transport and auth rejection; no authenticated production chat fixtures were created.

Local Docker Compose also reported both services healthy, with database readiness returning `ready`. Docker reported image sizes of 85,833,750 bytes for the API and 95,920,993 bytes for the local frontend. Runtime images run as `node` and exclude `.env` files, application source and TypeScript compiler packages. The images were built and published for Linux/amd64.

Validation: backend 55 tests passed; frontend 41 tests passed; both production builds passed; Bicep templates compiled; deployment script syntax passed; actual deployment script completed all endpoint checks.

The existing hosted Supabase project continues to provide database, authentication and storage. Azure resources are billable, including the standing registry and always-running backend. Backend replicas are limited to one until shared realtime delivery and rate limits are configured. Persistent cloud log retention and authenticated end-to-end production testing were not configured by this deployment.

Redeploy from the repository root using `./deploy/azure.ps1`. See the root README for settings, local Docker commands and operational guidance.
