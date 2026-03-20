# Windows Hosting

This folder contains the Windows-hosting assets for the hosted multiplayer stack:

- `Cloudflare Tunnel -> Caddy -> Angular static app + Nest go-server`
- External users hit one public hostname
- Only `cloudflared` needs outbound internet access from the Windows host
- Nest stays bound to `127.0.0.1:3000`
- Caddy listens on port `80` and serves both the SPA and websocket/API traffic

## Build the application

From the workspace root:

```powershell
npm exec -- nx build go-web --configuration=production
npm exec -- nx build go-server
```

This produces:

- `dist/apps/go-web/browser`
- `dist/go-server/main.js`

## Run go-server as a Windows service

1. Download `WinSW` and place `WinSW-x64.exe` next to `go-server-service.xml`.
2. Rename `WinSW-x64.exe` to `gx-go-server.exe`.
3. Review `go-server-service.xml` and update the absolute paths if needed.
4. Install and start the service:

```powershell
.\gx-go-server.exe install
.\gx-go-server.exe start
```

## Run Caddy as a Windows service

1. Download `caddy.exe` and place it at `C:\Services\caddy\caddy.exe`, or update the path in `caddy-service.xml`.
2. Review `Caddyfile` and confirm the workspace path matches your deployment path.
3. Download `WinSW` and place `WinSW-x64.exe` next to `caddy-service.xml`.
4. Rename `WinSW-x64.exe` to `gx-go-caddy.exe`.
5. Install and start the service:

```powershell
.\gx-go-caddy.exe install
.\gx-go-caddy.exe start
```

## Publish through Cloudflare Tunnel

Cloudflare recommends remotely-managed tunnels for production. Create the tunnel and public hostname in the Cloudflare dashboard, and point the published application to:

- `http://localhost:80`

On the Windows host, install `cloudflared` as a service with the tunnel token:

```powershell
cloudflared.exe service install <TUNNEL_TOKEN>
```

That command is documented in Cloudflare's setup guide for remotely-managed tunnels on Windows. After installation, verify the `cloudflared` service is running and the tunnel route points to `http://localhost:80`.

## Health check

Once the services are running locally, verify:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health
Invoke-WebRequest http://127.0.0.1/
```

The first checks Nest directly. The second checks the Caddy-served SPA entrypoint.

## Notes

- If you change the public hostname routing in Cloudflare, restart the `cloudflared` service.
- If you rebuild `go-server`, restart the `gx-go-server` service.
- If you rebuild `go-web`, restart the `gx-go-caddy` service so Caddy serves the updated files immediately.
- Caddy proxies `/api/*` and `/socket.io/*` to Nest automatically, including websocket upgrades.
