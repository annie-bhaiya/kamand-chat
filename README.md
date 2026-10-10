# Kamand Chat deployment

Public website: [Kamand Chat](https://kamandchat.highliftpages.com). See [deployment details](deploy/DEPLOYMENT.md) for the current resources and verification, and [custom domain setup](deploy/CUSTOM-DOMAIN.md) for DNS records.

The full application runs as two Linux containers: Next.js on port 3000 and Express/Socket.IO on port 4000. Existing hosted Supabase provides PostgreSQL, Auth and private object storage. Database migrations stay in `server/supabase/migrations` and are applied separately using the server's documented migration workflow.

## Docker

Install/start Docker Desktop with Linux containers. Configure `server/.env` from `server/.env.example` with your hosted Supabase URL and publishable key, then run from this directory:

```powershell
docker compose up --build -d --wait
docker compose ps
docker compose logs --tail 100
docker compose down
```

Open http://localhost:3000. Ports bind to local loopback. If local ports are occupied by development servers, stop those servers first. `NODE_ENV`, bind address and ports are explicitly overridden for production containers. `/health` checks process liveness; `/ready` additionally verifies the deployed Supabase schema. Local Supabase URLs using `127.0.0.1` must use `host.docker.internal` from containers, including Auth/Storage endpoints.

The Dockerfiles use locked `npm ci` installs, BuildKit dependency caching, separate compilation stages, Node 22 slim images, non-root users, health checks and direct Node startup for graceful shutdown. The frontend includes only Next.js standalone output and static assets; the backend includes only compiled code and production dependencies. Environment files, tests and host dependencies are excluded from build contexts. Compose bounds memory/CPU and rotates logs. The frontend's `NEXT_PUBLIC_API_URL` is a **build-time** setting: rebuild its image when the public API address changes.

## Azure

Requirements: PowerShell 7, Docker Desktop, Azure CLI, Bicep (`az bicep install`), a signed-in subscription (`az login`), and permissions to create resources and assign the registry pull role. Register `Microsoft.App`, `Microsoft.ContainerRegistry` and `Microsoft.ManagedIdentity` if your subscription has not enabled them.

```powershell
./deploy/azure.ps1 -Subscription '<subscription ID>' -Location centralindia
```

The script deploys repeatable Bicep infrastructure in `rg-pulse-chat` with the `kamand-chat` resource prefix and a standard Workload Profiles environment, builds Linux/amd64 images with the Azure API URL, pushes uniquely tagged images to a private Basic Azure Container Registry, deploys both Container Apps and verifies HTTPS health, readiness and the frontend. It reads only the Supabase URL and publishable key from `server/.env`; it never deploys SQL passwords or admin keys. Runtime keys use Container Apps secrets. Registry admin access is disabled; an assigned managed identity receives `AcrPull`. Backend CORS accepts `https://kamandchat.highliftpages.com` and the generated Azure frontend origin; redeployment preserves existing custom-domain bindings.

The backend stays at one replica because realtime fan-out and rate limits are currently process-local. It remains running to serve long-lived WebSockets. The frontend scales from zero to two replicas (cold starts are possible). Each replica requests 0.5 vCPU / 1 GiB. Configure a shared Redis adapter and shared rate limiting before increasing backend replicas. Azure HTTPS ingress forwards WebSockets; the application already uses WebSocket-only Socket.IO transport. Production CORS accepts only the deployed frontend origin.

Azure resources are billable: the registry has a standing cost and the API stays running. Supabase billing remains separate. Re-running the script updates the same infrastructure and apps. Inspect revisions/logs in the Azure portal; rollback by updating a Container App to a previous image tag. No Log Analytics workspace is created automatically; configure persistent logs/alerts using the logging features available for your Azure environment.

## Verification

Both applications' normal tests run without cloud credentials:

```powershell
npm.cmd --prefix server test
npm.cmd --prefix client test
docker compose build
```

Deployment checks do not create test accounts or modify production records. Run the documented live integration suite only against a dedicated development Supabase project.
