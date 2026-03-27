# Synology Docker Hosting

This deployment runs the Go stack as two Docker containers:

- `web`: builds the Angular frontend and serves it through Caddy
- `api`: builds the Nest backend and listens on `3000` inside the Docker network

Synology's reverse proxy is responsible for the public hostname and HTTPS. The containers only serve plain HTTP on the NAS.

## Prerequisites

- Synology Container Manager or Docker Compose is available on the NAS
- The repo is copied to the NAS as a normal working directory
- The NAS has enough CPU and memory to build the Angular and Nest images locally
- Synology reverse proxy is available if you want public HTTPS

## Files involved

- Root Compose stack: `compose.yml`
- Frontend image: `apps/go-web/Dockerfile`
- Frontend proxy config: `apps/go-web/Caddyfile`
- Backend image: `apps/go-server/Dockerfile`

## Build and run on the NAS

From the repo root on the NAS:

```bash
docker compose up -d --build
```

That command:

- builds the Angular frontend image
- builds the Nest backend image
- starts the `api` service on the internal Docker network
- starts the `web` service on port `8080` of the NAS

To stop the stack:

```bash
docker compose down
```

To rebuild after code changes:

```bash
docker compose up -d --build
```

## Local verification on the NAS

After the stack is up, verify:

```bash
wget -qO- http://127.0.0.1:8080/
wget -qO- http://127.0.0.1:8080/api/health
```

What to expect:

- `http://127.0.0.1:8080/` returns the Angular app shell
- `http://127.0.0.1:8080/api/health` reaches the Nest API through the Caddy reverse proxy

## Synology reverse proxy setup

In Synology DSM:

1. Open `Control Panel -> Login Portal -> Advanced -> Reverse Proxy`.
2. Create a new reverse proxy rule for your public hostname.
3. Set the source to your public HTTPS hostname, such as `go.example.com`.
4. Set the destination to `http://127.0.0.1:8080`.
5. Save the rule and attach a certificate in DSM if needed.

With that setup:

- Synology terminates HTTPS
- the Docker `web` container stays on HTTP port `80`
- the `web` container proxies `/api/*` and `/socket.io/*` to `api:3000`

## Operational notes

- Hosted room state is still stored in memory, so restarting the `api` container clears active rooms
- Only the `web` container is published on the NAS; the `api` container stays private to Docker networking
- If the public site is down, verify the containers are healthy before changing Synology reverse proxy settings

## Troubleshooting

Check the effective Compose configuration:

```bash
docker compose config
```

Inspect container status:

```bash
docker compose ps
```

Inspect logs:

```bash
docker compose logs web
docker compose logs api
```
