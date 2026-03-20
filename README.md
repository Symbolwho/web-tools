# web-tools

A client-only React 19 + Vite workspace for browser-based utilities. The app currently ships JSON and timestamp tools, stores state in `localStorage`, and builds to static assets in `dist/`.

## Local development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Commands

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm preview`

## Production deployment

Production is intentionally static:

- GitHub Actions runs `pnpm build`
- the generated `dist/` directory is uploaded to the VPS
- the VPS serves those files with `ghcr.io/caddybuilds/caddy-cloudflare:latest`
- there is no Node.js runtime container in production

Hash routes such as `#/json` and `#/timestamp` do not need SPA rewrite rules because the server only ever receives `/`.

## Repository files for deployment

- `.github/workflows/deploy.yml` builds and deploys on pushes to `master`
- `deploy/compose.yaml` runs the Caddy container on the VPS
- `deploy/Caddyfile` serves the static files, enables compression, and sets cache headers

## GitHub Actions secrets

Add these repository secrets before enabling the workflow:

- `VPS_HOST`: VPS hostname or IP
- `VPS_USER`: SSH user used for deployments
- `VPS_SSH_KEY`: private key for that deploy user
- `VPS_DEPLOY_PATH`: target path on the VPS, for example `/opt/web-tools`
- `VPS_DOMAIN`: production domain Caddy should serve

The workflow currently deploys on pushes to `master`. If your live branch changes later, update the branch list in `.github/workflows/deploy.yml`.

## One-time VPS bootstrap

### 1. Install Docker with the Compose plugin

The VPS needs:

- Docker Engine
- `docker compose` plugin

### 2. Create the deployment directories

```bash
sudo mkdir -p /opt/web-tools/site /opt/web-tools/caddy_data /opt/web-tools/caddy_config
sudo chown -R <deploy-user>:<deploy-user> /opt/web-tools
```

If you use a path other than `/opt/web-tools`, keep it in sync with the `VPS_DEPLOY_PATH` GitHub secret.

### 3. Store the Cloudflare token on the VPS

Create `/opt/web-tools/.env` on the VPS with the DNS token used by the Cloudflare-enabled Caddy image:

```dotenv
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

Keep this file on the server only. The GitHub Actions workflow does not need the Cloudflare token.

### 4. Start the stack for the first time

After the first workflow run has copied `compose.yaml`, `Caddyfile`, and the built site:

```bash
docker compose -f /opt/web-tools/compose.yaml --project-directory /opt/web-tools up -d
```

The workflow also writes `/opt/web-tools/site.env` on each deploy with the configured `DOMAIN` value from the `VPS_DOMAIN` GitHub secret.

## Expected VPS layout

```text
/opt/web-tools/
├── .env
├── site.env
├── Caddyfile
├── compose.yaml
├── caddy_config/
├── caddy_data/
└── site/
```

## Verification checklist

### Repo-level validation

```bash
pnpm build
```

Confirm the build succeeds and outputs files in `dist/`.

### VPS validation

- `docker compose -f /opt/web-tools/compose.yaml --project-directory /opt/web-tools ps`
- verify Caddy is up and ports `80` and `443` are published
- verify your domain points at the VPS
- verify HTTPS loads successfully

### Application validation

- open the deployed site
- refresh on `#/json`
- refresh on `#/timestamp`
- confirm browser-only features such as `localStorage`, clipboard actions, theme persistence, and locale persistence still work

### CI/CD validation

- push a small change to `master`
- confirm the `Deploy` workflow runs `pnpm build`
- confirm the workflow uploads the new `dist/` bundle and restarts the Caddy stack
- confirm the live site reflects the change
