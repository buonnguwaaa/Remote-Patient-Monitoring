# Remote Patient Monitoring — Backend

REST API and background workers for a **Remote Patient Monitoring (RPM)** platform. The backend supports clinical staff workflows, patient self-monitoring, real-time alerts, medication reminders, and telehealth features.

Built with **Go**, **MongoDB**, **Redis**, and **Temporal** for durable background processing.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Running the application](#running-the-application)
- [Database seeding](#database-seeding)
- [API documentation](#api-documentation)
- [Temporal workflows](#temporal-workflows)
- [Project structure](#project-structure)
- [Development](#development)
- [Docker & production](#docker--production)
- [Troubleshooting](#troubleshooting)
- [Additional resources](#additional-resources)

---

## Features

| Domain | What it covers |
|--------|----------------|
| **Authentication** | JWT-based auth, Google OAuth2, role-based access (admin, doctor, nurse, patient) |
| **Users & departments** | Staff and patient profiles, department management |
| **Care assignments** | Link patients to doctors and nurses |
| **Measurements** | Vital sign ingestion with configurable thresholds |
| **Alerts** | Automated threshold evaluation, push notifications, and in-app chat messages |
| **Prescriptions & reminders** | Medication schedules with Temporal-backed reminder delivery |
| **Medication intake** | Track whether patients took prescribed doses |
| **Follow-up appointments** | Scheduling with automated appointment reminders |
| **Chat** | Conversations between care team and patients |
| **Notifications** | In-app notifications and Firebase Cloud Messaging (FCM) push |
| **Realtime** | WebSocket hub backed by Redis pub/sub for live updates |
| **Video sessions** | Jitsi-based telehealth room provisioning |
| **Activity logs** | Audit trail for admin actions |

---

## Architecture

The backend runs as two processes in development (and production):

```
┌─────────────┐     HTTP / WebSocket      ┌──────────────────┐
│  Clients    │ ─────────────────────────▶│  API Server      │
│  (Web/Mobile)│                           │  (cmd/server)    │
└─────────────┘                           └────────┬─────────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────────────────┐
                     │                             │                             │
                     ▼                             ▼                             ▼
              ┌────────────┐               ┌────────────┐               ┌────────────┐
              │  MongoDB   │               │   Redis    │               │  Temporal  │
              │  (data)    │               │ (cache /   │               │ (workflows)│
              └────────────┘               │  pub-sub)  │               └─────┬──────┘
                                           └────────────┘                     │
                                                                               ▼
                                                                    ┌──────────────────┐
                                                                    │  Worker          │
                                                                    │  (cmd/worker)    │
                                                                    └──────────────────┘
```

**Request path:** Clients call the Gin API server. Handlers delegate to use cases and services, which read and write MongoDB and enqueue Temporal workflows where needed.

**Async path:** The Temporal worker executes workflows for measurement alerts, medication reminders, and appointment reminders. Activities handle side effects such as push notifications, chat messages, and Redis event publishing.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Language | Go 1.24 |
| HTTP framework | [Gin](https://github.com/gin-gonic/gin) |
| Database | MongoDB |
| Cache / pub-sub | Redis |
| Workflows | [Temporal](https://temporal.io/) |
| Auth | JWT, Google OAuth2 |
| Push notifications | Firebase Cloud Messaging |
| Media uploads | Cloudinary |
| Email | SMTP |
| Video | Jitsi |
| API docs | Swagger (swaggo) |

---

## Prerequisites

Install the following before running locally:

- **Go** 1.24 or later (see `go.mod`)
- **Docker** and **Docker Compose** — for Temporal and Redis
- **Make** — optional but recommended for common tasks
- **MongoDB** — Atlas cluster or local instance (connection string required)
- **goimports** — used by `make format` (`go install golang.org/x/tools/cmd/goimports@latest`)

---

## Getting started

### 1. Clone and install dependencies

```bash
git clone https://github.com/buonnguwaaa/Remote-Patient-Monitoring.git
cd Remote-Patient-Monitoring/Backend
go mod tidy
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

At minimum you need a valid **MongoDB URI**, **JWT secret**, and **Redis** settings. See [Configuration](#configuration) for the full list.

### 3. Start local infrastructure

Development Compose starts Temporal (dev server) and Redis:

```bash
make up-dev
# equivalent to: docker compose up -d
```

| Service | Port | Purpose |
|---------|------|---------|
| Temporal gRPC | `7233` | Workflow engine |
| Temporal Web UI | `8233` | Inspect workflows and task queues |
| Redis | `6379` | Cache and realtime event bus |

### 4. Seed the database (optional)

Populate demo users and sample data for local testing:

```bash
make seed
```

> **Warning:** Seeding **drops the entire database** before inserting data. Use only on development databases.

### 5. Run the application

```bash
make run
```

This starts both the API server and the Temporal worker. The API listens on **http://localhost:8080** by default.

Verify the server is up:

```bash
curl http://localhost:8080/health
```

---

## Configuration

Environment variables are loaded from `.env` at startup via [godotenv](https://github.com/joho/godotenv).

### Core

| Variable | Description | Default |
|----------|-------------|---------|
| `GIN_MODE` | Gin mode: `debug` or `release` | `debug` |
| `PORT` | HTTP server port | `8080` |
| `JWT_SECRET` | Secretly signing secret | — (required) |
| `MONGO_URI` | MongoDB connection string | — (required) |
| `MONGO_DB_NAME` | MongoDB database name | — (required) |
| `TEMPORAL_HOST` | Temporal frontend address | `localhost:7233` |

### Redis

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_ADDR` | Redis host and port | `localhost:6379` |
| `REDIS_PASSWORD` | Redis password | — |
| `REDIS_DB` | Redis database index | `0` |

### Frontend / CORS

| Variable | Description | Default |
|----------|-------------|---------|
| `FE_WEB_URL` | Patient web app origin | `http://localhost:3000` |
| `FE_ADMIN_URL` | Admin web app origin | `http://localhost:3001` |
| `FE_MOBILE_URI` | Mobile app redirect URI (OAuth) | — |

### Authentication

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URL` | OAuth callback URL |
| `COOKIE_DOMAIN` | Cookie domain for auth tokens |
| `COOKIE_CROSS_SITE` | Set to `true` for cross-site cookies in production |
| `FORCE_SAMESITE_NONE` | Force `SameSite=None` on cookies |

### Email (SMTP)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port |
| `SMTP_EMAIL` | Sender email address |
| `SMTP_PASSWORD` | SMTP password or app password |

### Push notifications (Firebase)

| Variable | Description |
|----------|-------------|
| `FIREBASE_CREDENTIALS_BASE64` | Base64-encoded service account JSON |
| `FIREBASE_CREDENTIALS_FILE` | Path to service account JSON file |

Provide one of the two Firebase credential options. Push delivery is disabled gracefully if neither is configured (worker logs a warning).

### Media (Cloudinary)

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

### Video sessions (Jitsi)

| Variable | Description |
|----------|-------------|
| `JITSI_DOMAIN` | Jitsi Meet domain |
| `JITSI_ROOM_PREFIX` | Room name prefix |
| `VIDEO_SESSION_TTL_MINUTES` | Session expiry in minutes |

---

## Running the application

### Full stack (recommended for local development)

Starts the API server and Temporal worker together:

```bash
make run
```

### Server only

Use when you want to test HTTP endpoints without background workflow processing:

```bash
make server
# or: go run cmd/server/main.go
```

### Worker only

Use when scaling workers separately or debugging Temporal activities:

```bash
make up-dev   # ensure Temporal and Redis are running
make worker
# or: go run cmd/worker/main.go
```

### Windows

If Make is unavailable, run processes directly:

```powershell
go run cmd/server/main.go
go run cmd/worker/main.go
```

### Stopping

- Press **Ctrl+C** in the terminal running the application.
- Stop Docker services: `make down-dev` or `docker compose down`.

---

## Database seeding

The seed command resets the database and inserts demo accounts plus ~50 records per domain (departments, measurements, prescriptions, etc.):

```bash
make seed
```

### Demo accounts (after seeding)

These credentials exist only in seeded development databases. **Do not use in production.**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gmail.com` | `Admin@123` |
| Doctor | `doctor@gmail.com` | `Doctor12345@` |
| Nurse | `nurse@gmail.com` | `Nurse@123` |
| Patient | `patient@gmail.com` | `Patient12345@` |

---

## API documentation

Interactive Swagger UI is served when the server is running:

**http://localhost:8080/swagger/index.html**

Regenerate docs after changing handler annotations:

```bash
make gen_swagger
```

This installs [swag](https://github.com/swaggo/swag) if needed and writes output to `docs/`.

---

## Temporal workflows

The worker registers two task queues:

| Task queue | Workflows | Purpose |
|------------|-----------|---------|
| `ALERT-TASK-QUEUE` | `AlertWorkflow` | Evaluate measurements against thresholds, create alerts, send push and chat notifications |
| `REMINDER-TASK-QUEUE` | `ReminderWorkflow`, `AppointmentReminderWorkflow` | Deliver medication and appointment reminders |

### Temporal Web UI

After starting Docker Compose, open the UI to inspect workflow runs, retries, and task queue backlogs:

**http://localhost:8233**

In production (`docker-compose.prod.yml`), the UI is provided by the `temporal-ui` service on the same port.

Workflow state in production is persisted in PostgreSQL (`temporal-postgres-data` volume) and survives container restarts.

---

## Project structure

```
Backend/
├── cmd/
│   ├── server/          # HTTP API entrypoint
│   ├── worker/          # Temporal worker entrypoint
│   └── seed/            # Database seeding CLI
├── config/              # MongoDB, Redis, Firebase, OAuth2, Cloudinary setup
├── docs/                # Generated Swagger specs
├── external/
│   ├── fcm/             # Firebase Cloud Messaging client
│   └── temporal/
│       ├── activity/    # Temporal activities (alerts, reminders, appointments)
│       ├── client/      # Workflow starters and Temporal client
│       ├── dto/         # Workflow input/output types
│       ├── helper/      # Shared helpers (e.g. measurement evaluation)
│       ├── worker/      # Worker registration and startup
│       └── workflow/    # Workflow definitions
├── internal/
│   ├── container/       # Dependency injection wiring
│   ├── domain/          # Domain models
│   ├── dto/             # Request/response DTOs
│   ├── handler/         # HTTP handlers
│   ├── middleware/      # Auth, activity logging
│   ├── realtime/        # WebSocket hub and handlers
│   ├── repository/      # MongoDB data access
│   ├── router/          # Route registration
│   ├── service/         # Business logic
│   ├── usecase/         # Application use cases
│   ├── util/            # Email, auth helpers
│   └── ws/              # WebSocket client utilities
├── migration/seed/      # Seed data and helpers
├── docker-compose.yml   # Local dev infrastructure (Temporal + Redis)
├── docker-compose.prod.yml
├── Dockerfile           # Multi-stage build for server and worker binaries
└── Makefile             # Common dev commands
```

### Layering convention

Handlers receive HTTP requests and call **use cases**, which orchestrate **services** and **repositories**. External integrations (Temporal, FCM, Cloudinary) live under `external/` to keep `internal/` focused on application logic.

---

## Development

### Format and lint

```bash
make format        # goimports + gofmt
make static_check  # go vet ./...
```

### Tests

```bash
go test ./...
```

Domain and measurement evaluator packages include unit tests. Run a single package:

```bash
go test ./internal/domain/... -v
go test ./external/temporal/helper/measurement_helper/... -v
```

### Adding a new API endpoint

1. Define or extend domain models in `internal/domain/`.
2. Add repository methods in `internal/repository/`.
3. Implement service logic in `internal/service/`.
4. Wire the use case in `internal/usecase/`.
5. Create handler and DTO, then register the route in `internal/router/`.
6. Add Swagger annotations and run `make gen_swagger`.

### Adding a Temporal workflow

1. Define the workflow in `external/temporal/workflow/`.
2. Implement activities in `external/temporal/activity/`.
3. Register workflow and activities in `external/temporal/worker/worker.go`.
4. Start workflows from the API layer via `external/temporal/client/`.

---

## Docker & production

### Build the image

```bash
docker build -t rpm-backend .
```

The Dockerfile produces two binaries: `/server` and `/worker`.

### Production Compose

Production stack includes PostgreSQL, Temporal, Temporal UI, Redis, server, worker, and nginx:

```bash
make up-prod
# equivalent to: docker compose -f docker-compose.prod.yml up -d
```

Stop production services:

```bash
make down-prod
```

Ensure `.env` (or `.env.production`) contains production MongoDB, Firebase, and SMTP credentials before deploying.

---

## Troubleshooting

### Port conflicts

Check whether services are already bound:

```bash
docker ps
lsof -i :8080   # API server
lsof -i :7233   # Temporal gRPC
lsof -i :6379   # Redis
```

### Docker containers fail to start

```bash
docker compose logs
docker compose restart
```

### MongoDB connection errors

Verify `MONGO_URI` and `MONGO_DB_NAME` in `.env`. Ensure your IP is allowlisted if using MongoDB Atlas.

### Temporal worker not processing tasks

1. Confirm Temporal is running: `docker compose ps`
2. Check the worker logs for connection errors to `TEMPORAL_HOST`
3. Open the Temporal UI at http://localhost:8233 and inspect task queue backlogs

### Module / dependency issues

```bash
go clean -modcache
go mod download
go mod tidy
```

### Firebase push not working

The worker continues without FCM if credentials are missing. Set `FIREBASE_CREDENTIALS_BASE64` or `FIREBASE_CREDENTIALS_FILE` and restart the worker.

---

## Additional resources

- [Temporal documentation](https://docs.temporal.io/)
- [Go modules reference](https://go.dev/ref/mod)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Gin web framework](https://gin-gonic.com/docs/)
- [Swaggo — Swagger for Go](https://github.com/swaggo/swag)

---

## Support

For bugs or feature requests, open an issue in the project repository. When reporting problems, include relevant server or worker logs and steps to reproduce.
