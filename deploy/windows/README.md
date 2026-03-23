# Windows Hosting

This folder contains the Windows laptop hosting assets for the multiplayer stack:

- `Cloudflare Tunnel -> Caddy -> Angular static app + Nest go-server`
- Public URL: `https://go.<your-domain>/`
- Shared room URL: `https://go.<your-domain>/online/room/:roomId`
- Local-only origin path: `cloudflared -> http://localhost:80 -> Caddy -> 127.0.0.1:3000`

## Source layout

- Frontend app: `apps/go-web`
- Backend app: `apps/go-server`
- Shared frontend libraries: `libs/go/*`
- Shared room contracts: `go/contracts`

## Runtime behavior

- `go-server` stays bound to `127.0.0.1:3000`
- Caddy binds to `127.0.0.1:80` and is the only local HTTP entrypoint
- No inbound port forwarding is required; `cloudflared` makes the outbound tunnel connection to Cloudflare
- Room state is ephemeral: the Nest `RoomsService` stores rooms in memory, so a `gx-go-server` restart clears active rooms
- Fully offline rooms are pruned after 1 hour

## Prerequisites

- The repo remains at `C:\software-dev\gx.go`
- The domain is already managed in Cloudflare
- Run PowerShell as Administrator for all service install/uninstall steps
- Install Node.js so `C:\Program Files\nodejs\node.exe` exists
- Place `caddy.exe` at `C:\Services\caddy\caddy.exe`
- Download `WinSW-x64.exe` into this folder as `deploy\windows\WinSW-x64.exe`
- Install `cloudflared` on the laptop
- Install workspace dependencies from the repo root:

```powershell
npm install
```

## Included files

- `Caddyfile`: serves `dist/apps/go-web/browser` and proxies `/api/*` and `/socket.io/*` to `127.0.0.1:3000`
- `go-server-service.xml`: WinSW definition for the Nest backend service
- `caddy-service.xml`: WinSW definition for the Caddy service
- `install-services.ps1`: builds both Nx apps, installs/starts the WinSW services, and waits for local health checks
- `restart-services.ps1`: rebuilds and restarts the local services after a code change
- `uninstall-services.ps1`: removes the WinSW services from Windows

## One-time local service install

From an elevated PowerShell window:

```powershell
Set-Location C:\software-dev\gx.go\deploy\windows
.\install-services.ps1
```

What the script does:

- Builds `go-web` in production mode with `npm exec -- nx build go-web --configuration=production`
- Builds `go-server` with `npm exec -- nx build go-server`
- Verifies `dist/apps/go-web/browser/index.html` and `dist/apps/go-server/main.js`
- Copies `WinSW-x64.exe` into `gx-go-server.exe` and `gx-go-caddy.exe` if those wrappers do not already exist
- Installs or refreshes the `gx-go-server` and `gx-go-caddy` services
- Starts or restarts both services
- Waits for local health checks to respond

The script does not install Cloudflare Tunnel and does not store any tunnel token.

## Local health checks

After the services are running, these URLs should respond locally:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health
Invoke-WebRequest http://127.0.0.1/
Invoke-WebRequest http://127.0.0.1/api/health
```

What each URL verifies:

- `http://127.0.0.1:3000/api/health`: Nest directly
- `http://127.0.0.1/`: SPA entrypoint from Caddy
- `http://127.0.0.1/api/health`: Caddy reverse proxy to Nest

## Publish the public hostname through Cloudflare

Use a remotely-managed Cloudflare Tunnel for this laptop-hosted service.

1. In the Cloudflare dashboard, create a tunnel for this laptop.
2. Add a public hostname such as `go.<your-domain>`.
3. Route that hostname to `http://localhost:80`.
4. On the laptop, open an elevated Command Prompt or PowerShell session.
5. Run the install command copied from the Cloudflare dashboard:

```powershell
cloudflared.exe service install <TUNNEL_TOKEN>
```

Once that service is running, the application should be live at the hostname you configured.

Quick Tunnels are intentionally out of scope here. They are for testing only, not a durable public game URL.

## Rebuild and restart after code changes

After changing app code, rebuild and restart the two local services:

```powershell
Set-Location C:\software-dev\gx.go\deploy\windows
.\restart-services.ps1
```

This rebuilds `go-web` and `go-server`, verifies the build outputs, restarts `gx-go-server`, restarts `gx-go-caddy`, and waits for the local health checks again.

## Remove the local services

To remove the WinSW-managed services from Windows:

```powershell
Set-Location C:\software-dev\gx.go\deploy\windows
.\uninstall-services.ps1
```

If the laptop also runs `cloudflared`, remove that service separately:

```powershell
cloudflared.exe service uninstall
```

## Cloudflare token rotation

To rotate the Cloudflare tunnel token:

1. In the Cloudflare dashboard, rotate the token for the tunnel.
2. Copy the new install command from the dashboard.
3. On the laptop, reinstall the service with the new token:

```powershell
cloudflared.exe service uninstall
cloudflared.exe service install <NEW_TUNNEL_TOKEN>
```

## Failure recovery

If the public site is down, check these items in order:

1. Verify the local services are running:

```powershell
Get-Service gx-go-server, gx-go-caddy, cloudflared
```

2. Verify the local health checks still work:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health
Invoke-WebRequest http://127.0.0.1/api/health
```

3. Restart the local stack:

```powershell
Set-Location C:\software-dev\gx.go\deploy\windows
.\restart-services.ps1
```

4. Restart `cloudflared` if the hostname route or tunnel state changed:

```powershell
Restart-Service cloudflared
```

5. If the Node.js or Caddy install path changed, update `go-server-service.xml` or `caddy-service.xml` before reinstalling the affected service.

Operational notes:

- Restarting `gx-go-server` clears active rooms because room state is in memory
- Restarting `gx-go-caddy` should not affect built assets, but it does interrupt currently connected browser sessions until the service comes back
- Prefer reusing the existing `cloudflared` service for additional routes on the same laptop instead of creating parallel ad hoc tunnel processes

## Manual verification checklist

- Open `https://go.<your-domain>/`
- Host creates a room
- Guest joins the room URL
- Spectator joins the same room URL
- A move appears live for all viewers
- Spectator sends chat and both players see it

## References

- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Cloudflare setup flow: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare tunnel tokens: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/
- Cloudflare Quick Tunnel limitations: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- Caddy command line docs: https://caddyserver.com/docs/command-line
- Caddy reverse proxy docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- WinSW bundled usage: https://github.com/winsw/winsw
