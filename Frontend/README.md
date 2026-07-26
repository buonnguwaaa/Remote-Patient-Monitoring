# Frontend

Client applications for the Remote Patient Monitoring (RPM) platform. Everything here talks to the shared Go backend at [`../Backend/`](../Backend/) over HTTP and WebSockets.

The frontend is split into **four independent apps** — not a monorepo with shared packages. Each has its own `package.json`, dependencies, dev server, and build output. Pick the app that matches the role you are working on, install dependencies inside that directory, and run it from there.

---

## Table of contents

- [Applications at a glance](#applications-at-a-glance)
- [How the apps relate](#how-the-apps-relate)
- [Shared conventions](#shared-conventions)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Authentication](#authentication)
- [Real-time features](#real-time-features)
- [Running the full frontend stack](#running-the-full-frontend-stack)
- [Project layout](#project-layout)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Further reading](#further-reading)

---

## Applications at a glance

| App | Directory | Who signs in | Stack | Dev port | README |
|-----|-----------|--------------|-------|----------|--------|
| **Doctor Web** | [`web/`](web/) | Doctors | React 18, TypeScript, Vite, Tailwind CSS 4 | `3000` | [`web/README.md`](web/README.md) |
| **Admin Panel** | [`admin/`](admin/) | Administrators | React 19, TypeScript, Vite, Tailwind CSS 4 | `5174` | [`admin/README.md`](admin/README.md) |
| **Patient Mobile** | [`mobile/`](mobile/) | Patients | React Native, Expo SDK 54 | `8081` | [`mobile/README.md`](mobile/README.md) |
| **Staff Mobile** | [`doctor-app/`](doctor-app/) | Doctors and nurses | React Native, Expo SDK 54 | `3001` | — |

### Doctor Web (`web/`)

The primary desktop experience for doctors. Dashboard with patient overview, measurement charts, threshold alerts, prescriptions, appointments, reminders, chat, and video calls.

Key routes: `/`, `/patient`, `/patient/:id`, `/threshold-alerts`, `/threshold-settings`, `/prescriptions`, `/appointments`, `/reminders`, `/patient/chats`.

### Admin Panel (`admin/`)

A separate web app for system administrators. Manages doctors, nurses, patients, departments, assignments, system settings, and activity history. Only users with the `admin` role can sign in. Creating a patient triggers a backend invite (email/SMS set-password link), not a raw temp password.

Key routes: `/`, `/doctors`, `/patients`, `/nurses`, `/departments`, `/assignments`, `/system-settings`, `/activity-history`.

### Patient Mobile (`mobile/`)

Expo app for patients on iOS and Android. Home screen, vitals tracking, health education, messaging, notifications, medication management, and video calls.

### Staff Mobile (`doctor-app/`)

Expo app for clinical staff on the go. After login, navigation adapts to the user's role:

- **Doctors** — bottom tabs for overview, patients, alerts, chat, and a "More" menu (thresholds, reminders, prescriptions, compliance, settings, video calls).
- **Nurses** — a focused tab bar for patient list, measurement input, prescriptions, and profile.

Despite the directory name, this is the staff-facing mobile client (package name: `rpm-staff`), not a doctor-only app. Nurse flows that previously lived under Patient Mobile were moved here.

---

## How the apps relate

```
                         ┌─────────────────────────────────┐
                         │     Backend API (:8080)         │
                         │  REST + WebSocket + Swagger     │
                         └───────────────┬─────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│   Doctor Web    │           │  Admin Panel    │           │  Mobile apps    │
│   Vite/React    │           │  Vite/React     │           │  Expo/RN        │
│   port 3000     │           │  port 5174      │           │  8081 / 3001    │
│                 │           │                 │           │                 │
│  role: doctor   │           │  role: admin    │           │ patient / staff │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

**Web apps are independent.** Doctor web and admin panel do not share code, state, or authentication sessions. They are deployed separately and guarded by role on both the client and the backend.

**Mobile apps are independent too.** Patient mobile and staff mobile are separate Expo projects with their own configs, though they follow similar patterns (`api/`, `context/`, `navigation/`, `screens/`).

**Backend CORS must match your dev origins.** Set `FE_WEB_URL` and `FE_ADMIN_URL` in `Backend/.env` to the URLs where your web apps actually run (e.g. `http://localhost:3000` and `http://localhost:5174`).

---

## Shared conventions

### Web apps (`web/`, `admin/`)

Both use the same general architecture:

```
src/
├── components/       # Reusable UI (layout/, ui/)
├── context/          # Auth, theme, language
├── features/         # Feature modules (e.g. auth)
├── pages/            # Route-level page components
├── services/         # Axios API clients
├── types/            # TypeScript definitions
├── locales/          # i18n translation files
└── App.tsx           # Router and providers
```

| Concern | Approach |
|---------|----------|
| HTTP client | Axios with `withCredentials: true` for cookie-based auth |
| API base URL | `VITE_API_URL` environment variable |
| Routing | React Router v7 with lazy-loaded pages |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` |
| Charts | Recharts |
| Icons | Lucide React, React Icons |
| i18n | react-i18next (doctor web; admin has its own config) |

### Mobile apps (`mobile/`, `doctor-app/`)

```
src/
├── api/              # HTTP client and endpoint modules
├── components/       # Shared UI components
├── context/          # Auth, badges, snackbar
├── hooks/            # Custom hooks
├── navigation/       # React Navigation stacks and tabs
├── screens/          # Screen components by role/feature
├── services/         # Push notifications, etc.
└── styles/           # Shared style tokens
```

| Concern | Approach |
|---------|----------|
| HTTP client | `fetch` via `httpClient.js` with token refresh |
| API base URL | `BASE_URL` / `EXPO_PUBLIC_BASE_URL` in `.env` |
| Env loading | `dotenv-cli` in npm scripts |
| Navigation | React Navigation (stack + bottom tabs) |
| Secure storage | `expo-secure-store` for auth tokens |
| Push | `expo-notifications` + Firebase (requires `google-services.json` on Android) |

---

## Prerequisites

| Tool | Version | Needed for |
|------|---------|------------|
| [Node.js](https://nodejs.org/) | LTS (20+) | All apps |
| npm | Bundled with Node | All apps |
| [Expo Go](https://expo.dev/client) | Latest | Mobile testing on a physical device |
| Android Studio / Xcode | Latest | Mobile emulators |
| Running backend | `http://localhost:8080` | All apps |

Start the backend before any frontend app. See [`../Backend/README.md`](../Backend/README.md).

---

## Quick start

Run these from the **app directory**, not from `Frontend/` root.

### Doctor web

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:3000**. Sign in with a doctor account.

### Admin panel

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5174**. Sign in with an admin account.

### Patient mobile

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios`.

### Staff mobile (doctors & nurses)

```bash
cd doctor-app
# Create .env with BASE_URL pointing at your backend
echo "BASE_URL=http://localhost:8080" > .env
npm install
npm start
```

Runs on port **3001**. Navigation changes automatically based on whether the logged-in user is a doctor or nurse.

### Common npm scripts (web & admin)

```bash
npm run dev       # Development server
npm run build     # Production build (output in dist/)
npm run preview   # Preview production build locally
npm run lint      # ESLint
```

### Common npm scripts (mobile & staff)

```bash
npm start         # Expo dev server (Metro)
npm run android   # Android emulator
npm run ios       # iOS simulator (macOS only)
```

Patient mobile also supports `npm run web` for a browser preview on port `8081`.

---

## Environment variables

### Web apps

Create `.env` from `.env.example` in each web app directory:

```bash
# web/.env and admin/.env
VITE_API_URL=http://localhost:8080
```

`VITE_API_URL` is baked in at build time. For production deployments, CI injects this from GitHub secrets.

The admin dev server also proxies `/api/*` to `VITE_API_URL` via Vite's proxy config, which can help during local development.

### Mobile apps

Create `.env` in the mobile app directory:

```bash
# mobile/.env and doctor-app/.env
BASE_URL=http://localhost:8080
```

`app.config.js` reads `BASE_URL` and `EXPO_PUBLIC_BASE_URL` and exposes them to the app via Expo `extra`.

| Target device | Typical `BASE_URL` |
|---------------|-------------------|
| Android emulator | `http://10.0.2.2:8080` |
| iOS simulator | `http://localhost:8080` |
| Physical device | `http://<your-machine-lan-ip>:8080` |

> `BASE_URL` must point at the **backend API** (port `8080`), not at a frontend dev server.

For Google OAuth on mobile, the backend redirects using `FE_WEB_URL`. For deep-link flows back into the app, you can set `FE_WEB_URL=rpm://oauth/success` and keep `"scheme": "rpm"` in `app.json`. See the notes in the old mobile setup docs if you use tunneling (`npx expo start --tunnel` or `ngrok http 8080`).

---

## Authentication

All apps use JWT-based auth backed by the backend, but the storage mechanism differs:

| App | Token storage | Refresh |
|-----|---------------|---------|
| Doctor web | HTTP-only cookies | Axios interceptor calls `/auth/refresh` on 401 |
| Admin panel | HTTP-only cookies | Same pattern as doctor web |
| Patient mobile | `expo-secure-store` | `httpClient.js` retries with `/auth/refresh` |
| Staff mobile | `expo-secure-store` | Same as patient mobile |

Role checks happen on both sides:

- **Admin panel** — client redirects non-admin users away from protected routes; backend enforces admin-only endpoints.
- **Doctor web** — doctor-role accounts only.
- **Staff mobile** — `isDoctor` / `isNurse` from auth context drives which navigator renders.
- **Patient mobile** — patient role only.

**Patient onboarding (backend):** When an admin creates a patient, the API does **not** send a raw temporary password. It emails/SMS an invite link to `/auth/accept-invite` (HTML set-password page), sets `mustSetPassword`, and uses a 15-minute token TTL. Admins can resend via `POST /users/patients/:id/resend-invite`. Forgot password on the patient app is a 6-digit email OTP (15 min). The API accepts login by email or phone (`phoneLookupHash`); logout uses a Redis JWT blacklist.

### Demo accounts (after backend seed)

| Role | Email | Password | Use with |
|------|-------|----------|----------|
| Admin | `admin@gmail.com` | `Admin@123` | Admin panel |
| Doctor | `doctor@gmail.com` | `Doctor12345@` | Doctor web or staff mobile |
| Nurse | `nurse@gmail.com` | `Nurse@123` | Staff mobile |
| Patient | `patient@gmail.com` | `Patient12345@` | Patient mobile |

---

## Real-time features

Doctor web, admin (where applicable), and both mobile apps connect to the backend WebSocket hub for live updates — new alerts, chat messages, and notification events.

WebSocket URLs are derived from the API base URL (`http` → `ws`, `https` → `wss`). If real-time features appear stuck, confirm the backend worker and Redis are running and that your `VITE_API_URL` / `BASE_URL` is correct.

---

## Running the full frontend stack

With the backend already running on port `8080`, open one terminal per app:

| Terminal | Directory | Command | URL |
|----------|-----------|---------|-----|
| 1 | `Frontend/web` | `npm run dev` | http://localhost:3000 |
| 2 | `Frontend/admin` | `npm run dev` | http://localhost:5174 |
| 3 | `Frontend/mobile` | `npm start` | Expo DevTools (:8081) |
| 4 | `Frontend/doctor-app` | `npm start` | Expo DevTools (:3001) |

Make sure `Backend/.env` has:

```bash
FE_WEB_URL=http://localhost:3000
FE_ADMIN_URL=http://localhost:5174
```

---

## Project layout

```
Frontend/
├── README.md           # This file — overview of all frontend apps
│
├── web/                # Doctor dashboard (React + Vite)
│   ├── src/
│   │   ├── pages/          # DashBoard, PatientPage, ThresholdAlert, …
│   │   ├── services/       # api.ts, patientService, chatService, …
│   │   ├── components/     # layout, ui, video, common
│   │   └── context/        # Auth, Theme, RealtimeNotification
│   ├── .env.example
│   └── vite.config.ts      # port 3000
│
├── admin/              # Admin panel (React + Vite)
│   ├── src/
│   │   ├── pages/          # DoctorManagement, AssignmentManagement, …
│   │   ├── services/       # api.ts, uploadService
│   │   └── components/     # layout, ui
│   ├── .env.example
│   └── vite.config.ts      # port 5174, /api proxy
│
├── mobile/             # Patient app (Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── patient/    # Home, tracking, education, chat, …
│   │   │   └── auth/       # Login, register, password reset
│   │   ├── api/            # httpClient, measurementApi, chatApi, …
│   │   └── navigation/     # AppNavigator
│   ├── app.config.js
│   ├── eas.json            # EAS Build profiles
│   └── .env.example
│
└── doctor-app/         # Staff app — doctors & nurses (Expo)
    ├── src/
    │   ├── screens/        # Doctor screens + screens/nurse/
    │   ├── api/
    │   └── navigation/     # Role-based DoctorMainTabs / NurseMainTabs
    ├── app.config.js
    └── package.json        # name: rpm-staff
```

---

## CI/CD

GitHub Actions deploys the two web apps on push to `master`:

| Workflow | App | What it does |
|----------|-----|--------------|
| [`frontend_web_ci_cd.yml`](../.github/workflows/frontend_web_ci_cd.yml) | `web/` | Build with `VITE_API_URL`, upload artifact, sync to S3 |
| [`frontend_admin_ci_cd.yml`](../.github/workflows/frontend_admin_ci_cd.yml) | `admin/` | Build with `VITE_API_URL`, upload artifact, sync to S3 |

Required secrets: `VITE_API_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_WEB_BUCKET_NAME`, `S3_ADMIN_BUCKET_NAME`.

Mobile apps are built locally or via EAS — see [`mobile/README.md`](mobile/README.md) for EAS Build commands (`development`, `preview`, `production` profiles).

---

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| **CORS or cookie errors (web)** | `FE_WEB_URL` / `FE_ADMIN_URL` in `Backend/.env` match your dev server origin exactly |
| **401 on every request** | Backend running? `.env` has correct `VITE_API_URL`? Try logging in again |
| **Mobile cannot reach API** | `BASE_URL` points to `:8080`, not a frontend port. Use `10.0.2.2` on Android emulator |
| **Expo env not loading** | `.env` file exists; scripts use `dotenv -e .env --` (already configured in `package.json`) |
| **Google OAuth redirect fails** | `FE_WEB_URL` on backend matches your setup; for mobile deep links use `rpm://` scheme |
| **Push notifications silent** | `google-services.json` present for Android; FCM credentials configured on backend worker |
| **WebSocket not connecting** | API URL correct; backend Redis and realtime hub running |
| **Port already in use** | Change port in `vite.config.ts` or Expo `--port` flag in `package.json` scripts |

---

## Further reading

| Topic | Document |
|-------|----------|
| Platform overview | [`../README.md`](../README.md) |
| Backend setup & API | [`../Backend/README.md`](../Backend/README.md) |
| Admin panel details | [`admin/README.md`](admin/README.md) |
| Patient mobile & EAS builds | [`mobile/README.md`](mobile/README.md) |
| Doctor web folder structure | [`web/README.md`](web/README.md) |
| Live API reference | http://localhost:8080/swagger/index.html |

When working on a specific app, start with this file for context, then open that app's README or source tree for the details.
