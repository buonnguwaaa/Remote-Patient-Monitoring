# Remote Patient Monitoring (RPM)

A full-stack platform that helps hospitals and care teams monitor patients outside the clinic. Patients log vitals and follow medication plans from their phones. Doctors review readings, respond to alerts, and coordinate care from a web dashboard or a companion mobile app. Administrators manage the entire system — users, departments, and assignments — from a separate admin panel.

Everything shares one Go backend: a REST API for day-to-day operations, WebSockets for live updates, and Temporal workflows for reliable background jobs like reminders and alert evaluation.

---

## Table of contents

- [Who uses what](#who-uses-what)
- [What the system does](#what-the-system-does)
- [How it fits together](#how-it-fits-together)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Running locally](#running-locally)
- [Demo accounts](#demo-accounts)
- [Project structure](#project-structure)
- [Development notes](#development-notes)
- [CI/CD](#cicd)
- [Further reading](#further-reading)

---

## Who uses what

The repository contains five applications. Each one targets a specific role and runs independently, but they all talk to the same backend.

| Application | Directory | Built for | Stack | Local port |
|-------------|-----------|-----------|-------|------------|
| **Backend API** | [`Backend/`](Backend/) | All clients | Go, Gin, MongoDB, Redis, Temporal | `8080` |
| **Doctor Web** | [`Frontend/web/`](Frontend/web/) | Doctors (desktop) | React, TypeScript, Vite, Tailwind CSS | `3000` |
| **Admin Panel** | [`Frontend/admin/`](Frontend/admin/) | System administrators | React, TypeScript, Vite, Tailwind CSS | `5174` |
| **Patient Mobile** | [`Frontend/mobile/`](Frontend/mobile/) | Patients and nurses | React Native, Expo SDK 54 | `8081` |
| **Doctor Mobile** | [`Frontend/doctor-app/`](Frontend/doctor-app/) | Doctors (on the go) | React Native, Expo SDK 54 | `3001` |

**Doctor Web vs Doctor Mobile** — Both give doctors access to patients, alerts, chat, prescriptions, and reminders. The web app is the primary desktop experience with charts and multi-panel layouts. The mobile app mirrors the core workflows for use between rounds or on call.

**Patient Mobile vs Nurse flows** — The same mobile app serves two roles. Patients see home, vitals tracking, education content, messaging, and notifications. Nurses get a streamlined view focused on their assigned patients and entering measurements on their behalf.

**Admin Panel** — Completely separate from the doctor web app. Only users with the `admin` role can sign in. It handles org-wide configuration that doctors and nurses do not need day to day.

---

## What the system does

### For patients

- Record vital signs (blood pressure, heart rate, blood glucose, and more)
- View measurement history and personal alert history
- Receive push notifications when readings cross configured thresholds
- Manage medications and mark doses as taken
- Chat with their care team
- Join video consultations (Jitsi)
- Read health education articles and complete quizzes

### For doctors

- Dashboard overview of assigned patients and recent activity
- Patient profiles with measurement trends and alert history
- Configure per-patient vital sign thresholds
- Review and act on threshold alerts in real time
- Prescribe medications and schedule follow-up appointments
- Set medication and appointment reminders
- Chat with patients and start video sessions
- Track medication compliance

### For nurses

- View assigned patients
- Enter measurements on behalf of patients
- Access a focused mobile workflow separate from the full patient experience

### For administrators

- Manage doctors, nurses, and patients (create, edit, deactivate)
- Organize departments and assign staff
- Assign patients to doctors and nurses
- Review system activity logs
- Configure system-wide settings

### Under the hood

| Capability | How it works |
|------------|--------------|
| **Authentication** | JWT tokens with role-based access; Google OAuth2 supported |
| **Threshold alerts** | Measurements evaluated against per-patient limits; Temporal workflows handle notification delivery |
| **Real-time updates** | WebSocket hub backed by Redis pub/sub — clients see new alerts and messages without polling |
| **Reminders** | Temporal schedules medication and appointment reminders; worker sends push notifications and in-app messages |
| **Push notifications** | Firebase Cloud Messaging (FCM) for mobile clients |
| **Media uploads** | Cloudinary for profile images and attachments |
| **Email** | SMTP for password reset and transactional mail |
| **Audit trail** | Activity logs for admin actions |

---

## How it fits together

At a high level, clients call the Gin API server over HTTP. When something needs to happen asynchronously — an alert to evaluate, a reminder to fire — the server starts a Temporal workflow. A separate worker process picks up those tasks and runs the side effects (push notifications, chat messages, Redis events).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Client applications                              │
├─────────────┬─────────────┬─────────────┬─────────────┬──────────────────┤
│ Doctor Web  │ Admin Panel │ Patient App │ Doctor App  │                  │
│ Vite/React  │ Vite/React  │ Expo/RN     │ Expo/RN     │                  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────────────────┘
       │             │             │             │
       └─────────────┴──────┬──────┴─────────────┘
                            │  HTTP / WebSocket
                            ▼
                  ┌─────────────────────┐
                  │   Backend API       │
                  │   cmd/server        │
                  └──────────┬──────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │   MongoDB   │    │    Redis    │    │  Temporal   │
  │  persistent │    │ cache +     │    │  workflow   │
  │  data store │    │ pub/sub bus │    │  engine     │
  └─────────────┘    └─────────────┘    └──────┬──────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │   Temporal Worker   │
                                    │   cmd/worker        │
                                    │                     │
                                    │  • Alert workflows  │
                                    │  • Reminder jobs    │
                                    │  • Appointment nudges│
                                    └─────────────────────┘
```

**Request path:** A client sends an HTTP request → handler → use case → service → MongoDB. If the action triggers background work, a Temporal workflow is enqueued.

**Async path:** The worker polls Temporal task queues, runs activities (send FCM push, post chat message, publish Redis event), and retries automatically on failure.

**Real-time path:** When state changes (new alert, new chat message), the server publishes an event to Redis. Connected WebSocket clients receive it immediately.

For local development, Docker Compose starts Temporal and Redis. MongoDB is expected as an external connection (Atlas or a local instance).

---

## Tech stack

| Layer | Choices | Notes |
|-------|---------|-------|
| **Backend** | Go 1.24, Gin | REST API with Swagger docs |
| **Database** | MongoDB | Users, measurements, prescriptions, chat, and more |
| **Cache & events** | Redis | Pub/sub for WebSocket fan-out |
| **Workflows** | Temporal | Durable scheduling for alerts and reminders |
| **Auth** | JWT, Google OAuth2 | Role-based middleware on protected routes |
| **Doctor & admin web** | React, TypeScript, Vite, Tailwind CSS | Separate Vite apps, independent deployments |
| **Mobile** | React Native, Expo SDK 54 | Patient app and doctor app are separate Expo projects |
| **Push** | Firebase Cloud Messaging | Optional notifications to mobile |
| **Video** | Jitsi | Telehealth room provisioning |
| **Media** | Cloudinary | Image uploads |
| **Email** | SMTP | Password reset, notifications |
| **DevOps** | Docker, GitHub Actions | CI on push; backend deploys to EC2 via Docker Hub |

---

## Getting started

### Prerequisites

Install these before running anything locally:

| Tool | Version | Used by |
|------|---------|---------|
| [Go](https://go.dev/) | 1.24+ | Backend |
| [Node.js](https://nodejs.org/) | LTS (20+) | All frontend apps |
| [Docker](https://www.docker.com/) | Latest | Temporal + Redis (backend dev) |
| MongoDB | Atlas or local | Backend data store |
| Make | Optional | Backend convenience commands |

For mobile development you will also want [Expo Go](https://expo.dev/client) on a physical device, or Android Studio / Xcode for emulators.

### Clone the repository

```bash
git clone https://github.com/buonnguwaaa/Remote-Patient-Monitoring.git
cd Remote-Patient-Monitoring
```

---

## Running locally

The backend must be running before any frontend app will work. The steps below assume you start from the repository root.

### Step 1 — Backend infrastructure and API

```bash
cd Backend

# Copy and edit environment variables
cp .env.example .env
# Required: MONGO_URI, MONGO_DB_NAME, JWT_SECRET
# Redis defaults match docker-compose.yml (password: redispassword)

go mod tidy

# Start Temporal (port 7233/8233) and Redis (port 6379)
make up-dev

# Optional: load demo users and sample data
# Warning: this drops the entire database first
make seed

# Start API server + Temporal worker together
make run
```

Confirm the server is healthy:

```bash
curl http://localhost:8080/health
# {"message":"OK"}
```

Useful URLs once the backend is up:

| URL | Purpose |
|-----|---------|
| http://localhost:8080/health | Health check |
| http://localhost:8080/swagger/index.html | Interactive API docs |
| http://localhost:8233 | Temporal Web UI (inspect workflows) |

For the full list of environment variables, Makefile targets, and troubleshooting, see [`Backend/README.md`](Backend/README.md).

### Step 2 — Doctor web app

Open a new terminal:

```bash
cd Frontend/web
cp .env.example .env    # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

Visit **http://localhost:3000** and sign in with a doctor account.

Main routes:

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/patient` | Patient list |
| `/patient/:id` | Patient detail |
| `/threshold-alerts` | Alert management |
| `/threshold-settings` | Threshold configuration |
| `/prescriptions` | Prescriptions |
| `/appointments` | Follow-up appointments |
| `/reminders` | Reminders |
| `/patient/chats` | Chat list |

### Step 3 — Admin panel

```bash
cd Frontend/admin
cp .env.example .env    # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

Visit **http://localhost:5174**. Only admin-role accounts can log in.

See [`Frontend/admin/README.md`](Frontend/admin/README.md) for admin-specific pages and configuration.

### Step 4 — Patient mobile app

```bash
cd Frontend/mobile
cp .env.example .env
npm install
npm start
```

Set `BASE_URL` in `.env` to point at your backend:

| Environment | Typical `BASE_URL` |
|-------------|-------------------|
| Android emulator | `http://10.0.2.2:8080` |
| iOS simulator | `http://localhost:8080` |
| Physical device | `http://<your-machine-ip>:8080` |

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios` for an emulator.

See [`Frontend/mobile/README.md`](Frontend/mobile/README.md) for EAS build instructions and device setup tips.

### Step 5 — Doctor mobile app

```bash
cd Frontend/doctor-app
npm install
npm start
```

Runs on port **3001** by default. Configure the API base URL in your environment to match your backend host.

Screens mirror the doctor web experience: patient list, alerts, chat, thresholds, reminders, prescriptions, and video calls.

### Running everything at once

For a full local stack you will have several terminals open:

| Terminal | Command | Port |
|----------|---------|------|
| 1 | `cd Backend && make up-dev && make run` | `8080` |
| 2 | `cd Frontend/web && npm run dev` | `3000` |
| 3 | `cd Frontend/admin && npm run dev` | `5174` |
| 4 | `cd Frontend/mobile && npm start` | `8081` |
| 5 | `cd Frontend/doctor-app && npm start` | `3001` |

Make sure `FE_WEB_URL` and `FE_ADMIN_URL` in `Backend/.env` match the origins your frontends actually run on, so CORS and auth cookies work correctly.

---

## Demo accounts

After running `make seed` in `Backend/`, these accounts are available for local testing:

| Role | Email | Password | Sign in via |
|------|-------|----------|-------------|
| Admin | `admin@gmail.com` | `Admin@123` | Admin panel (`5174`) |
| Doctor | `doctor@gmail.com` | `Doctor12345@` | Doctor web (`3000`) or doctor app (`3001`) |
| Nurse | `nurse@gmail.com` | `Nurse@123` | Patient mobile app (`8081`) |
| Patient | `patient@gmail.com` | `Patient12345@` | Patient mobile app (`8081`) |

These credentials exist only in seeded development databases. Never use them in production.

---

## Project structure

```
Remote-Patient-Monitoring/
│
├── Backend/                          # Go monolith: API + worker + seed CLI
│   ├── cmd/
│   │   ├── server/                   # HTTP API entrypoint
│   │   ├── worker/                   # Temporal worker entrypoint
│   │   └── seed/                     # Database seeding CLI
│   ├── internal/
│   │   ├── handler/                  # HTTP handlers (Gin)
│   │   ├── usecase/                  # Application orchestration
│   │   ├── service/                  # Business logic
│   │   ├── repository/               # MongoDB data access
│   │   ├── domain/                   # Core models
│   │   ├── router/                   # Route registration
│   │   ├── middleware/               # Auth, activity logging
│   │   └── realtime/                 # WebSocket hub
│   ├── external/
│   │   ├── temporal/                 # Workflows, activities, worker setup
│   │   └── fcm/                      # Firebase push client
│   ├── config/                       # MongoDB, Redis, OAuth, Cloudinary
│   ├── migration/
│   │   ├── cmd/                      # Seed & one-off migration CLIs
│   │   └── seed/                     # Seed data generators
│   ├── docker-compose.yml            # Dev: Temporal + Redis
│   ├── docker-compose.prod.yml       # Prod: full stack with nginx
│   └── Makefile                      # run, seed, up-dev, gen_swagger, …
│
├── Frontend/
│   ├── web/                          # Doctor dashboard (React + Vite)
│   ├── admin/                        # Admin panel (React + Vite)
│   ├── mobile/                       # Patient & nurse app (Expo)
│   └── doctor-app/                   # Doctor mobile app (Expo)
│
└── .github/workflows/                # CI/CD pipelines
    ├── backend_ci_cd.yml
    ├── frontend_web_ci_cd.yml
    └── frontend_admin_ci_cd.yml
```

### Backend layering

Handlers receive HTTP requests and delegate to **use cases**, which coordinate **services** and **repositories**. External integrations (Temporal, FCM, Cloudinary) live under `external/` to keep application logic in `internal/` clean and testable.

### API surface (overview)

The backend exposes routes for authentication, users, measurements, thresholds, alerts, departments, assignments, reminders, prescriptions, medication intake, follow-up appointments, chat, notifications, real-time WebSockets, activity logs, and video sessions. Full endpoint documentation is available via Swagger when the server is running.

---

## Development notes

### Backend

```bash
cd Backend

make server          # API only (no worker)
make worker          # Worker only (needs Temporal + Redis running)
make format          # goimports + gofmt
make static_check    # go vet
make gen_swagger     # Regenerate Swagger docs after handler changes

go test ./...        # Run all tests
```

Temporal task queues used by the worker:

| Queue | Workflows | Purpose |
|-------|-----------|---------|
| `ALERT-TASK-QUEUE` | `AlertWorkflow` | Evaluate measurements, create alerts, notify |
| `REMINDER-TASK-QUEUE` | `ReminderWorkflow`, `AppointmentReminderWorkflow` | Medication and appointment reminders |

### Frontend (web & admin)

Both apps use the same general pattern: Vite + React + TypeScript + Tailwind CSS + React Router. Each has its own `package.json`, dev server port, and build output — they are not a monorepo with shared packages.

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

### Mobile (Expo)

Both mobile apps use Expo SDK 54 with `dotenv-cli` to load environment variables at startup. Make sure a `.env` file exists before running any npm script.

Production builds use [EAS Build](https://docs.expo.dev/build/introduction/). See [`Frontend/mobile/README.md`](Frontend/mobile/README.md) for profile-specific commands (`development`, `preview`, `production`).

### Common issues

| Problem | Things to check |
|---------|----------------|
| CORS errors from a frontend | `FE_WEB_URL` / `FE_ADMIN_URL` in `Backend/.env` match your dev server origin |
| Mobile cannot reach API | Use `10.0.2.2` on Android emulator, machine IP on physical device |
| Reminders or alerts not firing | Temporal worker running? Check http://localhost:8233 for task queue backlog |
| MongoDB connection refused | `MONGO_URI` valid; Atlas IP allowlist includes your machine |
| Push notifications silent | FCM credentials optional in dev — worker logs a warning and continues |

More troubleshooting detail is in [`Backend/README.md`](Backend/README.md#troubleshooting).

---

## CI/CD

GitHub Actions workflows run automatically when changes are pushed to `master`:

| Workflow | Triggers on | What it does |
|----------|-------------|--------------|
| [`backend_ci_cd.yml`](.github/workflows/backend_ci_cd.yml) | `Backend/**` | `go fmt`, `go vet`, golangci-lint, tests, Docker image build, deploy to EC2 |
| [`frontend_web_ci_cd.yml`](.github/workflows/frontend_web_ci_cd.yml) | `Frontend/web/**` | Install, build with production `VITE_API_URL`, upload artifact |
| [`frontend_admin_ci_cd.yml`](.github/workflows/frontend_admin_ci_cd.yml) | `Frontend/admin/**` | Install, build, deploy admin panel |

The backend pipeline builds two Docker images (`rpm-backend`, `rpm-nginx`) and deploys them to EC2 via SSH. Frontend pipelines inject secrets such as `VITE_API_URL` at build time.

---

## Further reading

| Topic | Where to look |
|-------|---------------|
| Backend setup, env vars, Docker, Temporal | [`Backend/README.md`](Backend/README.md) |
| Admin panel features and pages | [`Frontend/admin/README.md`](Frontend/admin/README.md) |
| Patient mobile setup and EAS builds | [`Frontend/mobile/README.md`](Frontend/mobile/README.md) |
| Live API reference | http://localhost:8080/swagger/index.html |
| Temporal workflow inspection | http://localhost:8233 |

If you run into something not covered here, check the relevant sub-project README first — each one goes deeper into its own corner of the system.
