# TM Spotlight Studio (v0.2.0)

A self-contained, local-first Progressive Web Application (PWA) that composes manually entered or JSON-imported Team Member recognition data into two deterministic `1920 × 1080` (16:9) presentation slides:

1. **BJ's Team Member Nominees** — six nominees arranged in a fixed 3 × 2 grid.
2. **BJ's Team Member of the Month** — one selected nominee automatically inheriting their name and photo, presented with Recognized For and Recognition Summary.

---

## Key Properties

- **100% Client-Side & Local-First:** No backend, no database, no authentication, and no cloud dependencies.
- **Zero Recognition Persistence:** All entered names, winner details, imported JSON data, and photos exist strictly in session memory. Refreshing, closing the tab, or confirming **Reset / New Recognition** clears all data and revokes temporary browser `ObjectURL`s.
- **Flexible Photo Input & JSON Import:** Upload local photos (JPG/PNG/WebP) or load images directly by URL with live preview in the form, and upload a `.json` file to auto-populate the builder form for review before composing slides.
- **Offline PWA:** Service worker caches only the application shell and read-only template packages so the app continues working offline after initial installation.
- **Decoupled Template Engine:** All slide coordinates, typography, and asset paths live in versioned `manifest.json` packages under `public/templates/`. See [docs/template-manifest-spec.md](docs/template-manifest-spec.md).
- **Deterministic Export:** Exports independent `1920 × 1080` PNGs for Slide 1 and Slide 2 plus a combined 2-page 16:9 PDF, independent of browser window size.

---

## Local Development

### Prerequisites
- Node.js 22+ (with `npm`)

### Commands

```bash
# Install exact pinned dependencies
npm ci

# Start local development server
npm run dev

# Run TypeScript strict type-checking
npm run typecheck

# Run unit tests (validation, rendering geometry, template manifest, reset behavior)
npm test

# Build production bundle
npm run build
```

> **Windows PowerShell Note:** If local script execution policy blocks `npm.ps1`, invoke `npm.cmd` instead (e.g., `npm.cmd ci`, `npm.cmd test`, `npm.cmd run build`).

---

## Docker Deployment (Hardened Production Container)

The production image uses a multi-stage build with pinned container versions (`node:22.14.0-alpine3.21` → `nginxinc/nginx-unprivileged:1.27.4-alpine3.21`) and enforces:

- Non-root execution (`user: "101:101"`, port `8080`)
- Read-only root filesystem (`read_only: true`)
- Minimal `tmpfs` mounts (`/tmp`, `/var/cache/nginx`) with `noexec,nosuid`
- `privileged: false`, `cap_drop: [ALL]`, `no-new-privileges:true`
- Resource limits (`128m` memory, `0.50` CPU, `64` PIDs)
- Built-in HTTP health check (`GET /healthz`)

### Start with Docker Compose

```bash
docker compose up -d --build
```

The application will be available on your local network at:

```text
http://<host-ip>:8080
```

To bind a custom host port:

```bash
APP_PORT=8090 docker compose up -d
```

### Verify Container Health & Security

```bash
docker compose ps
docker inspect --format='{{.State.Health.Status}}' tm-recognition-studio
```

### Deploying Additional Templates Without Rebuilding

Mount a read-only templates folder containing `index.json` and one or more template packages into `/usr/share/nginx/html/templates:ro` in `docker-compose.yml`, then restart the container.

---

## Google Cloud Run Deployment

The container is pre-configured for Google Cloud Run (non-root port `8080`, `/healthz` health check, pinned Alpine images):

1. Open **Google Cloud Console → Cloud Run → Create Service**.
2. Choose **Continuously deploy from a repository** and connect the GitHub repository (`main` branch, Build type: **Dockerfile** at `/Dockerfile`).
3. Configure service settings:
   - **Container port:** `8080`
   - **Memory:** `256 MiB` &middot; **CPU:** `1`
   - **Minimum instances:** `0` (scales to zero when idle) &middot; **Maximum instances:** `3`
   - **Health probe:** HTTP `GET /healthz` on port `8080`
   - **Authentication:** *Allow unauthenticated invocations* for link-based team testing (or restrict with IAM / IAP).
4. Cloud Run provides automatic HTTPS (`*.run.app`), activating PWA installation and offline caching immediately.

---

## Workflow

1. **Input (Recognition Builder):** Choose a template, optionally set Recognition Period metadata, enter all 6 nominees (uploading or omitting individual photos), select one nominee as the Team Member of the Month, and fill Store / Department, Recognition Category, and Recognition Summary.
2. **Compose & Preview:** Review both slides rendered at exact `1920 × 1080` composition geometry.
3. **Export:** Download Slide 1 PNG (`1920 × 1080`), Slide 2 PNG (`1920 × 1080`), and/or the Combined 2-Page PDF.
4. **Reset:** Click **Reset / New Recognition** and confirm to purge all recognition inputs and uploaded photos from memory.
