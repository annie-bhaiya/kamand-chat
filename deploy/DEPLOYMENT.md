# Current Azure deployment

On 11 October 2026, the live frontend scaling configuration was updated from zero to one minimum replica (maximum remains two). Revision `kamand-chat-web--0000002` is the latest ready revision. The public site returned HTTP 200 with a 2.79-second first-byte time in one spot check. This update keeps a frontend replica warm after idle; it uses the existing deployed image. The matching Bicep template now preserves that setting on redeployment. The new password-recovery application code has not yet been deployed. Local verification passed 70 backend and 47 frontend tests, both type checks, both application builds, the changed-auth lint check and Bicep compilation. Docker container verification was blocked by an unavailable Docker Desktop Linux engine. Hosted Supabase recovery redirects and email delivery have not been verified end to end.

Deployed and verified on 10 October 2026 using the signed-in **Azure for Students** subscription.

| Setting | Value |
| --- | --- |
| Region | Central India |
| Resource group | `rg-pulse-chat` |
| Environment | `kamand-chat-env` (standard Workload Profiles) |
| Registry | `pulseitz3kz4cs7p2k.azurecr.io` |
| Frontend image tag | `20261010002530` |
| Backend image tag | `20261010002530` |
| Public frontend | https://kamandchat.highliftpages.com |
| Azure frontend | https://kamand-chat-web.blackmeadow-4b6b3a7d.centralindia.azurecontainerapps.io |
| API | https://kamand-chat-api.blackmeadow-4b6b3a7d.centralindia.azurecontainerapps.io |
| Registry pull identity | `kamand-chat-pull` |

Both active revisions reported **Healthy**. Frontend, API `/health` and API `/ready` returned HTTP 200. Production CORS returned the exact deployed frontend origin. All nine referenced JavaScript assets loaded successfully, and the frontend bundle included the correct public Azure API URL. A WebSocket-only Socket.IO connection reached the API over HTTPS and correctly rejected anonymous access. This verifies transport and auth rejection; no authenticated production chat fixtures were created.

Local Docker Compose also reported both services healthy, with database readiness returning `ready`. Docker reported image sizes of 85,833,750 bytes for the API and 95,920,993 bytes for the local frontend. Runtime images run as `node` and exclude `.env` files, application source and TypeScript compiler packages. The images were built and published for Linux/amd64.

Validation: backend 55 tests passed; frontend 41 tests passed; both production builds passed; Bicep templates compiled; deployment script syntax passed; actual deployment script completed all endpoint checks.

The existing hosted Supabase project continues to provide database, authentication and storage. Azure resources are billable, including the standing registry and always-running backend. Backend replicas are limited to one until shared realtime delivery and rate limits are configured. Persistent cloud log retention and authenticated end-to-end production testing were not configured by this deployment.

The app branding, browser title, authentication screens, sidebar, settings preview and OpenAPI title use **Kamand Chat**. The requested custom-domain CNAME and verification TXT records resolve publicly. Azure issued managed certificate `mc-kamand-chat-en-kamandchat-highl-2891`, the domain binding reports `SniEnabled`, and **https://kamandchat.highliftpages.com** returned HTTP 200 with valid HTTPS. See `CUSTOM-DOMAIN.md` for the exact records and commands.

Verification on the custom domain loaded all nine JavaScript assets with the correct new API endpoint, passed API liveness/readiness and CORS checks, and reached the Socket.IO server over HTTPS WebSocket transport. The browser showed **Welcome to Kamand Chat** and **Campus gateway is online**. Both active app revisions reported Healthy. Superseded `pulse-chat-web` and `pulse-chat-api` apps were removed; the registry remains shared by the current deployment.

Redeploy from the repository root using `./deploy/azure.ps1`. Existing domain bindings are preserved. The resource group and registry retain their original infrastructure names to avoid recreating the registry. See the root README for settings, local Docker commands and operational guidance.

The 10 October deployment activated API revision `kamand-chat-api--0000002` and frontend revision `kamand-chat-web--0000001`. Both report successful provisioning and are the latest ready revisions. The custom domain and Azure frontend, API `/health`, and API `/ready` returned HTTP 200. The API runtime has `AUTH_EMAIL_REDIRECT_URL=https://kamandchat.highliftpages.com`, and both signup paths explicitly pass that destination to Supabase. The backend build and all 55 server tests passed. Hosted Supabase Site URL and redirect allowlist updates remain pending because no management token was available; use `supabase-auth-url.ps1` with management access. Confirmation email delivery and the final hosted redirect have not been tested end to end.
